// Execute firestore.rules against the real Firestore emulator, as several different
// signed-in people.
//
//   Terminal 1:  npx firebase-tools emulators:start --only firestore,auth --project demo-osc
//   Terminal 2:  npm run rules:emulator
//
// WHY THIS EXISTS SEPARATELY FROM scripts/rules.mjs. That one is a text check: it diffs
// the rules against the form's option lists and greps for the deny lines. It needs no
// Java, no emulator and no network, so it runs on every CI push.
//
// This one actually EXECUTES the rules, and now it has to, because the model is no
// longer "anyone may create one thing". It is identity-dependent: a member may read
// exactly one document, an admin may query the collection, an off-domain account may do
// nothing, and an unverified address may do nothing even if the domain matches. None of
// that can be checked by reading the file. The interesting failures are all of the form
// "rule looks right, allows the wrong person".
//
// It uses @firebase/rules-unit-testing, which is the only way to forge an auth token —
// signing in for real would need a Google account per test case.
//
// A note on the emulator's output: several denials are logged as "evaluation error"
// rather than a clean `false`. That is expected — when a field is absent or the wrong
// type, expressions like `d.name.size()` raise instead of returning false, and the rules
// engine treats a raised error as a denial. The security outcome is identical; it only
// makes the log noisier. Every verdict below is asserted explicitly.

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const RULES = join(here, "..", "..", "firestore.rules");
const HOST = "127.0.0.1";
const PORT = Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8080);

// Fail with instructions rather than a stack trace: "connection refused" from the
// Firestore SDK looks like a code fault rather than a missing emulator.
try {
  await (await fetch(`http://${HOST}:${PORT}/`)).text();
} catch {
  console.error(
    `\n  No Firestore emulator on ${HOST}:${PORT}.\n\n` +
      "  Start it first, from the repo root:\n" +
      "    npx firebase-tools emulators:start --only firestore,auth --project demo-osc\n",
  );
  process.exit(1);
}

const env = await initializeTestEnvironment({
  projectId: "demo-osc",
  firestore: { host: HOST, port: PORT, rules: readFileSync(RULES, "utf8") },
});

// START FROM EMPTY, EVERY RUN. The emulator keeps its data for as long as it is up, so
// without this the second run finds the first run's profiles and "create your own
// profile" silently becomes an update — which the rules correctly refuse, because the
// create case sends created_at and an update may not change it. The suite then fails on
// its own leftovers rather than on anything in the rules, which is the most misleading
// kind of red.
await env.clearFirestore();

let pass = 0;
let fail = 0;
async function check(label, shouldSucceed, op) {
  try {
    await (shouldSucceed ? assertSucceeds(op()) : assertFails(op()));
    pass++;
    console.log(`  PASS  ${shouldSucceed ? "allow" : "deny "}  ${label}`);
  } catch (e) {
    fail++;
    console.log(
      `  FAIL  ${shouldSucceed ? "allow" : "deny "}  ${label}  (${String(e).slice(0, 90)})`,
    );
  }
}

/** A signed-in member of the club: on-domain and verified. */
const member = (uid, email) =>
  env.authenticatedContext(uid, { email, email_verified: true }).firestore();

/** The shape the profile form writes. Three fields plus the identity and the optionals —
 *  batch, branch and year are read from the address by web/lib/batch.ts and are not
 *  stored, so there is nothing about them for the rules to validate. */
const profileFor = (uid, email, over = {}) => ({
  uid,
  email,
  name: "Asha Verma",
  hostel: "uniworld-1",
  github: "asha",
  path: "program-track",
  // NO created_at / updated_at HERE. They are added by withStamps() below, which uses
  // serverTimestamp(). Literal Dates in this base object made every edit case send a
  // forged created_at, so the rules refused them and two tests failed for a reason that
  // had nothing to do with what they were testing.
  ...over,
});

/** A mentor, as AdminMentors writes one. */
const mentorFor = (over = {}) => ({
  name: "Priya Nair",
  description: "Kubernetes and Go. Good on proposal structure; not the person for frontend.",
  programme: "gsoc",
  org: "CNCF",
  active: true,
  ...over,
});

/** An enrollment, as MentorPicker writes one. */
const enrollmentFor = (uid, email, over = {}) => ({
  uid,
  email,
  programme: "gsoc",
  first_only: true,
  ...over,
});

// serverTimestamp() is what the client actually sends, and the rules require
// `updated_at == request.time`. The helper below swaps the placeholder dates for real
// sentinels, because a literal Date can never equal request.time and every write would
// fail for the wrong reason.
const { serverTimestamp } = await import("firebase/firestore");
const withStamps = (d, { created = true } = {}) => ({
  ...d,
  ...(created ? { created_at: serverTimestamp() } : {}),
  updated_at: serverTimestamp(),
});

// REAL-SHAPED ADDRESSES, not `asha@sst.scaler.com`. Every college account looks like
// `asha.23bcs10045@…`, and the dot in the local part is exactly the character a
// carelessly written domain regex mishandles. Using the real shape here means the
// anchored `^[^@]+@sst[.]scaler[.]com$` is being exercised against what it will actually
// meet, rather than against a simpler address that would pass a weaker check too.
const UID_A = "uid-asha";
const MAIL_A = "asha.23bcs10045@sst.scaler.com";
const UID_B = "uid-ravi";
const MAIL_B = "ravi.24bcs10192@sst.scaler.com";
// A third student who has never been a member, for the profile-creation cases.
const UID_C = "uid-new";
const MAIL_C = "new.25bcs10001@sst.scaler.com";
const UID_ADMIN = "uid-organiser";
const MAIL_ADMIN = "organiser@sst.scaler.com";
const UID_OWNER = "uid-owner";
const MAIL_OWNER = "owner@sst.scaler.com";
// Somebody who used to run the club. The row survives, because it is also the handover
// record; the access must not.
const UID_RETIRED = "uid-retired";
const MAIL_RETIRED = "retired@sst.scaler.com";
// THE PERSON THE ROSTER TESTS APPOINT, AND DELIBERATELY NOT ONE OF THE MEMBERS ABOVE.
// Appointing MAIL_B made them a real admin for every case that ran afterwards, so "read
// somebody else's response" and "read somebody else's contributions" both SUCCEEDED —
// correctly, because by then the person doing the reading was an organiser. Two tests
// went red for a reason that had nothing to do with the rule they were testing, which is
// the most misleading kind of red there is. Nobody ever signs in as this address.
const MAIL_APPOINTEE = "newlead@sst.scaler.com";

// Seed with rules disabled, which mirrors reality: the FIRST owner is added by hand in
// the Firebase console, because a rule that let a client create the first roster row
// would let any client create one.
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  const { doc, setDoc } = await import("firebase/firestore");
  // A LEGACY ROW, ON PURPOSE: no active flag and no role. This is the shape every row the
  // club already had carries, and the two defaults say it is an active plain admin. If a
  // rules edit ever inverts either default, this row is what notices — every admin case
  // below runs as this person.
  await setDoc(doc(db, "admins", MAIL_ADMIN), { added_by: "console" });
  await setDoc(doc(db, "admins", MAIL_OWNER), {
    email: MAIL_OWNER,
    name: "Nikita Rao",
    role: "owner",
    active: true,
    added_by: "console",
  });
  await setDoc(doc(db, "admins", MAIL_RETIRED), {
    email: MAIL_RETIRED,
    name: "Former Lead",
    role: "admin",
    active: false,
    added_by: "console",
  });
  // A pre-existing legacy application, to prove those rows are still unreadable.
  await setDoc(doc(db, "applications", "legacy-1"), { name: "Old Applicant" });
  // GitHub counts, as the Cloud Function writes them: through the Admin SDK, which does
  // not pass through the rules at all. Seeded here for the same reason — there is no
  // in-rules way to create one, and that is the feature rather than a gap in the test.
  await setDoc(doc(db, "contributions", UID_A), {
    uid: UID_A,
    github: "asha",
    merged: 4,
    open: 1,
    repos: 3,
    recent: [],
  });
});

