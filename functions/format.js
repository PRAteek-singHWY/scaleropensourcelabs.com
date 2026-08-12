// Turn an application document into the email an organiser receives.
//
// Kept as a PURE FUNCTION in its own module, with no Firebase or nodemailer imports, so
// it can be tested without deploying anything, without billing enabled, and without
// sending mail to a real address. `npm test` in this directory exercises it directly.
// The trigger in index.js does nothing but call this and hand the result to SMTP.
//
// Plain text rather than HTML, on purpose. The content is a form submission read on a
// phone between classes; HTML mail buys nothing here, and a plain body cannot render
// somebody's typed answer as markup — an applicant who writes "<b>hi" in the why field
// should not be able to influence how the email looks, however harmlessly.

const { LEVELS, PATHS, HOSTELS, INTERESTS, PROGRAMS, HEARD_FROM, label } = require("./labels");

/** A Firestore Timestamp, a Date, or nothing → a readable IST string.
 *  IST because every reader of this email is in India, and a UTC timestamp on an
 *  application received at 21:00 local reads as the previous day. */
function when(ts) {
  const d =
    ts && typeof ts.toDate === "function" ? ts.toDate() : ts instanceof Date ? ts : null;
  if (!d) return "just now";
  return (
    d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    }) + " IST"
  );
}

/** Map a list of codes to labels. Returns an em dash for empty, so a blank line in the
 *  email is never ambiguous between "none selected" and "field missing". */
function list(map, values) {
  if (!Array.isArray(values) || values.length === 0) return "—";
  return values.map((v) => label(map, v)).join(", ");
}

/**
 * Build the notification email.
 * @param {object} d   the application document
 * @param {string} [id] the Firestore document id, so an organiser can find it
 * @returns {{subject: string, text: string, replyTo: string|undefined}}
 */
function formatApplication(d = {}, id) {
  const name = typeof d.name === "string" && d.name.trim() ? d.name.trim() : "Someone";

  // The programmes are the most decision-relevant field, so they go in the subject:
  // an organiser triaging a full inbox can sort without opening anything.
  const programmes = list(PROGRAMS, d.programs);
  const subject = `OSC application — ${name} (${programmes})`;

  const rows = [
    ["Name", d.name || "—"],
    ["Email", d.email || "—"],
    ["Year and branch", d.year_branch || "—"],
    ["Hostel", label(HOSTELS, d.hostel)],
    ["Experience", label(LEVELS, d.level)],
    ["Route in", label(PATHS, d.path)],
    ["Programmes", programmes],
  ];

  // "Other" is only meaningful next to the text that names it, so they are one row.
  if (Array.isArray(d.programs) && d.programs.includes("other")) {
    rows.push(["Other programme", d.programs_other || "(not named)"]);
  }

  rows.push(
    ["Interests", list(INTERESTS, d.interests)],
    ["GitHub", d.github ? `https://github.com/${d.github}` : "not given"],
    ["Heard about us via", label(HEARD_FROM, d.heard_from)],
    ["Wants updates", d.updates === true ? "yes" : "no"],
    ["Submitted", when(d.submitted_at)],
  );

  const width = Math.max(...rows.map(([k]) => k.length));
  const table = rows.map(([k, v]) => `${k.padEnd(width)}  ${v}`).join("\n");

  const text = [
    `${name} applied to the Open Source Club.`,
    "",
    table,
    "",
    "Why open source interests them",
    "------------------------------",
    (d.why || "—").trim(),
    "",
    "---",
    // No link to a console page: the document id is enough to find it, and a deep link
    // would need the project id hardcoded here where it would go stale.
    //
    // null, not "", for the absent case. Filtering on `!== ""` also stripped every
    // intentional blank line above and produced a wall of text with no paragraph
    // breaks — the tests all still passed, because they assert on content rather than
    // on shape. Caught by reading the rendered sample.
    id ? `Document: applications/${id}` : null,
    "Reply directly to this email to reach the applicant.",
    "This is an automated notification from the club website.",
  ]
    .filter((line) => line !== null)
    .join("\n");

  // Reply-To is the applicant, so hitting reply in any mail client answers the student
  // rather than the notification address. Only set when the address looks real — a
  // malformed Reply-To makes some clients refuse to send at all, and the rules already
  // enforce the format, so this is belt and braces.
  const replyTo =
    typeof d.email === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)
      ? d.email
      : undefined;

  return { subject, text, replyTo };
}

module.exports = { formatApplication, when, list };
