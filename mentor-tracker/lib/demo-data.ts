// Deterministic GitHub fixtures for demo mode.
//
// Everything here is synthetic. No real person's activity is embedded in the repo,
// and every number is generated from a hash of the username, so the dashboard looks
// identical on every machine and across restarts — a contributor changing a chart
// can tell whether their change or the data moved.
//
// The fixtures deliberately cover the UI's awkward states, not just the happy path:
//
//   * all four contributor-rank states — ranked, unranked, outside-window, unresolved
//   * a repo where they're the sole contributor (no meaningful percentile)
//   * a mentee with a `partial` profile and a note
//   * a mentee whose tech-stack scan is missing entirely (stack: null)
//   * a mentee with no activity at all
//
// Those branches are the ones that rot silently when nobody can see them locally.

import type { DayCount, MenteeSnapshot } from "@/lib/github";
import type {
  DayContribution,
  DeepProfile,
  RankStatus,
  RepoContribution,
  StackEntry,
} from "@/lib/github-deep";

// ---- Deterministic pseudo-randomness --------------------------------------

/** FNV-1a. Stable across platforms and Node versions, unlike hashing libraries. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, good enough to make fixtures look plausible. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(r: () => number, items: readonly T[]): T {
  return items[Math.floor(r() * items.length)];
}

function intBetween(r: () => number, lo: number, hi: number): number {
  return lo + Math.floor(r() * (hi - lo + 1));
}

// ---- Demo cohort -----------------------------------------------------------

export type DemoMenteeSeed = {
  name: string;
  email: string;
  github: string;
  /** Rough activity level, drives how busy the generated numbers look. */
  tier: "strong" | "steady" | "quiet" | "inactive";
  /** Deliberately exercise a hard-to-reach UI state. */
  showcase?: "partial" | "no-stack";
};

export type DemoMentorSeed = {
  name: string;
  github: string | null;
  mentees: DemoMenteeSeed[];
};

// Fictional people. Any resemblance to real GitHub logins is unintended — these
// usernames are never sent to the GitHub API in demo mode.
export const DEMO_MENTORS: DemoMentorSeed[] = [
  {
    name: "Asha Raman",
    github: "asha-demo",
    mentees: [
      {
        name: "Kiran Devi",
        email: "kiran@example.invalid",
        github: "kiran-demo",
        tier: "strong",
      },
      {
        name: "Tomas Vidal",
        email: "tomas@example.invalid",
        github: "tomas-demo",
        tier: "steady",
      },
      {
        name: "Wei Lin",
        email: "wei@example.invalid",
        github: "wei-demo",
        tier: "steady",
        showcase: "partial",
      },
    ],
  },
  {
    name: "Ben Okoro",
    github: "ben-demo",
    mentees: [
      {
        name: "Nadia Haddad",
        email: "nadia@example.invalid",
        github: "nadia-demo",
        tier: "strong",
        showcase: "no-stack",
      },
      {
        name: "Sam Whitfield",
        email: "sam@example.invalid",
        github: "sam-demo",
        tier: "quiet",
      },
    ],
  },
  {
    name: "Priya Nair",
    github: null,
    mentees: [
      {
        name: "Diego Salas",
        email: "diego@example.invalid",
        github: "diego-demo",
        tier: "steady",
      },
      {
        name: "Ife Adeyemi",
        email: "ife@example.invalid",
        github: "ife-demo",
        tier: "inactive",
      },
    ],
  },
];

const ALL_SEEDS: DemoMenteeSeed[] = DEMO_MENTORS.flatMap((m) => m.mentees);

export function demoSeedFor(username: string): DemoMenteeSeed | null {
  const lower = username.toLowerCase();
  return ALL_SEEDS.find((s) => s.github.toLowerCase() === lower) ?? null;
}

const TIER_SCALE: Record<DemoMenteeSeed["tier"], number> = {
  strong: 1,
  steady: 0.55,
  quiet: 0.2,
  inactive: 0,
};

// ---- Repo and language vocabulary -----------------------------------------

