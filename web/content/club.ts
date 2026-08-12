// The single source of content for the site.
//
// With the GitHub data engine removed, every figure on this site is a literal in
// this file. That has one hard consequence: nothing here may be aspirational.
// A site whose whole argument is "our claims are verifiable" cannot carry numbers
// nobody checked — an international audience includes maintainers who will click
// the link.
//
// So the rule for this file is: if you cannot open a URL that proves it, it does
// not go in. Everything below is either verified or explicitly marked as awaiting
// real content.

export type Project = {
  /** "owner/repo" as it appears on GitHub. */
  repo: string;
  url: string;
  /** What the upstream project actually is, in the reader's terms. */
  what: string;
  /** What our member did there. Specific, not "contributed to". */
  did: string;
  /** Who did it. */
  member: string;
  memberUrl?: string;
  /** Optional hard proof: a rank, a count. Only when verified. */
  proof?: { label: string; value: string };
  language?: string;
  /**
   * Card state tag. "security" claims the site's single signal colour, so it is
   * reserved for coordinated-disclosure work rather than applied for emphasis.
   */
  tag?: { label: string; tone: "merged" | "security" | "neutral" };
  /** Set false for entries still being written, so they don't render. */
  published: boolean;
};

/**
 * VERIFIED against the live GitHub API on 2026-07-29 via the contributors
 * endpoint and scoped search counts. These numbers were read from GitHub, not
 * estimated.
 */
export const PROJECTS: Project[] = [
  {
    repo: "OWASP/OpenCRE",
    url: "https://github.com/OWASP/OpenCRE",
    what:
      "OWASP's Common Requirement Enumeration — the open catalogue that maps security standards to each other.",
    did:
      "Second-highest contributor by commits on the default branch, out of forty. 74 pull requests opened, 46 merged.",
    member: "Prateek Singh",
    memberUrl: "https://github.com/PRAteek-singHWY",
    proof: { label: "Contributor rank", value: "#2 / 40" },
    language: "Python",
    tag: { label: "46 merged", tone: "merged" },
    published: true,
  },

  // ---- Awaiting real content ----------------------------------------------
  // Add one entry per member contribution, with a URL that proves it. Set
  // published: true only once the numbers have been checked against GitHub.
  // Delete this comment block when the list is real.
];

/**
 * Headline figures. Derived from PROJECTS rather than typed separately, so the
 * summary can never drift from the evidence underneath it.
 */
export function totals() {
  const live = PROJECTS.filter((p) => p.published);
  return {
    projects: live.length,
    members: new Set(live.map((p) => p.member)).size,
    ranked: live.filter((p) => p.proof).length,
  };
}

// Declared here rather than at the foot of the file, where it used to sit: TRACKS
// below reads LINKS.github for its last card, and a `const` referenced before its
// declaration is a TDZ ReferenceError at module evaluation — the whole page would
// fail to render, not just the link.
export const LINKS = {
  github: "https://github.com/PRAteek-singHWY",
  security: "/security",
  email: "opensource@scaleropensourcelabs.com",
  /** The club's own repo. This site is one of the club's projects. */
  repo: "https://github.com/PRAteek-singHWY/scaleropensourcelabs.com",
  issues:
    "https://github.com/PRAteek-singHWY/scaleropensourcelabs.com/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22",
  contributing:
    "https://github.com/PRAteek-singHWY/scaleropensourcelabs.com/blob/main/CONTRIBUTING.md",
};

export type Track = {
  /** Rendered as two lines, the second in the track's own tint. */
  name: { lead: string; trail: string };
  summary: string;
  detail: string;
  /**
   * Which colour the card wears. A key rather than a hex: the two values behind
   * it (a soft fill and an ink that is legible on it) have to invert between
   * themes, so they live in globals.css as .tint-* and only the name travels
   * through the content file. See the .tint block there.
   */
  tint: "blue" | "mint" | "violet";
  /** Three at most — they are a scan aid on the card, not a taxonomy. */
  tags: string[];
  /**
   * The dark frame at the foot of each card. Ordinary commands anybody can run,
   * never simulated output: a fabricated `46 files changed` beside real
   * contribution figures elsewhere on this page would be indistinguishable from
   * a claim. Same rule as the code frames in the culture bento.
   */
  preview: { title: string; lines: { kind: "cmd" | "out"; text: string }[] };
  cta?: { label: string; href: string; external?: boolean };
};

export const TRACKS: Track[] = [
  {
    name: { lead: "Mentored", trail: "contribution" },
    summary: "Where almost everyone starts.",
    detail:
      "A mentor who has already landed work upstream helps you pick a project that genuinely needs help, find an issue sized for a first attempt, and review the patch before a maintainer ever sees it. The goal is your second contribution — once you know a codebase, the next one is much faster.",
    tint: "blue",
    // "Beginner" rather than "Beginner friendly": three pills have to hold ONE line
    // at a third of an 80rem grid, and the longer phrase wrapped — which pushed this
    // card's code frame a line higher than the other two and broke the row.
    tags: ["Beginner", "Mentor review", "First PR"],
    preview: {
      title: "first-patch",
      lines: [
        { kind: "cmd", text: "git switch -c fix/broken-link" },
        { kind: "out", text: "# small first, always" },
        { kind: "cmd", text: "gh pr create --fill" },
        { kind: "out", text: "# then read the review" },
      ],
    },
    cta: { label: "How it goes", href: "/how-to-join#path" },
  },
  {
    name: { lead: "AI", trail: "security" },
    summary: "Higher difficulty. The work most likely to get you noticed.",
    detail:
      "Open-source AI tooling shipped fast and is now load-bearing. Members find real weaknesses — credentials committed into model configs, checkpoints that execute code on load, agent frameworks letting untrusted input reach a shell — and land the fix upstream through the project's own coordinated disclosure process.",
    tint: "mint",
    tags: ["Disclosure", "Model configs", "Harder"],
    preview: {
      title: "audit",
      lines: [
        { kind: "cmd", text: 'grep -rn "api_key" configs/' },
        { kind: "out", text: "# secrets get committed by accident" },
        { kind: "cmd", text: "cat SECURITY.md" },
        { kind: "out", text: "# report privately, never in an issue" },
      ],
    },
    cta: { label: "Where it lands", href: "/hall-of-fame" },
  },
  {
    name: { lead: "Club", trail: "engineering" },
    summary: "Software the club owns and runs.",
    detail:
      "This site is one of them, and it is open source. Working here is the lowest-friction way to get a first merged pull request, because the maintainer reviewing it is someone you can talk to in person.",
    tint: "violet",
    tags: ["This site", "Next.js", "Lowest friction"],
    preview: {
      title: "this-site",
      lines: [
        { kind: "cmd", text: "git clone …/scaleropensourcelabs.com" },
        { kind: "cmd", text: "npm install && npm run dev" },
        { kind: "out", text: "# localhost:3000, then open a PR" },
      ],
    },
    cta: { label: "The repo", href: LINKS.github, external: true },
  },
];

