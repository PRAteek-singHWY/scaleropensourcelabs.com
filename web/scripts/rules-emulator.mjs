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
  github: "asha",
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
const UID_OWNER = "uid-owner";
const MAIL_OWNER = "priya@sst.scaler.com";
const UID_RETIRED = "uid-retired";
const MAIL_RETIRED = "rohan@sst.scaler.com";
const MAIL_NEW = "newlead@sst.scaler.com";

// Seed with rules disabled: the admins list is deliberately unwritable by every client,
// so there is no in-rules way to create it. This mirrors reality, where an organiser
// adds the document by hand in the Firebase console.
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  const { doc, setDoc } = await import("firebase/firestore");
  // DELIBERATELY THE OLD SHAPE -- no `role`, no `active`. This is what every row seeded
  // before the owner/admin split looks like, and the two defaults in isAdmin()/isOwner()
  // exist for exactly this document: it must still grant admin, and must NOT grant owner.
  await setDoc(doc(db, "admins", MAIL_ADMIN), { added_by: "console" });
  // The bootstrap owner, seeded by hand exactly as the console would.
  await setDoc(doc(db, "admins", MAIL_OWNER), {
    email: MAIL_OWNER,
    name: "Priya Owner",
    role: "owner",
    active: true,
    added_by: "console",
  });
  // Somebody who has left the core team. Still a row, so the handover history survives;
  // `active: false` is what takes the access away.
  await setDoc(doc(db, "admins", MAIL_RETIRED), {
    email: MAIL_RETIRED,
    name: "Rohan Lastyear",
    role: "admin",
    active: false,
    added_by: MAIL_OWNER,
  });
  // A pre-existing application, to prove a submitted row cannot be read back, edited or
  // deleted by anybody afterwards — including the person who sent it, who has no identity
  // to prove they did.
  await setDoc(doc(db, "applications", "legacy-1"), { name: "Old Applicant" });
});

const { doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection, getDocs, query, where } =
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
await check("create a profile with no github", true, () => {
  const d = profileFor("uid-min", "minimal@sst.scaler.com");
  delete d.github;
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
await check("an empty required field", false, badProfile({ name: "" }));
await check("an extra field the form never sends", false, badProfile({ isAdmin: true }));
// The four fields cut from the form. `hasOnly` is strict, so these are now refused
// outright — which is the point: an older client left open in a tab cannot keep writing
// a field the form no longer asks for and nothing reads.
for (const gone of [
  { why: "an essay nobody reads" },
  { heard_from: "senior" },
  { interests: ["web"] },
  { updates: true },
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
// THIS ASSERTION FLIPPED, DELIBERATELY. It used to expect a denial, because `admins`
// was a bare access marker and the only question anyone could ask of it was "am I in
// it" -- so enumeration would have leaked who the organisers are, to no benefit. The
// collection now carries the roster the organisers manage, so they must be able to see
// it. Members still cannot, which is the half that was actually protecting anything and
// is asserted in the roster block above.
await check("an admin listing the roster", true, () =>
  getDocs(collection(member(UID_ADMIN, MAIL_ADMIN), "admins")),
);
// The one privilege escalation this model would otherwise allow.
await check("an admin appointing another admin", false, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "admins", MAIL_B), { added_by: UID_ADMIN }),
);
await check("a member appointing themselves admin", false, () =>
  setDoc(doc(member(UID_B, MAIL_B), "admins", MAIL_B), { added_by: "me" }),
);

console.log("\n-- the roster: owners, admins, and people who have left --");

/** A roster row as the UI writes it. */
const rowFor = (email, over = {}) => ({
  email,
  name: "New Lead",
  role: "admin",
  active: true,
  added_by: MAIL_OWNER,
  ...over,
});

// ---- the two compatibility defaults, which are the whole reason old rows still work
// MAIL_ADMIN's document has neither `role` nor `active`. It must still be an admin...
await check("a row seeded before the split still grants admin", true, () =>
  getDocs(collection(member(UID_ADMIN, MAIL_ADMIN), "users")),
);
// ...and must NOT be an owner, or deploying these rules would have silently promoted
// every organiser the club already had.
await check("but it does NOT silently grant owner", false, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "admins", MAIL_NEW), withStamps(rowFor(MAIL_NEW), { created: false })),
);

