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

export type Track = {
  name: string;
  summary: string;
  detail: string;
  href?: string;
};

export const TRACKS: Track[] = [
  {
    name: "Mentored contribution",
    summary: "Where almost everyone starts.",
    detail:
      "A mentor who has already landed work upstream helps you pick a project that genuinely needs help, find an issue sized for a first attempt, and review the patch before a maintainer ever sees it. The goal is your second contribution — once you know a codebase, the next one is much faster.",
  },
  {
    name: "AI security",
    summary: "Higher difficulty. The work most likely to get you noticed.",
    detail:
      "Open-source AI tooling shipped fast and is now load-bearing. Members find real weaknesses — credentials committed into model configs, checkpoints that execute code on load, agent frameworks letting untrusted input reach a shell — and land the fix upstream through the project's own coordinated disclosure process.",
  },
  {
    name: "Club engineering",
    summary: "Software the club owns and runs.",
    detail:
      "This site is one of them, and it is open source. Working here is the lowest-friction way to get a first merged pull request, because the maintainer reviewing it is someone you can talk to in person.",
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
    body: "A failing edge case, a documentation gap, a small refactor. Unglamorous work gets merged; ambitious work gets stalled.",
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

export const LINKS = {
  github: "https://github.com/PRAteek-singHWY",
  security: "/security",
  email: "opensource@scaleropensourcelabs.com",
};

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

export type Programme = "GSOC" | "LFX" | "C4GT" | "SOB" | "OUTREACHY";

/** Full names, since the acronyms mean nothing to a general reader. */
export const PROGRAMME_NAME: Record<Programme, string> = {
  GSOC: "Google Summer of Code",
  LFX: "LFX Mentorship",
  C4GT: "Code for GovTech",
  SOB: "Summer of Bitcoin",
  OUTREACHY: "Outreachy",
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
export const PROGRAMME_COLOUR: Record<Programme, string> = {
  GSOC: "#4A86E8",
  LFX: "#D64FA0",
  C4GT: "#1F9D6B",
  SOB: "#B8871F",
  OUTREACHY: "#8B6DE8",
};

export const PROGRAMME_SHORT: Record<Programme, string> = {
  GSOC: "GSoC",
  LFX: "LFX",
  C4GT: "C4GT",
  SOB: "SoB",
  OUTREACHY: "Outreachy",
};

export type Selection = {
  name: string;
  programme: Programme;
  year: string;
  /** The mentoring organisation that selected them. */
  org: string;
  /** One line on what they actually built. Specific beats impressive. */
  work: string;
  /** Path under /public/people. Falls back to a monogram when absent. */
  photo?: string;
  github?: string;
  /** Proof link: the project page, the merged work, the announcement. */
  url?: string;
  /** Must be true to render. See rule 1 above. */
  consented: boolean;
};

// Awaiting real entries. Each needs a name, programme, year, org, one line of
// work, and that member's consent to being published.
export const SELECTIONS: Selection[] = [];

/**
 * Scaffold for local development only.
 *
 * The hall is a scroll-driven, multi-station layout — it cannot be designed or
 * reviewed against an empty array, because the weave, the alternating sides and the
 * active-card transitions only exist once there are stations to fly past.
 *
 * These are deliberately NOT plausible: obvious placeholder names and organisations,
 * so nobody can mistake a screenshot for a real claim. And they are gated on
 * NODE_ENV, so a production build cannot ship them even by accident — the guard is
 * structural rather than a note asking someone to remember.
 */
const SCAFFOLD: Selection[] = [
  {
    name: "Placeholder One",
    programme: "GSOC",
    year: "2026",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Two",
    programme: "LFX",
    year: "2025",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Three",
    programme: "C4GT",
    year: "2026",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Four",
    programme: "SOB",
    year: "2025",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Five",
    programme: "GSOC",
    year: "2026",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Six",
    programme: "LFX",
    year: "2025",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Seven",
    programme: "GSOC",
    year: "2026",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Eight",
    programme: "C4GT",
    year: "2025",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Nine",
    programme: "SOB",
    year: "2026",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Ten",
    programme: "GSOC",
    year: "2025",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Eleven",
    programme: "LFX",
    year: "2026",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Twelve",
    programme: "C4GT",
    year: "2025",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Thirteen",
    programme: "GSOC",
    year: "2026",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Fourteen",
    programme: "SOB",
    year: "2025",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
];

export function publishedSelections(): Selection[] {
  const real = SELECTIONS.filter((s) => s.consented);
  if (real.length > 0) return real;
  return process.env.NODE_ENV === "production" ? [] : SCAFFOLD;
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
    orgs: new Set(live.map((s) => s.org)).size,
  };
}

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
    what: "Google pays you to write code for an open-source organisation over a summer, with a mentor from that organisation assigned to you.",
    who: "Anyone 18+ who is new to the organisation. You do not need to be a student, and you do not need existing open-source experience.",
    when: "Organisations announced early in the year, applications a few weeks later, coding over the summer.",
    pays: "A stipend set by Google, varying by country and project size. Check the current figure on the programme site.",
    weDo: "We start six months early. Selection goes to people the maintainers already recognise, so the work is contributing steadily before applications open — not writing a good proposal in March.",
    url: "https://summerofcode.withgoogle.com/",
  },
  {
    key: "LFX",
    what: "The Linux Foundation's mentorship programme, running across CNCF, Kubernetes, Node.js and the rest of its projects.",
    who: "Beginners are explicitly the target. Terms run several times a year, so a miss is a few months rather than a year.",
    when: "Three terms annually, so there is almost always one open or opening.",
    pays: "A stipend published by the Linux Foundation, scaled by region.",
    weDo: "Help you pick a term and project that matches what you already know, and get a first contribution merged into that project before the application closes.",
    url: "https://lfx.linuxfoundation.org/tools/mentorship/",
  },
  {
    key: "C4GT",
    what: "Code for GovTech: open-source contribution to digital public infrastructure — the software Indian government services actually run on.",
    who: "Indian students, with a strong bias toward people who want their work used at national scale rather than starred on GitHub.",
    when: "An annual summer cohort plus year-round contribution windows.",
    pays: "A stipend published by the programme.",
    weDo: "Point you at the DPI projects with responsive maintainers, and help you read a codebase built for scale rather than for demos.",
    url: "https://www.codeforgovtech.in/",
  },
  {
    key: "SOB",
    what: "Summer of Bitcoin: a paid summer programme contributing to Bitcoin and Lightning open-source projects.",
    who: "Students, with a real ramp for people who have never touched the codebase. The C++ is intimidating and the community knows it.",
    when: "Applications early in the year, coding over the summer.",
    pays: "A stipend published by the programme.",
    weDo: "Work through the onboarding curriculum together, because almost nobody finishes it alone.",
    url: "https://www.summerofbitcoin.org/",
  },
];

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