const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where } =
  await import("firebase/firestore");

console.log("\nfirestore.rules, executed against the emulator\n");
console.log("-- a member and their own profile --");

await check("create your own profile", true, () =>
  setDoc(doc(member(UID_A, MAIL_A), "users", UID_A), withStamps(profileFor(UID_A, MAIL_A))),
);
await check("read your own profile", true, () =>
  getDoc(doc(member(UID_A, MAIL_A), "users", UID_A)),
);
// merge:true and no created_at, which is exactly what lib/profile.ts saveProfile does on
// an edit. Sending created_at again would be a forgery; omitting it without merge would
// erase it. Both are denied — see the two cases at the end of this block.
await check("edit your own profile", true, () =>
  setDoc(
    doc(member(UID_A, MAIL_A), "users", UID_A),
    withStamps(profileFor(UID_A, MAIL_A, { hostel: "uniworld-2" }), { created: false }),
    { merge: true },
  ),
);
// The minimum a member can file: the three required fields and nothing else. Both
// optionals absent, which is what most members actually save — no GitHub, and no ?path=
// because they came in through the nav button rather than a page's closing action.
await check("create a profile with neither github nor path", true, () => {
  const d = profileFor("uid-min", "minimal.25bcs10001@sst.scaler.com");
  delete d.github;
  delete d.path;
  return setDoc(
    doc(member("uid-min", "minimal.25bcs10001@sst.scaler.com"), "users", "uid-min"),
    withStamps(d),
  );
});
// Found by this suite rather than reasoned about: a full overwrite that simply leaves
// created_at out would wipe the membership date, and `immutablesUnchanged` refuses it.
// Worth an explicit test because the fix — always merge — lives in the client, where
// nothing else would catch a regression.
await check("overwrite your profile without merge, dropping created_at", false, () =>
  setDoc(
    doc(member(UID_A, MAIL_A), "users", UID_A),
    withStamps(profileFor(UID_A, MAIL_A), { created: false }),
    { merge: false },
  ),
);
await check("delete your own profile", false, () =>
  deleteDoc(doc(member(UID_A, MAIL_A), "users", UID_A)),
);

console.log("\n-- one member against another's profile --");
await check("read somebody else's profile", false, () =>
  getDoc(doc(member(UID_B, MAIL_B), "users", UID_A)),
);
await check("overwrite somebody else's profile", false, () =>
  setDoc(doc(member(UID_B, MAIL_B), "users", UID_A), withStamps(profileFor(UID_A, MAIL_A))),
);
await check("file a profile under another uid", false, () =>
  setDoc(doc(member(UID_B, MAIL_B), "users", "uid-someone-else"), withStamps(profileFor(UID_B, MAIL_B))),
);
await check("claim somebody else's email in your own profile", false, () =>
  setDoc(doc(member(UID_B, MAIL_B), "users", UID_B), withStamps(profileFor(UID_B, MAIL_A))),
);
await check("list the whole membership as a member", false, () =>
  getDocs(collection(member(UID_B, MAIL_B), "users")),
);
await check("query around the list rule with a filter", false, () =>
  getDocs(query(collection(member(UID_B, MAIL_B), "users"), where("hostel", "==", "uniworld-1"))),
);

console.log("\n-- who is not allowed in at all --");
await check("an anonymous visitor reading a profile", false, () =>
  getDoc(doc(env.unauthenticatedContext().firestore(), "users", UID_A)),
);
await check("an anonymous visitor creating a profile", false, () =>
  setDoc(doc(env.unauthenticatedContext().firestore(), "users", "anon"), withStamps(profileFor("anon", MAIL_A))),
);
await check("a gmail.com account creating a profile", false, () =>
  setDoc(
    doc(
      env.authenticatedContext("uid-outsider", { email: "someone@gmail.com", email_verified: true }).firestore(),
      "users",
      "uid-outsider",
    ),
    withStamps(profileFor("uid-outsider", "someone@gmail.com")),
  ),
);
// The two lookalikes an endsWith check would wave through.
await check("an address that only ends with the domain", false, () =>
  setDoc(
    doc(
      env.authenticatedContext("uid-x", { email: "eve@evil.com@sst.scaler.com", email_verified: true }).firestore(),
      "users",
      "uid-x",
    ),
    withStamps(profileFor("uid-x", "eve@evil.com@sst.scaler.com")),
  ),
);
await check("a subdomain-suffix lookalike", false, () =>
  setDoc(
    doc(
      env.authenticatedContext("uid-y", { email: "eve@sst.scaler.com.evil.com", email_verified: true }).firestore(),
      "users",
      "uid-y",
    ),
    withStamps(profileFor("uid-y", "eve@sst.scaler.com.evil.com")),
  ),
);
await check("an on-domain address that is NOT verified", false, () =>
  setDoc(
    doc(
      env.authenticatedContext("uid-unv", { email: "fake@sst.scaler.com", email_verified: false }).firestore(),
      "users",
      "uid-unv",
    ),
    withStamps(profileFor("uid-unv", "fake@sst.scaler.com")),
  ),
);

console.log("\n-- validation --");
const badProfile = (over) => () =>
  setDoc(doc(member(UID_B, MAIL_B), "users", UID_B), withStamps(profileFor(UID_B, MAIL_B, over)));
await check("a hostel outside the closed set", false, badProfile({ hostel: "uniworld-3" }));
await check("a path outside the closed set", false, badProfile({ path: "hackathon" }));
await check("an empty required field", false, badProfile({ name: "" }));
// An OPTIONAL field written as "" rather than omitted. This is the shape a clear-the-box
// edit would take if lib/profile.ts stopped sending deleteField(), and it is refused —
// so the member would see a save fail with no idea why. The test is here to make that
// coupling explicit rather than latent.
await check("an optional field written as an empty string", false, badProfile({ github: "" }));
await check("an extra field the form never sends", false, badProfile({ isAdmin: true }));
// The eight fields cut from the form over time. `hasOnly` is strict, so these are refused
// outright — which is the point: an older client left open in a tab cannot keep writing
// a field the form no longer asks for and nothing reads.
for (const gone of [
  { why: "an essay nobody reads" },
  { heard_from: "senior" },
  { interests: ["web"] },
  { updates: true },
  // Replaced by the batch derived from the address. A tab open from before that change
  // would still be sending this one.
  { year_branch: "2nd year, CSE" },
  { level: "some-git" },
  { programs: ["gsoc"] },
  { programs_other: "something" },
])
  await check(`the removed field "${Object.keys(gone)[0]}" is refused`, false, badProfile(gone));
await check("a client-forged updated_at", false, () =>
  setDoc(doc(member(UID_B, MAIL_B), "users", UID_B), profileFor(UID_B, MAIL_B)),
);

console.log("\n-- immutability of identity --");
// UID_A's profile exists by now, so these are updates rather than creates.
await check("changing your stored email on an edit", false, () =>
  updateDoc(doc(member(UID_A, MAIL_A), "users", UID_A), {
    email: "someone.else@sst.scaler.com",
    updated_at: serverTimestamp(),
  }),
);
await check("backdating created_at on an edit", false, () =>
  updateDoc(doc(member(UID_A, MAIL_A), "users", UID_A), {
    created_at: new Date(2000, 0, 1),
    updated_at: serverTimestamp(),
  }),
);