/** Where a newcomer actually starts. Ordered, because it is a sequence. */
export const PATH: { step: string; body: string }[] = [
  {
    step: "Pick a project that needs help",
    body: "Not the most famous one. A project with open issues, a responsive maintainer, and a test suite that runs on your machine.",
  },
  {
    step: "Find an issue sized for a first attempt",
    body: "A failing edge case, a documentation gap, a small refactor. Unglamorous work does get merged; that's how you start.",
  },
  {
    step: "Get it reviewed before you send it",
    body: "Your mentor reads the patch first, so the version a maintainer opens is already close to mergeable.",
  },
  {
    step: "Then do it again",
    body: "The first contribution is the hard one. Everything after it compounds, because you already know where things live.",
  },
];

// ---------------------------------------------------------------------------
// SELECTIONS — the club's strongest claim.
//
// Getting students into GSoC, LFX Mentorship, C4GT and Summer of Bitcoin is the
// most internationally legible thing a college open-source club can show. These
// programmes are recognised on sight by exactly the audience this site is for, and
// unlike a self-reported metric they cannot be manufactured: somebody else ran a
// selection process and picked your member.
//
// Two rules, both non-negotiable.
//
// 1. CONSENT. Each entry publishes a real student's face and name to an
//    international audience. That needs their explicit permission, and `consented`
//    must be true or the entry does not render — the same rule the old dashboard
//    enforced in the database, applied here in the content file.
//
// 2. NO PROGRAMME LOGOS. We render the programme NAME as type, never the official
//    GSoC/Linux Foundation/C4GT mark. Those are trademarks belonging to other
//    organisations, and putting them on a club site implies an endorsement nobody
//    granted. Typographic treatment says the same thing and is ours to use.

// GSSOC AND HACKTOBERFEST ARRIVED IN THE MERGE, and they are the reason the `tier`
// field below exists. This list used to be five programmes that a student has to be
// SELECTED into, which made "programme" and "paid, competitive thing" the same word.
// The moment two open-entry events joined the list that stopped being true, and a
// first-year reading a single undifferentiated grid would reasonably conclude that
// every item on it is out of reach this year. The honest answer — the open ones
// today, the paid ones after a few months of the open ones — needs the distinction
// to be in the data.
export type Programme =
  | "GSOC"
  | "LFX"
  | "C4GT"
  | "SOB"
  | "OUTREACHY"
  | "GSSOC"
  | "HACKTOBERFEST";

/**
 * `paid` — somebody else runs a selection process, and if they pick you, you are
 *   paid. This is the tier that is worth something to a recruiter precisely
 *   because you did not award it to yourself.
 * `open` — no selection. You participate by turning up and contributing. Real
 *   value for a first contribution, no signal value as a credential.
 */
export type Tier = "paid" | "open";

/** Full names, since the acronyms mean nothing to a general reader. */
export const PROGRAMME_NAME: Record<Programme, string> = {
  GSOC: "Google Summer of Code",
  LFX: "LFX Mentorship",
  C4GT: "Code for GovTech",
  SOB: "Summer of Bitcoin",
  OUTREACHY: "Outreachy",
  GSSOC: "GirlScript Summer of Code",
  HACKTOBERFEST: "Hacktoberfest",
};

/**
 * Programme colours, used to tint each planet in the system.
 *
 * Validated as a categorical set against the #05070D surface with the dataviz
 * validator — lightness band, chroma floor, normal-vision separation and contrast
 * all pass. Adjacent-pair CVD separation lands at ΔE 6.5 under deuteranopia, which
 * is the floor band and legal ONLY with secondary encoding, so every planet also
 * carries its programme name as a direct label. Colour never carries identity
 * alone here.
 *
 * The obvious palette — Google blue for GSoC next to a violet for LFX — failed
 * badly: ΔE 2.5 under protanopia, effectively one colour for a red-green
 * colourblind viewer. Blue and violet are adjacent hues; magenta buys the
 * separation that violet cannot.
 */
/* Programme colours resolve through CSS custom properties rather than literals,
   because the same hue cannot serve both themes: the dark set was validated
   against #05070D and measures 3.22–3.83:1 on white, i.e. all four fail AA as
   the 11px text they are used for. The variables are defined per theme in
   globals.css. Anything drawn in the DOM must use this map so it follows the
   theme. */
/* THE LAST TWO WERE ADDED BY A MERGE AND WERE PUT THROUGH THE SAME VALIDATOR.
   `npm run palette -- --legacy` sweeps all seven, and the seven-colour set fails on
   exactly the pairs the five-colour set already failed on — three GSOC/OUTREACHY
   distances, which are the known adjacent-hue problem the note above describes.
   Adding these two costs nothing.

   Getting there took three attempts and the reason is worth recording, because the
   obvious pick is the wrong one. GSSoC's own branding is pink, and a pink sits on
   top of LFX's magenta: dE 13.8 against a floor of 15. Moving it to a mid red then
   collided with SOB's orange under deuteranopia and with C4GT's teal under
   protanopia — because red-green CVD collapses all three of those onto the same
   axis, so no amount of hue-shifting inside the red-orange-green arc separates
   them. The only two things that survive red-green CVD are the blue-yellow axis and
   LIGHTNESS, which is why GSSoC ended up as a very dark red on light and a very
   light pink on dark rather than as anything in the middle.

   Colour still never carries identity alone here — every programme is directly
   labelled with its own name — but the set is no longer weaker than the one it
   extends. Re-run the sweep before adding an eighth. */
export const PROGRAMME_COLOUR: Record<Programme, string> = {
  GSOC: "var(--prog-gsoc)",
  LFX: "var(--prog-lfx)",
  C4GT: "var(--prog-c4gt)",
  SOB: "var(--prog-sob)",
  OUTREACHY: "var(--prog-outreachy)",
  GSSOC: "var(--prog-gssoc)",
  HACKTOBERFEST: "var(--prog-hacktoberfest)",
};

/* WebGL cannot read custom properties — a shader uniform needs a real number. The
   solar system is inside .night in both themes, so it always wants the dark set,
   which is exactly what these are. Do not use these in the DOM. */
export const PROGRAMME_COLOUR_HEX: Record<Programme, string> = {
  GSOC: "#4A86E8",
  LFX: "#D64FA0",
  C4GT: "#1F9D6B",
  SOB: "#B8871F",
  OUTREACHY: "#8B6DE8",
  GSSOC: "#FFB3B3",
  HACKTOBERFEST: "#C3D98A",
};

export const PROGRAMME_SHORT: Record<Programme, string> = {
  GSOC: "GSoC",
  LFX: "LFX",
  C4GT: "C4GT",
  SOB: "SoB",
  OUTREACHY: "Outreachy",
  GSSOC: "GSSoC",
  HACKTOBERFEST: "Hacktoberfest",
};

export type Selection = {
  name: string;
  programme: Programme;
  /** The PROGRAMME year — which edition selected them. Not their year of study. */
  year: string;
  /** Year of study at the time of selection, e.g. "3rd year". */
  studyYear?: string;
  /**
   * The mentoring organisation that selected them.
   *
   * Optional, and that is a concession to how the list actually gets filled in:
   * the names arrive first, from someone who knows the cohort, and the org and the
   * proof link get chased down per person afterwards. Requiring it up front would
   * mean inventing one, and an invented org on this page is exactly the kind of
   * unverifiable claim the file's opening rule exists to keep out. A missing org
   * renders as nothing; a wrong one renders as a lie.
   */
  org?: string;
  /** One line on what they actually built. Specific beats impressive. */
  work?: string;
  /** Path under /public/people. Falls back to a monogram when absent. */
  photo?: string;
  github?: string;
  /** Proof link: the project page, the merged work, the announcement. */
  url?: string;
  /** Must be true to render. See rule 1 above. */
  consented: boolean;
};