// ---- retirement is a field, not a delete
await check("a retired admin loses the roster", false, () =>
  getDocs(collection(member(UID_RETIRED, MAIL_RETIRED), "admins")),
);
await check("a retired admin loses the membership list too", false, () =>
  getDocs(collection(member(UID_RETIRED, MAIL_RETIRED), "users")),
);
await check("but their row survives for the handover record", true, () =>
  getDoc(doc(member(UID_OWNER, MAIL_OWNER), "admins", MAIL_RETIRED)),
);

// ---- who may read the roster
await check("an admin lists the roster", true, () =>
  getDocs(collection(member(UID_ADMIN, MAIL_ADMIN), "admins")),
);
await check("a member cannot list the roster", false, () =>
  getDocs(collection(member(UID_A, MAIL_A), "admins")),
);
await check("a member still reads their own row", true, () =>
  getDoc(doc(member(UID_A, MAIL_A), "admins", MAIL_A)),
);
await check("a member cannot read somebody else's row", false, () =>
  getDoc(doc(member(UID_B, MAIL_B), "admins", MAIL_ADMIN)),
);

// ---- who may write it
await check("an owner appoints an admin", true, () =>
  setDoc(doc(member(UID_OWNER, MAIL_OWNER), "admins", MAIL_NEW), withStamps(rowFor(MAIL_NEW), { created: false })),
);
await check("an ordinary admin cannot appoint anybody", false, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "admins", "someone@sst.scaler.com"),
    withStamps(rowFor("someone@sst.scaler.com"), { created: false })),
);
await check("a member cannot appoint themselves", false, () =>
  setDoc(doc(member(UID_B, MAIL_B), "admins", MAIL_B), withStamps(rowFor(MAIL_B), { created: false })),
);
await check("an owner retires an admin", true, () =>
  setDoc(doc(member(UID_OWNER, MAIL_OWNER), "admins", MAIL_NEW),
    withStamps(rowFor(MAIL_NEW, { active: false }), { created: false })),
);
await check("an owner promotes an admin to owner", true, () =>
  setDoc(doc(member(UID_OWNER, MAIL_OWNER), "admins", MAIL_NEW),
    withStamps(rowFor(MAIL_NEW, { role: "owner", active: true }), { created: false })),
);

// ---- THE LOCKOUT GUARD. An owner who demotes or retires themselves cannot undo it,
// because the undo needs the privilege they just gave up. So the roster is the one thing
// an owner may not point at themselves, in either direction.
await check("an owner cannot demote themselves", false, () =>
  setDoc(doc(member(UID_OWNER, MAIL_OWNER), "admins", MAIL_OWNER),
    withStamps(rowFor(MAIL_OWNER, { role: "admin" }), { created: false })),
);
await check("an owner cannot retire themselves", false, () =>
  setDoc(doc(member(UID_OWNER, MAIL_OWNER), "admins", MAIL_OWNER),
    withStamps(rowFor(MAIL_OWNER, { active: false }), { created: false })),
);

// ---- the team-page fields
await check("an owner sets the chart tier and batch", true, () =>
  setDoc(doc(member(UID_OWNER, MAIL_OWNER), "admins", MAIL_NEW),
    withStamps(rowFor(MAIL_NEW, { group: "lead", batch: "'28", github: "newlead" }), { created: false })),
);
await check("a shadow names the OFFICE it shadows", true, () =>
  setDoc(doc(member(UID_OWNER, MAIL_OWNER), "admins", MAIL_NEW),
    withStamps(rowFor(MAIL_NEW, { group: "shadow", shadow_of: "Repo Lead" }), { created: false })),
);
// An unknown tier would drop somebody off the team page ENTIRELY rather than render
// wrong, because the page emits one section per known value. Closed set for that reason.
await check("an invented chart tier", false, () =>
  setDoc(doc(member(UID_OWNER, MAIL_OWNER), "admins", MAIL_NEW),
    withStamps(rowFor(MAIL_NEW, { group: "founder" }), { created: false })),
);

