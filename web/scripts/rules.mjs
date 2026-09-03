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
//
// AND IT HAS TO KNOW WHAT A STRING IS, which the one-line regex this used to be did not.
// `d.link.matches('^https://…')` contains a literal // inside a quoted string, so the
// regex deleted the rest of the line and the assertion that the notice board refuses a
// `javascript:` href reported the rule missing when it was right there. That is the same
// failure in the other direction — code read as prose — and it is worse, because the
// obvious fix is to weaken the rule until the checker is happy.
//
// Rules strings are single-quoted with no escapes worth honouring, so one pass with a
// two-state scanner is enough.
function stripComments(src) {
  let out = "";
  let inString = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inString) {
      out += c;
      if (c === "'") inString = false;
      continue;
    }
    if (c === "'") {
      inString = true;
      out += c;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      out += "\n";
      continue;
    }
    out += c;
  }
  return out;
}
const rules = stripComments(rulesRaw);

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

/** Keys of an exported Record, which is how `level` is written now that upstream replaced
 *  the LEVELS array with LEVEL_LABEL. */
function contentKeys(exportName) {
  const start = content.indexOf(`export const ${exportName}`);
  if (start === -1) return null;
  const end = content.slice(start).search(/\n\}\s*(as const)?\s*;/);
  if (end === -1) return null;
  return new Set(
    [...content.slice(start, start + end).matchAll(/^\s{2}([A-Za-z0-9_-]+):/gm)].map((m) => m[1]),
  );
}

// EVERY OCCURRENCE OF EACH SET, not the first. `hostel` and `path` are written TWICE now —
// once on the member's profile and once on the anonymous application — exactly as
// `programme` is written twice below. A checker that read only the first copy would let
// the second drift, and the drift presents as a real applicant getting a permission error
// on a form that renders perfectly.
for (const [field, fromContent, expected] of [
  ["path", contentIds("PATHS"), 2],
  ["hostel", contentValues("HOSTELS"), 2],
  // Application-only, so far.
  ["level", contentKeys("LEVEL_LABEL"), 1],
  ["programs", contentValues("PROGRAMS"), 1],
]) {
  const sets = rulesSets(field);
  ok(`${field} is a closed set everywhere it appears`, sets.length === expected,
    `found ${sets.length}, expected ${expected}`);
  sets.forEach((s, i) => {
    ok(
      `${field} set ${i + 1} matches the content`,
      same(s, fromContent),
      same(s, fromContent) ? `(${s.size} values)` : `rules=${show(s)} content=${show(fromContent)}`,
    );
  });
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
for (const konst of [
  "APPLICATIONS",
  "USERS",
  "ADMINS",
  "MENTORS",
  "ENROLLMENTS",
  "ANNOUNCEMENTS",
  "FORMS",
  // A SUBCOLLECTION, which is why the test below cannot be a plain `match /name/`.
  // Responses live at forms/{formId}/responses/{uid}, so the string that proves they are
  // covered is `/responses/{` in the middle of a longer path — and the first version of
  // this loop, which looked for the path at the START, reported the one collection
  // holding members' answers as uncovered when it was fine.
  "RESPONSES",
  "SESSIONS",
  "CONTRIBUTIONS",
]) {
  const name = lib.match(new RegExp(`${konst}\\s*=\\s*"([^"]+)"`))?.[1] ?? null;
  const covered =
    Boolean(name) && new RegExp(`match\\s+[^\\n]*/${name}/\\{`).test(rules);
  ok(
    `${konst.toLowerCase()} collection is covered by the rules`,
    covered,
    `client=${name}`,
  );
}

// -------------------------------------------- the application's own field list
//
// THE ONE COLLECTION WHERE THE FIELD LIST ITSELF IS THE BOUNDARY. Everywhere else a write
// is pinned to a uid or an address, so an unexpected field is untidy; here the submitter
// is a stranger and `hasOnly` is the only thing stopping them appending whatever they like
// to a row an organiser opens later. So the rules' list and the client's type have to be
// the same list, and this is what says so.
//
// It also catches the quieter direction: a field ADDED to the form and not to the rules
// means every application is refused, on a page that renders perfectly.
const applicationsLib = readFileSync(join(here, "..", "lib", "applications.ts"), "utf8");

/** The `hasOnly([...])` list inside a named rules function. */
function hasOnlyIn(fnName) {
  const start = rules.indexOf(`function ${fnName}`);
  if (start === -1) return null;
  const m = rules.slice(start).match(/hasOnly\(\[([^\]]*)\]/);
  if (!m) return null;
  return new Set(
    m[1].split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean),
  );
}

