// Server-only GitHub client. This module must never be imported by a client
// component — the token lives here and stays here.

const API = "https://api.github.com";

export type LatestIssue = {
  title: string;
  html_url: string;
  repository_url: string;
  created_at: string;
  state: string;
  number: number;
};

export type RecentPR = {
  title: string;
  html_url: string;
  repository_url: string;
  created_at: string;
  state: string;
  number: number;
  repoName: string; // "owner/repo"
  linkedIssueUrl: string | null; // resolved from body via /repos/:o/:r/issues/:n
  linkedIssueTitle: string | null;
};

export type ActiveRepo = {
  name: string;
  url: string;
  lastPushed: string;
  stars: number;
  language: string | null;
};

// Aggregate contribution counts (all-time, from the Search API).
export type ContribStats = {
  openPRs: number;
  mergedPRs: number;
  closedPRs: number; // closed but not merged
  totalPRs: number;
  openIssues: number;
  closedIssues: number;
  totalIssues: number;
  commentedThreads: number; // issues/PRs the user has commented on (engagement)
  mergeRate: number; // mergedPRs / totalPRs, 0..1
  available: boolean; // false if search counts couldn't be fetched (rate limit)
};

export type DayCount = { date: string; count: number };

export type MenteeSnapshot = {
  username: string;
  profileUrl: string;
  avatarUrl: string;
  name: string | null;
  followers: number;
  publicRepos: number;
  totalStars: number;
  latestIssue: LatestIssue | null;
  recentPRs: RecentPR[];
  activeRepos: ActiveRepo[];
  commits30d: number;
  streakDays: number;
  commitsByDay: DayCount[]; // last 30 days, oldest → newest
  stats: ContribStats;
  fetchedAt: string;
  error?: string;
};

export const USERNAME_RE = /^[A-Za-z0-9-]{1,39}$/;

function headers(): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "mentor-tracker",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function gh<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub ${res.status} on ${path}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

// ---- Search API shapes (only the fields we use) ----

type SearchIssueItem = {
  title: string;
  html_url: string;
  repository_url: string;
  created_at: string;
  state: string;
  number: number;
  body: string | null;
};

type SearchResponse = { total_count: number; items: SearchIssueItem[] };

type GHUser = {
  name: string | null;
  avatar_url: string;
  html_url: string;
  followers: number;
  public_repos: number;
};

type GHRepo = {
  name: string;
  full_name: string;
  html_url: string;
  fork: boolean;
  pushed_at: string;
  stargazers_count: number;
  language: string | null;
};

type PushEvent = {
  type: string;
  created_at: string;
  payload: { commits?: unknown[] };
};

// Match `Fixes #12`, `Closes owner/repo#12`, `Resolves #12`, etc.
// Group 1 = optional "owner/repo" target, Group 2 = issue number.
const LINKED_ISSUE_RE =
  /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+(?:([\w.-]+\/[\w.-]+))?#(\d+)/i;

function repoNameFromUrl(repositoryUrl: string): string {
  const m = repositoryUrl.match(/repos\/([^/]+\/[^/]+)$/);
  return m ? m[1] : "";
}

function searchPath(q: string, perPage = 1): string {
  return `/search/issues?q=${encodeURIComponent(q)}&per_page=${perPage}`;
}

// total_count only — cheapest possible search query.
async function searchCount(q: string): Promise<number> {
  const r = await gh<SearchResponse>(searchPath(q, 1));
  return r.total_count;
}

async function resolveLinkedIssue(
  pr: SearchIssueItem,
): Promise<{ url: string | null; title: string | null }> {
  if (!pr.body) return { url: null, title: null };
  const m = pr.body.match(LINKED_ISSUE_RE);
  if (!m) return { url: null, title: null };

  const targetRepo = m[1] || repoNameFromUrl(pr.repository_url);
  const number = m[2];
  if (!targetRepo) return { url: null, title: null };

  try {
    const issue = await gh<{ title: string; html_url: string }>(
      `/repos/${targetRepo}/issues/${number}`,
    );
    return { url: issue.html_url, title: issue.title };
  } catch {
    return { url: null, title: null };
  }
}

// commits30d, streakDays, and a per-day series for the last 30 days.
function computeCommitStats(events: PushEvent[]): {
  commits30d: number;
  streakDays: number;
  commitsByDay: DayCount[];
} {
  const DAYS = 30;
  const dayKeys: string[] = [];
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(cursor);
    d.setUTCDate(cursor.getUTCDate() - i);
    dayKeys.push(d.toISOString().slice(0, 10));
  }
  const counts = new Map<string, number>(dayKeys.map((k) => [k, 0]));
  const activeDays = new Set<string>(); // any day with a PushEvent (for streak)

  for (const ev of events) {
    if (ev.type !== "PushEvent") continue;
    const day = ev.created_at.slice(0, 10);
    activeDays.add(day);
    if (counts.has(day)) {
      counts.set(day, (counts.get(day) ?? 0) + (ev.payload.commits?.length ?? 0));
    }
  }

  const commitsByDay: DayCount[] = dayKeys.map((date) => ({
    date,
    count: counts.get(date) ?? 0,
  }));
  const commits30d = commitsByDay.reduce((n, d) => n + d.count, 0);

  // Streak: consecutive UTC days ending today (today may be empty).
  let streakDays = 0;
  const sc = new Date();
  sc.setUTCHours(0, 0, 0, 0);
  const key = (d: Date) => d.toISOString().slice(0, 10);
  if (!activeDays.has(key(sc))) sc.setUTCDate(sc.getUTCDate() - 1);
  while (activeDays.has(key(sc))) {
    streakDays += 1;
    sc.setUTCDate(sc.getUTCDate() - 1);
  }

  return { commits30d, streakDays, commitsByDay };
}