// ---- HOW FAR ONE OWNER REACHES. The tier exists to bound what a compromised account
// can do, so the boundary has to be stated rather than assumed. These four cases are the
// answer, and two of them are permissive on purpose:
//
//   an owner may appoint further owners       -> the tier is self-propagating
//   an owner may retire ANOTHER owner         -> so a majority is not required for either
//
// Together they mean a single compromised owner can appoint accomplices and retire every
// other owner. That is the accepted cost of not routing every monthly addition through
// the Firebase console, and the console remains the recovery path — it bypasses rules
// entirely. If the club would rather not accept it, the fix is to forbid `role: "owner"`
// on client writes and seed owners by hand only; these two assertions are where that
// change would show up.
await check("an owner appoints a SECOND owner", true, () =>
  setDoc(doc(member(UID_OWNER, MAIL_OWNER), "admins", MAIL_NEW),
    withStamps(rowFor(MAIL_NEW, { role: "owner" }), { created: false })),
);
await check("and can retire that other owner", true, () =>
  setDoc(doc(member(UID_OWNER, MAIL_OWNER), "admins", MAIL_NEW),
    withStamps(rowFor(MAIL_NEW, { role: "owner", active: false }), { created: false })),
);
// The two things that stay closed even for an owner.
await check("but still cannot touch their own row", false, () =>
  setDoc(doc(member(UID_OWNER, MAIL_OWNER), "admins", MAIL_OWNER),
    withStamps(rowFor(MAIL_OWNER, { role: "owner", active: false }), { created: false })),
);
await check("and still cannot delete anybody's row", false, () =>
  deleteDoc(doc(member(UID_OWNER, MAIL_OWNER), "admins", MAIL_NEW)),
);

// ---- the shape
await check("a roster row whose id and email disagree", false, () =>
  setDoc(doc(member(UID_OWNER, MAIL_OWNER), "admins", "a@sst.scaler.com"),
    withStamps(rowFor("b@sst.scaler.com"), { created: false })),
);
await check("an invented role", false, () =>
  setDoc(doc(member(UID_OWNER, MAIL_OWNER), "admins", MAIL_NEW),
    withStamps(rowFor(MAIL_NEW, { role: "superuser" }), { created: false })),
);
await check("a field nobody declared", false, () =>
  setDoc(doc(member(UID_OWNER, MAIL_OWNER), "admins", MAIL_NEW),
    withStamps(rowFor(MAIL_NEW, { isSuperAdmin: true }), { created: false })),
);
await check("a forged byline", false, () =>
  setDoc(doc(member(UID_OWNER, MAIL_OWNER), "admins", MAIL_NEW),
    withStamps(rowFor(MAIL_NEW, { added_by: "somebody@sst.scaler.com" }), { created: false })),
);
// Nobody deletes a row, including the owner who created it -- that is what keeps the
// handover history intact.
await check("an owner deleting a roster row", false, () =>
  deleteDoc(doc(member(UID_OWNER, MAIL_OWNER), "admins", MAIL_NEW)),
);

console.log("\n-- the notice board --");

/** The shape Composer.tsx writes. Kept beside the tests rather than imported, for the
 *  same reason profileFor() is: this suite has to be able to send a MALFORMED post, and a
 *  helper that could only produce valid ones would be unable to test the rules that
 *  matter most. */
const postBy = (email, over = {}) => ({
  title: "No session this Saturday",
  body: "The lab is booked. Back the week after.",
  pinned: false,
  author_email: email,
  ...over,
});

