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
const UID_ADMIN = "uid-organiser";
const MAIL_ADMIN = "organiser@sst.scaler.com";

// Seed with rules disabled: the admins list is deliberately unwritable by every client,
// so there is no in-rules way to create it. This mirrors reality, where an organiser
// adds the document by hand in the Firebase console.
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(db, "admins", MAIL_ADMIN), { added_by: "console" });
  // A pre-existing legacy application, to prove those rows are still unreadable.
  await setDoc(doc(db, "applications", "legacy-1"), { name: "Old Applicant" });
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
await check("listing the admins", false, () =>
  getDocs(collection(member(UID_ADMIN, MAIL_ADMIN), "admins")),
);
// The one privilege escalation this model would otherwise allow.
await check("an admin appointing another admin", false, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "admins", MAIL_B), { added_by: UID_ADMIN }),
);
await check("a member appointing themselves admin", false, () =>
  setDoc(doc(member(UID_B, MAIL_B), "admins", MAIL_B), { added_by: "me" }),
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

console.log("\n-- legacy applications stay sealed --");
await check("reading a legacy application as an admin", false, () =>
  getDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "applications", "legacy-1")),
);
await check("writing a new application", false, () =>
  setDoc(doc(member(UID_A, MAIL_A), "applications", "new-1"), { name: "x" }),
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
