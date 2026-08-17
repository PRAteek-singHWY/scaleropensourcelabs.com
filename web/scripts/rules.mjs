// Assert firestore.rules agrees with the form it is validating.
//
//   node scripts/rules.mjs
//
// WHY THIS EXISTS. The rules file hardcodes the allowed values for `level`, `path`
// and `interests`, because Firestore rules cannot import anything. Those lists are a
// copy of web/content/join.ts, and a copy that nothing checks is a copy that drifts.
//
// The failure mode is nasty and asymmetric: if content gains a value the rules do not
// know, every real applicant who picks it gets a permission-denied on submit. The
// form is correct, the page renders perfectly, the screenshot looks right, and only
// that one path is broken. Nothing else in this repo's checks would notice — the
// smoke test submits nothing, and the QA sweep reads pixels.
//
// I wrote two of the five values wrong on the first attempt (`some` for `some-git`,
// `hackathon` for `build-day`), which is the entire argument for this file.
//
// It is a pure text check with no Firebase dependency and no network, so it runs in
// CI whether or not a Firebase project exists.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const RULES = join(here, "..", "..", "firestore.rules");
const CONTENT = join(here, "..", "content", "join.ts");

const rulesRaw = readFileSync(RULES, "utf8");
const content = readFileSync(CONTENT, "utf8");

// COMMENTS ARE STRIPPED BEFORE ANY ASSERTION, and this is not cosmetic. The header of
// firestore.rules explains the Firebase "test mode" trap by quoting the dangerous line
// verbatim, so the first version of the check below found that quotation and reported
// the rules wide open when they were correct. A checker that reads prose as code is
// worse than no checker: the failure looks exactly like a real one.
const rules = rulesRaw.replace(/\/\/[^\n]*/g, "");

let failed = 0;
const ok = (name, pass, detail = "") => {
  if (!pass) failed++;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
};

/** Values inside a `[...]` list in the rules, for a given field. */
function rulesSet(field) {
  // Matches both `d.level in [...]` and `d.interests.hasOnly([...])`.
  const re = new RegExp(`d\\.${field}(?:\\s+in\\s+|\\.hasOnly\\()\\[([^\\]]*)\\]`);
  const m = rules.match(re);
  if (!m) return null;
  return new Set(
    m[1]
      .split(",")
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean),
  );
}

/** The body of one exported array declaration.
 *
 *  The terminator must match `] as const;` as well as `];` — every array in
 *  content/join.ts is `as const`, and looking only for `];` ran past the end of the
 *  declaration into the NEXT one. That is how the first run of this script reported
 *  LEVELS as containing all fourteen values from three different arrays. */
function declBody(exportName) {
  const start = content.indexOf(`export const ${exportName}`);
  if (start === -1) return null;
  const end = content.slice(start).search(/\n\]\s*(as const)?\s*;/);
  if (end === -1) return null;
  return content.slice(start, start + end);
}

