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

/** The body of ONE `match /<name>/{...}` block, braces balanced.
 *
 *  THIS EXISTS BECAUSE THE OBVIOUS PATTERN SILENTLY READS THE WRONG COLLECTION. The
 *  assertions below used to be written as
 *
 *      /match \/admins\/\{email\}[\s\S]*?allow write: if false/
 *
 *  and `[\s\S]*?` does not stop at the end of the block -- it runs on until it finds the
 *  text somewhere, anywhere, further down the file. When `admins` gained owner-writes,
 *  that assertion kept passing by matching the `allow write: if false` inside
 *  `contributions`, 100 lines below. It was asserting a real line about the wrong
 *  collection, which is worse than not asserting at all: the check was green while the
 *  rule it named had been removed.
 *
 *  Caught only because a NEIGHBOURING assertion failed and made me read both. */
function blockFor(name) {
  const m = rules.match(new RegExp(`match /${name}/\\{[^}]*\\}\\s*\\{`));
  if (!m) return null;
  const open = m.index + m[0].length - 1;
  let depth = 0;
  for (let i = open; i < rules.length; i++) {
    if (rules[i] === "{") depth++;
    else if (rules[i] === "}") {
      depth--;
      if (depth === 0) return rules.slice(open, i + 1);
    }
  }
  return null;
}

/** Assert a pattern INSIDE one block, so a match cannot leak in from a neighbour. */
const inBlock = (name, re) => {
  const body = blockFor(name);
  return body !== null && re.test(body);
};

let failed = 0;
const ok = (name, pass, detail = "") => {
  if (!pass) failed++;
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
};

/** Values inside each `[...]` list in the rules for a given field — ONE ENTRY PER
 *  OCCURRENCE, and the plural is the whole point.
 *
 *  This returned only the first match while there was one form. There are two now, and
 *  the rules validate them with two separate functions: `isWellFormedProfile` for a
 *  signed-in member and `isWellFormedApplication` for an anonymous applicant. Both
 *  hardcode the same three closed sets, both are a copy of content/join.ts, and checking
 *  only the first would let the second drift silently — which is the exact failure this
 *  script exists to catch, reintroduced one level down.
 *
 *  Matches both `d.level in [...]` and `d.programs.hasOnly([...])`. */
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
  ["level", contentValues("LEVELS")],
  ["path", contentIds("PATHS")],
  ["hostel", contentValues("HOSTELS")],
  ["programs", contentValues("PROGRAMS")],
]) {
  const copies = rulesSets(field);
  // EVERY copy, not the first. A field validated in two places is only as correct as its
  // worst copy, and the one that drifts will be whichever the author was not looking at.
  const bad = copies.filter((c) => !same(c, fromContent));
  ok(
    `${field} sets match`,
    copies.length > 0 && bad.length === 0,
    copies.length === 0
      ? `absent from the rules, content=${show(fromContent)}`
      : bad.length === 0
        ? `(${copies.length} copies, ${copies[0].size} values)`
        : `${bad.length}/${copies.length} copies disagree: ${bad
            .map(show)
            .join(" ")} content=${show(fromContent)}`,
  );
}

// The collection name is shared between the rules and the client. Different strings
// here means the write targets a path the rules do not cover, so it is denied by the
// catch-all — a permission error that looks nothing like a naming mistake.
const lib = readFileSync(join(here, "..", "lib", "firebase.ts"), "utf8");
// Every collection the client names must have a match block, or a write goes to a path
// no rule covers and is denied by the catch-all — a permission error that looks nothing
// like a naming mistake.
for (const konst of ["APPLICATIONS", "USERS", "ADMINS", "ANNOUNCEMENTS", "CONTRIBUTIONS"]) {
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
  inBlock("users", /allow delete: if false/));
ok("the membership list is admin-only",
  /allow list: if isAdmin\(\)/.test(rules));
ok("a verified address is required",
  /email_verified\s*==\s*true/.test(rules));
ok("the domain is anchored at both ends",
  /matches\('\^\[\^@\]\+@sst\[\.\]scaler\[\.\]com\$'\)/.test(rules));
// THIS ASSERTION WAS REPLACED, NOT REPAIRED. It read "admins cannot be written by any
// client", which was true while the roster was managed entirely in the Firebase console.
// It is not true any more: owners write it, so that every monthly addition does not wait
// on whoever holds console access. What still has to hold is the narrower thing that was
// actually protecting anything -- an ORDINARY admin cannot appoint anybody, so one
// compromised college account cannot escalate.
ok("only owners write the roster",
  inBlock("admins", /allow create: if isOwner\(\)/) &&
  inBlock("admins", /allow update: if isOwner\(\)/));
ok("an owner cannot edit their own roster row",
  (blockFor("admins")?.match(/request\.auth\.token\.email\.lower\(\) != email/g) ?? []).length >= 2);
ok("roster rows cannot be deleted, only retired",
  inBlock("admins", /allow delete: if false/));
ok("retiring somebody actually revokes access",
  /function isAdmin\(\)[\s\S]{0,600}?get\('active', true\) == true/.test(rules));
ok("an old row cannot silently become an owner",
  /function isOwner\(\)[\s\S]{0,300}?get\('role', 'admin'\) == 'owner'/.test(rules));
