// The club's Cloud Functions. Four of them, in three unrelated jobs:
//
//   emailOnApplication    emails the organisers when a row lands in `applications`.
//   syncContributions     nightly, fetches every member's GitHub pull requests.
//   refreshContributions  the same fetch for one member, on demand from the dashboard.
//   tallyResponses        recounts a poll whenever somebody answers it.
//
// A NOTE ON THE FIRST ONE, because it is easy to read this file and assume it still
// fires. It triggers on `applications/{id}`, which is the LEGACY collection from before
// sign-in existed — nothing writes there any more; the profile at `users/{uid}` replaced
// it. So this function is currently dormant. It is kept rather than deleted because the
// rows already in that collection are still protected by it in the rules, and because
// pointing it at `users/{uid}` is a decision about whether organisers want an email per
// sign-up, not a tidy-up. Whoever makes that decision should change the `document` below
// and check format.js still matches the profile's field list.
//
// ---------------------------------------------------------------------------------
// EMAIL THE ORGANISERS WHENEVER SOMEBODY APPLIES.
//
// Triggered by the document being created, NOT by the form. That ordering is the whole
// design: the applicant's submit succeeds or fails on the Firestore write alone, so if
// SMTP is down, the mailbox is full, or this function throws, the application is still
// safely stored and nobody loses their submission. An email failure is an inconvenience
// for the organisers, never a lost applicant.
//
// It also means this cannot be used to confirm delivery to the applicant. It is a
// notification to the club, not a receipt to the student — the form's own success panel
// is the receipt.
//
// WHAT THIS COSTS. Outbound network from Cloud Functions requires the Blaze
// (pay-as-you-go) plan. For a student club's application volume the usage sits inside
// the free allowance, but a billing account must exist on the project. There is no way
// around that: it is Google's restriction on egress, not a choice made here.
//
// CREDENTIALS. Two secrets, held in Google Secret Manager via defineSecret and never in
// this repo, never in .env, and never in a NEXT_PUBLIC_ variable:
//
//   firebase functions:secrets:set SMTP_URL
//   firebase functions:secrets:set MAIL_TO
//
// SMTP_URL is a connection string, which keeps this provider-agnostic — Gmail with an
// app password, the domain's own mailbox, SendGrid, Mailgun, Resend, anything that
// speaks SMTP. Chosen over a provider SDK deliberately: the club should not have to
// migrate this function if it changes email host.
//
//   smtps://user%40example.com:app-password@smtp.gmail.com:465
//
// The username and password must be URL-encoded — an @ in the username or a / in the
// password will otherwise silently truncate the string and the connection fails with a
// confusing auth error.

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { setGlobalOptions } = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");
const nodemailer = require("nodemailer");

const { formatApplication } = require("./format");

const SMTP_URL = defineSecret("SMTP_URL");
const MAIL_TO = defineSecret("MAIL_TO");

// asia-south1 to sit beside the Firestore database. A function in another region works
// but pays a cross-region round trip on every trigger for no reason.
setGlobalOptions({ region: "asia-south1", maxInstances: 10 });