/* The 2026 GSoC cohort, as supplied by the club. `studyYear` is their year of study,
   which is a different axis from the programme year in `year` — both appear on the
   card and conflating them would put "3rd year" in the chip next to GSoC.

   THE THIRD SLOT IS THE MENTORING ORG, supplied by the club per student and filled
   in below. It was deliberately left empty until then: every one of these students
   was picked BY somebody, and which organisation that was is the fact a reader wants
   next after the name — but a plausible-looking foundation typed in from memory is
   precisely the claim `org`'s doc comment above exists to keep out. Names are written
   as the organisation itself writes them (Sugar Labs, Checkstyle, STE||AR Group), not
   as they get abbreviated in conversation. What is still open is the proof `url` per
   entry, which the roster prints as an em dash until it arrives. */
const GSOC_2026: [name: string, studyYear: string, org?: string][] = [
  ["Prateek Singh", "3rd year", "OWASP"],
  ["Ojas Maheshwari", "3rd year", "KDE"],
  ["Parth Dagia", "3rd year", "Sugar Labs"],
  ["Raj Prakash", "3rd year", "OpenMRS"],
  ["Shubham Kumar", "3rd year", "Mifos Initiative"],
  ["Shiva Gupta", "3rd year", "CDLI"],
  ["Kartik Jangid", "3rd year", "JdeRobot"],
  ["Vivek Singh Solanki", "3rd year", "Checkstyle"],
  ["Ujjawal Prabhat", "3rd year", "OpenMRS"],
  ["Piyush Goenka", "3rd year", "Ruby"],
  ["Kartik Deshpande", "4th year", "NRNB"],
  ["Amrinder Singh", "3rd year", "Libreswan"],
  ["Vansh Dobhal", "3rd year", "STE||AR Group (HPX)"],
  ["Kumar Amityush", "2nd year", "OpenAstronomy"],
];

const GSOC_2025: [name: string, studyYear: string, org?: string][] = [
  ["Sauhard Gupta", "3rd year"],
];

/**
 * The published list. These render everywhere — local, preview and production.
 *
 * PUBLISHED ON THE CLUB'S INSTRUCTION. This array used to be empty, with the cohort
 * held in a development-only scaffold behind a NODE_ENV gate, because naming a
 * student on a public page needs that student's consent and no consent record
 * existed here. The club has since directed twice that the cohort be published. That
 * is the club's call to make about its own members, and `consented: true` records
 * that they have made it — the flag now means "the club asserts this person agreed
 * to be named", which is what it has to mean for anyone but the student to set it.
 *
 * WHAT IS STILL MISSING, and it belongs here rather than in a ticket: not one of
 * these entries has a proof `url`. The page's entire argument is "somebody else
 * picked them, go and check", and until each name carries a link — the programme's
 * accepted-projects page, the student's proposal, the announcement — these fifteen
 * are the only claims on this site a reader cannot verify. The roster prints an em
 * dash in the Proof column for each, which is honest but is not evidence. Add `url`
 * per entry as the links come in; nothing else has to change.
 *
 * The ten LFX / C4GT / SoB rows that used to pad this list to twenty-five are gone,
 * deliberately. "Placeholder Seven, Example Foundation" is layout padding, not a
 * selected student; publishing it would have put visible nonsense on a public page
 * beside fifteen real people and undercut every real name next to it. Those
 * programmes get real entries the same way these did.
 */
export const SELECTIONS: Selection[] = [
  ...GSOC_2026.map(([name, studyYear, org]) => ({
    name,
    programme: "GSOC" as Programme,
    year: "2026",
    studyYear,
    org,
    consented: true,
  })),
  ...GSOC_2025.map(([name, studyYear, org]) => ({
    name,
    programme: "GSOC" as Programme,
    year: "2025",
    studyYear,
    org,
    consented: true,
  })),
];

/**
 * `consented` is still the gate, and it is now the ONLY one — per entry, rather than
 * per environment. An entry without it renders nowhere, so adding a name to the
 * array above stays a deliberate two-part act.
 *
 * The NODE_ENV branch that used to live here went with the scaffold it served. It
 * existed to keep unconsented names out of a production build; with the cohort
 * published there is no second list to fall back to, and a development-only source
 * of names is exactly what made local and production disagree about who the club is.
 */
export function publishedSelections(): Selection[] {
  return SELECTIONS.filter((s) => s.consented);
}

/** Programme counts, derived so the headline can never drift from the list. */
export function selectionStats() {
  const live = publishedSelections();
  const byProgramme = new Map<Programme, number>();
  for (const s of live) {
    byProgramme.set(s.programme, (byProgramme.get(s.programme) ?? 0) + 1);
  }
  return {
    total: live.length,
    programmes: [...byProgramme.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([programme, count]) => ({ programme, count })),
    // Entries with no org yet are not an organisation. Counting the empty slot the
    // way `new Set` counts `undefined` would add a phantom org to the total the
    // moment one student's org is still being chased down.
    orgs: new Set(live.map((s) => s.org).filter(Boolean)).size,
  };
}

// ---------------------------------------------------------------------------
// WHAT THE CLUB LOOKS FOR.
//
// Added on the founder's suggestion, and it is the highest-value thing on the page
// after the selections themselves — because it removes the one belief that stops
// people applying: "I am not good enough at coding yet."
//
// The claim was already here, buried as FAQ item twelve ("Do I need to be good at
// DSA? No. Different skill."). Nobody reaching a decision reads to item twelve.
//
// Worded as what the club VALUES, not as a test it administers. Nothing else on
// this site claims a screening process — the form is an application, not an exam —
// so "we assess your reasoning" would be inventing a mechanic that does not exist.
// The distinction matters: one is a statement of what predicts success here, the
// other is a promise about a process nobody has designed.
//
// Both columns are concrete and checkable against a real first contribution. That
// is the test for anything in this list: if a line could sit on any club's page, it
// is too vague to be here.

export type LookingFor = { not: string; yes: string };

export const LOOKING_FOR: LookingFor[] = [
  {
    not: "A contest rating, or fluency in DSA",
    yes: "Reading code you did not write and working out what it does",
  },
  {
    not: "Knowing a particular framework already",
    yes: "Turning a vague problem into one small change you can defend",
  },
  {
    not: "Prior open-source experience, or any merged work",
    yes: "Following a review thread and understanding why a change was refused",
  },
  {
    not: "A tidy GitHub profile with a streak",
    yes: "Saying \"I do not understand this yet\" early instead of late",
  },
];

// ---------------------------------------------------------------------------
// PROGRAMMES — the product line.
//
// The site's job is not only to show that members got selected; it is to explain
// what these programmes ARE to someone who has never heard of them, and what they
// pay. Most students don't apply because nobody told them the thing exists, pays
// real money, and takes applicants with almost no track record.
//
// Stipends are deliberately written as "published by the programme" rather than
// quoted as our own figures. They change year to year and we are not the source.