console.log("\n-- admins --");
await check("an admin reading somebody else's profile", true, () =>
  getDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "users", UID_A)),
);
await check("an admin listing the whole membership", true, () =>
  getDocs(collection(member(UID_ADMIN, MAIL_ADMIN), "users")),
);
await check("an admin editing somebody else's profile", false, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "users", UID_A), withStamps(profileFor(UID_A, MAIL_A))),
);
await check("an admin deleting a profile", false, () =>
  deleteDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "users", UID_A)),
);
await check("reading your own admins row", true, () =>
  getDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "admins", MAIL_ADMIN)),
);
await check("checking whether somebody ELSE is an admin", false, () =>
  getDoc(doc(member(UID_B, MAIL_B), "admins", MAIL_ADMIN)),
);
// THE ROSTER IS READABLE BY THE TEAM AND NOBODY ELSE. It used to be unreadable by
// everybody, because it was only an access list; it is the team page's source now, so the
// organisers' screen has to render it. The document id is an email, so listing it hands
// over every organiser's inbox — which is exactly why the line is drawn at admins rather
// than at members.
await check("an admin reading the whole roster", true, () =>
  getDocs(collection(member(UID_ADMIN, MAIL_ADMIN), "admins")),
);
await check("a member reading the whole roster", false, () =>
  getDocs(collection(member(UID_B, MAIL_B), "admins")),
);
// The one privilege escalation this model would otherwise allow: a plain admin — and so
// one compromised admin account — cannot appoint anybody.
await check("an admin appointing another admin", false, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "admins", MAIL_B), { added_by: UID_ADMIN }),
);
await check("a member appointing themselves admin", false, () =>
  setDoc(doc(member(UID_B, MAIL_B), "admins", MAIL_B), { added_by: "me" }),
);

console.log("\n-- the roster: owners appoint, and cannot appoint themselves --");
const rosterRow = (email, over = {}) => ({
  email,
  name: "Ravi Kumar",
  role: "admin",
  active: true,
  title: "Lead",
  group: "lead",
  added_by: MAIL_OWNER,
  ...over,
});
// `added_at` is the roster's created_at: stamped once, frozen after. Named differently
// from the profile's, which is why it needs its own helper rather than withStamps().
const withRoster = (d, { added = true } = {}) => ({
  ...d,
  ...(added ? { added_at: serverTimestamp() } : {}),
  updated_at: serverTimestamp(),
});

await check("an owner appointing an admin", true, () =>
  setDoc(doc(member(UID_OWNER, MAIL_OWNER), "admins", MAIL_APPOINTEE), withRoster(rosterRow(MAIL_APPOINTEE))),
);
await check("an owner retiring that admin", true, () =>
  setDoc(
    doc(member(UID_OWNER, MAIL_OWNER), "admins", MAIL_APPOINTEE),
    withRoster(rosterRow(MAIL_APPOINTEE, { active: false }), { added: false }),
    { merge: true },
  ),
);
await check("an owner bringing them back", true, () =>
  setDoc(
    doc(member(UID_OWNER, MAIL_OWNER), "admins", MAIL_APPOINTEE),
    withRoster(rosterRow(MAIL_APPOINTEE), { added: false }),
    { merge: true },
  ),
);
// THE SELF-GUARD, WHICH IS THE INTERESTING ONE. It reads like paternalism and is not:
// without it, taking one owner account is enough to retire every other owner and hold the
// club alone. With it, whoever is left can always turn the others back on.
await check("an owner editing their OWN row", false, () =>
  setDoc(
    doc(member(UID_OWNER, MAIL_OWNER), "admins", MAIL_OWNER),
    withRoster(rosterRow(MAIL_OWNER, { role: "owner" }), { added: false }),
    { merge: true },
  ),
);
await check("an owner retiring themselves", false, () =>
  updateDoc(doc(member(UID_OWNER, MAIL_OWNER), "admins", MAIL_OWNER), {
    active: false,
    updated_at: serverTimestamp(),
  }),
);
// A RETIRED ORGANISER IS NOT AN ORGANISER. The row is still there — that is the point of
// retiring rather than deleting — so before the active flag was read in the rules, this
// person kept every permission and only lost the buttons.
await check("a retired organiser listing the membership", false, () =>
  getDocs(collection(member(UID_RETIRED, MAIL_RETIRED), "users")),
);
await check("a retired organiser reading the roster", false, () =>
  getDocs(collection(member(UID_RETIRED, MAIL_RETIRED), "admins")),
);
await check("a retired organiser reading their own row", true, () =>
  getDoc(doc(member(UID_RETIRED, MAIL_RETIRED), "admins", MAIL_RETIRED)),
);

const badRow = (over) => () =>
  setDoc(
    doc(member(UID_OWNER, MAIL_OWNER), "admins", "newbie@sst.scaler.com"),
    withRoster(rosterRow("newbie@sst.scaler.com", over)),
  );
// The two fields that decide access, and the two least safe to leave unchecked: a role
// spelled with a capital grants nothing, and an active flag written as a string reads as
// active forever.
await check("a role outside the closed set", false, badRow({ role: "Owner" }));
await check("an active flag written as a string", false, badRow({ active: "true" }));
await check("a group outside the closed set", false, badRow({ group: "founder" }));
await check("an extra field on a roster row", false, badRow({ can_deploy: true }));
// A row cannot grant access to one address while describing another — the id is what
// isAdmin() looks up, and it lowercases before looking.
await check("a row whose email disagrees with its id", false, badRow({ email: MAIL_A }));
await check("appointing somebody who could never sign in", false, () =>
  setDoc(
    doc(member(UID_OWNER, MAIL_OWNER), "admins", "friend@gmail.com"),
    withRoster(rosterRow("friend@gmail.com")),
  ),
);
// Same lesson the profile learned: a full overwrite that simply leaves the date out
// erases when somebody was appointed.
await check("overwriting a row without its appointment date", false, () =>
  setDoc(
    doc(member(UID_OWNER, MAIL_OWNER), "admins", MAIL_APPOINTEE),
    withRoster(rosterRow(MAIL_APPOINTEE), { added: false }),
  ),
);
await check("an owner deleting a roster row", false, () =>
  deleteDoc(doc(member(UID_OWNER, MAIL_OWNER), "admins", MAIL_APPOINTEE)),
);

console.log("\n-- mentors: published by organisers, read by everyone --");
// The one collection a client may write that is not its own row. Everything below is
// about keeping that widening exactly as wide as it was meant to be.
const MENTOR_1 = "mentor-priya";
const MENTOR_2 = "mentor-arjun";
await check("an admin publishing a mentor", true, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "mentors", MENTOR_1), withStamps(mentorFor())),
);
await check("an admin publishing a second mentor", true, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "mentors", MENTOR_2),
    withStamps(mentorFor({ name: "Arjun Rao", org: "Kubernetes" })),
  ),
);
await check("an admin editing a mentor", true, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "mentors", MENTOR_1),
    withStamps(mentorFor({ active: false }), { created: false }),
    { merge: true },
  ),
);
await check("a member reading the mentor list", true, () =>
  getDocs(collection(member(UID_A, MAIL_A), "mentors")),
);
// THE WIDENING, TESTED AT ITS EDGE. A member may read every mentor and write none.
await check("a member publishing a mentor", false, () =>
  setDoc(doc(member(UID_A, MAIL_A), "mentors", "mentor-self"), withStamps(mentorFor())),
);
await check("a member editing a published mentor", false, () =>
  setDoc(
    doc(member(UID_A, MAIL_A), "mentors", MENTOR_1),
    withStamps(mentorFor({ name: "Me Actually" }), { created: false }),
    { merge: true },
  ),
);
await check("a member deleting a mentor", false, () =>
  deleteDoc(doc(member(UID_A, MAIL_A), "mentors", MENTOR_1)),
);
await check("an anonymous visitor reading the mentor list", false, () =>
  getDocs(collection(env.unauthenticatedContext().firestore(), "mentors")),
);
const badMentor = (over) => () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "mentors", "mentor-bad"), withStamps(mentorFor(over)));
await check("a mentor with a programme outside the closed set", false, badMentor({ programme: "nasa" }));
await check("a mentor with no description", false, badMentor({ description: "" }));
await check("a mentor description past 600 characters", false, badMentor({ description: "x".repeat(601) }));
await check("a mentor with an extra field", false, badMentor({ capacity: 5 }));
// active is a bool, not a truthy string. Worth a case because "false" is the value a
// hand-written console edit produces, and it would render as visible.
await check("a mentor whose active flag is a string", false, badMentor({ active: "false" }));