await check("an admin posting a notice", true, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", "post-1"), withStamps(postBy(MAIL_ADMIN))),
);
// THE WHOLE POINT OF THE COLLECTION: unlike users/, an ordinary member may list it.
await check("a member reading the board", true, () =>
  getDocs(collection(member(UID_A, MAIL_A), "announcements")),
);
await check("a member reading one notice", true, () =>
  getDoc(doc(member(UID_A, MAIL_A), "announcements", "post-1")),
);
// ...but may not write to it, which is the line between a notice board and a forum.
await check("a member posting a notice", false, () =>
  setDoc(doc(member(UID_B, MAIL_B), "announcements", "post-2"), withStamps(postBy(MAIL_B))),
);
await check("a member editing a notice", false, () =>
  setDoc(doc(member(UID_B, MAIL_B), "announcements", "post-1"), withStamps(postBy(MAIL_ADMIN))),
);
await check("a member deleting a notice", false, () =>
  deleteDoc(doc(member(UID_B, MAIL_B), "announcements", "post-1")),
);
await check("a signed-out reader seeing the board", false, () =>
  getDocs(collection(env.unauthenticatedContext().firestore(), "announcements")),
);
await check("an off-domain account seeing the board", false, () =>
  getDocs(collection(member("uid-out", "outsider@gmail.com"), "announcements")),
);
// THE BYLINE CANNOT BE FORGED, exactly as the profile's email cannot. An admin posting
// under a colleague's address would make the board unattributable.
await check("an admin posting under somebody else's byline", false, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", "post-3"), withStamps(postBy(MAIL_A))),
);
// A javascript: href in a field that renders as an anchor is the obvious hole in a
// board that organisers type into freely.
await check("a notice linking to javascript:", false, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", "post-4"),
    withStamps(postBy(MAIL_ADMIN, { link: "javascript:alert(1)" })),
  ),
);
await check("a notice linking to http://", false, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", "post-5"),
    withStamps(postBy(MAIL_ADMIN, { link: "http://example.com" })),
  ),
);
await check("a notice linking to https://", true, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", "post-6"),
    withStamps(postBy(MAIL_ADMIN, { link: "https://example.com" })),
  ),
);
await check("a notice with a field nobody declared", false, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", "post-7"),
    withStamps(postBy(MAIL_ADMIN, { isAdmin: true })),
  ),
);
await check("an empty notice", false, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", "post-8"),
    withStamps(postBy(MAIL_ADMIN, { title: "", body: "" })),
  ),
);
// PINNING IS A FULL OVERWRITE, NOT A ONE-FIELD UPDATE, and the pair of cases below is
// why. `isWellFormedPost` validates request.resource.data, which on an update is the
// WHOLE merged document -- so a write that changes `pinned` still has to carry every
// other field, created_at included. Sending it back unchanged is allowed; leaving it out
// is not, because that is indistinguishable from erasing the date the notice went up.
//
// The first version of this test omitted created_at and expected success. It failed, and
// it was the test that was wrong -- which is the entire argument for running these
// against the emulator rather than reading the rules and nodding.
await check("an admin repinning their own notice", true, async () => {
  const ref = doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", "post-1");
  const snap = await getDoc(ref);
  // Exactly what lib/announcements.ts setPinned() sends: the stored created_at, read back
  // and returned untouched, with a fresh updated_at.
  return setDoc(ref, {
    ...postBy(MAIL_ADMIN, { pinned: true }),
    created_at: snap.data().created_at,
    updated_at: serverTimestamp(),
  });
});
await check("an admin repinning WITHOUT returning created_at", false, () =>
  setDoc(
    doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", "post-1"),
    withStamps(postBy(MAIL_ADMIN, { pinned: true }), { created: false }),
  ),
);
await check("an admin backdating a notice", false, async () => {
  const ref = doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", "post-1");
  return setDoc(ref, {
    ...postBy(MAIL_ADMIN),
    created_at: new Date("2020-01-01"),
    updated_at: serverTimestamp(),
  });
});
await check("an admin deleting a notice", true, () =>
  deleteDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", "post-6")),
);