export type ProgrammeInfo = {
  key: Programme;
  /** See the note over `Tier`. Drives the two groups the programmes page renders. */
  tier: Tier;
  what: string;
  who: string;
  /** Rough shape of the year — not exact dates, which move annually. */
  when: string;
  pays: string;
  /** What OSC specifically does to get you in. This is the product. */
  weDo: string;
  url: string;
};

export const PROGRAMMES: ProgrammeInfo[] = [
  {
    key: "GSOC",

    tier: "paid",
    what: "Google pays you to write code for an open-source organisation over a summer, with a mentor from that organisation assigned to you.",
    who: "Anyone 18+ who is new to the organisation. You do not need to be a student, and you do not need existing open-source experience.",
    when: "Organisations announced early in the year, applications a few weeks later, coding over the summer.",
    pays: "A stipend set by Google, varying by country and project size. Check the current figure on the programme site.",
    weDo: "We start six months early. Selection goes to people the maintainers already recognise, so the work is contributing steadily before applications open — not writing a good proposal in March.",
    url: "https://summerofcode.withgoogle.com/",
  },
  {
    key: "LFX",

    tier: "paid",
    what: "The Linux Foundation's mentorship programme, running across CNCF, Kubernetes, Node.js and the rest of its projects.",
    who: "Beginners are explicitly the target. Terms run several times a year, so a miss is a few months rather than a year.",
    when: "Three terms annually, so there is almost always one open or opening.",
    pays: "A stipend published by the Linux Foundation, scaled by region.",
    weDo: "Help you pick a term and project that matches what you already know, and get a first contribution merged into that project before the application closes.",
    url: "https://lfx.linuxfoundation.org/tools/mentorship/",
  },
  {
    key: "C4GT",

    tier: "paid",
    what: "Code for GovTech: open-source contribution to digital public infrastructure — the software Indian government services actually run on.",
    who: "Indian students, with a strong bias toward people who want their work used at national scale rather than starred on GitHub.",
    when: "An annual summer cohort plus year-round contribution windows.",
    pays: "A stipend published by the programme.",
    weDo: "Point you at the DPI projects with responsive maintainers, and help you read a codebase built for scale rather than for demos.",
    url: "https://www.codeforgovtech.in/",
  },
  {
    key: "SOB",
    tier: "paid",
    what: "Summer of Bitcoin: a paid summer programme contributing to Bitcoin and Lightning open-source projects.",
    who: "Students, with a real ramp for people who have never touched the codebase. The C++ is intimidating and the community knows it.",
    when: "Applications early in the year, coding over the summer.",
    pays: "A stipend published by the programme.",
    weDo: "Work through the onboarding curriculum together, because almost nobody finishes it alone.",
    url: "https://www.summerofbitcoin.org/",
  },

  // ---- The open tier ------------------------------------------------------
  // Everything above requires somebody else to pick you. These two do not, and
  // that is the entire reason they are on the page: the honest answer to "which
  // of these can I actually do right now" is "these, today", and a first-year
  // who only ever sees the selective five concludes the answer is "none".
  {
    key: "GSSOC",
    tier: "open",
    what:
      "GirlScript Summer of Code: a three-month Indian open-source programme with assigned mentors and a points leaderboard. Beginner-focused by design, and much easier to get into than anything above.",
    who: "Open to beginners, including first-years with no merged work at all. This is usually the first name on this page that somebody can act on today.",
    when: "Registrations around the start of the edition, then roughly three months of contribution.",
    pays:
      "No stipend. Certificates, swag and a leaderboard — plus mentors, which is the part that is actually worth having.",
    weDo:
      "Nothing to prepare. Register when it opens and pick a project in a language you can already run. Use it to learn the mechanics — fork, branch, PR, review, merge — so the paid programmes below are not your first time using Git in anger.",
    url: "https://gssoc.girlscript.tech/",
  },
  {
    key: "HACKTOBERFEST",
    tier: "open",
    what:
      "A month-long event every October: get a handful of pull requests merged into participating repositories and you get swag. No selection, no application, no stipend.",
    who: "Anyone. This is the lowest barrier in open source, and the single best month of the year to make a first contribution because half the internet is reviewing pull requests at once.",
    when: "October, every year. Registration opens in late September.",
    pays: "Swag, or a tree planted in your name. That is the whole reward.",
    weDo:
      "Have one project picked and built on your machine before 1 October, so you spend the month contributing rather than setting up. Come to a session in September and we will do it with you.",
    url: "https://hacktoberfest.com/",
  },
];

/**
 * The honest caveat about Hacktoberfest, kept next to it rather than buried.
 *
 * This is on the page because the club's position is not "do all of these". In
 * 2020 Hacktoberfest's reward structure produced enough junk pull requests that
 * maintainers publicly asked people to stop, and the programme changed its rules
 * in response. Recommending it without saying so would be the kind of omission
 * this site exists not to make — and a maintainer reading this page would spot it
 * instantly.
 */
export const HACKTOBERFEST_CAVEAT =
  "One warning, because we would rather say it than have a maintainer say it to you: the point is not four merged PRs. Hacktoberfest earned a bad reputation from people opening whitespace changes to farm swag, and maintainers still remember. Fix something that was actually broken, or do not open the PR.";

/* Derived rather than written out as two arrays, so a programme cannot be in
   neither group or in both. Adding one to PROGRAMMES with a `tier` puts it in the
   right place on the page automatically. */
export const PAID = PROGRAMMES.filter((p) => p.tier === "paid");
export const OPEN_ENTRY = PROGRAMMES.filter((p) => p.tier === "open");

// ---------------------------------------------------------------------------
// WHAT YOU ACTUALLY GET — the argument that outlasts the stipend.
//
// The stipend is the smallest part. A student who lands one of these ends up with
// a public track record, a named maintainer who knows their work, and a reference
// from outside their university. That is what turns into an internship.

export const OUTCOMES: { title: string; body: string }[] = [
  {
    title: "A maintainer who knows your name",
    body: "You spend a summer being reviewed by someone senior at a real project. They remember who ships. That relationship does not expire when the programme ends — it is the single most valuable thing here, and it is not the money.",
  },
  {
    title: "A public record an employer can read",
    body: "Merged pull requests in a project a company already depends on. Not a certificate, not a course completion — code they can open and read, with your name on the commit.",
  },
  {
    title: "A reference from outside your college",
    body: "Every student in your batch has the same professors. Almost none of them have someone at a foundation willing to vouch for their work.",
  },
  {
    title: "The people doing it with you",
    body: "The others in this club apply to the same programmes, review each other's patches, and share which maintainers actually reply. That network is why the second selection is easier than the first.",
  },
];

// ---------------------------------------------------------------------------
// HOW THE CLUB ACTUALLY RUNS.
//
// Written plainly and specifically. "Vibrant community" tells a reader nothing;
// coffee and Maggi at eleven at night tells them exactly what walking in is like.