const UPSTREAM_REPOS = [
  { name: "openlibrary/catalog-service", lang: "Python" },
  { name: "civictech/opendata-portal", lang: "TypeScript" },
  { name: "kubestack/operator-toolkit", lang: "Go" },
  { name: "rustaceans/parse-utils", lang: "Rust" },
  { name: "a11y-collective/axe-rules", lang: "TypeScript" },
  { name: "climatebase/emissions-api", lang: "Python" },
  { name: "docsy/markdown-lint", lang: "JavaScript" },
] as const;

const PERSONAL_REPOS = [
  "portfolio-site",
  "algo-notes",
  "chat-playground",
  "dotfiles",
  "leetcode-log",
  "weather-cli",
] as const;

const CODE_LANGS = [
  { label: "TypeScript", ext: ".ts" },
  { label: "TypeScript (React)", ext: ".tsx" },
  { label: "Python", ext: ".py" },
  { label: "Go", ext: ".go" },
  { label: "Rust", ext: ".rs" },
  { label: "CSS", ext: ".css" },
  { label: "SQL", ext: ".sql" },
  { label: "Shell", ext: ".sh" },
] as const;

const SUPPORT_LANGS = [
  { label: "JSON", ext: ".json" },
  { label: "YAML / config", ext: ".yml" },
  { label: "Docs", ext: ".md" },
] as const;

const PR_TITLES = [
  "Fix off-by-one in pagination cursor",
  "Add retry with backoff to the fetch client",
  "Handle empty response from the search endpoint",
  "Extract validation into a reusable schema",
  "Cache language lookups per repo",
  "Correct timezone handling in the daily rollup",
  "Add keyboard navigation to the results list",
  "Reduce duplicate queries in the loader",
] as const;

const ISSUE_TITLES = [
  "Dashboard crashes when a repo has no default branch",
  "Rate limit not surfaced to the user",
  "Sorting resets after a refresh",
] as const;

// ---- Snapshot (the card grid) ---------------------------------------------

function commitSeries(r: () => number, scale: number): DayCount[] {
  const out: DayCount[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
    const base = scale * (weekend ? 2 : 6);
    // Bursty rather than uniform — real commit histories have quiet days.
    const quiet = r() < (weekend ? 0.55 : 0.25);
    out.push({
      date: d.toISOString().slice(0, 10),
      count: quiet ? 0 : Math.round(r() * base),
    });
  }
  return out;
}