console.log("\n-- enrollments: a member's own preferences --");
// Re-enable MENTOR_1 first; it was hidden two cases above and a hidden mentor is still a
// legal choice as far as the rules are concerned (the client filters the picker).
await check("an admin re-showing a mentor", true, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "mentors", MENTOR_1),
    withStamps(mentorFor({ active: true }), { created: false }),
    { merge: true },
  ),
);
await check("enrol with a first preference only", true, () =>
  setDoc(
    doc(member(UID_A, MAIL_A), "enrollments", UID_A),
    withStamps(enrollmentFor(UID_A, MAIL_A, { mentor_1: MENTOR_1, first_only: true })),
  ),
);
await check("enrol with two preferences", true, () =>
  setDoc(
    doc(member(UID_B, MAIL_B), "enrollments", UID_B),
    withStamps(
      enrollmentFor(UID_B, MAIL_B, {
        mentor_1: MENTOR_1,
        mentor_2: MENTOR_2,
        first_only: false,
      }),
    ),
  ),
);
await check("read your own enrollment", true, () =>
  getDoc(doc(member(UID_A, MAIL_A), "enrollments", UID_A)),
);
await check("change your own preferences", true, () =>
  setDoc(
    doc(member(UID_A, MAIL_A), "enrollments", UID_A),
    withStamps(
      enrollmentFor(UID_A, MAIL_A, { mentor_1: MENTOR_2, first_only: true }),
      { created: false },
    ),
    { merge: true },
  ),
);
// WITHDRAWING IS ALLOWED, and this is the one place the enrollment rules deliberately
// differ from the profile rules. See the note on ENROLLMENTS in web/lib/firebase.ts.
await check("withdraw your own enrollment", true, () =>
  deleteDoc(doc(member(UID_A, MAIL_A), "enrollments", UID_A)),
);

console.log("\n-- enrollments: the pairing, in both directions --");
const badEnrollment = (over) => () =>
  setDoc(
    doc(member(UID_A, MAIL_A), "enrollments", UID_A),
    withStamps(enrollmentFor(UID_A, MAIL_A, { mentor_1: MENTOR_1, ...over })),
  );
// THE TWO CASES THE PAIRING EXISTS FOR. Without the first, a member can claim to want
// only their first choice while storing a second; without the second, "no second
// preference" can be saved by omission, so a member who has not decided and a member who
// has decided become indistinguishable in the organisers' list.
await check("'first preference only' carrying a second preference", false,
  badEnrollment({ first_only: true, mentor_2: MENTOR_2 }));
await check("no second preference and no first_only flag", false,
  badEnrollment({ first_only: false }));
await check("the same mentor as both preferences", false,
  badEnrollment({ first_only: false, mentor_2: MENTOR_1 }));
await check("a first preference that is not a real mentor", false,
  badEnrollment({ mentor_1: "mentor-does-not-exist", first_only: true }));
await check("a second preference that is not a real mentor", false,
  badEnrollment({ first_only: false, mentor_2: "mentor-does-not-exist" }));
await check("a programme outside the closed set", false,
  badEnrollment({ programme: "nasa", first_only: true }));
await check("an extra field on an enrollment", false,
  badEnrollment({ first_only: true, confirmed_mentor: MENTOR_1 }));

console.log("\n-- enrollments: one member against another --");
await check("reading somebody else's enrollment", false, () =>
  getDoc(doc(member(UID_A, MAIL_A), "enrollments", UID_B)),
);
await check("writing somebody else's enrollment", false, () =>
  setDoc(
    doc(member(UID_A, MAIL_A), "enrollments", UID_B),
    withStamps(enrollmentFor(UID_B, MAIL_B, { mentor_1: MENTOR_1, first_only: true })),
  ),
);
await check("claiming another address on your own enrollment", false, () =>
  setDoc(
    doc(member(UID_A, MAIL_A), "enrollments", UID_A),
    withStamps(enrollmentFor(UID_A, MAIL_B, { mentor_1: MENTOR_1, first_only: true })),
  ),
);
await check("listing every enrollment as a member", false, () =>
  getDocs(collection(member(UID_A, MAIL_A), "enrollments")),
);
await check("an admin listing every enrollment", true, () =>
  getDocs(collection(member(UID_ADMIN, MAIL_ADMIN), "enrollments")),
);
await check("an admin reading one enrollment", true, () =>
  getDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "enrollments", UID_B)),
);
// An organiser cannot quietly reassign somebody, for the same reason they cannot edit a
// profile: the pairing is a conversation, and a silent overwrite is not one.
await check("an admin editing somebody's preferences", false, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "enrollments", UID_B),
    withStamps(
      enrollmentFor(UID_B, MAIL_B, { mentor_1: MENTOR_2, first_only: true }),
      { created: false },
    ),
    { merge: true },
  ),
);
await check("an admin withdrawing somebody's enrollment", false, () =>
  deleteDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "enrollments", UID_B)),
);

console.log("\n-- the notice board --");
/** Strip the audience back off a fixture, to model a document written before the field
 *  existed. Those are refused to ordinary readers by design — see canSeeAudience() in
 *  firestore.rules — so the cases that use this are asserting that refusal. */
const withoutAudience = (d) => {
  const { audience, ...rest } = d;
  return rest;
};

const postFor = (over = {}) => ({
  title: "No session this Saturday",
  body: "Lab 2 is taken for the hackathon. We are back the week after.",
  pinned: false,
  author_email: MAIL_ADMIN,
  // Every document the composers write now carries one; the fixtures match.
  audience: "both",
  ...over,
});
const POST_1 = "post-no-session";

await check("an admin posting a notice", true, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", POST_1), withStamps(postFor())),
);
// A READER MUST SAY WHICH AUDIENCES THEY ARE ASKING FOR. An unconstrained read of this
// collection is refused for anybody but an organiser — not because of what is in it,
// but because a list rule is judged against the query, and nothing in an unfiltered one
// proves the reader may see whatever turns up next. The pair of cases below is the
// contract every panel in web/lib is written to.
await check("a member reading the board unfiltered", false, () =>
  getDocs(collection(member(UID_A, MAIL_A), "announcements")),
);
await check("a member reading the board, audiences named", true, () =>
  getDocs(query(
    collection(member(UID_A, MAIL_A), "announcements"),
    where("audience", "in", ["both", "students"]),
  )),
);
await check("an anonymous visitor reading the board", false, () =>
  getDocs(collection(env.unauthenticatedContext().firestore(), "announcements")),
);
await check("a member posting a notice", false, () =>
  setDoc(doc(member(UID_A, MAIL_A), "announcements", "post-mine"), withStamps(postFor({ author_email: MAIL_A }))),
);
await check("a retired organiser posting a notice", false, () =>
  setDoc(
    doc(member(UID_RETIRED, MAIL_RETIRED), "announcements", "post-ghost"),
    withStamps(postFor({ author_email: MAIL_RETIRED })),
  ),
);
// PINNED ON CREATE, FROZEN ON EDIT — two different rules, and the pair is the point. The
// first stops an admin signing somebody else's name to a new notice; the second stops the
// next admin to press "pin" quietly signing theirs to an existing one.
await check("posting under somebody else's byline", false, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", "post-forged"),
    withStamps(postFor({ author_email: MAIL_OWNER })),
  ),
);
await check("another organiser pinning that notice", true, () =>
  setDoc(
    doc(member(UID_OWNER, MAIL_OWNER), "announcements", POST_1),
    withStamps(postFor({ pinned: true }), { created: false }),
    { merge: true },
  ),
);
await check("rewriting the byline on an edit", false, () =>
  setDoc(
    doc(member(UID_OWNER, MAIL_OWNER), "announcements", POST_1),
    withStamps(postFor({ author_email: MAIL_OWNER }), { created: false }),
    { merge: true },
  ),
);
await check("archiving a notice", true, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", POST_1),
    withStamps(postFor({ pinned: true, archived: true }), { created: false }),
    { merge: true },
  ),
);

