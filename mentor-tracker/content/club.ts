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