export function demoSnapshot(username: string): MenteeSnapshot {
  const seed = demoSeedFor(username);
  const r = rng(hash(username));
  const scale = TIER_SCALE[seed?.tier ?? "steady"];

  const commitsByDay = commitSeries(r, scale);
  const commits30d = commitsByDay.reduce((n, d) => n + d.count, 0);

  // Streak = trailing consecutive non-zero days, matching the real definition.
  let streakDays = 0;
  for (let i = commitsByDay.length - 1; i >= 0; i--) {
    if (commitsByDay[i].count === 0) break;
    streakDays += 1;
  }

  const totalPRs = Math.round(scale * intBetween(r, 20, 90));
  const mergedPRs = Math.round(totalPRs * (0.45 + r() * 0.4));
  const openPRs = Math.min(totalPRs - mergedPRs, intBetween(r, 0, 5));
  const closedPRs = Math.max(0, totalPRs - mergedPRs - openPRs);
  const totalIssues = Math.round(scale * intBetween(r, 3, 30));
  const openIssues = Math.round(totalIssues * r() * 0.5);

  const repoCount = scale === 0 ? 0 : intBetween(r, 2, 5);
  const activeRepos = Array.from({ length: repoCount }, (_, i) => {
    const name = PERSONAL_REPOS[(hash(username) + i) % PERSONAL_REPOS.length];
    const daysAgo = intBetween(r, 0, 60);
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - daysAgo);
    return {
      name,
      url: `https://github.com/${username}/${name}`,
      lastPushed: d.toISOString(),
      stars: Math.round(scale * intBetween(r, 0, 40)),
      language: pick(r, CODE_LANGS).label.replace(" (React)", ""),
    };
  });

  const prCount = scale === 0 ? 0 : Math.min(5, intBetween(r, 2, 5));
  const recentPRs = Array.from({ length: prCount }, (_, i) => {
    const repo = pick(r, UPSTREAM_REPOS);
    const daysAgo = i * intBetween(r, 2, 9) + 1;
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - daysAgo);
    const number = intBetween(r, 100, 4000);
    const linked = r() < 0.5;
    return {
      title: PR_TITLES[(hash(username + i) % PR_TITLES.length)],
      html_url: `https://github.com/${repo.name}/pull/${number}`,
      repository_url: `https://api.github.com/repos/${repo.name}`,
      created_at: d.toISOString(),
      state: r() < 0.7 ? "closed" : "open",
      number,
      repoName: repo.name,
      linkedIssueUrl: linked
        ? `https://github.com/${repo.name}/issues/${number - 3}`
        : null,
      linkedIssueTitle: linked
        ? ISSUE_TITLES[hash(username + i) % ISSUE_TITLES.length]
        : null,
    };
  });

  const latestIssueRepo = pick(r, UPSTREAM_REPOS);
  const issueNumber = intBetween(r, 100, 3000);
  const issueDate = new Date();
  issueDate.setUTCDate(issueDate.getUTCDate() - intBetween(r, 1, 40));

  return {
    username,
    profileUrl: `https://github.com/${username}`,
    // github.com/<name>.png resolves for any string, so avatars still render
    // without leaking a real account's identity into the fixtures.
    avatarUrl: `https://github.com/${username}.png`,
    name: seed?.name ?? username,
    followers: Math.round(scale * intBetween(r, 0, 120)),
    publicRepos: repoCount + intBetween(r, 0, 8),
    totalStars: activeRepos.reduce((n, x) => n + x.stars, 0),
    latestIssue:
      totalIssues > 0
        ? {
            title: ISSUE_TITLES[hash(username) % ISSUE_TITLES.length],
            html_url: `https://github.com/${latestIssueRepo.name}/issues/${issueNumber}`,
            repository_url: `https://api.github.com/repos/${latestIssueRepo.name}`,
            created_at: issueDate.toISOString(),
            state: r() < 0.5 ? "open" : "closed",
            number: issueNumber,
          }
        : null,
    recentPRs,
    activeRepos,
    commits30d,
    streakDays,
    commitsByDay,
    stats: {
      openPRs,
      mergedPRs,
      closedPRs,
      totalPRs,
      openIssues,
      closedIssues: totalIssues - openIssues,
      totalIssues,
      commentedThreads: Math.round(scale * intBetween(r, 5, 80)),
      mergeRate: totalPRs > 0 ? mergedPRs / totalPRs : 0,
      available: true,
    },
    fetchedAt: new Date().toISOString(),
  };
}

// ---- Deep profile (the drill-down) ----------------------------------------

/**
 * Rank states, assigned so that any cohort shows all four. Position in the repo
 * list decides the state, which keeps it deterministic and means a contributor
 * always has an `unresolved` and an `outside-window` row on screen to style.
 */
function rankFor(
  r: () => number,
  index: number,
  isOwn: boolean,
): Pick<
  RepoContribution,
  "rank" | "rankStatus" | "totalContributors" | "contributorsExact" | "commits"
