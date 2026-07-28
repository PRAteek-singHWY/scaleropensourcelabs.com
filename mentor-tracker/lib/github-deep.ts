// Server-only deep contribution profile for a single GitHub user.
//
// This is the data behind the mentee drill-down page. For every public repo the
// user actually contributes to — including repos they do not own — it resolves:
//
//   * their contributor rank by commits on the default branch  ("#7 of 143")
//   * issues opened / closed
//   * PRs opened / merged / closed-unmerged / still open, and merge rate
//   * their real tech stack, from the files changed in their merged PRs
//
// Cost & why it is cached
// -----------------------
// A full profile is roughly 50-70 API requests:
//   1  GraphQL   repo discovery + windowed contribution totals
//   ~4 GraphQL   per-repo issue/PR counts, 5 repos x 6 aliased searches per call
//   1-5 REST     contributor rank, per repo (1 call unless the repo is huge)
//   ~21 REST     merged-PR file scan for the tech stack
//
// So this must never run on a page render. Callers go through the API route,
// which serves a Postgres-cached copy (see ContribProfile in schema.prisma) and
// only refetches past the TTL. Every step degrades independently: if the stack
// scan runs out of quota you still get the repo table, flagged `partial`.
//
// The GITHUB_TOKEN env var is REQUIRED here. GitHub's GraphQL API rejects
// unauthenticated requests outright, and the REST budget would be exhausted in
// two profiles at the anonymous 60/hr limit.

import { githubHeaders, USERNAME_RE } from "@/lib/github";

const REST = "https://api.github.com";
const GRAPHQL = "https://api.github.com/graphql";

// ---- Tunables --------------------------------------------------------------

/** Repos to fully enrich (rank + counts). The rest are listed without detail. */
const REPO_LIMIT = 20;
/** Repos per batched GraphQL search request. 6 aliased searches each. */
const REPOS_PER_SEARCH_BATCH = 5;
/** How deep to page the contributors list looking for the user. 100/page. */
const RANK_PAGES = 5;
/** Merged PRs to open up for the tech-stack scan. 1 request each. */
const STACK_PR_BUDGET = 20;
/** Max concurrent in-flight GitHub requests. Keeps us off the abuse limiter. */
const CONCURRENCY = 6;
/** Below this many remaining "core" REST calls we skip optional work. */
const CORE_FLOOR = 300;
/** Search is a 30/min bucket, so its reserve has to be tiny to be usable. */
const SEARCH_FLOOR = 2;

export const RANK_WINDOW = RANK_PAGES * 100;

// ---- Public types ----------------------------------------------------------

export type RepoContribution = {
  nameWithOwner: string;
  url: string;
  description: string | null;
  stars: number;
  primaryLanguage: string | null;
  isOwnRepo: boolean;
  isFork: boolean;

  commits: number;
  issuesOpened: number;
  issuesClosed: number;
  prsOpened: number;
  prsMerged: number;
  prsOpen: number;
  prsClosed: number;
  reviews: number;

  /** 1-based rank by commits on the default branch. Non-null iff rankStatus="ranked". */
  rank: number | null;
  rankStatus: RankStatus;
  totalContributors: number | null;
  /** false → totalContributors is a lower bound, not an exact count. */
  contributorsExact: boolean;

  lastActivityAt: string | null;
};

/**
 * Why a repo has no rank number. Keeping these four apart matters: "we checked
 * the whole list and they have no commits on the default branch" and "we ran out
 * of API budget before we could finish checking" look identical in the data but
 * mean opposite things to a mentor reading the page.
 */
export type RankStatus =
  /** `rank` holds their position among contributors. */
  | "ranked"
  /** Checked the full contributor list — no commits on the default branch. */
  | "unranked"
  /** Repo has more contributors than we page through; they're past the window. */
  | "outside-window"
  /** Couldn't finish checking (rate limit, or GitHub declined the list). */
  | "unresolved";

/**
 * Whether a language counts as the engineering stack or as the scaffolding
 * around it. Without this split a single large JSON fixture or lockfile-adjacent
 * data blob outweighs every line of real code — in testing, JSON came out at 59%
 * of one profile, which answers "what does this person write" with "config".
 * Both groups are kept and shown; only the headline is computed from code.
 */
