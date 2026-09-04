// Build the public team page from the core-team roster.
//
//   npm run team:sync            against the local emulator
//   FIRESTORE_TOKEN=... npm run team:sync    against the real project
//
// WHY A BUILD STEP AND NOT A FETCH. The obvious alternative is for /team to read the
// roster in the browser, and it is wrong for one decisive reason: Firestore rules are
// per-DOCUMENT, not per-field. A public page reading `admins` reads whole rows — and the
// document id IS an email — so it would publish every organiser's inbox next to their
// name. Projecting at build time takes only the public fields, and leaves /team
// prerendered and instant rather than turning the club's best-looking page into a
// loading state.
//
// WHAT IT MERGES, AND WHY THERE ARE TWO SOURCES AT ALL:
//
//   Firestore `admins`          WHO is on the team. Live, owner-edited, and the same row
//                               that grants access — so the page and the access list
//                               cannot disagree, which is the drift this whole exercise
//                               is about.
//   content/team-editorial.ts   WHAT the page says about them. Reviewed prose with rules
//                               of its own; see the header of that file.
//
// IT FAILS RATHER THAN GUESSES. An active member with no remit stops the build and is
// named. That is the forcing function that keeps the two steps honest: access is instant,
// publication is reviewed. A script that emitted a bare name instead would make the
// second step optional, and it would stay undone.
//
// NO DEPENDENCIES, DELIBERATELY. It talks to the Firestore REST API with `fetch`, so it
// needs no firebase-admin in web/package.json — this repo must keep building for a
// contributor with no Firebase project at all.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const ENV = join(here, "..", ".env.local");
const OUT = join(here, "..", "content", "team.generated.ts");

const envFile = existsSync(ENV) ? readFileSync(ENV, "utf8") : "";
const fromEnvFile = (k) =>
  (envFile.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1] ?? "").trim();