const badPost = (over) => () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", "post-bad"), withStamps(postFor(over)));
// THE LINK, WHICH IS THE ONE FIELD WITH A HOLE IN IT. Free text an organiser types,
// rendered as a link every member can click.
await check("a notice linking to https", true, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", "post-linked"),
    withStamps(postFor({ link: "https://github.com/orgs/scaler/discussions/12" })),
  ),
);
await check("a notice with a javascript: link", false, badPost({ link: "javascript:alert(1)" }));
await check("a notice with a plain http link", false, badPost({ link: "http://example.com" }));
await check("a notice with a data: link", false, badPost({ link: "data:text/html,<script>1</script>" }));
await check("a category outside the closed set", false, badPost({ category: "urgent" }));
await check("a notice with no body", false, badPost({ body: "" }));
await check("a notice with an extra field", false, badPost({ audience: "first-years" }));
await check("a pinned flag written as a string", false, badPost({ pinned: "true" }));
await check("a client-forged timestamp on a notice", false, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", "post-backdated"), postFor()),
);
// THE FULL-OVERWRITE CASE, which is what setFlags() actually does when somebody presses
// "pin": it sends the whole document, not one field. A version of it that forgot to put
// created_at back would wipe the posting date of every notice anybody ever pinned, and
// nothing on screen would say so — the notice would simply lose its date. Same lesson the
// profile rules learned once already, in the same shape.
await check("overwriting a notice without its posting date", false, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", POST_1),
    withStamps(postFor({ pinned: true }), { created: false }),
  ),
);
await check("a member deleting a notice", false, () =>
  deleteDoc(doc(member(UID_A, MAIL_A), "announcements", POST_1)),
);
await check("an admin deleting a notice", true, () =>
  deleteDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", POST_1)),
);

console.log("\n-- sessions --");
const sessionFor = (over = {}) => ({
  title: "Your first pull request",
  speaker: "Priya Nair",
  location: "Lab 2",
  starts_at: new Date(2027, 9, 24, 18, 0),
  created_by: MAIL_ADMIN,
  // Every document the composers write now carries one; the fixtures match.
  audience: "both",
  ...over,
});
const SESSION_1 = "session-first-pr";

await check("an admin scheduling a session", true, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "sessions", SESSION_1), withStamps(sessionFor())),
);
// A READER MUST SAY WHICH AUDIENCES THEY ARE ASKING FOR. An unconstrained read of this
// collection is refused for anybody but an organiser — not because of what is in it,
// but because a list rule is judged against the query, and nothing in an unfiltered one
// proves the reader may see whatever turns up next. The pair of cases below is the
// contract every panel in web/lib is written to.
await check("a member reading the schedule unfiltered", false, () =>
  getDocs(collection(member(UID_A, MAIL_A), "sessions")),
);
await check("a member reading the schedule, audiences named", true, () =>
  getDocs(query(
    collection(member(UID_A, MAIL_A), "sessions"),
    where("audience", "in", ["both", "students"]),
  )),
);
await check("a member scheduling a session", false, () =>
  setDoc(doc(member(UID_A, MAIL_A), "sessions", "session-mine"), withStamps(sessionFor({ created_by: MAIL_A }))),
);
await check("an admin moving a session", true, () =>
  setDoc(
    doc(member(UID_OWNER, MAIL_OWNER), "sessions", SESSION_1),
    withStamps(sessionFor({ location: "Lab 4" }), { created: false }),
    { merge: true },
  ),
);
await check("claiming somebody else's session on an edit", false, () =>
  setDoc(
    doc(member(UID_OWNER, MAIL_OWNER), "sessions", SESSION_1),
    withStamps(sessionFor({ created_by: MAIL_OWNER }), { created: false }),
    { merge: true },
  ),
);
// THE ONE CLIENT-CHOSEN DATE IN THE FILE. It is still a DATE — a session whose time is
// prose is a session nothing can sort or filter, which is the failure that made these
// stop being pinned notices in the first place.
await check("a start time that is a string", false, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "sessions", "session-bad"),
    withStamps(sessionFor({ starts_at: "Saturday, 4pm" })),
  ),
);
await check("a session with an extra field", false, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "sessions", "session-bad"),
    withStamps(sessionFor({ capacity: 40 })),
  ),
);
await check("moving a session without its scheduling date", false, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "sessions", SESSION_1),
    withStamps(sessionFor({ location: "Lab 5" }), { created: false }),
  ),
);
await check("a member cancelling a session", false, () =>
  deleteDoc(doc(member(UID_A, MAIL_A), "sessions", SESSION_1)),
);
await check("an admin cancelling a session", true, () =>
  deleteDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "sessions", SESSION_1)),
);

console.log("\n-- forms and polls --");
const FIELDS = [
  { id: "name-0", label: "Your name", type: "short", required: true },
  { id: "saturday-1", label: "Which Saturday?", type: "choice", options: ["11th", "18th"] },
];
const formFor = (over = {}) => ({
  title: "Session sign-up",
  fields: FIELDS,
  field_ids: FIELDS.map((f) => f.id),
  open: true,
  show_tally: false,
  author_email: MAIL_ADMIN,
  // Every document the composers write now carries one; the fixtures match.
  audience: "both",
  ...over,
});
const FORM_1 = "form-signup";
const FORM_CLOSED = "form-closed";
const FORM_POLL = "form-poll";

await check("an admin publishing a form", true, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "forms", FORM_1), withStamps(formFor())),
);
// A READER MUST SAY WHICH AUDIENCES THEY ARE ASKING FOR. An unconstrained read of this
// collection is refused for anybody but an organiser — not because of what is in it,
// but because a list rule is judged against the query, and nothing in an unfiltered one
// proves the reader may see whatever turns up next. The pair of cases below is the
// contract every panel in web/lib is written to.
await check("a member reading the forms unfiltered", false, () =>
  getDocs(collection(member(UID_A, MAIL_A), "forms")),
);
await check("a member reading the forms, audiences named", true, () =>
  getDocs(query(
    collection(member(UID_A, MAIL_A), "forms"),
    where("audience", "in", ["both", "students"]),
  )),
);
await check("a member publishing a form", false, () =>
  setDoc(doc(member(UID_A, MAIL_A), "forms", "form-mine"), withStamps(formFor({ author_email: MAIL_A }))),
);
// THE MIRROR, WHICH IS THE ONLY THING KEEPING ANSWER KEYS HONEST. Rules cannot iterate a
// list of maps, so if the flat id list stops matching the questions there is no other way
// to express "answers may only use keys this form asked about".
await check("a form whose id mirror is short", false, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "forms", "form-bad"),
    withStamps(formFor({ field_ids: ["name-0"] })),
  ),
);
await check("a form with no questions", false, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "forms", "form-bad"),
    withStamps(formFor({ fields: [], field_ids: [] })),
  ),
);
// A COUNT THE CLIENT SUPPLIES IS A COUNT THE CLIENT INVENTED.
await check("publishing a form with a tally already in it", false, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "forms", "form-bad"),
    withStamps(formFor({ tally: { "saturday-1": { "11th": 99 } } })),
  ),
);

