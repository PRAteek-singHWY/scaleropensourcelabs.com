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
  // Matches both `d.path in [...]` and `d.programs.hasOnly([...])`.
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

/** EVERY occurrence of a field's closed set, because `programme` is now written twice —
 *  once for a mentor and once for an enrollment — and a check that only ever read the
 *  first would let the second drift silently. Returns one Set per occurrence. */
function rulesSets(field) {
  const re = new RegExp(`d\\.${field}(?:\\s+in\\s+|\\.hasOnly\\()\\[([^\\]]*)\\]`, "g");
  return [...rules.matchAll(re)].map(
    (m) =>
      new Set(
        m[1]
          .split(",")
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
          .filter(Boolean),
      ),
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
  ["path", contentIds("PATHS")],
  ["hostel", contentValues("HOSTELS")],
]) {
  const fromRules = rulesSet(field);
  ok(
    `${field} sets match`,
    same(fromRules, fromContent),
    same(fromRules, fromContent) ? `(${fromRules.size} values)` : `rules=${show(fromRules)} content=${show(fromContent)}`,
  );
}

// `programme` appears TWICE in the rules — on a mentor and on an enrollment — and both
// copies have to match PROGRAMS. Checking only the first is how the two drift apart: a
// new programme added to the mentor list but not to the enrollment one means an organiser
// can publish a mentor that no member can then choose, and the member's save fails with a
// permission error that looks nothing like the cause.
const programmes = contentValues("PROGRAMS");
const programmeSets = rulesSets("programme");
ok(
  "programme is a closed set in both places that carry it",
  programmeSets.length === 2,
  `found ${programmeSets.length}`,
);
programmeSets.forEach((s, i) => {
  ok(
    `programme set ${i + 1} matches PROGRAMS`,
    same(s, programmes),
    same(s, programmes) ? `(${s.size} values)` : `rules=${show(s)} content=${show(programmes)}`,
  );
});

// The collection name is shared between the rules and the client. Different strings
// here means the write targets a path the rules do not cover, so it is denied by the
// catch-all — a permission error that looks nothing like a naming mistake.
const lib = readFileSync(join(here, "..", "lib", "firebase.ts"), "utf8");
// Every collection the client names must have a match block, or a write goes to a path
// no rule covers and is denied by the catch-all — a permission error that looks nothing
// like a naming mistake.
for (const konst of ["APPLICATIONS", "USERS", "ADMINS", "MENTORS", "ENROLLMENTS"]) {
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
// FIELDS THAT WERE DELETED STAY DELETED, in both files or neither. `hasOnly` is strict,
// so a field reintroduced to the form but not the rules means every save fails; the
// reverse leaves a field the rules accept and nothing writes. Either way it is silent.
//
// THE CONTENT EXPORT IS NAMED EXPLICITLY, not derived with toUpperCase(). It used to be
// derived, and for `level` that produced `export const LEVEL\b` — which matches neither
// `LEVELS` nor `LEVEL_LABEL`, because `\b` does not fire between two word characters. The
// check would have passed whether or not the array was still there, which is the worst
// kind of green. Where a removed field has no content array at all, the name is null and
// only the rules half is asserted.
for (const [gone, exportName] of [
  ["why", null],
  ["heard_from", null],
  ["interests", null],
  ["updates", null],
  // Replaced by the batch derived from the college address — see web/lib/batch.ts.
  ["year_branch", null],
  ["level", "LEVELS"],
  // `programs` (the member's checkbox list) is gone; `programme` (singular, on a mentor
  // and an enrollment) is a different field and is checked above. The regex below looks
  // for the quoted plural exactly, so it does not fire on the singular.
  ["programs", null],
  ["programs_other", null],
]) {
  const inRules = new RegExp(`'${gone}'`).test(rules);
  const inContent = exportName
    ? new RegExp(`export const ${exportName}\\s*[=:]`).test(content)
    : false;
  ok(
    `the removed field "${gone}" is absent from both`,
    !inRules && !inContent,
    inRules || inContent ? `rules=${inRules} content=${inContent}` : "",
  );
}
ok("server timestamps are enforced",
  /updated_at\s*==\s*request\.time/.test(rules));
ok("identity fields are frozen on edit",
  /function immutablesUnchanged\(\)[\s\S]{0,400}created_at\s*==\s*resource\.data\.created_at/.test(rules));

// ---------------------------------------------------------------- mentorship
//
// Same treatment as the block above: each of these exists because a plausible edit would
// remove it, and because none of them would look broken on screen when they went.
//
//   "let mentors update their own entry"  -> a member write to a collection every other
//                                            member reads
//   "students should just pick one"       -> drops the pairing, and an unanswered second
//                                            preference becomes indistinguishable from a
//                                            deliberate one
//   "the exists() check is slow"          -> a preference pointing at nothing, which
//                                            renders as an id in the organisers' list

ok("only admins may write a mentor",
  /match \/mentors\/\{id\}[\s\S]*?allow create, update: if isAdmin\(\)/.test(rules));
ok("mentor writes are validated, not open",
  /allow create, update: if isAdmin\(\)[\s\S]{0,120}isWellFormedMentor/.test(rules));
ok("only admins may delete a mentor",
  /match \/mentors\/\{id\}[\s\S]*?allow delete: if isAdmin\(\)/.test(rules));
ok("every member may read the mentor list",
  /match \/mentors\/\{id\}[\s\S]*?allow get, list: if isMember\(\)/.test(rules));

ok("enrollments are written by their owner only",
  /match \/enrollments\/\{uid\}[\s\S]*?allow create: if isMember\(\)[\s\S]{0,120}request\.auth\.uid == uid/.test(rules));
ok("the enrollment list is admin-only",
  /match \/enrollments\/\{uid\}[\s\S]*?allow list: if isAdmin\(\)/.test(rules));
ok("an enrollment can only be withdrawn by its owner",
  /match \/enrollments\/\{uid\}[\s\S]*?allow delete: if isMember\(\) && request\.auth\.uid == uid/.test(rules));
ok("an enrollment's identity is frozen on edit",
  /match \/enrollments\/\{uid\}[\s\S]*?allow update:[\s\S]{0,400}created_at == resource\.data\.created_at/.test(rules));

// THE PAIRING, IN BOTH DIRECTIONS, and it is the assertion most worth having: the two
// halves look redundant and are not. Drop the first and a member can store a second
// preference while claiming to want only their first; drop the second and "no second
// preference" can be saved by simply leaving it out, which is the unanswered question
// this field exists to distinguish from a decision.
ok(
  "'first preference only' forbids a second preference",
  /!d\.first_only \|\| !\('mentor_2' in d\)/.test(rules),
);
ok(
  "not asking for first-preference-only requires a second preference",
  /d\.first_only \|\| 'mentor_2' in d/.test(rules),
);
ok(
  "the same mentor cannot be both preferences",
  /d\.mentor_2 != d\.mentor_1/.test(rules),
);
// Both ids must name a real mentor. Without this the organisers' interest list renders a
// truncated document id where a name should be, and nobody can explain why.
for (const f of ["mentor_1", "mentor_2"]) {
  ok(
    `${f} must reference a mentor that exists`,
    new RegExp(`exists\\(/databases/\\$\\(database\\)/documents/mentors/\\$\\(d\\.${f}\\)\\)`).test(rules),
  );
}

console.log(
  failed === 0
    ? "\n  rules agree with the form.\n"
    : `\n  ${failed} mismatch(es). Fix firestore.rules or content/join.ts.\n`,
);
process.exit(failed === 0 ? 0 : 1);