/** Field names from an exported object-type alias. */
function typeFields(src, typeName) {
  const m = src.match(new RegExp(`export type ${typeName} = \\{([\\s\\S]*?)\\n\\};`));
  if (!m) return null;
  return new Set([...m[1].matchAll(/^\s{2}(\w+)\??:/gm)].map((x) => x[1]));
}

const appType = typeFields(applicationsLib, "Application");
// submitted_at is added by submitApplication() rather than typed on the form's payload,
// so it is the one field the rules expect that the type does not carry.
const appExpected = appType ? new Set([...appType, "submitted_at"]) : null;
const appRules = hasOnlyIn("isWellFormedApplication");
ok(
  "the application's fields match lib/applications.ts",
  same(appRules, appExpected),
  same(appRules, appExpected)
    ? `(${appRules.size} fields)`
    : `rules=${show(appRules)} client=${show(appExpected)}`,
);

// ------------------------------------------------ closed sets outside join.ts
//
// Three more lists the rules hardcode, and none of them live in content/join.ts — they
// are types beside the library that writes them. Same failure as every other copy in
// this file: add a value on one side only and a real organiser gets a permission error
// on save, with a screen that looks perfectly correct.
const announcementsLib = readFileSync(join(here, "..", "lib", "announcements.ts"), "utf8");
const rosterLib = readFileSync(join(here, "..", "lib", "roster.ts"), "utf8");

/** `value: "x"` entries from a named exported array in an arbitrary source file. */
function valuesFrom(src, exportName) {
  const start = src.indexOf(`export const ${exportName}`);
  if (start === -1) return null;
  const end = src.slice(start).search(/\n\]\s*(as const)?\s*;/);
  if (end === -1) return null;
  return new Set(
    [...src.slice(start, start + end).matchAll(/value:\s*"([^"]+)"/g)].map((m) => m[1]),
  );
}