> {
  if (isOwn) {
    // Sole author of their own repo — real, but not a meaningful percentile.
    return {
      rank: 1,
      rankStatus: "ranked",
      totalContributors: 1,
      contributorsExact: true,
      commits: intBetween(r, 8, 90),
    };
  }
  const state: RankStatus =
    index === 1
      ? "unresolved"
      : index === 2
        ? "outside-window"
        : index === 3
          ? "unranked"
          : "ranked";

  if (state === "ranked") {
    const total = intBetween(r, 12, 260);
    return {
      rank: Math.max(1, Math.round(total * r() * 0.3)),
      rankStatus: "ranked",
      totalContributors: total,
      contributorsExact: r() < 0.6,
      commits: intBetween(r, 5, 120),
    };
  }
  if (state === "outside-window") {
    return {
      rank: null,
      rankStatus: "outside-window",
      totalContributors: intBetween(r, 600, 1400),
      contributorsExact: false,
      commits: intBetween(r, 1, 6),
    };
  }
  if (state === "unranked") {
    return {
      rank: null,
      rankStatus: "unranked",
      totalContributors: intBetween(r, 20, 90),
      contributorsExact: true,
      commits: 0,
    };
  }
  return {
    rank: null,
    rankStatus: "unresolved",
    totalContributors: null,
    contributorsExact: false,
    commits: 0,
  };
}

function stackFor(r: () => number, scale: number): StackEntry[] {
  const codeCount = intBetween(r, 3, 6);
  const raw: Omit<StackEntry, "share">[] = [];

  for (let i = 0; i < codeCount; i++) {
    const lang = CODE_LANGS[(i * 3 + Math.floor(r() * 3)) % CODE_LANGS.length];
    if (raw.some((x) => x.label === lang.label)) continue;
    const files = intBetween(r, 2, 40);
    raw.push({
      label: lang.label,
      ext: lang.ext,
      kind: "code",
      files,
      additions: files * intBetween(r, 8, 90),
      deletions: files * intBetween(r, 1, 30),
    });
  }

  // A support row large enough to demonstrate why the code/support split exists:
  // a single generated JSON payload out-weighing real code by lines added.
  const jsonFiles = intBetween(r, 2, 9);
  raw.push({
    label: "JSON",
    ext: ".json",
    kind: "support",
    files: jsonFiles,
    additions: jsonFiles * intBetween(r, 300, 900),
    deletions: 0,
  });
  for (const s of SUPPORT_LANGS.slice(1)) {
    const files = intBetween(r, 1, 5);
    raw.push({
      label: s.label,
      ext: s.ext,
      kind: "support",
      files,
      additions: files * intBetween(r, 3, 40),
      deletions: files * intBetween(r, 0, 10),
    });
  }

  const scaled = raw.map((e) => ({
    ...e,
    additions: Math.max(1, Math.round(e.additions * Math.max(scale, 0.15))),
  }));
  const total = scaled.reduce((n, e) => n + e.additions, 0);
  return scaled
    .map((e) => ({ ...e, share: total > 0 ? e.additions / total : 0 }))
    .sort((a, b) => b.additions - a.additions);
}

/**
 * A year of daily contribution counts. Term-time is busier than the winter and
 * summer breaks, and weekends are quieter — a flat random series looks obviously
 * synthetic in a grid, which would undercut the whole point of the hero.
 */
function yearSeries(r: () => number, scale: number): DayContribution[] {
  const out: DayContribution[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const month = d.getUTCMonth(); // 0-11
    const onBreak = month === 11 || month === 4 || month === 5; // Dec, May, Jun
    const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
    const intensity = scale * (onBreak ? 0.35 : 1) * (weekend ? 0.4 : 1);
    const quiet = r() < 1 - intensity * 0.75;
    out.push({
      date: d.toISOString().slice(0, 10),
      count: quiet ? 0 : Math.max(1, Math.round(r() * intensity * 11)),
    });
  }
  return out;
}