// A poll the Cloud Function has already counted. Seeded with rules disabled because that
// is exactly how it arrives in production — the Admin SDK does not pass through the rules.
const TALLY = { "saturday-1": { "11th": 3, "18th": 1 } };
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  const { doc: d2, setDoc: s2, serverTimestamp: t2 } = await import("firebase/firestore");
  await s2(d2(db, "forms", FORM_POLL), {
    ...formFor({ show_tally: true, title: "Which Saturday suits you?" }),
    tally: TALLY,
    created_at: t2(),
    updated_at: t2(),
  });
});
// FIXING A TYPO IN A POLL THAT ALREADY HAS VOTES. This is the case the rules have to get
// right and the one that is easy to get wrong in either direction: refuse the write and
// the question can never be corrected, allow a changed tally and the counts are fiction.
await check("editing a poll and carrying its counts back unchanged", true, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "forms", FORM_POLL),
    withStamps(
      formFor({ show_tally: true, title: "Which Saturday suits you best?", tally: TALLY }),
      { created: false },
    ),
    { merge: true },
  ),
);
await check("editing a poll and adjusting its counts", false, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "forms", FORM_POLL),
    withStamps(
      formFor({ show_tally: true, tally: { "saturday-1": { "11th": 99, "18th": 1 } } }),
      { created: false },
    ),
    { merge: true },
  ),
);

await check("editing a form without its publication date", false, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "forms", FORM_1),
    withStamps(formFor({ title: "Session sign-up (revised)" }), { created: false }),
  ),
);

console.log("\n-- responses: attributed, and readable by nobody else --");
const responseFor = (uid, email, over = {}) => ({
  uid,
  email,
  name: "Asha Verma",
  answers: { "name-0": "Asha Verma", "saturday-1": "11th" },
  ...over,
});
// submitted_at is deliberately not frozen, so the helper stamps updated_at alone.
const withAnswer = (d) => ({ ...d, submitted_at: serverTimestamp(), updated_at: serverTimestamp() });

await check("a member answering a form", true, () =>
  setDoc(
    doc(member(UID_A, MAIL_A), "forms", FORM_1, "responses", UID_A),
    withAnswer(responseFor(UID_A, MAIL_A)),
  ),
);
await check("a member changing their own answer", true, () =>
  setDoc(
    doc(member(UID_A, MAIL_A), "forms", FORM_1, "responses", UID_A),
    withAnswer(responseFor(UID_A, MAIL_A, { answers: { "name-0": "Asha V", "saturday-1": "18th" } })),
    { merge: true },
  ),
);
await check("a second member answering the same form", true, () =>
  setDoc(
    doc(member(UID_B, MAIL_B), "forms", FORM_1, "responses", UID_B),
    withAnswer(responseFor(UID_B, MAIL_B, { name: "Ravi Kumar" })),
  ),
);
await check("reading your own answer", true, () =>
  getDoc(doc(member(UID_A, MAIL_A), "forms", FORM_1, "responses", UID_A)),
);
// THE RULE THAT KEEPS THIS A FORM SYSTEM RATHER THAN A PUBLIC ONE. Answers are
// attributed on purpose — somebody has to chase the people who did not sign up — and that
// is only safe while no member can read another's.
await check("reading somebody else's answer", false, () =>
  getDoc(doc(member(UID_B, MAIL_B), "forms", FORM_1, "responses", UID_A)),
);
await check("listing the answers as a member", false, () =>
  getDocs(collection(member(UID_A, MAIL_A), "forms", FORM_1, "responses")),
);
await check("listing the answers as an admin", true, () =>
  getDocs(collection(member(UID_ADMIN, MAIL_ADMIN), "forms", FORM_1, "responses")),
);
await check("an admin reading one answer", true, () =>
  getDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "forms", FORM_1, "responses", UID_A)),
);
await check("answering as somebody else", false, () =>
  setDoc(
    doc(member(UID_B, MAIL_B), "forms", FORM_1, "responses", UID_A),
    withAnswer(responseFor(UID_A, MAIL_A)),
  ),
);
await check("claiming another address on your own answer", false, () =>
  setDoc(
    doc(member(UID_B, MAIL_B), "forms", FORM_1, "responses", UID_B),
    withAnswer(responseFor(UID_B, MAIL_A)),
  ),
);
// ANSWER KEYS ARE PINNED TO THE FORM'S OWN QUESTIONS. Without this a member can append
// whatever they like to a document the organisers later export to a spreadsheet.
await check("an answer to a question the form never asked", false, () =>
  setDoc(
    doc(member(UID_B, MAIL_B), "forms", FORM_1, "responses", UID_B),
    withAnswer(responseFor(UID_B, MAIL_B, { answers: { "name-0": "Ravi", "salary-9": "lots" } })),
  ),
);
await check("an extra field on a response", false, () =>
  setDoc(
    doc(member(UID_B, MAIL_B), "forms", FORM_1, "responses", UID_B),
    withAnswer(responseFor(UID_B, MAIL_B, { verified: true })),
  ),
);
await check("an admin answering on somebody's behalf", false, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "forms", FORM_1, "responses", UID_A),
    withAnswer(responseFor(UID_A, MAIL_A)),
  ),
);
await check("withdrawing your own answer", false, () =>
  deleteDoc(doc(member(UID_A, MAIL_A), "forms", FORM_1, "responses", UID_A)),
);
await check("answering a form that does not exist", false, () =>
  setDoc(
    doc(member(UID_A, MAIL_A), "forms", "form-imaginary", "responses", UID_A),
    withAnswer(responseFor(UID_A, MAIL_A)),
  ),
);

// CLOSING A FORM IS THE ONLY THING AN ORGANISER HAS to stop a sign-up once the room is
// full, so it has to hold in the rules and not just in a hidden button.
await check("an admin closing a form", true, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "forms", FORM_CLOSED),
    withStamps(formFor({ open: false, title: "Last term's sign-up" })),
  ),
);
await check("answering a closed form", false, () =>
  setDoc(
    doc(member(UID_A, MAIL_A), "forms", FORM_CLOSED, "responses", UID_A),
    withAnswer(responseFor(UID_A, MAIL_A)),
  ),
);
await check("reading a closed form", true, () =>
  getDoc(doc(member(UID_A, MAIL_A), "forms", FORM_CLOSED)),
);

console.log("\n-- contributions: read by two people, written by none --");
await check("reading your own contributions", true, () =>
  getDoc(doc(member(UID_A, MAIL_A), "contributions", UID_A)),
);
await check("reading somebody else's contributions", false, () =>
  getDoc(doc(member(UID_B, MAIL_B), "contributions", UID_A)),
);
await check("an admin reading a member's contributions", true, () =>
  getDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "contributions", UID_A)),
);
// THE WHOLE POINT OF THE COLLECTION. "Merged pull requests" is the one number on this
// dashboard somebody has a reason to inflate, and the counts arrive through a Cloud
// Function using the Admin SDK — which never passes through this file.
await check("inflating your own merged count", false, () =>
  setDoc(doc(member(UID_A, MAIL_A), "contributions", UID_A), {
    uid: UID_A,
    github: "asha",
    merged: 400,
    open: 0,
    repos: 40,
    recent: [],
  }),
);
await check("an admin writing a member's counts", false, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "contributions", UID_A), { merged: 0 }),
);
await check("an owner writing a member's counts", false, () =>
  setDoc(doc(member(UID_OWNER, MAIL_OWNER), "contributions", UID_A), { merged: 0 }),
);
await check("a member listing everybody's contributions", false, () =>
  getDocs(collection(member(UID_A, MAIL_A), "contributions")),
);

