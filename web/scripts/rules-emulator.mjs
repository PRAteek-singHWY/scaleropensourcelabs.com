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

/** The shape the profile form writes. */
const profileFor = (uid, email, over = {}) => ({
  uid,
  email,
  name: "Asha Verma",
  year_branch: "2nd year, CSE",
  hostel: "uniworld-1",
  level: "some-git",
  path: "program-track",
  programs: ["gsoc", "outreachy"],
  interests: ["web"],
  github: "asha",
  why: "I want a first merged pull request that somebody real reviewed.",
  heard_from: "senior",
  updates: true,
  // NO created_at / updated_at HERE. They are added by withStamps() below, which uses
  // serverTimestamp(). Literal Dates in this base object made every edit case send a
  // forged created_at, so the rules refused them and two tests failed for a reason that
  // had nothing to do with what they were testing.
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

const UID_A = "uid-asha";
const MAIL_A = "asha@sst.scaler.com";
const UID_B = "uid-ravi";
const MAIL_B = "ravi@sst.scaler.com";
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
    withStamps(profileFor(UID_A, MAIL_A, { year_branch: "3rd year, CSE" }), { created: false }),
    { merge: true },
  ),
);
await check("create a profile with no github, interests or heard_from", true, () => {
  const d = profileFor("uid-min", "minimal@sst.scaler.com");
  delete d.github;
  delete d.interests;
  delete d.heard_from;
  return setDoc(
    doc(member("uid-min", "minimal@sst.scaler.com"), "users", "uid-min"),
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
await check("a level outside the closed set", false, badProfile({ level: "some" }));
await check("a path outside the closed set", false, badProfile({ path: "hackathon" }));
await check("a programme outside the known set", false, badProfile({ programs: ["nasa"] }));
await check("an empty programmes list", false, badProfile({ programs: [] }));
await check("'other' with nothing naming it", false, badProfile({ programs: ["other"] }));
await check("free text without 'other' ticked", false,
  badProfile({ programs: ["gsoc"], programs_other: "GSoC again" }));
await check("an interest outside the known set", false, badProfile({ interests: ["crypto"] }));
await check("a why over the 400-character limit", false, badProfile({ why: "x".repeat(401) }));
await check("an empty required field", false, badProfile({ name: "" }));
await check("an extra field the form never sends", false, badProfile({ isAdmin: true }));
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