const PROJECT =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || fromEnvFile("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
const EMULATOR =
  process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR || fromEnvFile("NEXT_PUBLIC_FIRESTORE_EMULATOR");
const TOKEN = process.env.FIRESTORE_TOKEN ?? "";

if (!PROJECT) {
  console.error(
    "\n  No project id. Set NEXT_PUBLIC_FIREBASE_PROJECT_ID in web/.env.local.\n",
  );
  process.exit(1);
}

// AGAINST THE EMULATOR THERE IS NO AUTH AT ALL, which is what makes this runnable by a
// contributor with no credentials. Against the real project it needs a token with read
// access to Firestore, and the operator supplies one rather than the repo storing a
// service-account key:
//
//   FIRESTORE_TOKEN=$(gcloud auth print-access-token) npm run team:sync
//
// That is deliberate. A key committed anywhere, or held in CI, is a standing credential
// that reads the whole database; a token printed by whoever is deploying expires in an
// hour and belongs to a person who already had that access.
const BASE = EMULATOR
  ? `http://${EMULATOR}/v1/projects/${PROJECT}/databases/(default)/documents`
  : `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

if (!EMULATOR && !TOKEN) {
  console.error(
    "\n  Reading the real project needs a token:\n\n" +
      "    FIRESTORE_TOKEN=$(gcloud auth print-access-token) npm run team:sync\n\n" +
      "  Or point at the emulator by setting NEXT_PUBLIC_FIRESTORE_EMULATOR in .env.local.\n",
  );
  process.exit(1);
}

/** Firestore's REST shape -> a plain object. Only the types this collection uses. */
function plain(fields = {}) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    if ("stringValue" in v) out[k] = v.stringValue;
    else if ("booleanValue" in v) out[k] = v.booleanValue;
    else if ("timestampValue" in v) out[k] = v.timestampValue;
    else if ("integerValue" in v) out[k] = Number(v.integerValue);
  }
  return out;
}

// `Bearer owner` is the Firestore emulator's documented owner credential: it bypasses
// the rules, which is what a build step needs and what an unauthenticated request does
// NOT get -- the emulator enforces rules on REST exactly as production does, so a bare
// request is refused by the admin-only `list` rule. scripts/e2e-auth.mjs seeds the same
// way. Against the real project the operator's own short-lived token is used instead.
const headers = { Authorization: `Bearer ${EMULATOR ? "owner" : TOKEN}` };
const res = await fetch(`${BASE}/admins?pageSize=300`, { headers });
if (!res.ok) {
  console.error(`\n  Firestore returned ${res.status}. ${await res.text()}\n`);
  process.exit(1);
}
const body = await res.json();
const rows = (body.documents ?? []).map((d) => ({
  ...plain(d.fields),
  email: d.name.split("/").pop(),
}));

// Only the current team reaches the page. A retired row stays in Firestore for the
// handover record and simply stops being published — which is the whole point of
// retiring being a field rather than a delete.
const active = rows.filter((r) => r.active !== false);

// ---------------------------------------------------------------- the editorial
const edSrc = readFileSync(join(here, "..", "content", "team-editorial.ts"), "utf8");
/** Keys of TEAM_EDITORIAL, read textually rather than imported — this is a .mjs script
 *  and the content file is TypeScript. Only the KEYS are needed here; the values are
 *  imported properly by the generated module at build time. */
const editorialKeys = new Set(
  [...edSrc.matchAll(/^\s*"([^"]+@[^"]+)":\s*\{/gm)].map((m) => m[1].toLowerCase()),
);

const problems = [];

// An active member with nothing written about them. Named rather than skipped, because a
// skip makes the second step optional and it would stay undone.
for (const r of active) {
  if (!editorialKeys.has(r.email.toLowerCase())) {
    problems.push(
      `  ${r.email} is on the roster but has no entry in content/team-editorial.ts.\n` +
        `      Write their remit there, then run this again.`,
    );
  }
  if (!r.group) {
    problems.push(
      `  ${r.email} has no chart tier. Set officer / lead / shadow on /admin.`,
    );
  }
  if (!r.title) {
    problems.push(`  ${r.email} has no title, which is what the page prints above the name.`);
  }
}

// The reverse: prose for somebody no roster row claims. Usually a typo'd address, and
// silently dropping it would leave that person on the page with a bare name.
const activeEmails = new Set(active.map((r) => r.email.toLowerCase()));
for (const k of editorialKeys) {
  if (!activeEmails.has(k)) {
    problems.push(
      `  content/team-editorial.ts has an entry for ${k}, but no active roster row does.\n` +
        `      Either they left (remove the entry) or the address is misspelt.`,
    );
  }
}

if (problems.length) {
  console.error(`\n  The team page cannot be built yet:\n\n${problems.join("\n")}\n`);
  process.exit(1);
}

// ------------------------------------------------------------------- the output
const byGroup = (g) =>
  active
    .filter((r) => r.group === g)
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

const emit = (r) => {
  const parts = [
    `    email: ${JSON.stringify(r.email)},`,
    `    name: ${JSON.stringify(r.name)},`,
    `    designation: ${JSON.stringify(r.title)},`,
  ];
  if (r.batch) parts.push(`    batch: ${JSON.stringify(r.batch)},`);
  if (r.photo) parts.push(`    photo: ${JSON.stringify(r.photo)},`);
  if (r.github) parts.push(`    github: ${JSON.stringify(r.github)},`);
  if (r.shadow_of) parts.push(`    shadowOf: ${JSON.stringify(r.shadow_of)},`);
  return `  {\n${parts.join("\n")}\n  },`;
};

const list = (name, g) =>
  `export const ${name}: RosterMember[] = [\n${byGroup(g).map(emit).join("\n")}\n];`;

const out = `// GENERATED BY scripts/team-roster.mjs -- DO NOT EDIT.
//
// Who is on the core team, projected from the Firestore roster that also grants them
// access, so the public page and the access list cannot disagree. Regenerate with:
//
//   npm run team:sync
//
// The prose each of these people gets on the page is NOT here: it lives in
// content/team-editorial.ts, keyed by the same address, and is merged by content/club.ts.
// See the header of either file for why the two are separate.
//
// Generated from ${active.length} active roster row(s).

/** The membership half of a team member. The editorial half is merged in separately. */
export type RosterMember = {
  email: string;
  name: string;
  designation: string;
  batch?: string;
  photo?: string;
  github?: string;
  shadowOf?: string;
};

${list("ROSTER_OFFICERS", "officer")}

${list("ROSTER_LEADS", "lead")}

${list("ROSTER_SHADOWS", "shadow")}
`;

writeFileSync(OUT, out, "utf8");
console.log(
  `\n  Wrote content/team.generated.ts` +
    `\n    ${byGroup("officer").length} officer(s), ${byGroup("lead").length} lead(s), ` +
    `${byGroup("shadow").length} shadow(s)` +
    `\n    from ${EMULATOR ? `the emulator at ${EMULATOR}` : PROJECT}\n`,
);