console.log("\n-- applications: a stranger's front door, write-only --");
// THE ONLY UNAUTHENTICATED WRITE IN THE FILE. Everything else here is about keeping people
// out of each other's rows; this one is about letting somebody with no account in at all,
// because a club whose apply form needs a college Google account has locked its front door
// with the key you get by walking through it.
//
// A merge once denied this create while /join still rendered the form that writes to it,
// so every application was refused with nothing on screen to say so. That is the failure
// this block exists to make loud.
const stranger = () => env.unauthenticatedContext().firestore();
const applicationFor = (over = {}) => ({
  name: "Meera Iyer",
  // NOT a college address, deliberately: somebody applying from a personal one is an
  // applicant to talk to, not a forgery to reject.
  email: "meera.iyer@gmail.com",
  year_branch: "1st year, CSE",
  hostel: "uniworld-1",
  level: "beginner",
  path: "first-contribution",
  programs: ["gsoc"],
  github: "meera",
  ...over,
});
const withSubmitted = (d) => ({ ...d, submitted_at: serverTimestamp() });

await check("a stranger applying", true, () =>
  setDoc(doc(stranger(), "applications", "app-1"), withSubmitted(applicationFor())),
);
await check("a stranger applying with no github", true, () => {
  const d = applicationFor();
  delete d.github;
  return setDoc(doc(stranger(), "applications", "app-2"), withSubmitted(d));
});
await check("a signed-in member applying", true, () =>
  setDoc(doc(member(UID_A, MAIL_A), "applications", "app-3"), withSubmitted(applicationFor())),
);
await check("applying with Other ticked and explained", true, () =>
  setDoc(
    doc(stranger(), "applications", "app-4"),
    withSubmitted(applicationFor({ programs: ["gsoc", "other"], programs_other: "Zephyr" })),
  ),
);

// READ STAYS SHUT TO EVERYBODY, admins included. These rows hold names and addresses
// belonging to people who are not members yet and never agreed to appear in anything.
await check("an admin reading an application", false, () =>
  getDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "applications", "app-1")),
);
await check("an owner reading an application", false, () =>
  getDoc(doc(member(UID_OWNER, MAIL_OWNER), "applications", "app-1")),
);
await check("a stranger reading back their own application", false, () =>
  getDoc(doc(stranger(), "applications", "app-1")),
);
await check("listing the applications as an admin", false, () =>
  getDocs(collection(member(UID_ADMIN, MAIL_ADMIN), "applications")),
);
await check("reading a legacy application as an admin", false, () =>
  getDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "applications", "legacy-1")),
);
await check("editing an application after sending it", false, () =>
  setDoc(doc(stranger(), "applications", "app-1"), withSubmitted(applicationFor({ name: "Someone Else" }))),
);
await check("deleting an application", false, () =>
  deleteDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "applications", "app-1")),
);

// VALIDATION IS THE WHOLE BOUNDARY HERE. There is no uid to compare and no verified
// address — every field was typed by somebody the club has never met, so the shape check
// is the only thing standing between the collection and whatever a script feels like
// sending.
const badApplication = (over) => () =>
  setDoc(doc(stranger(), "applications", "app-bad"), withSubmitted(applicationFor(over)));
await check("an application with an extra field", false, badApplication({ admin: true }));
await check("an application with no name", false, badApplication({ name: "" }));
await check("an application with a malformed email", false, badApplication({ email: "not-an-email" }));
await check("an application with no year or branch", false, badApplication({ year_branch: "" }));
// THE SET THAT HAD ALREADY DRIFTED. The rule recovered from git accepted none/some-git/
// merged; the form has offered beginner/intermediate since upstream changed it. Deployed
// unexamined, it would have refused every real application while looking correct.
await check("the level the form actually sends", true, () =>
  setDoc(
    doc(stranger(), "applications", "app-level"),
    withSubmitted(applicationFor({ level: "intermediate" })),
  ),
);
await check("a level from the rule's previous vocabulary", false, badApplication({ level: "some-git" }));
await check("a hostel outside the closed set", false, badApplication({ hostel: "uniworld-9" }));
await check("a path outside the closed set", false, badApplication({ path: "hackathon" }));
await check("an application with no programmes ticked", false, badApplication({ programs: [] }));
await check("a programme outside the closed set", false, badApplication({ programs: ["nasa"] }));
// The pairing, in both directions — the same shape as the mentorship one.
await check("Other ticked with nothing to explain it", false, badApplication({ programs: ["other"] }));
await check("an explanation with Other not ticked", false,
  badApplication({ programs: ["gsoc"], programs_other: "Zephyr" }));
await check("a client-forged submission time", false, () =>
  setDoc(doc(stranger(), "applications", "app-backdated"), {
    ...applicationFor(),
    submitted_at: new Date(2000, 0, 1),
  }),
);
await check("an application with no submission time at all", false, () =>
  setDoc(doc(stranger(), "applications", "app-nostamp"), applicationFor()),
);
// The floor: a stranger has exactly one door, and it is this one.
await check("a stranger writing anywhere else", false, () =>
  setDoc(doc(stranger(), "announcements", "post-anon"), withStamps(postFor())),
);

// ---------------------------------------------------------------------------
console.log("\n-- membership: a student is not a member --");

// THE BUG THIS WHOLE SECTION EXISTS TO CATCH. `isStudent()` and `isClubMember()` look
// alike, read alike, and were the same function until an audience picker needed them not
// to be. Every case below fails loudly if they are ever re-merged.
//
// UID_A is seeded as a member; UID_B never is, and is the control that every "members
// only" case is measured against.
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  const { doc, setDoc } = await import("firebase/firestore");
  // Seeded past the rules because the only legitimate way to set `membership` is an
  // admin write, and that path is itself under test further down.
  await setDoc(doc(db, "users", UID_A), {
    uid: UID_A, email: MAIL_A, name: "Asha Verma", hostel: "uniworld-1",
    membership: "member", membership_by: MAIL_ADMIN,
    created_at: serverTimestamp(), updated_at: serverTimestamp(),
  });
  // created_at IS NOT OPTIONAL IN THIS FIXTURE. immutablesUnchanged() compares it
  // across the write, and reading a field that is not there raises rather than
  // returning null — which denies the member's own entirely legal name edit and looks
  // like a membership bug. Every real profile has one; the fixture must too.
  await setDoc(doc(db, "users", UID_B), {
    uid: UID_B, email: MAIL_B, name: "Ravi Kumar", hostel: "uniworld-2",
    created_at: serverTimestamp(), updated_at: serverTimestamp(),
  });
  // One notice per audience, plus one with no audience field at all — the shape every
  // notice written before this feature carries.
  await setDoc(doc(db, "announcements", "post-members"), { ...postFor(), audience: "members" });
  await setDoc(doc(db, "announcements", "post-students"), { ...postFor(), audience: "students" });
  await setDoc(doc(db, "announcements", "post-both"), { ...postFor(), audience: "both" });
  await setDoc(doc(db, "announcements", "post-legacy"), withoutAudience(postFor()));
  await setDoc(doc(db, "forms", "form-members"), { ...formFor(), audience: "members", open: true });
  // No audience field: the shape of a form written before this feature.
  await setDoc(doc(db, "forms", "form-legacy"), withoutAudience({ ...formFor(), open: true }));
});

