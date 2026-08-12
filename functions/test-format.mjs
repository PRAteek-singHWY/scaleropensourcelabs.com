// Exercise the email formatter without Firebase, billing, SMTP, or a deploy.
//
//   cd functions && npm test
//
// The formatter is the part with all the logic and the only part an organiser sees, so
// it is worth testing on its own. The trigger around it is four lines of plumbing that
// the Functions emulator covers.

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { formatApplication } = require("./format.js");

let pass = 0;
let fail = 0;
const ok = (name, cond, detail = "") => {
  cond ? pass++ : fail++;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : `  ${detail}`}`);
};

const full = {
  name: "Ravi Kulkarni",
  email: "ravi.kulkarni@example.com",
  year_branch: "1st year, ECE",
  hostel: "uniworld-1",
  level: "some-git",
  path: "program-track",
  programs: ["gsoc", "outreachy"],
  interests: ["web", "docs"],
  github: "ravik",
  heard_from: "senior",
  updates: true,
  why: "I want a first merged pull request that somebody real reviewed.",
  submitted_at: new Date("2026-08-13T05:30:00Z"),
};

const a = formatApplication(full, "abc123");

console.log("\nemail formatter\n");
ok("subject names the applicant", a.subject.includes("Ravi Kulkarni"), a.subject);
ok("subject carries the programmes for triage", a.subject.includes("Google Summer of Code"), a.subject);
ok("codes are rendered as labels, not raw", a.text.includes("Some Git experience"), "level not labelled");
ok("hostel is labelled", a.text.includes("Uniworld 1"));
ok("path is labelled", a.text.includes("Program track"));
ok("interests are labelled and joined", a.text.includes("Web, Docs / writing"));
ok("github becomes a usable link", a.text.includes("https://github.com/ravik"));
ok("the why text is included verbatim", a.text.includes("somebody real reviewed"));
ok("reply-to is the applicant", a.replyTo === "ravi.kulkarni@example.com", String(a.replyTo));
ok("document id is quoted for lookup", a.text.includes("applications/abc123"));
ok("timestamp rendered in IST", a.text.includes("IST"), "no IST marker");

// A raw code must survive rather than being erased, in case labels.js falls behind.
const unknown = formatApplication({ ...full, level: "brand-new-value" });
ok("an unmapped code shows the raw value, not 'Unknown'", unknown.text.includes("brand-new-value"));

// 'other' is meaningless without the text naming it.
const other = formatApplication({ ...full, programs: ["other"], programs_other: "Season of Docs" });
ok("'other' shows the named programme", other.text.includes("Season of Docs"));
const otherUnnamed = formatApplication({ ...full, programs: ["other"] });
ok("'other' with no text says so explicitly", otherUnnamed.text.includes("(not named)"));

// Optional fields absent — the common case, and it must not print "undefined".
const sparse = formatApplication({
  name: "Asha",
  email: "asha@example.com",
  year_branch: "2nd year, CSE",
  hostel: "uniworld-2",
  level: "none",
  path: "build-day",
  programs: ["hacktoberfest"],
  why: "Curious.",
});
ok("no 'undefined' leaks into the body", !sparse.text.includes("undefined"), sparse.text);
ok("missing github is stated, not blank", sparse.text.includes("not given"));
ok("missing interests render as a dash", sparse.text.includes("—"));
ok("missing timestamp does not crash", sparse.text.includes("just now"));

// A malformed address must not become a Reply-To, which some clients refuse to send.
const badEmail = formatApplication({ ...full, email: "not-an-email" });
ok("malformed email is not used as reply-to", badEmail.replyTo === undefined, String(badEmail.replyTo));

// Nothing at all — the function must never throw on a partial document.
let threw = false;
try {
  formatApplication({});
} catch {
  threw = true;
}
ok("an empty document does not throw", !threw);

console.log(`\n  ${pass} passed, ${fail} failed\n`);
if (fail === 0) {
  console.log("--- sample email ---");
  console.log(`Subject: ${a.subject}`);
  console.log(`Reply-To: ${a.replyTo}\n`);
  console.log(a.text);
  console.log("--------------------\n");
}
process.exit(fail === 0 ? 0 : 1);