console.log("\n-- sessions --");

const sessionBy = (email, over = {}) => ({
  title: "Introduction to Rust",
  speaker: "Alex Chen",
  location: "Lab 2",
  starts_at: new Date("2026-10-24T18:00:00Z"),
  created_by: email,
  ...over,
});

await check("an admin schedules a session", true, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "sessions", "s1"),
    withStamps(sessionBy(MAIL_ADMIN), { created: false })),
);
await check("a member reads the schedule", true, () =>
  getDocs(collection(member(UID_A, MAIL_A), "sessions")),
);
await check("a member cannot schedule one", false, () =>
  setDoc(doc(member(UID_A, MAIL_A), "sessions", "s2"),
    withStamps(sessionBy(MAIL_A), { created: false })),
);
await check("a signed-out reader cannot see the schedule", false, () =>
  getDocs(collection(env.unauthenticatedContext().firestore(), "sessions")),
);
// starts_at is the only reason this collection exists rather than being notices, so a
// session without a real one is refused outright.
await check("a session with no start time", false, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "sessions", "s3"),
    withStamps({ title: "TBA", created_by: MAIL_ADMIN }, { created: false })),
);
await check("a session whose start time is typed text", false, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "sessions", "s4"),
    withStamps(sessionBy(MAIL_ADMIN, { starts_at: "Saturday 4pm" }), { created: false })),
);
// A FUTURE starts_at MUST be allowed, which is why it is not pinned to request.time the
// way every other date in these rules is. Scheduling is the entire feature.
await check("a session scheduled months ahead", true, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "sessions", "s5"),
    withStamps(sessionBy(MAIL_ADMIN, { starts_at: new Date("2027-03-01T10:00:00Z") }), { created: false })),
);
await check("a forged organiser byline", false, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "sessions", "s6"),
    withStamps(sessionBy(MAIL_A), { created: false })),
);
await check("an admin cancels a session", true, () =>
  deleteDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "sessions", "s5")),
);
await check("a member cannot cancel one", false, () =>
  deleteDoc(doc(member(UID_A, MAIL_A), "sessions", "s1")),
);

console.log("\n-- notices: categories and archiving --");
await check("an admin categorises a notice", true, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", "post-cat"),
    withStamps(postBy(MAIL_ADMIN, { category: "event" }))),
);
await check("an invented category", false, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", "post-bad"),
    withStamps(postBy(MAIL_ADMIN, { category: "urgent" }))),
);
await check("an admin archives a notice", true, async () => {
  const ref = doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", "post-cat");
  const snap = await getDoc(ref);
  return setDoc(ref, {
    ...postBy(MAIL_ADMIN, { category: "event", archived: true }),
    created_at: snap.data().created_at,
    updated_at: serverTimestamp(),
  });
});
// The two fields are OPTIONAL so notices posted before they existed stay editable. A
// strict hasAll would have made every existing notice unsaveable the moment these rules
// deployed, and it would have presented as "the board is broken".
await check("a notice with neither field still saves", true, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "announcements", "post-old"),
    withStamps(postBy(MAIL_ADMIN))),
);
await check("a member cannot archive a notice", false, () =>
  setDoc(doc(member(UID_B, MAIL_B), "announcements", "post-cat"),
    withStamps(postBy(MAIL_ADMIN, { archived: true }), { created: false })),
);

console.log("\n-- contribution counts, which no client may write --");

// Seeded with rules disabled because that is exactly how it happens in production: the
// Cloud Function writes through the Admin SDK, which does not go through these rules.
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  const { doc: d, setDoc: set } = await import("firebase/firestore");
  await set(d(db, "contributions", UID_A), {
    uid: UID_A,
    github: "asha",
    merged: 3,
    open: 1,
    repos: 2,
    recent: [],
  });
});