export const CULTURE: { title: string; body: string }[] = [
  {
    title: "Discussions, not lectures",
    body: "Sessions are people arguing about a codebase with a laptop open, not slides. If you have a question halfway through, that is the session.",
  },
  {
    title: "Coffee and Maggi are on the club",
    body: "Working sessions run late and nobody codes well hungry. There is always chai, coffee and Maggi, and you do not have to ask.",
  },
  {
    title: "Work where you like",
    body: "Library, lab, hostel common room, or the campus spot everyone knows. We pick the location by what the group wants that week, not by what was booked.",
  },
  {
    title: "Nobody is behind",
    body: "People join knowing wildly different amounts. Sitting in on a session you only half follow is a completely normal way to start, and everyone here did it.",
  },
];

// ---------------------------------------------------------------------------
// POSITIONING against the other club a student is choosing between.
//
// EVERY NUMBER HERE IS VERIFIED AGAINST A PRIMARY SOURCE AND CARRIES ITS LINK.
// That is not fussiness — this section attacks a rival activity, so it is the
// first place a sceptical reader will go looking for an exaggeration. One
// unsupported figure here retroactively discredits every other claim on a site
// whose whole thesis is "you can check this".
//
// Two claims were CUT during research because they did not hold up:
//   * "only ~9 people per college make ICPC" — no rule or dataset produces 9.
//     The real numbers (3 by rule, ~5.6 in practice, 30 nationally) are both
//     true and more striking, so the invented figure bought nothing.
//   * "open source is an easier door than ICPC" — false. GSoC 2025 accepted
//     1,280 of 15,240 applicants, about 8.4%. Comparable brutality.
//
// So the argument is deliberately NOT "our thing is easier to win". It is that
// open source pays out below the top prize and competitive programming mostly
// does not. That is the floor, not the ceiling, and it is defensible.
//
// THE THIRD COLUMN. A student on this campus is realistically choosing between
// three clubs, not two, so the AI/ML club is in the comparison rather than
// implied. It carries NO FIGURES, and that is deliberate: there is no rulebook
// to cite for a hackathon and no published national admit rate for a Kaggle
// competition, so every AI/ML cell is a structural statement about how the
// activity works — open entry, a fixed prize pool, a leaderboard that closes —
// which is checkable by anyone who has entered one. Inventing a stat to fill
// the column would break the same rule the two claims above were cut for.
//
// Each row is also written so the CP and AI/ML cells are ones their own members
// would agree with. "Who signs off" concedes the judge outright. A comparison a
// rival would call unfair is one a reader discounts entirely, and this section
// only works if it survives being read by someone in both other clubs.

export type Cell = {
  stat?: string;
  line: string;
  sources?: { label: string; url: string }[];
};

export type Comparison = {
  /** The question the row answers. Renders as the row header. */
  axis: string;
  cp: Cell;
  aiml: Cell;
  osc: Cell;
};

export const COMPARISON: Comparison[] = [
  {
    axis: "How many can win",
    cp: {
      stat: "3",
      line: "Only one team from a given institution may advance to the World Finals. Three students, per college, per year. Ten Indian teams reached Baku in 2025 — thirty students, for the entire country. They earned every place; the door is simply that narrow by design.",
      sources: [
        {
          label: "ICPC Regional Rules",
          url: "https://icpc-iiitdm.vercel.app/onsite-rules.pdf",
        },
        { label: "ICPC 2025 standings", url: "https://cphof.org/standings/icpc/2025" },
      ],
    },
    aiml: {
      line: "A hackathon or a Kaggle competition ranks everyone who entered and pays the top of the list. How many places exist is decided before registration opens.",
    },
    osc: {
      stat: "∞",
      line: "No rule caps how many people from your college get code merged into Kubernetes. Competitive programming is a sport with a fixed number of podium places. Open source is a backlog with an unbounded number of open issues.",
    },
  },
  {
    axis: "Odds at the top",
    cp: {
      line: "The World Finals is the ceiling and it is brutal. Nothing on this page pretends otherwise.",
    },
    aiml: {
      line: "The leaderboard is public and open, which means you are ranked against everyone who entered — including people who do this full time.",
    },
    osc: {
      stat: "8.4%",
      // 1,280 not 1,272. Google's May announcement said 1,272; the August final
      // statistics post — which is what we link — says 1,280. Citing one figure and
      // linking a source that states another is the exact failure this whole section
      // exists to avoid, so the number now matches the page it points at.
      line: "GSoC accepted 1,280 people from 15,240 applicants in 2025. This is not the soft option, and we will not pretend it is.",
      sources: [
        {
          label: "Google Open Source Blog",
          url: "https://opensource.googleblog.com/2025/08/google-summer-of-code-2025-contributor-statistics.html",
        },
      ],
    },
  },
  {
    axis: "What you keep if you do not get in",
    cp: {
      line: "A rating graph. It is a real measure of real skill, and it lives on one site, in one profile.",
    },
    aiml: {
      line: "A model in a notebook. Good work — and the competition it was built for closes, and the leaderboard is archived.",
    },
    osc: {
      line: "Commits with your name on them, in a repository other people run in production. Merged is merged whether or not the stipend came with it.",
    },
  },
  {
    axis: "When you stop being eligible",
    cp: {
      line: "Five regional years, two World Finals, and you must still be enrolled. The clock is part of the format.",
    },
    aiml: {
      line: "Kaggle has no student rule. Most campus hackathons do — the badge goes with the enrolment.",
    },
    osc: {
      line: "Your commit history has no eligibility clause, and GSoC dropped its student-only requirement in 2022.",
      sources: [
        {
          label: "GSoC eligibility change",
          url: "https://opensource.googleblog.com/2021/11/expanding-google-summer-of-code-in-2022.html",
        },
      ],
    },
  },
  {
    axis: "Who signs off on your work",
    cp: {
      line: "An automated judge, in thirty seconds. The fastest feedback loop of the three and unbeatable for getting quick at DSA. What it cannot tell you is whether another person could read what you wrote.",
    },
    aiml: {
      line: "A metric on a held-out set. Objective and immediate, and indifferent to everything a number cannot see — including whether anybody but you can run the code.",
    },
    osc: {
      line: "A maintainer who has to read your patch, push back on it, and then live with it for years. The slowest signal of the three — a pull request can sit for three weeks — and the only one where a working engineer reviews your code the way your future colleagues will.",
    },
  },
  {
    axis: "What it pays",
    cp: {
      line: "Prize money at the top of the bracket. Below it, the return is the skill itself — which is not nothing, but it is not a stipend.",
    },
    aiml: {
      line: "A prize pool, split between the teams that place.",
    },
    osc: {
      line: "GSoC, LFX Mentorship, C4GT and Summer of Bitcoin pay stipends to contributors who are nowhere near the best in the country. The money is the floor here, not the ceiling.",
    },
  },
];

/**
 * The closing line under the comparison table.
 *
 * Deliberately not a row: it is not a fact about any of the three clubs, it is
 * the reason this one exists. Putting it in the grid would have forced two
 * invented cells to sit beside it.
 */
export const COMPARISON_NOTE = {
  line: "India now has the largest open-source contributor base in the world. American developers still contribute more per head. That gap is the entire reason this club exists.",
  source: {
    label: "GitHub Octoverse 2025",
    url: "https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/",
  },
};

/**
 * What we are worse at.
 *
 * This is on the page on purpose. A comparison that lists only our advantages
 * reads as marketing and gets discounted wholesale; naming the real cost is what
 * makes the paragraph above believable. The DSA point goes first because it is
 * the single strongest honest argument for joining the CP club instead, and
 * burying it would be the tell.
 */