// The heart of it: one document, two students, two different answers.
await check("a club member reads a members-only notice", true, () =>
  getDoc(doc(member(UID_A, MAIL_A), "announcements", "post-members")),
);
await check("a non-member reads a members-only notice", false, () =>
  getDoc(doc(member(UID_B, MAIL_B), "announcements", "post-members")),
);
await check("a non-member reads a students-only notice", true, () =>
  getDoc(doc(member(UID_B, MAIL_B), "announcements", "post-students")),
);
// The case that looks like a mistake and is the entire reason for a third audience:
// recruitment copy is withheld from the people who have already joined.
await check("a club member reads a students-only notice", false, () =>
  getDoc(doc(member(UID_A, MAIL_A), "announcements", "post-students")),
);
await check("everyone reads a notice addressed to both", true, () =>
  getDoc(doc(member(UID_B, MAIL_B), "announcements", "post-both")),
);
// A NOTICE WITH NO AUDIENCE IS REFUSED TO MEMBERS, AND THAT IS THE CHOSEN BEHAVIOUR.
// The tolerant alternative — defaulting an absent audience to "everyone" — cannot be
// expressed in a read rule without also disabling enforcement on every list; see the
// note on canSeeAudience() in firestore.rules. It costs nothing real, because such a
// document is already unreachable through the where() clause every reader carries, and
// AudienceBackfill.tsx surfaces them on the organisers' page until they are stamped.
await check("a notice with no audience at all, read by a non-member", false, () =>
  getDoc(doc(member(UID_B, MAIL_B), "announcements", "post-legacy")),
);
// The people who can fix it can still see it.
await check("an organiser reads an unstamped notice", true, () =>
  getDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", "post-legacy")),
);
// And a form written before audiences existed still takes answers — the write-time
// check defaults where the read rule cannot.
await check("a non-member answers a form with no audience", true, () =>
  setDoc(
    doc(member(UID_B, MAIL_B), "forms", "form-legacy", "responses", UID_B),
    withAnswer(responseFor(UID_B, MAIL_B)),
  ),
);
// THE ORGANISER PANELS DEPEND ON THIS ONE. Composer, Sessions and FormBuilder all read
// their collection unfiltered, which is only allowed because isAdmin() does not depend
// on the document being read — so the prover can satisfy the rule for any row the query
// might return. If this ever fails, every admin screen goes blank at once, and the fix
// is to give those reads an audience clause rather than to loosen the rule.
await check("an organiser listing the whole board unfiltered", true, () =>
  getDocs(collection(member(UID_ADMIN, MAIL_ADMIN), "announcements")),
);
await check("an organiser listing every form unfiltered", true, () =>
  getDocs(collection(member(UID_ADMIN, MAIL_ADMIN), "forms")),
);
await check("an organiser listing every session unfiltered", true, () =>
  getDocs(collection(member(UID_ADMIN, MAIL_ADMIN), "sessions")),
);
await check("an organiser reads every audience", true, () =>
  getDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", "post-students")),
);

// A LIST THAT REACHES FURTHER THAN THE READER MAY SEE FAILS ENTIRELY. Every reader in
// web/lib is written around this: the where() clause is not a filter, it is what makes
// the read succeed at all. If this case ever starts passing, Firestore has changed its
// semantics and those clauses could be reconsidered — until then they are load-bearing.
await check("a non-member listing the whole board", false, () =>
  getDocs(query(collection(member(UID_B, MAIL_B), "announcements"))),
);
await check("a non-member listing only what they may see", true, () =>
  getDocs(query(
    collection(member(UID_B, MAIL_B), "announcements"),
    where("audience", "in", ["both", "students"]),
  )),
);
await check("a club member listing only what they may see", true, () =>
  getDocs(query(
    collection(member(UID_A, MAIL_A), "announcements"),
    where("audience", "in", ["both", "members"]),
  )),
);

// The back door. Reading a form and answering it are separate requests against separate
// paths, so a read gate is not automatically a write gate.
await check("a non-member answering a members-only form", false, () =>
  setDoc(
    doc(member(UID_B, MAIL_B), "forms", "form-members", "responses", UID_B),
    withAnswer(responseFor(UID_B, MAIL_B)),
  ),
);

console.log("\n-- membership: who may grant it --");

// THE PRIVILEGE ESCALATION THIS MODEL LIVES OR DIES ON. Membership sits on a document
// its own subject owns and may otherwise edit freely.
await check("a student granting themselves membership", false, () =>
  updateDoc(doc(member(UID_B, MAIL_B), "users", UID_B), {
    membership: "member", membership_by: MAIL_B, membership_at: serverTimestamp(),
  }),
);
await check("a student slipping membership in alongside a real edit", false, () =>
  setDoc(doc(member(UID_B, MAIL_B), "users", UID_B), {
    uid: UID_B, email: MAIL_B, name: "Ravi Kumar", hostel: "uniworld-2",
    membership: "member", updated_at: serverTimestamp(),
  }),
);
await check("a student editing their own name, membership untouched", true, () =>
  setDoc(
    doc(member(UID_B, MAIL_B), "users", UID_B),
    { uid: UID_B, email: MAIL_B, name: "Ravi K", hostel: "uniworld-2", updated_at: serverTimestamp() },
    { merge: true },
  ),
);
await check("a new profile that claims membership on creation", false, () =>
  setDoc(doc(member(UID_C, MAIL_C), "users", UID_C), {
    uid: UID_C, email: MAIL_C, name: "New Student", hostel: "uniworld-1",
    membership: "member", updated_at: serverTimestamp(),
  }),
);
await check("a new profile with no membership claim", true, () =>
  setDoc(doc(member(UID_C, MAIL_C), "users", UID_C), {
    uid: UID_C, email: MAIL_C, name: "New Student", hostel: "uniworld-1",
    created_at: serverTimestamp(), updated_at: serverTimestamp(),
  }),
);

// The organiser's path, and its limits.
await check("an organiser admitting somebody to the club", true, () =>
  updateDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "users", UID_B), {
    membership: "member", membership_by: MAIL_ADMIN, membership_at: serverTimestamp(),
  }),
);
await check("an organiser removing somebody from the club", true, () =>
  updateDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "users", UID_B), {
    membership: "student", membership_by: MAIL_ADMIN, membership_at: serverTimestamp(),
  }),
);
// Stamped from the token, never the body: an organiser cannot sign somebody else's name
// to a membership decision.
await check("an organiser attributing the change to another organiser", false, () =>
  updateDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "users", UID_B), {
    membership: "member", membership_by: MAIL_OWNER, membership_at: serverTimestamp(),
  }),
);
await check("an organiser backdating a membership change", false, () =>
  updateDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "users", UID_B), {
    membership: "member", membership_by: MAIL_ADMIN, membership_at: new Date(2020, 0, 1),
  }),
);
// The narrowness of the admin path. It is for membership and nothing else — an organiser
// does not acquire edit rights over somebody's name by way of this rule.
await check("an organiser editing a member's name through the membership path", false, () =>
  updateDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "users", UID_B), {
    name: "Renamed By Admin", membership: "member",
    membership_by: MAIL_ADMIN, membership_at: serverTimestamp(),
  }),
);
await check("a retired organiser admitting somebody", false, () =>
  updateDoc(doc(member(UID_RETIRED, MAIL_RETIRED), "users", UID_B), {
    membership: "member", membership_by: MAIL_RETIRED, membership_at: serverTimestamp(),
  }),
);
await check("an ordinary student admitting somebody else", false, () =>
  updateDoc(doc(member(UID_A, MAIL_A), "users", UID_B), {
    membership: "member", membership_by: MAIL_A, membership_at: serverTimestamp(),
  }),
);
await check("an organiser writing an audience outside the closed set", false, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", "post-badaudience"),
    withStamps({ ...postFor(), audience: "everyone" })),
);


console.log("\n-- anything else --");
await check("writing to an unknown collection", false, () =>
  setDoc(doc(member(UID_A, MAIL_A), "secrets", "x"), { a: 1 }),
);

await env.cleanup();
console.log(
  fail === 0
    ? `\n  ${pass} passed. Members reach only their own row, admins read the roster, and nobody else gets in.\n`
    : `\n  ${pass} passed, ${fail} FAILED. Do not deploy these rules.\n`,
);
process.exit(fail === 0 ? 0 : 1);