// ALSO FLIPPED. The roster is listable now, because the organisers manage it in the UI.
// The half that mattered is that MEMBERS still cannot enumerate it, which is the
// difference between `isAdmin()` and `isMember()` here.
ok("only admins can enumerate the roster",
  inBlock("admins", /allow list: if isAdmin\(\)/));
// APPLICATIONS GET FOUR ASSERTIONS RATHER THAN ONE, because this is the only collection
// an unauthenticated stranger may write to. It used to get one — "legacy applications stay
// unreadable" — which was the right amount of attention for a collection nothing wrote to
// any more. /join is an anonymous form again, so the create rule is live, and a one-word
// edit to it ("if true") turns the club's Firestore project into a public document store.
//
// Extracted as a block rather than matched with a lazy `[\s\S]*?` across the whole file:
// the negative assertion below has to be sure it is reading THIS block and not finding a
// phrase in some later one.
const applicationsBlock =
  rules.match(/match \/applications\/\{id\} \{([\s\S]*?)\n    \}/)?.[1] ?? "";
ok("the applications block was found at all", applicationsBlock.length > 0);
ok("applications are unreadable from every client, admins included",
  /allow read: if false/.test(applicationsBlock));
ok("applications are immutable once submitted",
  /allow update, delete: if false/.test(applicationsBlock));
// THE LOAD-BEARING ONE.
ok("anonymous applications are validated, not merely accepted",
  /allow create: if isWellFormedApplication\(request\.resource\.data\)/.test(
    applicationsBlock,
  ));
// AND THE INVERSE, which is the regression this whole change undoes. If somebody ever
// puts isMember() on this create rule, applying will require a college Google account
// again — and the site's own headline promises the reader it does not.
ok("applying does not require sign-in",
  !/allow create: if[^;]*isMember\(\)/.test(applicationsBlock));
ok("no test-mode wildcard write", !/allow read, write:\s*if true/.test(rules));
// FIELDS THAT WERE DELETED STAY DELETED, in both files or neither. `hasOnly` is strict,
// so a field reintroduced to the form but not the rules means every save fails; the
// reverse leaves a field the rules accept and nothing writes. Either way it is silent.
for (const gone of ["why", "heard_from", "interests", "updates"]) {
  const inRules = new RegExp(`'${gone}'`).test(rules);
  const inContent = new RegExp(`export const ${gone.toUpperCase()}\\b`).test(content);
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

// ---------------------------------------------------------------- the notice board
//
// THE SAME TREATMENT AS THE PROFILE ASSERTIONS ABOVE, and each of these exists because a
// plausible, well-meaning edit would remove it:
//
//   "members should be able to post too"      -> would open an admin-only collection to
//                                                anybody with a college address
//   "let people read the board signed out"    -> would make a members-only board public
//   "the link field is just a string"         -> would allow javascript: in a field that
//                                                renders as an anchor
ok("only admins write the notice board",
  inBlock("announcements", /allow create: if isAdmin\(\)/));
ok("the notice board is members-only to read",
  inBlock("announcements", /allow get, list: if isMember\(\)/));
ok("a post's link must be https",
  /d\.link\.matches\('\^https:/.test(rules));
ok("a post's byline cannot be forged",
  /author_email == request\.auth\.token\.email/.test(rules));

// ------------------------------------------------------------------ contributions
//
// THE ONE ASSERTION IN THIS FILE THAT PROTECTS A NUMBER RATHER THAN A PERSON. If any
// client can write contributions/{uid}, "merged pull requests" becomes a self-reported
// figure and the whole panel is decoration. The Cloud Function writes through the Admin
// SDK, which does not go through these rules at all, so denying every client costs
// nothing at all and is the entire reason the collection is separate from users/{uid}.
ok("nobody writes their own contribution counts",
  inBlock("contributions", /allow write: if false/));
ok("contributions are readable only by their owner or an admin",
  inBlock("contributions", /allow get: if isMember\(\) && \(request\.auth\.uid == uid \|\| isAdmin\(\)\)/));

// THE FUNCTIONS REGION, IN THREE FILES. The callable is addressed by region on the
// client, deployed to one by setGlobalOptions, and named in the CSP's connect-src. A
// mismatch between any two of them is a button that fails with `functions/internal` --
// which reads like the function threw rather than like a URL nobody can reach, and is
// therefore debugged in the wrong file entirely.
{
  const region = lib.match(/FUNCTIONS_REGION\s*=\s*"([^"]+)"/)?.[1] ?? null;
  const fns = readFileSync(join(here, "..", "..", "functions", "index.js"), "utf8");
  const csp = readFileSync(join(here, "..", "lib", "security-headers.js"), "utf8");
  const inFns = Boolean(region) && new RegExp(`region:\\s*"${region}"`).test(fns);
  const inCsp = Boolean(region) && new RegExp(`FUNCTIONS_REGION\\s*=\\s*"${region}"`).test(csp);
  ok(
    "the functions region agrees across the client, the functions and the CSP",
    Boolean(region) && inFns && inCsp,
    `client=${region} functions=${inFns} csp=${inCsp}`,
  );
}

console.log(
  failed === 0
    ? "\n  rules agree with the form.\n"
    : `\n  ${failed} mismatch(es). Fix firestore.rules or content/join.ts.\n`,
);
process.exit(failed === 0 ? 0 : 1);
