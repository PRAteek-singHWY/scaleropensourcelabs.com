// Exercise firestore.rules against the real Firestore emulator.
//
//   Terminal 1:  npx firebase-tools emulators:start --only firestore --project demo-osc
//   Terminal 2:  npm run rules:emulator
//
// WHY THIS EXISTS SEPARATELY FROM scripts/rules.mjs. That one is a text check: it
// diffs the rules against the form's option lists and greps for the deny lines. It
// needs no Java, no emulator and no network, so it runs on every CI push.
//
// This one actually EXECUTES the rules. It is the difference between "the file says
// `allow read: if false`" and "a read was attempted and Firestore refused it". Before
// this existed, firestore.rules had never been parsed by Firestore at all — a syntax
// error or an inverted condition would have been discovered on first deploy, in
// production, against real applicants.
//
// It also proves the half that is easy to forget while hardening: that a GENUINE
// application still gets through. Rules that deny everything pass every security
// check and break the form.
//
// Not in CI by default because it needs the emulator (a ~60MB JAR and a JVM). Run it
// whenever you touch firestore.rules or the form's fields — which is exactly when the
// text check is least sufficient.
//
// A note on the emulator's output: several denials are logged as "evaluation error"
// rather than a clean `false`. That is expected and is not a bug — when a field is
// absent or the wrong type, expressions like `d.name.size()` raise instead of
// returning false, and the rules engine treats a raised error as a denial. The
// security outcome is identical; it only makes the emulator's log noisier. What
// matters is the verdict, and every verdict below is asserted explicitly.

import { initializeApp } from "firebase/app";
import {
  getFirestore, connectFirestoreEmulator, collection, addDoc, doc,
  getDocs, deleteDoc, updateDoc, serverTimestamp, Timestamp,
} from "firebase/firestore";

const HOST = "127.0.0.1";
const PORT = Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8080);

// Fail with instructions rather than a stack trace, because "connection refused" from
// the Firestore SDK looks like a code fault rather than a missing emulator.
try {
  const res = await fetch(`http://${HOST}:${PORT}/`);
  await res.text();
} catch {
  console.error(
    `\n  No Firestore emulator on ${HOST}:${PORT}.\n\n` +
      "  Start it first, from the repo root:\n" +
      "    npx firebase-tools emulators:start --only firestore --project demo-osc\n",
  );
  process.exit(1);
}

// `demo-` prefixed project IDs are the emulator's offline mode: no credentials, and
// any attempt to reach real Google services fails loudly instead of silently writing
// to somebody's actual project.
const app = initializeApp({ projectId: "demo-osc", apiKey: "unused-by-the-emulator" });
const db = getFirestore(app);
connectFirestoreEmulator(db, HOST, PORT);

const APPS = collection(db, "applications");

/** Exactly what components/ApplyForm.tsx sends. If you change the form, change this. */
const valid = () => ({
  name: "Asha Verma",
  email: "asha@example.com",
  year_branch: "2nd year, CSE",
  hostel: "uniworld-1",
  level: "none",
  path: "build-day",
  why: "I want to see how real projects get reviewed.",
  interests: ["web", "ml"],
  programs: ["gsoc", "outreachy"],
  github: "asha",
  heard_from: "senior",
  updates: false,
  submitted_at: serverTimestamp(),
});

let pass = 0;
let fail = 0;
async function expect(label, shouldSucceed, fn) {
  let ok = false;
  let detail = "";
  try {
    await fn();
    ok = true;
  } catch (e) {
    detail = String(e.code ?? e.message ?? "").slice(0, 40);
  }
  const good = ok === shouldSucceed;
  good ? pass++ : fail++;
  console.log(
    `  ${good ? "PASS" : "FAIL"}  ${shouldSucceed ? "allow" : "deny "}  ${label}` +
      (ok ? "" : `  (${detail})`),
  );
  return ok;
}

console.log("\nfirestore.rules, executed against the emulator\n");