export const TRADE_OFFS: string[] = [
  "We will not prepare you for the DSA round. That is the filter on most campus placements, and the competitive programming club is straightforwardly better at it. Do both.",
  "Feedback is slow and depends on strangers. A pull request can sit for three weeks; a judge answers in thirty seconds. If a tight loop is what keeps you going, this is the harder room.",
  "There is no single number for your resume. Nothing sorts. A recruiter has to actually open your GitHub, and some will not.",
  "Getting started takes longer. Building the project, finding a tractable issue and reading enough code to be useful can take weeks. Your first submission on a judge takes ten minutes.",
  "If you are aiming at quant or high-frequency trading, contest standing is the recognised route and we are not a substitute for it.",
];

// ---------------------------------------------------------------------------
// MENTORS.
//
// A student mentor is not a professor, and a page that implies otherwise is
// detectable in one line. The programmes that handle peer mentorship credibly all
// redefine authority away from rank: Outreachy states mentor eligibility purely as
// hours committed, GSoC defines a mentor by duty rather than qualification, and
// Recurse Center establishes seniority by naming an artifact, attaching a number,
// and stopping.
//
// So each entry here is: a named artifact, a public link that proves it, an
// explicit boundary on what they are useful for, and a bounded availability. No
// adjectives describing the person. Recency and a checkable record are the honest
// basis of a senior's authority, and they are enough.
//
// On "lifelong mentors": the word never appears. Asserting duration spends it and
// proves nothing. Instead each entry can carry who mentored THEM — after two or
// three cohorts that lineage renders as a visible graph, which demonstrates the
// same thing and cannot be faked.

export type Mentor = {
  name: string;
  /** Present tense, no adjectives. "Final year, CSE." / "Graduated 2024. …" */
  situation: string;
  /** The credential: programme, year, org, and the official public archive link. */
  credential: { programme: Programme; year: string; org: string; url?: string };
  /** One sentence naming a subsystem, not a domain. Links the merged work. */
  shipped: string;
  shippedUrl?: string;
  /** The boundary of their authority. This is what makes the inside believable. */
  askAbout: string[];
  /** A stated commitment, not a disposition. Only publish what will hold. */
  around: string;
  github?: string;
  /** Who taught them. Needs BOTH people's consent — it discloses about both. */
  mentoredBy?: string;
  /** Publication consent, per person. No consent, no entry. */
  consented: boolean;
};

export const MENTORS: Mentor[] = [];

export function publishedMentors(): Mentor[] {
  return MENTORS.filter((m) => m.consented);
}

// ---------------------------------------------------------------------------
// THE CALENDAR — the only honest urgency device this club owns.
//
// Not a logistics footer. The argument is arithmetic: organisations select
// contributors who already have months of commits in their repo, so an
// application written the week it opens is competing against people who started
// in autumn. "I'll do it next year" is therefore not a delay, it is a skipped
// cycle. That is unanswerable and it needs no countdown timer.
//
// Deliberately no exact dates. They move every year, and a stale date on a page
// whose whole claim is accuracy costs more than it buys. Each row states the
// typical window and — the part that matters — what you should already be doing
// months before it opens.

export type CalendarRow = {
  window: string;
  programme: string;
  opens: string;
  /** The month range when the work that actually gets you selected happens. */
  prepFrom: string;
  doingNow: string;
};

export const CALENDAR: CalendarRow[] = [
  {
    window: "Jan – Apr",
    programme: "Google Summer of Code",
    opens: "Organisations announced late Feb, proposals due late Mar",
    prepFrom: "Sep – Dec",
    doingNow:
      "Pick two organisations and get one small patch merged in each. By the time proposals open, the maintainers reviewing yours should already recognise your username.",
  },
  {
    window: "Rolling, three terms",
    programme: "LFX Mentorship",
    opens: "Terms start around Mar, Jun and Sep",
    prepFrom: "6–8 weeks before a term",
    doingNow:
      "The most forgiving entry point, because a miss costs months rather than a year. Choose the term that matches what you already know instead of waiting for the perfect project.",
  },
  {
    window: "Feb – Jun",
    programme: "Code for GovTech",
    opens: "Cohort announced early in the year",
    prepFrom: "Nov – Jan",
    doingNow:
      "Read a digital public infrastructure codebase properly. These are built for national scale rather than for demos, and that is a different reading exercise.",
  },
  {
    window: "Jan – Aug",
    programme: "Summer of Bitcoin",
    opens: "Applications early in the year, then a multi-week bootcamp",
    prepFrom: "Oct – Dec",
    doingNow:
      "Start the onboarding curriculum. Almost nobody finishes it alone, which is most of the reason to do it inside a club.",
  },
];

// ---------------------------------------------------------------------------
// WHO THIS IS NOT FOR.
//
// An explicit filter immediately before the ask. Stating who should not join
// makes the invitation read as selective rather than desperate, and it saves
// everyone the wasted month — including us.

export const NOT_FOR: string[] = [
  "Anyone who wants a certificate. There isn't one. The output is a public commit history, which is worth more and photographs worse.",
  "Anyone optimising purely for the DSA round. Go to the competitive programming club — they are better at it — and come here as well if you have the hours.",
  "Anyone who wants to be told exactly what to do each week. You get a mentor and a direction, not a syllabus.",
  "Anyone counting pull requests. Chasing PR count is how Hacktoberfest became something maintainers publicly asked people to stop doing. We are not running that.",
];

// ---------------------------------------------------------------------------
// FAQ.
//
// Seven questions, no more. Every one is a real reason somebody decides not to
// join, and the Scaler-funnel question is the one that silently loses exactly the
// sceptical students most worth having.

export const FAQ: { q: string; a: string }[] = [
  {
    q: "Do I need to be good at DSA?",
    a: "No. Different skill. Reading an unfamiliar codebase, writing a small correct change and surviving review is what this needs, and none of it is competitive programming.",
  },
  {
    q: "How many hours a week?",
    a: "Four to six once you're going, and more in the weeks around an application deadline. During exams people go quiet and nobody minds — say so and pick it back up.",
  },
  {
    q: "Is this free?",
    a: "Yes, and there is nothing to upsell you. The coffee is on the club.",
  },
  {
    q: "Is this a Scaler product or a marketing funnel?",
    a: "It is a student club at Scaler School of Technology, run by students. Nothing here is a paid programme and nothing here sells you one.",
  },
  {
    q: "I'm in my final year — is it too late?",
    a: "For this year's GSoC cycle, most likely. For LFX Mentorship, no: terms run three times a year and GSoC dropped its student-only requirement in 2022, so graduating does not end your eligibility.",
  },
  {
    q: "What language or stack do I need?",
    a: "One you can already write and run. Projects exist in Python, Go, Rust, TypeScript, C++ and more; we pick the project around you rather than the other way round.",
  },
  {
    q: "What if my pull request gets rejected?",
    a: "It will, sometimes. Ours do — 46 of 74 merged on our largest project, which is a normal ratio and the reason we publish it rather than rounding it up.",
  },
];

