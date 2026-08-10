// PROJECTS — three separate fields, deliberately not one mixed grid.
//
// The three answer different questions and mixing them destroys all three:
//
//   BUILD DAYS      "what could I work on this Saturday?"      — join-able now
//   CLUB REPOS      "does this club actually maintain things?"  — longer-lived
//   IN THE WILD     "has anyone here landed code elsewhere?"    — the real proof
//
// A single grid of cards forces the reader to work out which is which from the
// text, and the most valuable one — upstream work in somebody else's repository —
// gets diluted by our own side projects sitting next to it at the same weight.
//
// ---------------------------------------------------------------------------
// WHY THERE ARE NO ORG LOGOS on the upstream cards.
//
// Two reasons, either sufficient. First, an organisation's logo is its trademark,
// and putting OWASP's or Kubernetes' mark on a club page implies an endorsement
// nobody granted — the same rule this site already applies to programme logos.
// Second, the Content-Security-Policy in next.config.js sets `img-src 'self'
// data:`, so a remote logo would be blocked at the browser and render as a broken
// image. The org name set in mono inside a bordered plate says the same thing,
// is ours to use, and cannot 404.

// ---------------------------------------------------------------------------
// 1. BUILD DAY PROJECTS — what is running right now.
//
// The gate here is `published`, and it means something specific: the "good first
// issue" link must actually resolve to open issues. A build-day card promising a
// beginner-sized task and linking to an empty list is worse than no card, because
// the person who clicks it concludes the club is dormant.

export type BuildDayProject = {
  name: string;
  /** ONE line. The problem it solves, in the reader's terms, not the architecture. */
  problem: string;
  stack: string[];
  /** Who to actually talk to on the day. A name, not a role. */
  maintainer: string;
  maintainerGithub?: string;
  repo?: string;
  /** Must resolve to genuinely open, genuinely beginner-sized issues. */
  goodFirstIssue?: string;
  /** How many people are on it, so a reader can judge whether to join. */
  size?: string;
  published: boolean;
};

export const BUILD_DAY: BuildDayProject[] = [
  // ---- Awaiting real content ---------------------------------------------
  // One entry per project actually running in build days. Before setting
  // `published: true`, open the goodFirstIssue link yourself and confirm it lists
  // open issues a first-timer could take.
];

const BUILD_DAY_SCAFFOLD: BuildDayProject[] = [
  {
    name: "Placeholder Project One",
    problem:
      "Replace with the one-line problem this project solves, in plain terms.",
    stack: ["Language", "Framework"],
    maintainer: "Placeholder Maintainer",
    size: "N people",
    published: true,
  },
  {
    name: "Placeholder Project Two",
    problem:
      "Replace with the one-line problem this project solves, in plain terms.",
    stack: ["Language", "Database"],
    maintainer: "Placeholder Maintainer",
    size: "N people",
    published: true,
  },
  {
    name: "Placeholder Project Three",
    problem:
      "Replace with the one-line problem this project solves, in plain terms.",
    stack: ["Language", "Tooling"],
    maintainer: "Placeholder Maintainer",
    size: "N people",
    published: true,
  },
];

export function publishedBuildDay(): BuildDayProject[] {
  const real = BUILD_DAY.filter((p) => p.published);
  if (real.length > 0) return real;
  return process.env.NODE_ENV === "production" ? [] : BUILD_DAY_SCAFFOLD;
}

// ---------------------------------------------------------------------------
// 2. CLUB REPOS — the software the club owns and runs.
//
// This site is one of them, and it is the honest flagship: a real repository, with
// a real CONTRIBUTING.md, a real good-first-issue label, and a maintainer a member
// can find in person. That last part is why it is the lowest-friction first merged
// pull request available to anybody reading this page.

export type ClubRepo = {
  name: string;
  repo: string;
  what: string;
  /** Why a beginner specifically should start here. */
  whyStartHere?: string;
  stack: string[];
  goodFirstIssue?: string;
  contributing?: string;
  /** Roughly how long it has been running. Not a version number. */
  since?: string;
  published: boolean;
};