// --- the happy path. If this breaks, the form is broken. --------------------
let created = null;
await expect("a real application is accepted", true, async () => {
  created = await addDoc(APPS, valid());
});
await expect("omitting the optional github and heard_from", true, async () => {
  const d = valid();
  delete d.github;
  delete d.heard_from;
  return addDoc(APPS, d);
});
await expect("omitting interests entirely", true, async () => {
  const d = valid();
  delete d.interests;
  return addDoc(APPS, d);
});
await expect("'other' alongside the programme it names", true, async () =>
  addDoc(APPS, {
    ...valid(),
    programs: ["gsoc", "other"],
    programs_other: "Google Season of Docs",
  }));

// --- the boundary. Each of these leaking is a different incident. -----------
await expect("reading the collection", false, () => getDocs(APPS));
await expect("updating a submitted application", false, () =>
  updateDoc(doc(db, "applications", created?.id ?? "missing"), { name: "Someone Else" }));
await expect("deleting a submitted application", false, () =>
  deleteDoc(doc(db, "applications", created?.id ?? "missing")));
await expect("writing to any other collection", false, () =>
  addDoc(collection(db, "secrets"), { anything: 1 }));

// --- validation. An unvalidated create-only collection is a free document store.
const withPatch = (patch) => async () => addDoc(APPS, { ...valid(), ...patch });
await expect("a level outside the closed set", false, withPatch({ level: "some" }));
await expect("a path outside the closed set", false, withPatch({ path: "hackathon" }));
// The hostel is required and closed: no opt-out, no invented third building.
await expect("a hostel outside the closed set", false, withPatch({ hostel: "uniworld-3" }));
await expect("an empty hostel string", false, withPatch({ hostel: "" }));
await expect("omitting the hostel", false, async () => {
  const d = valid();
  delete d.hostel;
  return addDoc(APPS, d);
});
await expect("an interest outside the known set", false, withPatch({ interests: ["crypto"] }));
await expect("more interests than the form can send", false,
  withPatch({ interests: ["web", "ml", "systems", "design", "docs", "web"] }));
// Programmes are required, non-empty, and 'other' is paired with its explanation. The
// browser enforces the first two with a setCustomValidity message on the checkbox
// group; these are the same rules for anyone who skips the browser.
await expect("a programme outside the known set", false, withPatch({ programs: ["nasa"] }));
await expect("an empty programmes list", false, withPatch({ programs: [] }));
await expect("no programmes field at all", false, async () => {
  const d = valid();
  delete d.programs;
  return addDoc(APPS, d);
});
await expect("'other' with nothing naming it", false, withPatch({ programs: ["other"] }));
await expect("'other' named with an empty string", false,
  withPatch({ programs: ["other"], programs_other: "" }));
await expect("free text without 'other' ticked", false,
  withPatch({ programs: ["gsoc"], programs_other: "GSoC again" }));
await expect("an oversized programme name", false,
  withPatch({ programs: ["other"], programs_other: "x".repeat(121) }));
await expect("an extra field the form never sends", false, withPatch({ isAdmin: true }));
await expect("a malformed email", false, withPatch({ email: "not-an-email" }));
await expect("a why over the 400-character limit", false, withPatch({ why: "x".repeat(401) }));
await expect("an oversized name", false, withPatch({ name: "x".repeat(121) }));
await expect("an empty required field", false, withPatch({ name: "" }));
await expect("a missing required field", false, async () => {
  const d = valid();
  delete d.name;
  return addDoc(APPS, d);
});
// The one field the client must not control. Without this, submission order is
// forgeable and "who applied first" becomes meaningless.
await expect("a client-forged timestamp", false,
  withPatch({ submitted_at: Timestamp.fromMillis(0) }));

console.log(
  fail === 0
    ? `\n  ${pass} passed. The rules allow a real application and deny everything else.\n`
    : `\n  ${pass} passed, ${fail} FAILED. Do not deploy these rules.\n`,
);
process.exit(fail === 0 ? 0 : 1);