// ---------------------------------------------------------------------------
// FOR FACULTY, SPONSORS AND MAINTAINERS.
//
// Two of this site's three audiences previously had no real estate at all. An
// anonymous club reads as vaporware to a faculty member and to a maintainer
// simultaneously, so this band exists to be concrete and contactable, and to make
// exactly one ask.
//
// THE ASK IS FOR PEOPLE, NOT MONEY, and it used to be the other thing — a room, a
// projector, a small budget for the domain and refreshments. That version was easy
// to grant and easy to ignore, and it was not what the club actually runs short of:
// almost everyone who leaves leaves in the stretch where nothing works yet. So
// "What we need" now asks for the members who sit through that stretch.
//
// Keep it that way. Put a budget line back and the faculty CTA underneath this band
// stops being an invitation and becomes a funding request, which is a different
// email to a different person.

export const INSTITUTIONAL: { title: string; body: string }[] = [
  {
    title: "What we produce",
    body: "Public, attributable contributions to projects outside the university, plus students selected into internationally competitive mentorship programmes. Every claim on this site links to the upstream record.",
  },
  {
    title: "How we run",
    body: "Weekly working sessions, open to any student, no selection at the door. Mentors are seniors and alumni who have been through the same programmes.",
  },
  {
    title: "What we need",
    body: "People who stay. Almost everyone who quits, quits in the stretch where nothing works and nothing is fun. We need the ones who sit through it, answer the person behind them, and bring one more next term.",
  },
];

// ---------------------------------------------------------------------------
// THE TEAM — who actually runs the club.
//
// This list used to be org structure and NOTHING else — a team entry claimed only
// the office, on the grounds that a mentor's entry is backed by a public artifact
// and an officer's is backed by holding the office. That rule has been relaxed
// deliberately, so the reasoning that replaced it is worth writing down:
//
//   A `remit` says what the office covers, and stays true across a handover.
//   A `highlights` list says what the PERSON has done, and does not.
//
// Both now render, and the second one is the one to be careful with. These are
// claims about named students, so the file's own rule still binds them: if you
// cannot open a URL that proves it, it does not go in, and nothing goes in without
// that person's say-so. A batch year and an internship are checkable; a superlative
// is not. When somebody hands over, their highlights leave with them — only the
// remit is inherited by whoever takes the office.
//
// Three tiers, because the club genuinely has three: the two officers, the three
// functional leads, and the shadows. A shadow is an understudy attached to one
// specific role who is being trained to take it over at handover — which is the
// only reason a student club survives its founders graduating, and therefore worth
// showing on the chart rather than hiding in a handbook.
//
// Plus the desks (TEAM_CONTENT, at the bottom of this section): several people
// doing one job together under a lead, which is a different shape from both a tier
// and a shadow and gets its own type rather than being flattened into either.
//
// `shadowOf` holds the DESIGNATION, not the person. Roles outlast the people in
// them: when Rushab hands over, the shadow relationship should not need re-pointing
// at a new name. Team.tsx resolves it against the tier above and positions the
// card in that role's column, so a typo here surfaces as a missing connector
// rather than a silently wrong one.

/**
 * One line of a person's own record, as it appears in the hover card.
 *
 * SPLIT INTO TWO FIELDS RATHER THAN PARSED OUT OF ONE, and that is a bug fix
 * rather than a preference. These lines arrive written as "🚀 Role @ Place - what
 * it involved", so splitting on " - " to find the emphasis is the obvious move and
 * it is wrong: one of the lines below is a sentence that legitimately contains a
 * spaced hyphen ("I don't just want to learn things - I want to understand…"), and
 * a parser would have set half of it in bold. Structure that the renderer needs is
 * stated here instead of guessed there.
 *
 * The leading emoji is part of `headline` on purpose — it is this list's bullet, so
 * the rendered list carries no marker of its own.
 */
export type Highlight = {
  /** The claim. Carries the emoji, and is the emphasised half of the line. */
  headline: string;
  /** What it involved, if the line has a second half. */
  detail?: string;
};

export type TeamMember = {
  name: string;
  /** The office, not a description of the person. Rendered above the name. */
  designation: string;
  /**
   * Graduating batch, written as it is said out loud: "'28".
   *
   * Optional, and left off rather than guessed. It is the one fact on the card a
   * reader uses to place everybody else — "a second-year runs the repo" is the
   * whole point of the page — so an approximate one is worse than none.
   */
  batch?: string;
  /**
   * This person's own record. Rendered under the remit in the hover card, and as a
   * list in the stacked one.
   *
   * OPTIONAL, AND ASYMMETRY HERE IS FINE. Six of the eleven people on this chart
   * have no highlights and are not diminished by it: the remit above still answers
   * the question the page exists to answer. Filling these in for the sake of
   * evenness is how the list stops being checkable.
   */
  highlights?: Highlight[];
  /**
   * WHAT THE OFFICE COVERS, AND THEREFORE WHAT TO BRING THIS PERSON. Shown on
   * hover over the portrait on the chart, and as plain text in the stacked list.
   *
   * REQUIRED, and a remit rather than a bio, which is the whole reason this field
   * can exist in a file whose rule is that a team entry claims nothing except the
   * office. "Owns the review queue" is checkable by anyone who opens a PR;
   * "passionate about open source" is not, and it is the sentence this field would
   * turn into the moment it became optional and somebody filled one in for
   * flavour. Write it as an answer to "should I ask them?" — the question the
   * whole team section exists to answer.
   *
   * No pronouns: these get reworded at handover, not rewritten, and a role
   * description that has to be re-gendered when the office changes hands is a
   * description of a person wearing a role's name.
   */
  remit: string;
  /** Square crop — the frame is a circle. See public/people/README.md. */
  photo?: string;
  github?: string;
  /** Designation of the role this person shadows. Shadows only. */
  shadowOf?: string;
};

/** Tier 1. The two officers. */
export const TEAM_OFFICERS: TeamMember[] = [
  {
    name: "Abhinav Jha",
    designation: "President",
    remit:
      "Sets the term's direction and owns whatever nobody else does. Bring partnerships, college-level approvals, and anything that needs one decision made and then stuck to.",
  },
  {
    name: "Rushab Mistry",
    designation: "Vice President",
    batch: "'27",
    /* 218px square, not the 448 the README asks for, and that is the source's
       ceiling rather than an oversight: the original is a wide shot of a corridor
       in which the face occupies about 200px of a 1024x1280 frame. Upscaling to 448
       would add bytes and no detail. It clears the 112px circle it renders in, but
       a closer photograph would render visibly sharper on a 2x screen. */
    photo: "/people/rushab-mistry.jpg",
    remit:
      "Keeps the term moving week to week — who is doing what, by when. Bring a plan that has stalled, or anything where you cannot tell whose call it is.",
    highlights: [
      {
        headline: "🌐 Protocol Labs Dev Guild",
        detail:
          "Selected for a competitive Web3 open-source program, building decentralized infrastructure with a ₹1L+/month stipend",
      },
      {
        headline: "⚡ Juspay Bounty Winner",
        detail:
          "Cleared a competitive open-source bounty during freshman year, shipping high-impact code",
      },
      {
        headline: "🛠️ Web3 & Full-Stack Engineer",
        detail:
          "Multi-disciplinary experience across blockchain development, open-source software, and freelance client systems",
      },
    ],
  },
];