exports.emailOnApplication = onDocumentCreated(
  {
    document: "applications/{id}",
    secrets: [SMTP_URL, MAIL_TO],
    // One retry is worth having for a transient SMTP failure; more than that risks
    // sending the same application repeatedly, which is worse than missing one.
    retry: false,
    timeoutSeconds: 60,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) {
      logger.warn("Triggered with no document; nothing to send.");
      return;
    }

    const data = snap.data();
    const { subject, text, replyTo } = formatApplication(data, event.params.id);

    const url = SMTP_URL.value();
    const to = MAIL_TO.value();

    // Degrade to a log rather than throwing. An unconfigured function that crashes fills
    // the error log and tells nobody anything useful; this way the application is stored,
    // the body is visible in `firebase functions:log`, and the fix is obvious.
    if (!url || !to) {
      logger.warn(
        "SMTP_URL or MAIL_TO is not set, so no email was sent. The application IS saved.",
        { subject },
      );
      return;
    }

    try {
      const transport = nodemailer.createTransport(url);
      await transport.sendMail({
        // From must be an address the SMTP account is allowed to send as, so it is
        // derived from the connection rather than invented. Many providers silently
        // rewrite or reject a mismatched From.
        from: to,
        to,
        replyTo,
        subject,
        text,
      });
      logger.info("Application email sent.", { id: event.params.id });
    } catch (err) {
      // Logged, not rethrown. The document is already written and committed; throwing
      // would only mark the trigger failed and, with retries on, could email twice.
      logger.error("Could not send the application email. The application IS saved.", {
        id: event.params.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
);

// ---------------------------------------------------------------------------------
// GITHUB CONTRIBUTIONS
//
// Two entry points onto the same work: a scheduled sweep that keeps every member's row
// warm, and a callable so a member who merged something an hour ago does not have to wait
// for tomorrow.
//
// WHY THIS IS A FUNCTION AND NOT A FETCH IN THE BROWSER. Both halves of the answer are in
// web/lib/contributions.ts, and both are decisive: a browser gets 60 unauthenticated
// GitHub requests an hour PER IP, which on a college network is 60 an hour for the whole
// club; and a count the client writes is a count the client can invent. The Admin SDK
// here bypasses firestore.rules, which is exactly why `contributions/{uid}` is
// `allow write: if false` for every client including its owner.
//
// CREDENTIALS. One optional secret:
//
//   firebase functions:secrets:set GITHUB_TOKEN
//
// A fine-grained personal access token with NO scopes at all is enough — this only reads
// public data, and the token is for the rate limit rather than for access. Without it the
// sweep still runs and simply gets much less far before GitHub refuses; with it, the
// search limit goes from 10 requests a minute to 30.

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const { fetchContributions, isValidHandle } = require("./github");

const GITHUB_TOKEN = defineSecret("GITHUB_TOKEN");

// Initialised once, at module load, guarded because both functions in this file share the
// process and a second initializeApp() throws.
if (!admin.apps.length) admin.initializeApp();

/** Collection names, which MUST match web/lib/firebase.ts. Different strings here means
 *  the sweep writes rows the dashboard never reads — and nothing fails, which is what
 *  makes it worth stating rather than inlining. `npm run rules` asserts these. */
const USERS = "users";
const CONTRIBUTIONS = "contributions";
const FORMS = "forms";
const RESPONSES = "responses";

/** Two search requests per member against a 30-per-minute authenticated limit means one
 *  member every 4.5 seconds is the ceiling. 5s leaves a little headroom. */
const GAP_MS = 5000;

/** How many members one scheduled run will refresh.
 *
 *  A CAP RATHER THAN A LONGER TIMEOUT, and the cap is the honest half of the design.
 *  Cloud Functions v2 stops at 3,600s; at GAP_MS per member a full club sweep would
 *  approach that as membership grows, and a run killed mid-sweep leaves an arbitrary half
 *  of the club stale with nothing saying so. Instead each run takes the 100 STALEST rows,
 *  so the whole club is covered every ceil(n/100) days in a deterministic order. At 100
 *  members that is daily; at 400 it is every four days, and the dashboard's "checked N
 *  days ago" line is what makes that visible rather than mysterious. */
const MAX_PER_RUN = 100;

/** A member may ask for a refresh this often. Enforced HERE rather than in the client,
 *  because a client-side timer is a suggestion — and this is the only path by which a
 *  signed-in member can cause outbound requests, so it is the one that needs a limit. */
const COOLDOWN_MS = 10 * 60 * 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Fetch one member's contributions and store them.
 *
 *  `synced_at` is written even for a not_found handle, and deliberately: without it a
 *  typo'd handle would be retried on every run forever, and the cooldown would never
 *  engage for the person most likely to press the button repeatedly. */
async function syncOne(uid, handle, token) {
  const data = await fetchContributions(handle, token);
  await admin
    .firestore()
    .collection(CONTRIBUTIONS)
    .doc(uid)
    .set({ uid, ...data, synced_at: admin.firestore.FieldValue.serverTimestamp() });
}

/** Read a row back as plain JSON, for handing to a callable's caller.
 *
 *  NEEDED BECAUSE THE WRITE ABOVE STORES A SENTINEL, not a time. Returning the object
 *  that was written hands the client `{_methodName: "serverTimestamp"}`, which toDate()
 *  cannot read and which renders as "checked never" immediately after a successful sync —
 *  the one moment the reader is looking straight at it. */
async function readOne(uid) {
  const snap = await admin.firestore().collection(CONTRIBUTIONS).doc(uid).get();
  if (!snap.exists) return null;
  const d = snap.data();
  return {
    ...d,
    // A Firestore Timestamp does not survive the callable's JSON encoding as anything
    // useful, so it crosses as ISO and toDate() parses the string on the other side.
    synced_at: d.synced_at?.toDate?.().toISOString() ?? null,
  };
}

exports.syncContributions = onSchedule(
  {
    // 04:00 IST — the middle of the night for the only people who use this. The timezone
    // is stated rather than left at UTC so the schedule means what it reads.
    schedule: "0 4 * * *",
    timeZone: "Asia/Kolkata",
    secrets: [GITHUB_TOKEN],
    timeoutSeconds: 3600,
    // ONE INSTANCE, ALWAYS. Two overlapping sweeps would double the request rate against
    // a limit this is carefully sized under, and the throttle would mean nothing.
    maxInstances: 1,
    retryCount: 0,
  },
  async () => {
    const token = GITHUB_TOKEN.value() || "";
    if (!token) {
      logger.warn(
        "GITHUB_TOKEN is not set. The sweep runs against the unauthenticated limit " +
          "(10 searches a minute) and will not get far. Set it with: " +
          "firebase functions:secrets:set GITHUB_TOKEN",
      );
    }

    const db = admin.firestore();
    // Every member who gave a handle. `github` is optional on the profile, so this is a
    // subset of the roster.
    const members = await db.collection(USERS).get();
    const withHandles = members.docs
      .map((d) => ({ uid: d.id, handle: (d.data().github ?? "").trim() }))
      .filter((m) => isValidHandle(m.handle));

    // STALEST FIRST, so MAX_PER_RUN rotates through the club rather than refreshing the
    // same hundred people every night. Never-synced rows sort first, having no timestamp.
    const existing = await db.collection(CONTRIBUTIONS).get();
    const syncedAt = new Map(
      existing.docs.map((d) => [d.id, d.data().synced_at?.toMillis?.() ?? 0]),
    );
    withHandles.sort((a, b) => (syncedAt.get(a.uid) ?? 0) - (syncedAt.get(b.uid) ?? 0));

    const batch = withHandles.slice(0, MAX_PER_RUN);
    logger.info(
      `Syncing ${batch.length} of ${withHandles.length} members with a GitHub handle.`,
    );

    let done = 0;
    let failed = 0;
    for (const m of batch) {
      try {
        await syncOne(m.uid, m.handle, token);
        done++;
      } catch (err) {
        failed++;
        if (err.code === "rate-limit") {
          // STOP, DO NOT CARRY ON. Once GitHub is refusing, every further request in this
          // run is also refused — continuing turns one rate limit into a hundred, and the
          // remaining members are picked up tomorrow anyway because they are now the
          // stalest rows.
          logger.warn(`Rate limited after ${done} members. Stopping; the rest are next run.`);
          break;
        }
        // Anything else is one member's problem, not the sweep's. Logged and skipped.
        logger.error("Could not sync one member.", {
          uid: m.uid,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      await sleep(GAP_MS);
    }

    logger.info(`Sync finished. ${done} updated, ${failed} failed.`);
  },
);

exports.refreshContributions = onCall(
  { secrets: [GITHUB_TOKEN], timeoutSeconds: 60, maxInstances: 10 },
  async (request) => {
    const auth = request.auth;
    // THE UID COMES FROM THE TOKEN, NEVER FROM A PARAMETER. That is the whole reason this
    // is a callable rather than an HTTP endpoint: a uid passed in the body is a uid
    // somebody can change, and this would become "refresh anybody's row".
    if (!auth?.uid) throw new HttpsError("unauthenticated", "Sign in first.");

    // THE SAME DOMAIN RULE AS firestore.rules, RESTATED — because the Admin SDK below
    // does not go through the rules at all. Without this, a Google account on any domain
    // could call this function and spend the club's GitHub rate limit. If the domain in
    // web/lib/firebase.ts changes, it changes here too.
    const email = String(auth.token?.email ?? "").toLowerCase();
    if (auth.token?.email_verified !== true || !/^[^@]+@sst\.scaler\.com$/.test(email)) {
      throw new HttpsError("permission-denied", "Members only.");
    }

    const db = admin.firestore();
    const profile = await db.collection(USERS).doc(auth.uid).get();
    const handle = (profile.data()?.github ?? "").trim();
    if (!isValidHandle(handle)) return { ok: false, reason: "no-handle" };

    const current = await db.collection(CONTRIBUTIONS).doc(auth.uid).get();
    const last = current.data()?.synced_at?.toMillis?.() ?? 0;
    // The cooldown is SKIPPED when the stored row is for a different handle. Somebody who
    // has just corrected a typo should not be told to wait ten minutes to see the fix —
    // that is the one moment they will certainly press the button twice.
    const sameHandle =
      (current.data()?.github ?? "").trim().toLowerCase() === handle.toLowerCase();
    if (sameHandle && Date.now() - last < COOLDOWN_MS) {
      return { ok: false, reason: "cooldown" };
    }

    try {
      await syncOne(auth.uid, handle, GITHUB_TOKEN.value() || "");
      const stored = await readOne(auth.uid);
      if (stored?.not_found) return { ok: false, reason: "not-found" };
      return { ok: true, contributions: stored };
    } catch (err) {
      // Logged with the distinction, returned without it: "we are being throttled" and
      // "GitHub is down" are different things to whoever reads the logs and the same
      // sentence to a member, who can only try again either way.
      logger.error("Refresh failed.", {
        uid: auth.uid,
        code: err.code ?? "unknown",
        error: err instanceof Error ? err.message : String(err),
      });
      return { ok: false, reason: "github-down" };
    }
  },
);

// ---------------------------------------------------------------------------------
// POLL TALLIES
//
// Recomputes forms/{formId}.tally whenever a response is written.
//
// WHY A FUNCTION AND NOT A CLIENT-SIDE COUNTER. `tally` is refused to every client by
// firestore.rules — including the admin who created the form — because a count the client
// supplies is a count the client invented. The obvious alternative, letting a member
// increment a counter as they vote, cannot be made safe in rules: a rule can check that
// the new count is the old count plus one, but it CANNOT check that the increment came
// with an actual vote, so anybody could push a number up without answering anything.
//
// IT RECOMPUTES FROM SCRATCH RATHER THAN INCREMENTING, and that is the decision worth
// defending. Incrementing is O(1) and wrong in three ordinary situations: a member
// changing their answer (decrement the old, increment the new), a retried function
// invocation (double count), and any write that lands while another is in flight. Reading
// every response and counting is O(n) per write, which for a club poll is a few hundred
// documents — and it is ALWAYS right, including after a bug, because it derives the
// answer rather than accumulating it. If the club ever runs a poll with tens of thousands
// of responses, revisit this; at that point a distributed counter is the standard answer.
//
// ONLY `choice` AND `multi` FIELDS ARE COUNTED. Tallying free text would produce one
// bucket per person, which is not a tally.

const { onDocumentWritten } = require("firebase-functions/v2/firestore");

exports.tallyResponses = onDocumentWritten(
  {
    document: "forms/{formId}/responses/{uid}",
    // ONE AT A TIME PER DEPLOYMENT. Two invocations recomputing the same form
    // concurrently would both read, both count, and the slower one would write a total
    // that is missing the other's response. Serialising costs latency nobody perceives on
    // a club poll and removes the whole class of lost update.
    maxInstances: 1,
    retry: false,
    timeoutSeconds: 120,
  },
  async (event) => {
    const formId = event.params.formId;
    const db = admin.firestore();

    const formRef = db.collection(FORMS).doc(formId);
    const form = await formRef.get();
    if (!form.exists) {
      logger.warn("A response was written to a form that does not exist.", { formId });
      return;
    }

    const data = form.data();
    // Nothing to show, nothing to compute. A sign-up sheet is not a poll and its
    // organisers read the responses directly.
    if (data.show_tally !== true) return;

    const counted = (data.fields ?? []).filter(
      (f) => (f.type === "choice" || f.type === "multi") && Array.isArray(f.options),
    );
    if (!counted.length) return;

    const responses = await formRef.collection(RESPONSES).get();

    // Every option starts at zero, so an option nobody picked renders as "0" rather than
    // vanishing from the bars — which would make a poll look like it had fewer choices
    // than it offered.
    const tally = {};
    for (const f of counted) {
      tally[f.id] = {};
      for (const o of f.options) tally[f.id][o] = 0;
    }

    for (const doc of responses.docs) {
      const answers = doc.data().answers ?? {};
      for (const f of counted) {
        const a = answers[f.id];
        // An answer naming an option the form no longer offers is DROPPED rather than
        // added as a new bucket: options can be edited after responses arrive, and a
        // tally that grew a row for a deleted option would read as a live choice.
        for (const v of Array.isArray(a) ? a : [a]) {
          if (typeof v === "string" && v in tally[f.id]) tally[f.id][v] += 1;
        }
      }
    }

    // merge:true so this touches nothing else on the form. A full set would race with an
    // organiser editing the question at the same moment and silently revert their edit.
    await formRef.set({ tally }, { merge: true });
    logger.info("Tally updated.", { formId, responses: responses.size });
  },
);