await check("reading your own contribution counts", true, () =>
  getDoc(doc(member(UID_A, MAIL_A), "contributions", UID_A)),
);
await check("an admin reading a member's counts", true, () =>
  getDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "contributions", UID_A)),
);
await check("a member reading somebody else's counts", false, () =>
  getDoc(doc(member(UID_B, MAIL_B), "contributions", UID_A)),
);
await check("a member listing everyone's counts", false, () =>
  getDocs(collection(member(UID_B, MAIL_B), "contributions")),
);
// THE ASSERTION THIS COLLECTION EXISTS FOR. If any of these three passed, "merged pull
// requests" would be a number members type in, and the dashboard panel would be worth
// nothing.
await check("inflating your own merged count", false, () =>
  setDoc(doc(member(UID_A, MAIL_A), "contributions", UID_A), {
    uid: UID_A,
    github: "asha",
    merged: 9999,
    open: 0,
    repos: 50,
    recent: [],
  }),
);
await check("creating a counts row for yourself", false, () =>
  setDoc(doc(member(UID_B, MAIL_B), "contributions", UID_B), {
    uid: UID_B,
    github: "ravi",
    merged: 100,
    open: 0,
    repos: 9,
    recent: [],
  }),
);
await check("an admin editing somebody's counts", false, () =>
  updateDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "contributions", UID_A), { merged: 0 }),
);

// APPLICATIONS: THE ONE DOOR WITH NO KEY.
//
// This block used to be two lines called "legacy applications stay sealed", and it was
// the right size for a collection nothing wrote to any more. /join is an anonymous form
// again, so `allow create` is live and this is now the only rule in the file that an
// unauthenticated stranger can reach. It gets the most cases of anything here.
//
// EVERY APPLICANT BELOW IS UNAUTHENTICATED, deliberately. Using a signed-in member would
// have proved nothing: the create rule never mentions auth, so a member passes it for the
// same reason a stranger does. An anonymous context is the only one that can catch the
// regression that matters — somebody putting isMember() back on this rule and quietly
// requiring a college Google account to ask to join.
console.log("\n-- applications: the one door with no key --");

/** No auth token at all. This is what a reader on /join actually is. */
const stranger = () => env.unauthenticatedContext().firestore();

/** The shape ApplyForm writes. `submitted_at` is a sentinel for the same reason the
 *  profile stamps are: the rules require `submitted_at == request.time`, and a literal
 *  Date can never equal that. */
const application = (over = {}) => ({
  name: "Nikhil Rao",
  email: "nikhil@sst.scaler.com",
  year_branch: "1st year, CSE",
  hostel: "uniworld-2",
  level: "none",
  path: "first-contribution",
  programs: ["gsoc"],
  submitted_at: serverTimestamp(),
  ...over,
});

/** Drop a key entirely. `{ email: undefined }` would not do it — the SDK rejects
 *  undefined values client-side, so the test would fail before the rules saw anything and
 *  would look like a denial that never happened. */
const without = (d, ...keys) => {
  const out = { ...d };
  for (const k of keys) delete out[k];
  return out;
};

const apply = (over) => addDoc(collection(stranger(), "applications"), application(over));

// THE HAPPY PATH, and the whole reason for the change this suite is checking.
await check("a stranger submitting a well-formed application", true, () => apply());
// Applying is ASKING, so the domain rule does not apply here — only membership is
// restricted. Somebody applying from a personal address is a person to email back.
await check("applying from an off-domain address", true, () =>
  apply({ email: "nikhil@gmail.com" }),
);
await check("applying with the optional github filled in", true, () =>
  apply({ github: "nikhil" }),
);
await check("applying with 'other' and the free text that explains it", true, () =>
  apply({ programs: ["other"], programs_other: "Season of Docs" }),
);

// MISSING REQUIRED FIELDS.
await check("applying with no email", false, () =>
  addDoc(collection(stranger(), "applications"), without(application(), "email")),
);
await check("applying with no programmes chosen", false, () => apply({ programs: [] }));
await check("applying with an empty name", false, () => apply({ name: "" }));