// The all-time contribution counts come from a handful of Search API queries.
// They are rate-limited (30/min with a token, 10/min without), so we fetch them
// with allSettled: if the search quota is exhausted, the card still renders with
// stats.available=false instead of erroring the whole snapshot.
async function fetchContribStats(u: string): Promise<ContribStats> {
  const queries = [
    `author:${u} is:pr`,
    `author:${u} is:pr is:open`,
    `author:${u} is:pr is:merged`,
    `author:${u} is:issue`,
    `author:${u} is:issue is:open`,
    `commenter:${u}`,
  ];
  const results = await Promise.allSettled(queries.map((q) => searchCount(q)));
  const val = (i: number): number | null =>
    results[i].status === "fulfilled"
      ? (results[i] as PromiseFulfilledResult<number>).value
      : null;

  const available = results.every((r) => r.status === "fulfilled");
  const totalPRs = val(0) ?? 0;
  const openPRs = val(1) ?? 0;
  const mergedPRs = val(2) ?? 0;
  const totalIssues = val(3) ?? 0;
  const openIssues = val(4) ?? 0;
  const commentedThreads = val(5) ?? 0;

  const closedPRs = Math.max(0, totalPRs - openPRs - mergedPRs);
  const closedIssues = Math.max(0, totalIssues - openIssues);
  const mergeRate = totalPRs > 0 ? mergedPRs / totalPRs : 0;

  return {
    openPRs,
    mergedPRs,
    closedPRs,
    totalPRs,
    openIssues,
    closedIssues,
    totalIssues,
    commentedThreads,
    mergeRate,
    available,
  };
}

export async function getMenteeSnapshot(
  username: string,
): Promise<MenteeSnapshot> {
  const base: MenteeSnapshot = {
    username,
    profileUrl: `https://github.com/${username}`,
    avatarUrl: `https://github.com/${username}.png`,
    name: null,
    followers: 0,
    publicRepos: 0,
    totalStars: 0,
    latestIssue: null,
    recentPRs: [],
    activeRepos: [],
    commits30d: 0,
    streakDays: 0,
    commitsByDay: [],
    stats: {
      openPRs: 0,
      mergedPRs: 0,
      closedPRs: 0,
      totalPRs: 0,
      openIssues: 0,
      closedIssues: 0,
      totalIssues: 0,
      commentedThreads: 0,
      mergeRate: 0,
      available: false,
    },
    fetchedAt: new Date().toISOString(),
  };

  try {
    const [user, issueSearch, prSearch, repos, events, stats] =
      await Promise.all([
        gh<GHUser>(`/users/${username}`),
        gh<SearchResponse>(
          `/search/issues?q=${encodeURIComponent(`author:${username} is:issue`)}&sort=created&order=desc&per_page=1`,
        ),
        gh<SearchResponse>(
          `/search/issues?q=${encodeURIComponent(`author:${username} is:pr`)}&sort=created&order=desc&per_page=5`,
        ),
        gh<GHRepo[]>(
          `/users/${username}/repos?sort=pushed&per_page=12&type=owner`,
        ),
        gh<PushEvent[]>(`/users/${username}/events/public?per_page=100`),
        fetchContribStats(username),
      ]);

    base.name = user.name;
    base.avatarUrl = user.avatar_url || base.avatarUrl;
    base.profileUrl = user.html_url || base.profileUrl;
    base.followers = user.followers ?? 0;
    base.publicRepos = user.public_repos ?? 0;
    base.stats = stats;

    const issue = issueSearch.items[0];
    if (issue) {
      base.latestIssue = {
        title: issue.title,
        html_url: issue.html_url,
        repository_url: issue.repository_url,
        created_at: issue.created_at,
        state: issue.state,
        number: issue.number,
      };
    }

    base.recentPRs = await Promise.all(
      prSearch.items.map(async (pr): Promise<RecentPR> => {
        const linked = await resolveLinkedIssue(pr);
        return {
          title: pr.title,
          html_url: pr.html_url,
          repository_url: pr.repository_url,
          created_at: pr.created_at,
          state: pr.state,
          number: pr.number,
          repoName: repoNameFromUrl(pr.repository_url),
          linkedIssueUrl: linked.url,
          linkedIssueTitle: linked.title,
        };
      }),
    );

    const ownRepos = repos.filter((r) => !r.fork);
    base.totalStars = ownRepos.reduce((n, r) => n + (r.stargazers_count ?? 0), 0);
    base.activeRepos = ownRepos.slice(0, 5).map((r) => ({
      name: r.name,
      url: r.html_url,
      lastPushed: r.pushed_at,
      stars: r.stargazers_count ?? 0,
      language: r.language,
    }));

    const cs = computeCommitStats(events);
    base.commits30d = cs.commits30d;
    base.streakDays = cs.streakDays;
    base.commitsByDay = cs.commitsByDay;

    return base;
  } catch (err) {
    base.error = err instanceof Error ? err.message : "Unknown GitHub error";
    return base;
  }
}
