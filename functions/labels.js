// Human labels for the codes stored in an application document.
//
// A SECOND COPY OF web/content/join.ts, and unavoidably so: this runs in Cloud
// Functions, which cannot import the site's TypeScript. Without it the notification
// email reads "level: some-git, path: build-day, hostel: uniworld-1", which makes an
// organiser decode the form's internals to read an application.
//
// A copy nothing checks is a copy that rots, and this repo has already been bitten by
// exactly that (firestore.rules had two wrong values on its first write). So
// web/scripts/rules.mjs now asserts these keys cover every value the rules accept —
// meaning content/join.ts, firestore.rules and this file all have to agree, and CI
// fails if they do not. Add an option to the form and this file must gain a label.
//
// Plain CommonJS with no dependencies so the drift checker can require it directly.

/** Where somebody is starting from. */
const LEVELS = {
  none: "Never contributed to open source",
  "some-git": "Some Git experience, no merged PRs",
  merged: "Has merged pull requests already",
};

/** Which route into the club they picked. */
const PATHS = {
  "build-day": "Come to a hackathon or build day",
  "first-contribution": "First contribution sprint",
  "fast-track": "Fast-track",
  "program-track": "Program track",
};

/** Which residence. Required, and the two values are the whole list. */
const HOSTELS = {
  "uniworld-1": "Uniworld 1",
  "uniworld-2": "Uniworld 2",
};

/** Areas of interest. Optional, multiple. */
const INTERESTS = {
  web: "Web",
  ml: "ML / AI",
  systems: "Systems",
  design: "Design",
  docs: "Docs / writing",
};

/** Programmes they are aiming at. Required, at least one. */
const PROGRAMS = {
  gsoc: "Google Summer of Code (GSoC)",
  lfx: "Linux Foundation LFX Mentorship",
  outreachy: "Outreachy",
  sok: "Season of KDE",
  hacktoberfest: "Hacktoberfest",
  sob: "Summer of Bitcoin",
  gssoc: "GSSoC",
  ssoc: "SSoC",
  esoc: "ESoC",
  other: "Other",
};

/** How they found the club. Optional. */
const HEARD_FROM = {
  senior: "A senior or friend",
  session: "A club session or build day",
  poster: "A poster or campus screen",
  social: "Instagram / LinkedIn / Discord",
  search: "Found the site themselves",
  other: "Something else",
};

/** Label for a code, falling back to the RAW CODE rather than to "Unknown".
 *  Deliberate: if this file ever falls behind the form, the organiser still sees the
 *  real stored value and can act on it. An email that says "Unknown" has destroyed
 *  information that was sitting right there. */
function label(map, code) {
  if (typeof code !== "string" || code === "") return "—";
  return map[code] ?? code;
}

module.exports = { LEVELS, PATHS, HOSTELS, INTERESTS, PROGRAMS, HEARD_FROM, label };