// EXTRA KEYS. `hasOnly` is the half that stops this collection being a free document
// store, and an invented `approved` field is the specific thing worth refusing: it is
// what somebody would send to look like an accepted applicant.
await check("applying with an invented extra field", false, () =>
  apply({ approved: true }),
);

// CLOSED SETS. These are the values that drifted once already and are why scripts/rules.mjs
// exists; here they are checked against the emulator rather than by text.
await check("applying with a hostel that does not exist", false, () =>
  apply({ hostel: "uniworld-3" }),
);
await check("applying with an off-list level", false, () => apply({ level: "expert" }));
await check("applying with an off-list programme", false, () =>
  apply({ programs: ["gsoc", "made-up-programme"] }),
);

// THE 'other' PAIRING, in both directions.
await check("applying with a bare 'other' and nothing to explain it", false, () =>
  apply({ programs: ["other"] }),
);
await check("applying with free text but without ticking 'other'", false, () =>
  apply({ programs: ["gsoc"], programs_other: "smuggled" }),
);

// SIZE LIMITS. The form's maxLength is a courtesy; these are the real ceiling, and
// without them one request can park a megabyte in a single field.
await check("applying with a name past the length limit", false, () =>
  apply({ name: "x".repeat(121) }),
);

// THE CLOCK. A forged submitted_at would make submission order meaningless, which is the
// only ordering the organisers have.
await check("applying with a client-supplied timestamp", false, () =>
  apply({ submitted_at: new Date("2020-01-01") }),
);

// AND WHAT HAPPENS AFTER. A submitted application is readable by nobody through the SDK
// and immutable to everybody, including the stranger who sent it.
await check("reading an application as an admin", false, () =>
  getDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "applications", "legacy-1")),
);
await check("reading an application as a stranger", false, () =>
  getDoc(doc(stranger(), "applications", "legacy-1")),
);
await check("listing the applications as an admin", false, () =>
  getDocs(collection(member(UID_ADMIN, MAIL_ADMIN), "applications")),
);
await check("editing a submitted application", false, () =>
  updateDoc(doc(stranger(), "applications", "legacy-1"), { name: "someone else" }),
);
await check("deleting a submitted application", false, () =>
  deleteDoc(doc(stranger(), "applications", "legacy-1")),
);

console.log("\n-- forms and polls --");

/** A form as the builder writes it. `field_ids` mirrors `fields`, which is what lets the
 *  response rule check answer keys without iterating nested maps. */
const formBy = (email, over = {}) => ({
  title: "Saturday session",
  description: "Which slot suits you?",
  fields: [{ id: "slot", label: "Which slot?", type: "choice", options: ["10am", "2pm"] }],
  field_ids: ["slot"],
  open: true,
  show_tally: true,
  author_email: email,
  ...over,
});

const answerBy = (uid, email, over = {}) => ({
  uid,
  email,
  name: "Asha Verma",
  answers: { slot: "10am" },
  ...over,
});

await check("an admin creates a form", true, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "forms", "f1"), withStamps(formBy(MAIL_ADMIN))),
);
await check("a member cannot create a form", false, () =>
  setDoc(doc(member(UID_A, MAIL_A), "forms", "f2"), withStamps(formBy(MAIL_A))),
);
await check("a member reads the forms", true, () =>
  getDocs(collection(member(UID_A, MAIL_A), "forms")),
);
await check("a signed-out reader cannot", false, () =>
  getDocs(collection(env.unauthenticatedContext().firestore(), "forms")),
);
// field_ids is what the response rule compares against, so a form whose two lists
// disagree would validate answers against the wrong set.
await check("a form whose field_ids do not match its fields", false, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "forms", "f3"),
    withStamps(formBy(MAIL_ADMIN, { field_ids: ["slot", "extra"] }))),
);