/** The members of a string-union type alias: `export type Role = "owner" | "admin";` */
function unionFrom(src, typeName) {
  const m = src.match(new RegExp(`export type ${typeName}\\s*=([^;]+);`));
  if (!m) return null;
  return new Set([...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
}

for (const [field, fromClient, where] of [
  ["category", valuesFrom(announcementsLib, "CATEGORIES"), "announcements.ts CATEGORIES"],
  ["group", valuesFrom(rosterLib, "GROUPS"), "roster.ts GROUPS"],
  // The one that decides access rather than appearance. A rules file that accepted a role
  // the client cannot produce would be harmless; a client producing one the rules refuse
  // means an owner appoints somebody and the write fails.
  ["role", unionFrom(rosterLib, "Role"), "roster.ts Role"],
]) {
  const fromRules = rulesSet(field);
  ok(
    `${field} set matches ${where}`,
    same(fromRules, fromClient),
    same(fromRules, fromClient)
      ? `(${fromRules.size} values)`
      : `rules=${show(fromRules)} client=${show(fromClient)}`,
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
  /allow create: if isStudent\(\)[\s\S]{0,200}isWellFormedProfile/.test(rules));
ok("profiles cannot be deleted from any client",
  /match \/users\/\{uid\}[\s\S]*?allow delete: if false/.test(rules));
ok("the membership list is admin-only",
  /allow list: if isAdmin\(\)/.test(rules));
ok("a verified address is required",
  /email_verified\s*==\s*true/.test(rules));
ok("the domain is anchored at both ends",
  /matches\('\^\[\^@\]\+@sst\[\.\]scaler\[\.\]com\$'\)/.test(rules));
// THE ROSTER, which used to be "no client writes this, ever" and is now the one place a
// client can grant access. Every assertion below is a fence around that widening, and
// each exists because a plausible edit would take it down:
//
//   "admins should manage the team"     -> drops isOwner(), and one compromised admin
//                                          account can appoint accomplices
//   "let me fix my own title"           -> drops the self-guard, and an owner can demote
//                                          themselves into a state only somebody else can
//                                          undo — or, with the guard gone, a compromised
//                                          owner can retire every other owner and be the
//                                          only one holding the club
//   "retired rows are clutter"          -> a delete, which destroys the handover record
//                                          and is the one revocation that cannot be undone
// CREATE AND UPDATE ARE ASSERTED SEPARATELY BECAUSE THEY ARE WRITTEN SEPARATELY, and the
// reason is worth stating: allow statements OR together, so a single
// `allow create, update` next to a stricter `allow update` would not tighten anything —
// the looser one grants the write and the stricter one never gets a say. Anybody merging
// these two back into one line takes the appointment date's freeze off with it.
for (const verb of ["create", "update"]) {
  const re = (tail) =>
    new RegExp(`match \\/admins\\/\\{email\\}[\\s\\S]*?allow ${verb}: if isOwner\\(\\)${tail}`);
  ok(`only owners may ${verb} a roster row`, re("").test(rules));
  ok(`nobody may ${verb} their own roster row`,
    re("[\\s\\S]{0,160}request\\.auth\\.token\\.email\\.lower\\(\\) != email").test(rules));
  ok(`roster ${verb}s are validated, not open`,
    re("[\\s\\S]{0,220}isWellFormedRosterRow").test(rules));
}
ok("an edit cannot erase when somebody was appointed",
  /allow update: if isOwner\(\)[\s\S]{0,400}request\.resource\.data\.added_at == resource\.data\.added_at/.test(rules));

// THE SAME FREEZE, ON THE THREE COLLECTIONS WHOSE CLIENT WRITES ARE FULL OVERWRITES.
// setFlags(), saveSession() and saveForm() all send the whole document rather than the
// field that changed, so each one has to put the creation date back — and if the rule does
// not insist, a version that forgets simply erases it, with nothing on screen to say so.
for (const [collection, id] of [
  ["announcements", "id"],
  ["sessions", "id"],
  ["forms", "formId"],
]) {
  ok(
    `an edit cannot erase when a ${collection.replace(/s$/, "")} was created`,
    new RegExp(
      `match \\/${collection}\\/\\{${id}\\}[\\s\\S]*?allow update:[\\s\\S]{0,900}request\\.resource\\.data\\.created_at == resource\\.data\\.created_at`,
    ).test(rules),
  );
}
ok("roster rows cannot be deleted from any client",
  /match \/admins\/\{email\}[\s\S]*?allow delete: if false/.test(rules));
ok("the roster is not readable by an ordinary member",
  /match \/admins\/\{email\}[\s\S]*?allow list: if isAdmin\(\)/.test(rules));
// THE TWO DEFAULTS, WHICH web/lib/auth.tsx MIRRORS. A missing flag means active and a
// missing role means plain admin. Getting either backwards is silent: the first locks out
// every organiser the club already had, the second promotes all of them.
ok("a retired organiser loses access, not just their buttons",
  /function isAdmin\(\)[\s\S]{0,300}adminRow\(\)\.get\('active', true\) == true/.test(rules));
ok("owner is a role on the row, and defaults to plain admin",
  /function isOwner\(\)[\s\S]{0,200}adminRow\(\)\.get\('role', 'admin'\) == 'owner'/.test(rules));
ok("applications stay unreadable from every client",
  /match \/applications\/\{id\}[\s\S]*?allow read: if false/.test(rules));
ok("applications cannot be edited once sent",
  /match \/applications\/\{id\}[\s\S]*?allow update, delete: if false/.test(rules));
// THE ONLY UNAUTHENTICATED WRITE IN THE FILE, and the club's front door. A merge once
// closed it with a comment calling the collection legacy while /join still rendered the
// form that writes to it, so every application was silently refused. These two say the
// door is open AND that the validator is the thing holding it.
ok("a stranger may still apply",
  /match \/applications\/\{id\}[\s\S]*?allow create: if isWellFormedApplication/.test(rules));
ok("an application is validated field by field",
  /function isWellFormedApplication\(d\)[\s\S]{0,200}hasOnly/.test(rules));
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
// SCOPED TO THE PROFILE, NOT TO THE WHOLE FILE, and getting that wrong is what would
// quietly re-break the apply form. Four of these fields — year_branch, level, programs,
// programs_other — were cut from the MEMBER'S PROFILE and are still asked of a STRANGER
// on the application, so a check that greps the whole rules file for them fails the
// moment the application validator exists. The tempting way to make it green again is to
// delete the application rule, which is precisely the mistake this file is here to stop.
// So the profile's own function body is what gets searched.
const profileBody = (() => {
  const start = rules.indexOf("function isWellFormedProfile");
  if (start === -1) return "";
  const end = rules.indexOf("\n    }", start);
  return end === -1 ? rules.slice(start) : rules.slice(start, end);
})();
ok("the profile validator was found, so the scoped checks below mean something",
  profileBody.length > 200, `${profileBody.length} chars`);

for (const [gone, exportName, scope] of [
  // Gone from EVERYWHERE. Nothing in this repo writes these any more, so the whole rules
  // file is the right thing to search.
  ["why", null, "rules"],
  ["heard_from", null, "rules"],
  ["interests", null, "rules"],
  ["updates", null, "rules"],
  // Gone from the PROFILE, still asked on the anonymous application.
  ["year_branch", null, "profile"],
  // `LEVELS` the array is gone; upstream replaced it with the LEVEL_LABEL record, whose
  // keys the application rule mirrors and which is diffed against it above.
  ["level", "LEVELS", "profile"],
  // `programs` (a checkbox list) is a different field from `programme` (singular, on a
  // mentor and an enrollment), which is checked above. The regex looks for the quoted
  // plural exactly, so it does not fire on the singular.
  ["programs", null, "profile"],
  ["programs_other", null, "profile"],
]) {
  const haystack = scope === "profile" ? profileBody : rules;
  const inRules = new RegExp(`'${gone}'`).test(haystack);
  const inContent = exportName
    ? new RegExp(`export const ${exportName}\\s*[=:]`).test(content)
    : false;
  ok(
    `the removed field "${gone}" is absent from ${scope === "profile" ? "the profile" : "the rules"} and the content`,
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
  /match \/mentors\/\{id\}[\s\S]*?allow get, list: if isStudent\(\)/.test(rules));

ok("enrollments are written by their owner only",
  /match \/enrollments\/\{uid\}[\s\S]*?allow create: if isStudent\(\)[\s\S]{0,120}request\.auth\.uid == uid/.test(rules));
ok("the enrollment list is admin-only",
  /match \/enrollments\/\{uid\}[\s\S]*?allow list: if isAdmin\(\)/.test(rules));
ok("an enrollment can only be withdrawn by its owner",
  /match \/enrollments\/\{uid\}[\s\S]*?allow delete: if isStudent\(\) && request\.auth\.uid == uid/.test(rules));
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

// ----------------------------------------------------------------- dashboard
//
// The five collections the dashboard added. These fell to the catch-all for a while after
// an upstream merge took the rules file wholesale — the panels errored, nothing leaked,
// and the only thing that said so was a comment. These assertions are what would have
// said so instead.
//
//   "the board is public anyway"        -> a notice board readable signed out, on a site
//                                          whose every other collection needs a college
//                                          address
//   "members should see who signed up"  -> the one rule between an attributed form and a
//                                          public one
//   "let the browser fetch GitHub"      -> a count the client writes is a count the client
//                                          invented

ok("the notice board is signed-in students only, filtered by audience",
  /match \/announcements\/\{id\}[\s\S]*?allow get, list: if isStudent\(\) && canSeeAudience\(\)/.test(rules));
ok("only admins may post a notice",
  /match \/announcements\/\{id\}[\s\S]*?allow create: if isAdmin\(\)/.test(rules));
ok("notice writes are validated, not open",
  /allow create: if isAdmin\(\)[\s\S]{0,220}isWellFormedPost/.test(rules));
// The one field in this app that renders as a member-clickable link out of free text an
// organiser typed. Without the scheme check, `javascript:` in it is a script in a
// signed-in member's page.
ok("a notice link must be https",
  /d\.link\.matches\('\^https:\/\//.test(rules));
// Pinned on create, frozen on edit. Not the same rule: pin it on edit too and any admin
// touching a notice signs their name to it; freeze it on create and it is pinned to
// nothing.
ok("a notice byline is pinned to its author on create",
  /match \/announcements\/\{id\}[\s\S]*?allow create:[\s\S]{0,200}author_email == request\.auth\.token\.email/.test(rules));
ok("a notice byline cannot be rewritten on edit",
  /match \/announcements\/\{id\}[\s\S]*?allow update:[\s\S]{0,200}author_email == resource\.data\.author_email/.test(rules));

ok("sessions are signed-in students only, filtered by audience",
  /match \/sessions\/\{id\}[\s\S]*?allow get, list: if isStudent\(\) && canSeeAudience\(\)/.test(rules));
ok("only admins may schedule a session",
  /match \/sessions\/\{id\}[\s\S]*?allow create: if isAdmin\(\)/.test(rules));
ok("session writes are validated, not open",
  /match \/sessions\/\{id\}[\s\S]*?isWellFormedSession/.test(rules));
// THE ONE CLIENT-CHOSEN DATE IN THE FILE, asserted so that a future sweep pinning every
// timestamp to request.time does not quietly make scheduling impossible.
ok("a session's start time is chosen by the organiser, not the server",
  /d\.starts_at is timestamp/.test(rules));

ok("only admins may write a form",
  /match \/forms\/\{formId\}[\s\S]*?allow create: if isAdmin\(\)/.test(rules));
ok("form writes are validated, not open",
  /match \/forms\/\{formId\}[\s\S]*?isWellFormedForm/.test(rules));
// The tally is the aggregate every member can see, so it is the number worth forging.
ok("no client may invent a tally",
  /allow create: if isAdmin\(\)[\s\S]{0,200}!\('tally' in request\.resource\.data\)/.test(rules));
ok("an edit may carry the tally back but not change it",
  /request\.resource\.data\.tally == resource\.data\.tally/.test(rules));

ok("a member may read only their own response",
  /match \/forms\/\{formId\}\/responses\/\{uid\}[\s\S]*?allow get: if isStudent\(\) && \(request\.auth\.uid == uid \|\| isAdmin\(\)\)/.test(rules));
ok("responses cannot be enumerated by a member",
  /match \/forms\/\{formId\}\/responses\/\{uid\}[\s\S]*?allow list: if isAdmin\(\)/.test(rules));
ok("a member may answer only as themselves",
  /match \/forms\/\{formId\}\/responses\/\{uid\}[\s\S]*?allow create: if isStudent\(\)[\s\S]{0,120}request\.auth\.uid == uid/.test(rules));
// Closing a form is the only thing an organiser has to stop a sign-up once the room is
// full. Enforced here, because the hidden button is a rendering decision.
ok("a closed form takes no more answers",
  /allow create: if isStudent\(\)[\s\S]{0,200}formDoc\(formId\)\.open == true/.test(rules));
// Rules cannot iterate a list of maps, so the flat mirror is the ONLY expressible form of
// "answers may only use keys this form asked about".
ok("answers are pinned to the form's own question ids",
  /d\.answers\.keys\(\)\.hasOnly\(formDoc\(formId\)\.field_ids\)/.test(rules));
ok("the mirror cannot drift from the questions it mirrors",
  /d\.field_ids\.size\(\) == d\.fields\.size\(\)/.test(rules));

ok("contribution counts are written by no client",
  /match \/contributions\/\{uid\}[\s\S]*?allow write: if false/.test(rules));
ok("a member may read only their own contributions",
  /match \/contributions\/\{uid\}[\s\S]*?allow get: if isStudent\(\) && \(request\.auth\.uid == uid \|\| isAdmin\(\)\)/.test(rules));


// ---------------------------------------------------------------- membership
//
// THE DISTINCTION THESE GUARD. `isStudent()` is every verified address on the college
// domain; `isClubMember()` is the subset the organisers have admitted. They were the
// same function until an audience picker needed them not to be, and the whole value of
// the split is that nothing can quietly re-merge them. Each assertion below fails on a
// specific plausible edit:
//
//   "simplify — membership is just being signed in"  -> would restore the original bug,
//                                                       every student reading everything
//   "let a member fix their own profile completely"  -> would let them grant themselves
//                                                       membership and read the club's
//                                                       private board
//   "admins should be able to fix a member's name"   -> would widen the one rule in this
//                                                       file that writes another
//                                                       person's document

ok("membership is a separate question from signing in",
  /function isClubMember\(\)[\s\S]{0,200}membership', 'student'\) == 'member'/.test(rules));
ok("an absent membership means NOT a member",
  /profileRow\(\)\.get\('membership', 'student'\)/.test(rules));
ok("a new profile cannot claim membership",
  /allow create: if isStudent\(\)[\s\S]{0,320}hasAny\(\['membership', 'membership_by', 'membership_at'\]\)/.test(rules));
ok("a member cannot edit their own membership",
  /allow update: if isStudent\(\)[\s\S]{0,320}membershipUnchanged\(\)/.test(rules));
ok("only an admin may change membership, and only membership",
  /allow update: if isAdmin\(\)\s*&& onlyMembershipChanged\(\)/.test(rules));
ok("an admin changing membership is stamped from their own token",
  /onlyMembershipChanged\(\)[\s\S]{0,400}membership_by == request\.auth\.token\.email/.test(rules));
ok("membership changes cannot be backdated",
  /onlyMembershipChanged\(\)[\s\S]{0,400}membership_at == request\.time/.test(rules));

// ------------------------------------------------------------------ audience
//
// The three values are a closed set in BOTH files, and an absent audience reads as
// 'both' in both — see web/lib/audience.ts. A mismatch here is the failure that hides:
// a notice targeted at a value the rules do not know would be refused to every reader
// while looking perfectly correct on the organiser's screen.

ok("audience is a closed set of exactly three values",
  /d\.audience in \['members', 'students', 'both'\]/.test(rules));
// THE READ RULE READS THE FIELD DIRECTLY, WITH NO DEFAULT, and this assertion is the
// one that would catch it being "tidied up" back into `resource.data.get('audience',
// 'both')`. That form is not enforced against a QUERY — verified on the emulator — so
// an unfiltered list returns members-only rows to anybody. See the note on
// canSeeAudience() in firestore.rules.
ok("the read rule compares the audience field directly, with no default",
  /function canSeeAudience\(\)[\s\S]{0,260}resource\.data\.audience == 'both'/.test(rules));
ok("no defaulted audience lookup survives in the read rule",
  !/function canSeeAudience\(\)[\s\S]{0,400}\.get\('audience'/.test(rules));
ok("members-only content requires club membership",
  /resource\.data\.audience == 'members' && isClubMember\(\)/.test(rules));
ok("students-only content is hidden from members",
  /resource\.data\.audience == 'students' && !isClubMember\(\)/.test(rules));
ok("organisers see every audience",
  /function canSeeAudience\(\) \{\s*return isAdmin\(\)/.test(rules));
// The write-time twin, which MAY default because it is never evaluated against a query
// — it is what lets a member answer a form written before audiences existed.
ok("answering a form tolerates a form with no audience",
  /function canAnswerForm\(f\)[\s\S]{0,200}f\.get\('audience', 'both'\)/.test(rules));
ok("the three content shapes all validate audience",
  (rules.match(/isWellFormedAudience\(d\)/g) || []).length >= 3);
// A form a non-member cannot SEE must also be one they cannot ANSWER. Reading and
// writing are separate requests against separate paths, so the read gate is not a
// write gate — this is the clause that closes the back door.
ok("a form's audience also gates who may answer it",
  /match \/forms\/\{formId\}\/responses\/\{uid\}[\s\S]*?allow create: if isStudent\(\)[\s\S]{0,260}canAnswerForm\(formDoc\(formId\)\)/.test(rules));

console.log(
  failed === 0
    ? "\n  rules agree with the form.\n"
    : `\n  ${failed} mismatch(es). Fix firestore.rules, content/join.ts, or the library the set lives beside.\n`,
);
process.exit(failed === 0 ? 0 : 1);