/** `value: "x"` entries from a named exported array. */
function contentValues(exportName) {
  const body = declBody(exportName);
  if (body === null) return null;
  return new Set([...body.matchAll(/value:\s*"([^"]+)"/g)].map((m) => m[1]));
}

/** `id: "x"` entries, which is how PATHS is keyed. */
function contentIds(exportName) {
  const body = declBody(exportName);
  if (body === null) return null;
  return new Set([...body.matchAll(/\bid:\s*"([^"]+)"/g)].map((m) => m[1]));
}

const same = (a, b) =>
  a && b && a.size === b.size && [...a].every((v) => b.has(v));
const show = (s) => (s ? `{${[...s].sort().join(", ")}}` : "null");

console.log("\nfirestore.rules vs content/join.ts\n");

for (const [field, fromContent] of [
  ["level", contentValues("LEVELS")],
  ["path", contentIds("PATHS")],
  ["hostel", contentValues("HOSTELS")],
  ["interests", contentValues("INTERESTS")],
  ["programs", contentValues("PROGRAMS")],
]) {
  const fromRules = rulesSet(field);
  ok(
    `${field} sets match`,
    same(fromRules, fromContent),
    same(fromRules, fromContent) ? `(${fromRules.size} values)` : `rules=${show(fromRules)} content=${show(fromContent)}`,
  );
}

// The collection name is shared between the rules and the client. Different strings
// here means the write targets a path the rules do not cover, so it is denied by the
// catch-all — a permission error that looks nothing like a naming mistake.
const lib = readFileSync(join(here, "..", "lib", "firebase.ts"), "utf8");
// Every collection the client names must have a match block, or a write goes to a path
// no rule covers and is denied by the catch-all — a permission error that looks nothing
// like a naming mistake.
for (const konst of ["APPLICATIONS", "USERS", "ADMINS"]) {
  const name = lib.match(new RegExp(`${konst}\\s*=\\s*"([^"]+)"`))?.[1] ?? null;
  ok(
    `${konst.toLowerCase()} collection is covered by the rules`,
    Boolean(name) && rules.includes(`match /${name}/`),
    `client=${name}`,
  );
}

// The allowed domain is written in two languages — a JS suffix check in lib/firebase.ts
// and a regex in the rules — so it gets the same drift treatment as the option lists.
const clientDomain = lib.match(/ALLOWED_EMAIL_DOMAIN\s*=\s*"([^"]+)"/)?.[1] ?? null;
ok(
  "allowed email domain matches the rules",
  Boolean(clientDomain) &&
    rules.includes(clientDomain.replace(/\./g, "[.]")),
  `client=${clientDomain}`,
);

// THE ASSERTIONS BELOW ARE THE BOUNDARY, stated literally. Each one exists because a
// plausible, well-meaning edit would remove it:
//
//   "let the dashboard read profiles"      -> would drop the admin-only list rule
//   "members should be able to leave"      -> would add a delete a compromised session
//                                             could use to wipe the roster
//   "make onboarding smoother"             -> would drop email_verified, letting anyone
//                                             claim a colleague's address
//   "let admins manage admins"             -> the one privilege escalation in this model
ok("profile writes are validated, not open",
  /allow create: if isMember\(\)[\s\S]{0,200}isWellFormedProfile/.test(rules));
ok("profiles cannot be deleted from any client",
  /match \/users\/\{uid\}[\s\S]*?allow delete: if false/.test(rules));
ok("the membership list is admin-only",
  /allow list: if isAdmin\(\)/.test(rules));
ok("a verified address is required",
  /email_verified\s*==\s*true/.test(rules));
ok("the domain is anchored at both ends",
  /matches\('\^\[\^@\]\+@sst\[\.\]scaler\[\.\]com\$'\)/.test(rules));
ok("admins cannot be written by any client",
  /match \/admins\/\{email\}[\s\S]*?allow write: if false/.test(rules));
ok("the admin list cannot be enumerated",
  /match \/admins\/\{email\}[\s\S]*?allow list: if false/.test(rules));
ok("legacy applications stay unreadable",
  /match \/applications\/\{id\}[\s\S]*?allow read: if false/.test(rules));
ok("no test-mode wildcard write", !/allow read, write:\s*if true/.test(rules));
ok("server timestamps are enforced",
  /updated_at\s*==\s*request\.time/.test(rules));
ok("identity fields are frozen on edit",
  /function immutablesUnchanged\(\)[\s\S]{0,400}created_at\s*==\s*resource\.data\.created_at/.test(rules));

// `programs` is the one list field the form requires, so "at least one" has to survive
// in the rules and not only in the component. A checkbox group cannot use `required`,
// which means the browser-side half of this is a setCustomValidity call that a future
// refactor could drop without anything looking broken.
ok(
  "at least one programme is required",
  /d\.programs\.size\(\)\s*>\s*0/.test(rules),
);
// The pairing, in both directions. A bare 'other' is an application nobody can act on.
ok(
  "'other' requires the free-text field",
  /!d\.programs\.hasAny\(\['other'\]\)[\s\S]{0,200}?'programs_other' in d/.test(rules),
);
ok(
  "the free-text field requires 'other'",
  /!\('programs_other' in d\)[\s\S]{0,200}?d\.programs\.hasAny\(\['other'\]\)/.test(rules),
);
// PROGRAM_OTHER is what the form branches on when deciding to render that input. If it
// stops being 'other', the two assertions above are checking a value nothing sends.
const otherValue = content.match(/PROGRAM_OTHER\s*=\s*"([^"]+)"/)?.[1] ?? null;
ok(
  "PROGRAM_OTHER matches the value in the rules",
  otherValue === "other",
  `content=${otherValue}`,
);

console.log(
  failed === 0
    ? "\n  rules agree with the form.\n"
    : `\n  ${failed} mismatch(es). Fix firestore.rules or content/join.ts.\n`,
);
process.exit(failed === 0 ? 0 : 1);