export function demoDeepProfile(username: string): DeepProfile {
  const seed = demoSeedFor(username);
  const r = rng(hash(`deep:${username}`));
  const scale = TIER_SCALE[seed?.tier ?? "steady"];
  const snap = demoSnapshot(username);

  const upstreamCount = scale === 0 ? 0 : intBetween(r, 3, 5);
  const ownCount = scale === 0 ? 1 : intBetween(r, 2, 4);

  const repos: RepoContribution[] = [];

  for (let i = 0; i < upstreamCount; i++) {
    const repo = UPSTREAM_REPOS[(hash(username) + i * 3) % UPSTREAM_REPOS.length];
    if (repos.some((x) => x.nameWithOwner === repo.name)) continue;
    const rank = rankFor(r, i, false);
    const prsOpened = Math.round(scale * intBetween(r, 2, 40));
    const prsMerged = Math.round(prsOpened * (0.4 + r() * 0.5));
    const prsOpen = Math.min(prsOpened - prsMerged, intBetween(r, 0, 4));
    const issuesOpened = Math.round(scale * intBetween(r, 0, 12));
    const days = intBetween(r, 0, 90);
    const last = new Date();
    last.setUTCDate(last.getUTCDate() - days);

    repos.push({
      nameWithOwner: repo.name,
      url: `https://github.com/${repo.name}`,
      description: `Demo fixture — ${repo.lang} project used to populate the dashboard.`,
      stars: intBetween(r, 40, 9000),
      primaryLanguage: repo.lang,
      isOwnRepo: false,
      isFork: false,
      issuesOpened,
      issuesClosed: Math.round(issuesOpened * r()),
      prsOpened,
      prsMerged,
      prsOpen,
      prsClosed: Math.max(0, prsOpened - prsMerged - prsOpen),
      reviews: Math.round(scale * intBetween(r, 0, 15)),
      lastActivityAt: last.toISOString(),
      ...rank,
    });
  }

  for (let i = 0; i < ownCount; i++) {
    const name = PERSONAL_REPOS[(hash(username) + i) % PERSONAL_REPOS.length];
    const full = `${username}/${name}`;
    if (repos.some((x) => x.nameWithOwner === full)) continue;
    const days = intBetween(r, 0, 120);
    const last = new Date();
    last.setUTCDate(last.getUTCDate() - days);
    repos.push({
      nameWithOwner: full,
      url: `https://github.com/${full}`,
      description: "Demo fixture — a personal project.",
      stars: Math.round(scale * intBetween(r, 0, 30)),
      primaryLanguage: pick(r, CODE_LANGS).label.replace(" (React)", ""),
      isOwnRepo: true,
      isFork: false,
      issuesOpened: 0,
      issuesClosed: 0,
      prsOpened: 0,
      prsMerged: 0,
      prsOpen: 0,
      prsClosed: 0,
      reviews: 0,
      lastActivityAt: last.toISOString(),
      ...rankFor(r, i, true),
    });
  }

  repos.sort((a, b) => b.commits - a.commits);

  const calendar = yearSeries(rng(hash(`cal:${username}`)), scale);
  const partial = seed?.showcase === "partial";
  const noStack = seed?.showcase === "no-stack";

  return {
    username,
    displayName: seed?.name ?? username,
    avatarUrl: snap.avatarUrl,
    profileUrl: snap.profileUrl,
    followers: snap.followers,
    publicRepos: snap.publicRepos,

    windowDays: 365,
    commitsInWindow: Math.round(scale * intBetween(r, 40, 600)),
    prsInWindow: snap.stats.totalPRs,
    issuesInWindow: snap.stats.totalIssues,
    reviewsInWindow: Math.round(scale * intBetween(r, 0, 40)),

    dailyContributions: calendar,
    totalContributionsInWindow: calendar.reduce((n, d) => n + d.count, 0),

    totalPRs: snap.stats.totalPRs,
    totalMergedPRs: snap.stats.mergedPRs,
    totalIssues: snap.stats.totalIssues,

    reposContributedTo: repos.length + intBetween(r, 0, 14),
    repos,
    stack: noStack
      ? null
      : {
          prsScanned: Math.min(20, Math.max(0, Math.round(scale * 20))),
          filesSeen: Math.round(scale * intBetween(r, 20, 140)),
          entries: scale === 0 ? [] : stackFor(r, scale),
          truncated: partial,
        },

    partial: partial || noStack,
    note: partial
      ? "Demo fixture: this profile is flagged partial so the warning banner and the 'unresolved' rank state stay visible during development."
      : noStack
        ? "Demo fixture: the tech-stack scan is intentionally missing here so its empty state stays visible during development."
        : null,
    fetchedAt: new Date().toISOString(),
  };
}