export type StackKind = "code" | "support";

export type StackEntry = {
  label: string; // "TypeScript"
  ext: string; // ".ts"
  kind: StackKind;
  files: number;
  additions: number;
  deletions: number;
  share: number; // 0..1 of additions across ALL entries (both kinds)
};

export type StackProfile = {
  prsScanned: number;
  filesSeen: number;
  entries: StackEntry[];
  truncated: boolean;
};

export type DeepProfile = {
  username: string;
  displayName: string | null;
  avatarUrl: string;
  profileUrl: string;
  followers: number;
  publicRepos: number;

  windowDays: number;
  commitsInWindow: number;
  prsInWindow: number;
  issuesInWindow: number;
  reviewsInWindow: number;

  totalPRs: number;
  totalMergedPRs: number;
  totalIssues: number;

  /** Total public repos contributed to, before REPO_LIMIT truncation. */
  reposContributedTo: number;
  repos: RepoContribution[];
  stack: StackProfile | null;

  partial: boolean;
  note: string | null;
  fetchedAt: string;
};

export class MissingTokenError extends Error {
  constructor() {
    super(
      "GITHUB_TOKEN is required for the contribution drill-down: GitHub's GraphQL API rejects unauthenticated requests. Add a classic PAT with no scopes (public data only) to your environment.",
    );
    this.name = "MissingTokenError";
  }
}

// ---- Request plumbing ------------------------------------------------------

/**
 * Remaining-call budget, read from response headers as we go.
 *
 * GitHub meters each resource in its OWN bucket — `core` is 5000/hr, `search` is
 * 30/min, `graphql` is 5000 points/hr — and reports which one a response came
 * from via `x-ratelimit-resource`. Tracking a single number would let one search
 * response (remaining: 27) overwrite the core budget and make every following
 * core request believe it was nearly out of quota, silently skipping work. So
 * buckets are kept apart and each call site checks the bucket it actually spends.
 */
class Budget {
  private buckets = new Map<string, number>();

  note(h: Headers) {
    const remaining = h.get("x-ratelimit-remaining");
    if (remaining === null) return;
    const resource = h.get("x-ratelimit-resource") ?? "core";
    this.buckets.set(resource, Number(remaining));
  }

  noteGraphql(remaining: number) {
    this.buckets.set("graphql", remaining);
  }

  /** Infinity until we've actually seen a header for that bucket. */
  remaining(resource: string): number {
    return this.buckets.get(resource) ?? Infinity;
  }

  /** Room for a normal REST call (repos, pulls, contributors). */
  coreOk(cost = 1): boolean {
    return this.remaining("core") - cost > CORE_FLOOR;
  }

  /** Room for a Search API call. */
  searchOk(cost = 1): boolean {
    return this.remaining("search") - cost > SEARCH_FLOOR;
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.buckets);
  }
}

async function restRaw(
  path: string,
  budget: Budget,
): Promise<{ res: Response; body: unknown }> {
  const res = await fetch(`${REST}${path}`, {
    headers: githubHeaders(),
    cache: "no-store",
  });
  budget.note(res.headers);
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  return { res, body };
}

async function rest<T>(path: string, budget: Budget): Promise<T> {
  const { res, body } = await restRaw(path, budget);
  if (!res.ok) {
    const msg =
      (body as { message?: string } | null)?.message ?? `HTTP ${res.status}`;
    throw new Error(`GitHub REST ${res.status} on ${path}: ${msg}`);
  }
  return body as T;
}

type GraphQLResult<T> = {
  data: T | null;
  errors?: { message: string; type?: string }[];
};