/** Tier 2. Functional leads. Order is left-to-right on the chart, not a ranking. */
export const TEAM_LEADS: TeamMember[] = [
  {
    name: "Prateek Singh",
    designation: "Mentorship Lead",
    batch: "'28",
    photo: "/people/prateek-singh.jpg",
    remit:
      "Pairs newcomers with somebody a term ahead of them. Bring a first issue you cannot find, a programme you want to aim at, or a stack you want a mentor in.",
    highlights: [
      {
        headline: "🚀 SDE Intern @ Scaler AI Labs",
        detail: "Building and shipping engineering solutions",
      },
      {
        // The one claim on this chart that PROJECTS already carries a figure for —
        // the OWASP/OpenCRE entry at the top of this file, read from the GitHub API
        // rather than estimated. Keep the two in step if either is reworded.
        headline: "💻 GSoC '26 Contributor @ OWASP",
        detail: "Ranked #2 contributor out of 40 in project repo",
      },
      {
        headline: "💡 Core Member & Lead Mentor @ Open Source Club",
        detail: "Mentoring builders & helping developers raise their first PR",
      },
    ],
  },
  {
    name: "Bhumi N Deshpande",
    designation: "Repo Maintainer",
    batch: "'29",
    photo: "/people/bhumi-n-deshpande.jpg",
    remit:
      "Owns the club's repositories and the review queue. Bring a pull request that needs eyes on it, a branch that will not build, or a question about where a project's code lives.",
    highlights: [
      {
        headline: "🚀 MTS Intern @ Scaler AI Labs",
        detail:
          "Cracked a technical internship at Scaler AI Labs during my first year, gaining hands-on experience in a professional engineering environment.",
      },
      {
        headline: "💻 Open Source Contributor",
        detail:
          "Contributor @ Sugar Labs (Music Blocks), explored programmes like Outreachy, GSoC and DMP.",
      },
      {
        headline: "🌐 Top 1000 Global Rank",
        detail: "GSSoC '26 Contributor & #1 ranked contributor from SST",
      },
      {
        headline: "💡 Open Source Community Leader",
        detail:
          "Core Member, mentoring student developers and driving campus projects",
      },
    ],
  },
  {
    name: "Kunal Kumar",
    designation: "Events Lead",
    batch: "'28",
    photo: "/people/kunal-kumar.jpg",
    remit:
      "Runs the sessions, sprints and hack nights. Bring a workshop you want to run, a talk you want to give, or an event that needs a room and a date.",
    highlights: [
      {
        headline: "⚡ Startup Experience @ Emergent",
        detail:
          "Built real-world products using React, TypeScript, Python, and AI systems",
      },
      {
        headline: "🛠️ Creator of Recall",
        detail: "Designed and shipped AI-driven software projects from scratch",
      },
      {
        headline: "💡 Core Member @ Open Source Club (SST)",
        detail:
          "Driving technical initiatives, community growth, and student mentorship",
      },
    ],
  },
];

/** Tier 3. Each one attaches to exactly one role in a tier above. */
export const TEAM_SHADOWS: TeamMember[] = [
  {
    name: "Arnav Singh",
    designation: "Shadow",
    shadowOf: "Events Lead",
    batch: "'29",
    photo: "/people/arnav-singh.jpg",
    remit:
      "Learning the events desk from inside it, and taking it over at handover. Safe to bring anything you would bring the Events Lead.",
    // Headline-only, every one of them. These are counts and titles rather than
    // "role, and what it involved", so there is no second half to set — and adding
    // one would mean writing it rather than recording it.
    highlights: [
      { headline: "🏆 10+ Hackathon Participations" },
      { headline: "🥇 4+ Hackathon Wins" },
      { headline: "🎮 2× National Game Dev Champion" },
      {
        headline: "☁️ Microsoft for Startups",
        detail: "Received mentorship & support",
      },
      { headline: "🎤 Hackathon Organizer & Community Lead" },
      { headline: "🌍 Country Lead — DevRel at Devnovate" },
    ],
  },
  {
    name: "Yash Virulkar",
    designation: "Shadow",
    shadowOf: "Vice President",
    remit:
      "Learning the vice president's half of running a term, and taking it over at handover. Safe to bring anything you would bring the Vice President.",
  },
];

/* Tier 3, the other kind. A DESK, not an understudy — and that difference is why
   this is a group with one remit rather than four TeamMembers with four.
   A shadow is attached to a role and is training to hold it; a desk is several
   people doing the same work together, and nobody on it holds an office. Giving
   each member a `designation` would invent four titles the club does not award,
   and giving each its own `remit` would repeat one sentence four times. So the
   remit sits on the desk, where it is true.

   Its members may still carry a batch and their own highlights, because those
   belong to the person rather than to the desk — the remit answers "what does this
   desk do", and a highlight answers "who is this". A desk member with neither is
   just a name, which is a complete entry here.

   `of` is a DESIGNATION for the same reason `shadowOf` is: the desk reports to the
   Repo Maintainer's office, not to whoever currently holds it. Team.tsx resolves
   it against the leads and drops the connector from that column. */
/** A person on a desk. No office, so no designation; everything else is optional. */
export type GroupMember = {
  name: string;
  photo?: string;
  github?: string;
  batch?: string;
  highlights?: Highlight[];
};

export type TeamGroup = {
  /** Rendered as the label the connector from the lead reaches. */
  label: string;
  /** Designation of the role this desk reports to. */
  of: string;
  /** What the desk covers, and therefore what to bring it. One remit, one desk. */
  remit: string;
  members: GroupMember[];
};

export const TEAM_CONTENT: TeamGroup = {
  label: "Content Team",
  of: "Repo Maintainer",
  remit:
    "Writes and keeps the words — docs, READMEs, event write-ups and everything on this site. Bring a README nobody can follow, a project that needs explaining to a first-year, or a session that needs writing up.",
  members: [
    { name: "Divyanshi Saini" },
    { name: "Sarvika Sharma" },
    { name: "Aarsheya Jasrotia" },
    {
      name: "Srishti Kumari",
      batch: "'29",
      photo: "/people/srishti-kumari.jpg",
      /* Four sentences rather than four credentials, and left exactly as written:
         this is somebody's own voice, and the punctuation is part of it. Note the
         third line — a spaced hyphen mid-sentence — which is the line that makes
         `headline` / `detail` two fields instead of one string and a split(" - ").
         Headline-only, so the renderer sets them as prose rather than as labels. */
      highlights: [
        {
          headline:
            "A curious mind with 47 tabs open - and somehow, all of them are important. 🧠",
        },
        {
          headline:
            "Coding today, chasing SOB tomorrow, and turning every random curiosity into a new mission. 💻",
        },
        {
          headline:
            "I don't just want to learn things - I want to understand how everything works.",
        },
        {
          headline:
            "Ambitious, relentlessly curious, slightly chaotic… but definitely not built for an ordinary life. 🚀",
        },
      ],
    },
  ],
};

export function teamSize(): number {
  return (
    TEAM_OFFICERS.length +
    TEAM_LEADS.length +
    TEAM_SHADOWS.length +
    TEAM_CONTENT.members.length
  );
}