export const CLUB_REPOS: ClubRepo[] = [
  {
    name: "scaleropensourcelabs.com",
    repo: "https://github.com/PRAteek-singHWY/scaleropensourcelabs.com",
    what:
      "This website. Next.js, statically rendered, no database and no backend — all the content lives in typed arrays under web/content, so adding a person or a project is an edit to one file.",
    whyStartHere:
      "It is the lowest-friction first pull request that exists for you, because the maintainer reviewing it is somebody you can find in the lab and ask. The repo also carries a CONTRIBUTING.md written for people who have never opened a PR anywhere.",
    stack: ["TypeScript", "Next.js", "Tailwind", "Playwright"],
    goodFirstIssue:
      "https://github.com/PRAteek-singHWY/scaleropensourcelabs.com/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22",
    contributing:
      "https://github.com/PRAteek-singHWY/scaleropensourcelabs.com/blob/main/CONTRIBUTING.md",
    published: true,
  },
  // ---- Awaiting real content ---------------------------------------------
  // Add the club's other long-running repos here as they exist. Same rule: a
  // repository somebody can open, not a plan for one.
];

export function publishedClubRepos(): ClubRepo[] {
  return CLUB_REPOS.filter((r) => r.published);
}

// ---------------------------------------------------------------------------
// 3. MEMBER CONTRIBUTIONS IN THE WILD — the strongest thing on this page.
//
// Code that a maintainer who owes us nothing agreed to merge into a project we do
// not control. Everything else here is work we assigned ourselves.
//
// VERIFIED against the live GitHub API on 2026-07-29 via the contributors endpoint
// and scoped search counts. These numbers were read from GitHub, not estimated.
// Re-check before quoting them anywhere else, because they move.

export type Upstream = {
  /** "owner/repo" as it appears on GitHub. */
  repo: string;
  url: string;
  /** The organisation, rendered as type. See the note on logos above. */
  org: string;
  /** What the upstream project actually is, in the reader's terms. */
  what: string;
  /** What our member did there. Specific — never "contributed to". */
  did: string;
  member: string;
  memberUrl?: string;
  /** Link to the merged work itself, when there is one PR to point at. */
  prUrl?: string;
  /** Hard proof: a rank, a count. Only when verified against the source. */
  proof?: { label: string; value: string };
  language?: string;
  /** Card state tag. "security" claims the site's single signal colour, so it is
      reserved for coordinated-disclosure work rather than applied for emphasis. */
  tag?: { label: string; tone: "merged" | "security" | "neutral" };
  published: boolean;
};

export const UPSTREAM: Upstream[] = [
  {
    repo: "OWASP/OpenCRE",
    url: "https://github.com/OWASP/OpenCRE",
    org: "OWASP",
    what:
      "OWASP's Common Requirement Enumeration — the open catalogue that maps security standards to each other, so a control in one framework can be traced to its equivalent in another.",
    did:
      "Second-highest contributor by commits on the default branch, out of forty. 74 pull requests opened, 46 merged.",
    member: "Prateek Singh",
    memberUrl: "https://github.com/PRAteek-singHWY",
    proof: { label: "Contributor rank", value: "#2 / 40" },
    language: "Python",
    tag: { label: "46 merged", tone: "merged" },
    published: true,
  },
  // ---- Awaiting real content ---------------------------------------------
  // One entry per member contribution, with a URL that proves it. Set
  // published: true only once the numbers have been checked against GitHub.
];

export function publishedUpstream(): Upstream[] {
  return UPSTREAM.filter((p) => p.published);
}

/**
 * Headline figures, DERIVED from the lists rather than typed separately, so a
 * summary can never drift from the evidence underneath it. This is the mechanism
 * that makes the numbers strip on the home page safe: there is no second place to
 * edit, so there is nothing to forget to update.
 */
export function projectTotals() {
  const upstream = publishedUpstream();
  const repos = publishedClubRepos();
  const buildDay = publishedBuildDay();

  // Merged PRs are only counted where a tag states a verified count. Parsing the
  // tag rather than keeping a second number is deliberate: one source of truth,
  // and an entry with no verified count contributes nothing instead of guessing.
  const merged = upstream.reduce((n, u) => {
    const m = u.tag?.label.match(/^(\d+)\s+merged$/);
    return n + (m ? Number(m[1]) : 0);
  }, 0);

  return {
    upstreamRepos: upstream.length,
    clubRepos: repos.length,
    activeProjects: buildDay.length + repos.length,
    merged,
    contributors: new Set(upstream.map((u) => u.member)).size,
    orgs: new Set(upstream.map((u) => u.org)).size,
  };
}