async function graphql<T>(
  query: string,
  variables: Record<string, unknown>,
  budget: Budget,
): Promise<GraphQLResult<T>> {
  if (!process.env.GITHUB_TOKEN) throw new MissingTokenError();

  const res = await fetch(GRAPHQL, {
    method: "POST",
    headers: { ...githubHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as GraphQLResult<
    T & { rateLimit?: { remaining: number } }
  > | null;

  if (!res.ok || !json) {
    const detail = (json as { errors?: { message: string }[] } | null)?.errors
      ?.map((e) => e.message)
      .join("; ");
    throw new Error(`GitHub GraphQL ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  // GraphQL reports its own point budget in the response body, not the headers.
  const remaining = json.data?.rateLimit?.remaining;
  if (typeof remaining === "number") budget.noteGraphql(remaining);

  return json as GraphQLResult<T>;
}

/** Bounded-concurrency map. Preserves input order; never rejects. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<(R | null)[]> {
  const out: (R | null)[] = new Array(items.length).fill(null);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      try {
        out[i] = await fn(items[i], i);
      } catch {
        out[i] = null;
      }
    }
  });
  await Promise.all(workers);
  return out;
}

// ---- Step 1: discovery (GraphQL) -------------------------------------------

const DISCOVERY_QUERY = /* GraphQL */ `
  query DeepProfile($login: String!, $from: DateTime!) {
    user(login: $login) {
      login
      name
      avatarUrl(size: 200)
      url
      followers {
        totalCount
      }
      repositories(privacy: PUBLIC) {
        totalCount
      }
      contributionsCollection(from: $from) {
        totalCommitContributions
        totalPullRequestContributions
        totalIssueContributions
        totalPullRequestReviewContributions
        commitContributionsByRepository(maxRepositories: 100) {
          repository {
            nameWithOwner
          }
          contributions {
            totalCount
          }
        }
      }
      repositoriesContributedTo(
        first: 100
        privacy: PUBLIC
        includeUserRepositories: true
        contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, PULL_REQUEST_REVIEW]
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        totalCount
        nodes {
          nameWithOwner
          url
          description
          stargazerCount
          isFork
          isPrivate
          pushedAt
          owner {
            login
          }
          primaryLanguage {
            name
          }
        }
      }
    }
    rateLimit {
      remaining
      cost
      limit
    }
  }
`;

type DiscoveryData = {
  user: {
    login: string;
    name: string | null;
    avatarUrl: string;
    url: string;
    followers: { totalCount: number };
    repositories: { totalCount: number };
    contributionsCollection: {
      totalCommitContributions: number;
      totalPullRequestContributions: number;
      totalIssueContributions: number;
      totalPullRequestReviewContributions: number;
      commitContributionsByRepository: {
        repository: { nameWithOwner: string };
        contributions: { totalCount: number };
      }[];
    };
    repositoriesContributedTo: {
      totalCount: number;
      nodes: {
        nameWithOwner: string;
        url: string;
        description: string | null;
        stargazerCount: number;
        isFork: boolean;
        isPrivate: boolean;
        pushedAt: string | null;
        owner: { login: string };
        primaryLanguage: { name: string } | null;
      }[];
    };
  } | null;
};

// ---- Step 2: per-repo issue/PR counts (batched GraphQL search) -------------

/**
 * Six scoped search counts per repo, aliased into one request. GitHub's search
 * can't group by author, so the only way to get "this user's PRs in this repo"
 * is one query per (repo, filter) pair — aliasing collapses 30 of those into a
 * single HTTP round trip.
 */
function buildSearchBatch(
  repos: string[],
  username: string,
): { query: string; variables: Record<string, string> } {
  const vars: Record<string, string> = {};
  const decls: string[] = [];
  const fields: string[] = [];

  repos.forEach((repo, i) => {
    const scope = `repo:${repo} author:${username}`;
    const parts: [string, string][] = [
      [`r${i}_prsOpened`, `${scope} is:pr`],
      [`r${i}_prsMerged`, `${scope} is:pr is:merged`],
      [`r${i}_prsOpen`, `${scope} is:pr is:open`],
      [`r${i}_issuesOpened`, `${scope} is:issue`],
      [`r${i}_issuesOpen`, `${scope} is:issue is:open`],
      [`r${i}_reviews`, `repo:${repo} reviewed-by:${username}`],
    ];
    for (const [alias, q] of parts) {
      const v = `q_${alias}`;
      vars[v] = q;
      decls.push(`$${v}: String!`);
      fields.push(
        `${alias}: search(query: $${v}, type: ISSUE) { issueCount }`,
      );
    }
  });

  const query = `query Counts(${decls.join(", ")}) {\n  ${fields.join("\n  ")}\n  rateLimit { remaining }\n}`;
  return { query, variables: vars };
}

type CountsData = Record<string, { issueCount: number } | undefined>;

type RepoCounts = {
  prsOpened: number;
  prsMerged: number;
  prsOpen: number;
  prsClosed: number;
  issuesOpened: number;
  issuesClosed: number;
  reviews: number;
};

const ZERO_COUNTS: RepoCounts = {
  prsOpened: 0,
  prsMerged: 0,
  prsOpen: 0,
  prsClosed: 0,
  issuesOpened: 0,
  issuesClosed: 0,
  reviews: 0,
};

async function fetchRepoCounts(
  repos: string[],
  username: string,
  budget: Budget,
): Promise<{ counts: Map<string, RepoCounts>; degraded: boolean }> {
  const counts = new Map<string, RepoCounts>();
  let degraded = false;

  const batches: string[][] = [];
  for (let i = 0; i < repos.length; i += REPOS_PER_SEARCH_BATCH) {
    batches.push(repos.slice(i, i + REPOS_PER_SEARCH_BATCH));
  }

  // Search is the most aggressively throttled GitHub surface, so batches run
  // sequentially rather than through mapLimit.
  for (const batch of batches) {
    const { query, variables } = buildSearchBatch(batch, username);
    let data: CountsData | null = null;
    try {
      const r = await graphql<CountsData>(query, variables, budget);
      data = r.data;
      if (r.errors?.length) degraded = true;
    } catch {
      degraded = true;
    }

    batch.forEach((repo, i) => {
      const at = (k: string): number | null => {
        const v = data?.[`r${i}_${k}`];
        return v ? v.issueCount : null;
      };
      const prsOpened = at("prsOpened");
      if (prsOpened === null) {
        degraded = true;
        counts.set(repo, { ...ZERO_COUNTS });
        return;
      }
      const prsMerged = at("prsMerged") ?? 0;
      const prsOpen = at("prsOpen") ?? 0;
      const issuesOpened = at("issuesOpened") ?? 0;
      const issuesOpen = at("issuesOpen") ?? 0;

      counts.set(repo, {
        prsOpened,
        prsMerged,
        prsOpen,
        prsClosed: Math.max(0, prsOpened - prsMerged - prsOpen),
        issuesOpened,
        issuesClosed: Math.max(0, issuesOpened - issuesOpen),
        reviews: at("reviews") ?? 0,
      });
    });
  }

  return { counts, degraded };
}

// ---- Step 3: contributor rank (REST) --------------------------------------

type Contributor = { login: string | null; contributions: number };

type RankResult = {
  rank: number | null;
  rankStatus: RankStatus;
  commits: number;
  totalContributors: number | null;
  contributorsExact: boolean;
};

const NO_RANK: RankResult = {
  rank: null,
  rankStatus: "unresolved",
  commits: 0,
  totalContributors: null,
  contributorsExact: false,
};

/** Page number from a `rel="last"` Link header, or null when absent. */
function lastPage(link: string | null): number | null {
  if (!link) return null;
  const m = link.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/);
  return m ? Number(m[1]) : null;
}

/**
 * The contributors endpoint returns contributors pre-sorted by commit count on
 * the default branch, so the user's index in that list IS their rank, and the
 * `contributions` field on their entry is their all-time commit count.
 *
 * Three honest limits, surfaced via rankStatus rather than hidden:
 *   - Commits on the default branch only. Someone who contributed via issues,
 *     reviews, or commits under an unlinked email won't appear → "unranked".
 *   - We page at most RANK_PAGES deep, so very large repos yield
 *     "outside-window" rather than an invented number.
 *   - If the API budget runs out mid-search, or GitHub declines the list (403 on
 *     repos too large to compute), the answer is "unresolved" — NOT "unranked".
 *     Conflating those two would tell a mentor their mentee has no commits when
 *     all that actually happened is that we stopped looking.
 */
async function fetchRank(
  repo: string,
  username: string,
  budget: Budget,
): Promise<RankResult> {
  const lower = username.toLowerCase();
  const find = (list: Contributor[], offset: number): number | null => {
    const i = list.findIndex((c) => c.login?.toLowerCase() === lower);
    return i === -1 ? null : i;
  };

  const { res, body } = await restRaw(
    `/repos/${repo}/contributors?per_page=100&anon=0`,
    budget,
  );
  // 204 = empty repo. 403 = contributor list too large for GitHub to compute.
  // Neither tells us anything about this user, so both stay "unresolved".
  if (!res.ok || res.status === 204 || !Array.isArray(body)) return NO_RANK;

  const page1 = body as Contributor[];
  const pages = lastPage(res.headers.get("link"));

  // Exact only when the whole list fit in one page; otherwise a lower bound
  // until we manage to fetch the final page.
  let totalContributors = pages === null ? page1.length : (pages - 1) * 100;
  let contributorsExact = pages === null;

  const hitIdx = find(page1, 0);
  if (hitIdx !== null) {
    return {
      rank: hitIdx + 1,
      rankStatus: "ranked",
      commits: page1[hitIdx].contributions ?? 0,
      totalContributors,
      contributorsExact,
    };
  }

  if (pages === null) {
    // The full list fit on one page and they aren't on it — confirmed unranked.
    return {
      ...NO_RANK,
      rankStatus: "unranked",
      totalContributors,
      contributorsExact,
    };
  }

  const reachable = Math.min(pages, RANK_PAGES);
  const wanted = Array.from({ length: reachable - 1 }, (_, i) => i + 2);
  // Tracks pages we intended to read but skipped for budget — the difference
  // between "they aren't there" and "we never looked".
  let incomplete = false;

  const later = await mapLimit(wanted, 3, async (page) => {
    if (!budget.coreOk()) {
      incomplete = true;
      return null;
    }
    const r = await restRaw(
      `/repos/${repo}/contributors?per_page=100&anon=0&page=${page}`,
      budget,
    );
    if (!Array.isArray(r.body)) {
      incomplete = true;
      return null;
    }
    return { page, list: r.body as Contributor[] };
  });

  // Reading the final page upgrades the contributor total to an exact count.
  const lastFetched = later.find((p) => p?.page === pages);
  if (lastFetched) {
    totalContributors = (pages - 1) * 100 + lastFetched.list.length;
    contributorsExact = true;
  }

  for (const p of later) {
    if (!p) continue;
    const idx = find(p.list, 0);
    if (idx !== null) {
      return {
        rank: (p.page - 1) * 100 + idx + 1,
        rankStatus: "ranked",
        commits: p.list[idx].contributions ?? 0,
        totalContributors,
        contributorsExact,
      };
    }
  }

  return {
    ...NO_RANK,
    rankStatus: incomplete
      ? "unresolved"
      : pages > RANK_PAGES
        ? "outside-window"
        : "unranked",
    totalContributors,
    contributorsExact,
  };
}

// ---- Step 4: tech stack from real merged-PR files (REST) ------------------

// Extension → display label. Only entries we can name confidently; anything
// unrecognized is grouped under "Other" rather than guessed at.
const EXT_LABELS: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript (React)",
  js: "JavaScript",
  jsx: "JavaScript (React)",
  mjs: "JavaScript",
  cjs: "JavaScript",
  py: "Python",
  rb: "Ruby",
  go: "Go",
  rs: "Rust",
  java: "Java",
  kt: "Kotlin",
  kts: "Kotlin",
  swift: "Swift",
  c: "C",
  h: "C/C++ header",
  cc: "C++",
  cpp: "C++",
  cxx: "C++",
  hpp: "C++ header",
  cs: "C#",
  php: "PHP",
  scala: "Scala",
  ex: "Elixir",
  exs: "Elixir",
  erl: "Erlang",
  hs: "Haskell",
  clj: "Clojure",
  dart: "Dart",
  lua: "Lua",
  pl: "Perl",
  r: "R",
  jl: "Julia",
  zig: "Zig",
  m: "Objective-C",
  mm: "Objective-C++",
  vue: "Vue",
  svelte: "Svelte",
  css: "CSS",
  scss: "SCSS",
  sass: "Sass",
  less: "Less",
  html: "HTML",
  htm: "HTML",
  sql: "SQL",
  graphql: "GraphQL",
  gql: "GraphQL",
  proto: "Protobuf",
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  fish: "Shell",
  ps1: "PowerShell",
  yml: "YAML / config",
  yaml: "YAML / config",
  toml: "TOML / config",
  ini: "Config",
  json: "JSON",
  tf: "Terraform",
  hcl: "Terraform",
  md: "Docs",
  mdx: "Docs",
  rst: "Docs",
  txt: "Docs",
  ipynb: "Jupyter",
  prisma: "Prisma schema",
  dockerfile: "Docker",
  gradle: "Gradle",
  cmake: "CMake",
  make: "Make",
  vim: "Vim script",
  el: "Emacs Lisp",
  tex: "LaTeX",
  csv: "Data",
};

// Generated, vendored, and lockfile paths. Without this a single regenerated
// package-lock.json (tens of thousands of lines) would swamp every real edit.
const NOISE_RE = new RegExp(
  [
    "(^|/)(node_modules|vendor|third_party|thirdparty|external)/",
    "(^|/)(dist|build|out|target|\\.next|coverage|__snapshots__)/",
    "(^|/)(package-lock\\.json|yarn\\.lock|pnpm-lock\\.yaml|bun\\.lockb)$",
    "(^|/)(Gemfile\\.lock|poetry\\.lock|Cargo\\.lock|composer\\.lock|go\\.sum)$",
    "\\.(min\\.(js|css)|map|snap|lock)$",
    "(^|/)(generated|__generated__|\\.pb\\.go)",
    "\\.(pb|generated)\\.(go|ts|js|py|dart)$",
    "\\.(png|jpe?g|gif|svg|ico|webp|woff2?|ttf|eot|pdf|zip|gz|mp4|wasm)$",
  ].join("|"),
  "i",
);

// Labels that describe scaffolding rather than the engineering stack. Everything
// not listed here — including Shell, Docker, Terraform and SQL, which are real
// work — counts as code.
const SUPPORT_LABELS = new Set([
  "JSON",
  "YAML / config",
  "TOML / config",
  "Config",
  "Docs",
  "Data",
  "Other",
]);

function kindFor(label: string): StackKind {
  return SUPPORT_LABELS.has(label) ? "support" : "code";
}

function classify(
  filename: string,
): { ext: string; label: string; kind: StackKind } | null {
  if (NOISE_RE.test(filename)) return null;

  const base = filename.split("/").pop() ?? filename;
  const lower = base.toLowerCase();

  // Extensionless but recognizable by name.
  if (lower.startsWith("dockerfile"))
    return { ext: "Dockerfile", label: "Docker", kind: "code" };
  if (lower === "makefile") return { ext: "Makefile", label: "Make", kind: "code" };

  const dot = lower.lastIndexOf(".");
  if (dot <= 0 || dot === lower.length - 1) return null;
  const ext = lower.slice(dot + 1);
  const label = EXT_LABELS[ext];
  if (!label) return { ext: `.${ext}`, label: "Other", kind: "support" };
  return { ext: `.${ext}`, label, kind: kindFor(label) };
}

type PRFile = { filename: string; additions: number; deletions: number };
type MergedPRRef = { repo: string; number: number };

/**
 * The mentee's real diff surface: open their most recent merged PRs and count
 * the files they actually touched, by language. Unlike repo language stats this
 * cannot be skewed by the size of the host codebase — contributing one Python
 * script to a JavaScript monorepo reads as Python here, which is the point.
 */
async function fetchStack(
  username: string,
  budget: Budget,
): Promise<StackProfile | null> {
  type SearchItem = { repository_url: string; number: number };
  let items: SearchItem[] = [];
  // One search call (search bucket), then one call per PR (core bucket).
  if (!budget.searchOk()) return null;
  try {
    const r = await rest<{ total_count: number; items: SearchItem[] }>(
      `/search/issues?q=${encodeURIComponent(
        `author:${username} is:pr is:merged`,
      )}&sort=created&order=desc&per_page=${STACK_PR_BUDGET}`,
      budget,
    );
    items = r.items ?? [];
  } catch {
    return null;
  }
  if (items.length === 0) {
    return { prsScanned: 0, filesSeen: 0, entries: [], truncated: false };
  }

  const refs: MergedPRRef[] = items
    .map((it): MergedPRRef | null => {
      const m = it.repository_url.match(/repos\/([^/]+\/[^/]+)$/);
      return m ? { repo: m[1], number: it.number } : null;
    })
    .filter((r): r is MergedPRRef => r !== null);

  let truncated = false;
  const perPR = await mapLimit(refs, CONCURRENCY, async (ref) => {
    if (!budget.coreOk()) {
      truncated = true;
      return null;
    }
    return rest<PRFile[]>(
      `/repos/${ref.repo}/pulls/${ref.number}/files?per_page=100`,
      budget,
    );
  });

  const agg = new Map<string, StackEntry>();
  let filesSeen = 0;
  let prsScanned = 0;

  for (const files of perPR) {
    if (!files) continue;
    prsScanned += 1;
    for (const f of files) {
      const c = classify(f.filename);
      if (!c) continue;
      filesSeen += 1;
      const key = c.label;
      const cur =
        agg.get(key) ??
        ({
          label: c.label,
          ext: c.ext,
          kind: c.kind,
          files: 0,
          additions: 0,
          deletions: 0,
          share: 0,
        } satisfies StackEntry);
      cur.files += 1;
      cur.additions += f.additions ?? 0;
      cur.deletions += f.deletions ?? 0;
      agg.set(key, cur);
    }
  }

  const entries = [...agg.values()].sort((a, b) => b.additions - a.additions);
  const totalAdds = entries.reduce((n, e) => n + e.additions, 0);
  for (const e of entries) {
    e.share = totalAdds > 0 ? e.additions / totalAdds : 0;
  }

  return { prsScanned, filesSeen, entries, truncated };
}

// ---- All-time totals (REST search) ----------------------------------------

async function fetchAllTimeTotals(
  username: string,
  budget: Budget,
): Promise<{ totalPRs: number; totalMergedPRs: number; totalIssues: number }> {
  const one = async (q: string): Promise<number> => {
    if (!budget.searchOk()) return 0;
    const r = await rest<{ total_count: number }>(
      `/search/issues?q=${encodeURIComponent(q)}&per_page=1`,
      budget,
    );
    return r.total_count ?? 0;
  };
  const [prs, merged, issues] = await Promise.all([
    one(`author:${username} is:pr`).catch(() => 0),
    one(`author:${username} is:pr is:merged`).catch(() => 0),
    one(`author:${username} is:issue`).catch(() => 0),
  ]);
  return { totalPRs: prs, totalMergedPRs: merged, totalIssues: issues };
}

// ---- Orchestration ---------------------------------------------------------

export async function getDeepProfile(
  usernameInput: string,
  opts: { windowDays?: number; repoLimit?: number } = {},
): Promise<DeepProfile> {
  if (!USERNAME_RE.test(usernameInput)) {
    throw new Error("Invalid GitHub username");
  }
  if (!process.env.GITHUB_TOKEN) throw new MissingTokenError();

  const username = usernameInput;
  const windowDays = opts.windowDays ?? 365;
  const repoLimit = opts.repoLimit ?? REPO_LIMIT;
  const budget = new Budget();
  const notes: string[] = [];
  let partial = false;

  const from = new Date(Date.now() - windowDays * 86_400_000).toISOString();

  const discovery = await graphql<DiscoveryData>(
    DISCOVERY_QUERY,
    { login: username, from },
    budget,
  );
  const user = discovery.data?.user;
  if (!user) {
    const why = discovery.errors?.map((e) => e.message).join("; ");
    throw new Error(why || `GitHub user "${username}" not found`);
  }

  // Their commit count per repo inside the window — used to rank which repos are
  // worth the expensive enrichment, since repositoriesContributedTo is ordered
  // by the repo's own push activity, not by how much this user did there.
  const windowCommits = new Map<string, number>();
  for (const c of user.contributionsCollection.commitContributionsByRepository) {
    windowCommits.set(c.repository.nameWithOwner, c.contributions.totalCount);
  }

  const allRepos = user.repositoriesContributedTo.nodes.filter(
    (r) => r && !r.isPrivate,
  );
  const ranked = [...allRepos].sort((a, b) => {
    const ca = windowCommits.get(a.nameWithOwner) ?? 0;
    const cb = windowCommits.get(b.nameWithOwner) ?? 0;
    if (cb !== ca) return cb - ca;
    const pa = a.pushedAt ? Date.parse(a.pushedAt) : 0;
    const pb = b.pushedAt ? Date.parse(b.pushedAt) : 0;
    return pb - pa;
  });
  const selected = ranked.slice(0, repoLimit);
  if (allRepos.length > selected.length) {
    notes.push(
      `Enriched the ${selected.length} repos with the most activity out of ${allRepos.length}.`,
    );
  }

  const repoNames = selected.map((r) => r.nameWithOwner);

  // Counts, ranks, stack, and all-time totals are independent — run together and
  // let each one fail on its own.
  const [countsResult, rankResults, stack, totals] = await Promise.all([
    fetchRepoCounts(repoNames, username, budget),
    mapLimit(repoNames, CONCURRENCY, (repo) => fetchRank(repo, username, budget)),
    fetchStack(username, budget),
    fetchAllTimeTotals(username, budget),
  ]);

  if (countsResult.degraded) {
    partial = true;
    notes.push("Some per-repo issue/PR counts were unavailable (search limit).");
  }
  const unresolvedRanks = rankResults.filter(
    (r) => (r ?? NO_RANK).rankStatus === "unresolved",
  ).length;
  if (unresolvedRanks > 0) {
    partial = true;
    notes.push(
      `Contributor rank could not be resolved for ${unresolvedRanks} repo${unresolvedRanks === 1 ? "" : "s"} (rate limit or an oversized contributor list) — shown as unknown, not as zero.`,
    );
  }
  if (!stack) {
    partial = true;
    notes.push("Tech-stack scan could not run (rate limit).");
  } else if (stack.truncated) {
    partial = true;
    notes.push(
      `Tech-stack scan stopped early at ${stack.prsScanned} PRs (rate limit).`,
    );
  }

  const repos: RepoContribution[] = selected.map((r, i) => {
    const counts = countsResult.counts.get(r.nameWithOwner) ?? { ...ZERO_COUNTS };
    const rank = rankResults[i] ?? NO_RANK;
    return {
      nameWithOwner: r.nameWithOwner,
      url: r.url,
      description: r.description,
      stars: r.stargazerCount ?? 0,
      primaryLanguage: r.primaryLanguage?.name ?? null,
      isOwnRepo: r.owner.login.toLowerCase() === username.toLowerCase(),
      isFork: r.isFork,

      // Prefer the all-time commit count from the contributors list; fall back
      // to the windowed GraphQL number when they're not in that list.
      commits: rank.commits || (windowCommits.get(r.nameWithOwner) ?? 0),
      issuesOpened: counts.issuesOpened,
      issuesClosed: counts.issuesClosed,
      prsOpened: counts.prsOpened,
      prsMerged: counts.prsMerged,
      prsOpen: counts.prsOpen,
      prsClosed: counts.prsClosed,
      reviews: counts.reviews,

      rank: rank.rank,
      rankStatus: rank.rankStatus,
      totalContributors: rank.totalContributors,
      contributorsExact: rank.contributorsExact,

      lastActivityAt: r.pushedAt,
    };
  });

  const cc = user.contributionsCollection;

  const result: DeepProfile = {
    username: user.login,
    displayName: user.name,
    avatarUrl: user.avatarUrl,
    profileUrl: user.url,
    followers: user.followers.totalCount,
    publicRepos: user.repositories.totalCount,

    windowDays,
    commitsInWindow: cc.totalCommitContributions,
    prsInWindow: cc.totalPullRequestContributions,
    issuesInWindow: cc.totalIssueContributions,
    reviewsInWindow: cc.totalPullRequestReviewContributions,

    ...totals,

    reposContributedTo: user.repositoriesContributedTo.totalCount,
    repos,
    stack,

    partial,
    note: notes.length ? notes.join(" ") : null,
    fetchedAt: new Date().toISOString(),
  };
  return result;
}

// Exported only so scripts/verify-deep.ts can exercise each step in isolation
// against the live API. Not part of the app's surface — the app calls
// getDeepProfile() and nothing else here.
export const __internals = {
  Budget,
  buildSearchBatch,
  classify,
  fetchRank,
  fetchStack,
  fetchAllTimeTotals,
  lastPage,
  mapLimit,
  NOISE_RE,
};