// ---- THE TALLY. The number the whole poll is worth nothing without.
await check("an admin cannot invent a tally on create", false, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "forms", "f4"),
    withStamps(formBy(MAIL_ADMIN, { tally: { slot: { "10am": 999 } } }))),
);
await check("an admin cannot bolt a tally on afterwards", false, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "forms", "f1"),
    withStamps(formBy(MAIL_ADMIN, { tally: { slot: { "10am": 999 } } }), { created: false })),
);
await check("a member certainly cannot", false, () =>
  setDoc(doc(member(UID_A, MAIL_A), "forms", "f1"),
    withStamps(formBy(MAIL_A, { tally: { slot: { "10am": 999 } } }), { created: false })),
);

// ---- responses
await check("a member answers", true, () =>
  setDoc(doc(member(UID_A, MAIL_A), "forms", "f1", "responses", UID_A),
    withStamps(answerBy(UID_A, MAIL_A), { created: false })),
);
await check("and reads their own answer back", true, () =>
  getDoc(doc(member(UID_A, MAIL_A), "forms", "f1", "responses", UID_A)),
);
await check("and may change it while the form is open", true, () =>
  setDoc(doc(member(UID_A, MAIL_A), "forms", "f1", "responses", UID_A),
    withStamps(answerBy(UID_A, MAIL_A, { answers: { slot: "2pm" } }), { created: false })),
);
// THE PRIVACY LINE. Attributed responses are only safe because members cannot read each
// other's -- organisers can, members cannot.
await check("a member cannot read somebody else's answer", false, () =>
  getDoc(doc(member(UID_B, MAIL_B), "forms", "f1", "responses", UID_A)),
);
await check("a member cannot list the answers", false, () =>
  getDocs(collection(member(UID_B, MAIL_B), "forms", "f1", "responses")),
);
await check("an admin lists the answers", true, () =>
  getDocs(collection(member(UID_ADMIN, MAIL_ADMIN), "forms", "f1", "responses")),
);
// Keyed by uid, so answering for somebody else is not refused -- it is inexpressible.
await check("a member cannot answer as somebody else", false, () =>
  setDoc(doc(member(UID_B, MAIL_B), "forms", "f1", "responses", UID_A),
    withStamps(answerBy(UID_A, MAIL_A), { created: false })),
);
await check("a member cannot forge the address on their own answer", false, () =>
  setDoc(doc(member(UID_B, MAIL_B), "forms", "f1", "responses", UID_B),
    withStamps(answerBy(UID_B, MAIL_A), { created: false })),
);
// Without this a member could append arbitrary keys to a document organisers export.
await check("an answer to a question the form does not ask", false, () =>
  setDoc(doc(member(UID_B, MAIL_B), "forms", "f1", "responses", UID_B),
    withStamps(answerBy(UID_B, MAIL_B, { answers: { slot: "10am", smuggled: "x" } }), { created: false })),
);
await check("nobody withdraws an answer", false, () =>
  deleteDoc(doc(member(UID_A, MAIL_A), "forms", "f1", "responses", UID_A)),
);

// ---- CLOSED MEANS CLOSED, enforced here rather than by a disabled button.
await check("an admin closes the form", true, () =>
  setDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "forms", "f1"),
    withStamps(formBy(MAIL_ADMIN, { open: false }), { created: false })),
);
await check("answering a closed form", false, () =>
  setDoc(doc(member(UID_B, MAIL_B), "forms", "f1", "responses", UID_B),
    withStamps(answerBy(UID_B, MAIL_B), { created: false })),
);
await check("changing an answer after it closes", false, () =>
  setDoc(doc(member(UID_A, MAIL_A), "forms", "f1", "responses", UID_A),
    withStamps(answerBy(UID_A, MAIL_A, { answers: { slot: "10am" } }), { created: false })),
);
await check("a form cannot be deleted, only closed", false, () =>
  deleteDoc(doc(member(UID_ADMIN, MAIL_ADMIN), "forms", "f1")),
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
