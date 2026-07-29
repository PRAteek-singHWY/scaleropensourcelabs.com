// Server-only data loader for the PUBLIC leaderboard.
//
// Two rules govern everything in this file:
//
//   1. It reads only whitelisted public columns (PUBLIC_MEMBER_SELECT). A mentee's
//      email address is not merely filtered out — the Mentee table is never
//      touched here, and Member.email is never selected.
//
//   2. It does NOT call the GitHub API. Contribution stats come from the
//      ContribProfile cache that the admin drill-down already populates. A public
//      page cannot fan out ~60 GitHub requests per member: it would exhaust the
//      hourly rate limit on the first crawl and make the site unusably slow. A
//      member with no cached profile yet renders with stats: null and a "pending"
//      label, which is honest and cheap.
//
// The refresh job that keeps those cached profiles warm is the piece still to
// build — see the note at the bottom of this file.

import { prisma } from "@/lib/prisma";
import {
  PUBLIC_MEMBER_SELECT,
  PUBLIC_MEMBER_WHERE,
  rankLeaderboard,
  toPublicMember,
  toPublicStats,
  type LeaderboardEntry,
  type PublicMember,
} from "@/lib/public";
import { rowToDeepProfileForPublic } from "@/lib/deep-cache";

/**
 * Run a read that the public site needs, falling back to `empty` if the database
 * is unreachable.
 *
 * The public pages are statically prerendered, so without this a database that is
 * briefly unavailable at build time fails the whole deploy — and at runtime, a
 * connection blip would turn the club's front page into a 500. Every public page
 * already has a designed empty state, so degrading into it is strictly better than
 * breaking. The error is logged loudly so this never hides a real outage.
 */
async function orEmpty<T>(label: string, run: () => Promise<T>, empty: T): Promise<T> {
  try {
    return await run();
  } catch (err) {
    console.error(
      `[leaderboard] ${label} failed; rendering the empty state instead:`,
      err instanceof Error ? err.message : err,
    );
    return empty;
  }
}

/** Every member cleared for publication, newest first. Public columns only. */
export async function listPublicMembers(): Promise<PublicMember[]> {
  return orEmpty(
    "listPublicMembers",
    async () => {
      const rows = await prisma.member.findMany({
        where: PUBLIC_MEMBER_WHERE,
        select: PUBLIC_MEMBER_SELECT,
        orderBy: { createdAt: "asc" },
      });
      return rows.map(toPublicMember);
    },
    [],
  );
}

/**
 * The full leaderboard: publishable members joined to their cached contribution
 * stats, ordered by merged PRs.
 */
export async function loadLeaderboard(): Promise<LeaderboardEntry[]> {
  const members = await listPublicMembers();
  if (members.length === 0) return [];

  return orEmpty(
    "loadLeaderboard",
    async () => {
      const profiles = await prisma.contribProfile.findMany({
        where: { username: { in: members.map((m) => m.github) } },
        include: { repos: true, stackScan: true },
      });
      const byLogin = new Map(profiles.map((p) => [p.username, p]));

      const entries: LeaderboardEntry[] = members.map((member) => {
        const row = byLogin.get(member.github);
        return {
          member,
          stats: row ? toPublicStats(rowToDeepProfileForPublic(row)) : null,
        };
      });

      return rankLeaderboard(entries);
    },
    // Members without their stats still beats an error page.
    members.map((member) => ({ member, stats: null })),
  );
}

/**
 * How many members the PUBLIC leaderboard shows.
 *
 * The cutoff does two jobs. It keeps the public board a highlight reel rather than
 * a ranking of every student from best to worst — nobody consented to being
 * publicly listed as 47th. And because joining now publishes immediately, it is
 * also the spam control: appearing publicly requires out-ranking ten people on
 * merged pull requests, which a junk signup cannot do.
 */
export const PUBLIC_LEADERBOARD_LIMIT = 10;

/** The public top N. Everything below the cutoff is simply not returned. */
export async function loadPublicLeaderboard(): Promise<{
  top: LeaderboardEntry[];
  totalMembers: number;
}> {
  const board = await loadLeaderboard();
  return {
    top: board.slice(0, PUBLIC_LEADERBOARD_LIMIT),
    // A count is fine to publish — it says how big the club is, not who is where.
    totalMembers: board.length,
  };
}

export type MemberStanding = {
  rank: number;
  totalMembers: number;
  /** True when they're already visible on the public board. */
  isPublic: boolean;
  /** Merged PRs needed to reach the public cutoff, or null if already there. */
  mergedPRsToPublic: number | null;
  entry: LeaderboardEntry;
};

/**
 * A signed-in member's own position, shown only to them.
 *
 * This is the feedback loop the public cutoff would otherwise remove: without it a
 * member outside the top ten has no idea whether they are 11th or 60th, and a
 * leaderboard you cannot locate yourself on does not motivate anyone. Returning the
 * gap to the cutoff turns it into a target rather than a verdict.
 */
export async function loadMemberStanding(
  github: string,
): Promise<MemberStanding | null> {
  const board = await loadLeaderboard();
  const key = github.toLowerCase();
  const index = board.findIndex((e) => e.member.github === key);
  if (index === -1) return null;

  const rank = index + 1;
  const isPublic = rank <= PUBLIC_LEADERBOARD_LIMIT;
  const cutoffEntry = board[PUBLIC_LEADERBOARD_LIMIT - 1];
  const mine = board[index].stats?.totalMergedPRs ?? 0;
  const needed = cutoffEntry?.stats?.totalMergedPRs ?? 0;

  return {
    rank,
    totalMembers: board.length,
    isPublic,
    mergedPRsToPublic: isPublic ? null : Math.max(1, needed - mine + 1),
    entry: board[index],
  };
}

/** One member's public profile page, or null if they aren't publishable. */
export async function loadPublicMember(
  github: string,
): Promise<LeaderboardEntry | null> {
  return orEmpty(
    "loadPublicMember",
    async () => {
      const row = await prisma.member.findFirst({
        where: { ...PUBLIC_MEMBER_WHERE, github: github.toLowerCase() },
        select: PUBLIC_MEMBER_SELECT,
      });
      if (!row) return null;

      const member = toPublicMember(row);
      const profile = await prisma.contribProfile.findUnique({
        where: { username: member.github },
        include: { repos: true, stackScan: true },
      });

      return {
        member,
        stats: profile ? toPublicStats(rowToDeepProfileForPublic(profile)) : null,
      };
    },
    // A database failure must not 404 a real member's page as if they withdrew —
    // but we also cannot invent one, so null it is, and the error is logged.
    null,
  );
}

/**
 * The club's collective contribution grid: every published member's daily counts
 * summed into one series, oldest first. This is the landing page's hero, and it is
 * real data — on a club with no members yet it returns an empty array and the page
 * renders an honest empty state rather than a decorative fake.
 */
export async function loadClubGrid(): Promise<{
  days: { date: string; count: number }[];
  total: number;
  contributors: number;
}> {
  const members = await listPublicMembers();
  const empty = { days: [], total: 0, contributors: 0 };
  if (members.length === 0) return empty;

  return orEmpty(
    "loadClubGrid",
    async () => {
      const profiles = await prisma.contribProfile.findMany({
        where: { username: { in: members.map((m) => m.github) } },
        select: { dailyContributions: true },
      });

      const byDate = new Map<string, number>();
      let contributors = 0;
      for (const p of profiles) {
        const series = toDayList(p.dailyContributions);
        if (series.length === 0) continue;
        contributors += 1;
        for (const d of series) {
          byDate.set(d.date, (byDate.get(d.date) ?? 0) + d.count);
        }
      }

      const days = [...byDate.entries()]
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        days,
        total: days.reduce((n, d) => n + d.count, 0),
        contributors,
      };
    },
    empty,
  );
}

/** Local, defensive parse of the Json column. */
function toDayList(raw: unknown): { date: string; count: number }[] {
  if (!Array.isArray(raw)) return [];
  const out: { date: string; count: number }[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    if (typeof o.date !== "string") continue;
    out.push({ date: o.date, count: typeof o.count === "number" ? o.count : 0 });
  }
  return out;
}

/** Headline totals for the landing page. Aggregated, so nothing identifies anyone. */
export async function loadClubTotals(): Promise<{
  members: number;
  mergedPRs: number;
  reposTouched: number;
  issuesOpened: number;
}> {
  const zero = { members: 0, mergedPRs: 0, reposTouched: 0, issuesOpened: 0 };
  return orEmpty(
    "loadClubTotals",
    async () => {
      const logins = (
        await prisma.member.findMany({
          where: PUBLIC_MEMBER_WHERE,
          select: { github: true },
        })
      ).map((m) => m.github);

      if (logins.length === 0) return zero;

      const agg = await prisma.contribProfile.aggregate({
        where: { username: { in: logins } },
        _sum: { totalMergedPRs: true, totalIssues: true, reposContributedTo: true },
      });

      return {
        members: logins.length,
        mergedPRs: agg._sum.totalMergedPRs ?? 0,
        issuesOpened: agg._sum.totalIssues ?? 0,
        reposTouched: agg._sum.reposContributedTo ?? 0,
      };
    },
    zero,
  );
}

// TODO(refresh job): cached profiles are currently only populated when an admin
// opens a mentee's drill-down. For the public site, a scheduled job should walk
// publishable members and refresh any profile older than the TTL — a Vercel Cron
// hitting an authenticated route, spaced to respect the GitHub rate limit. Until
// that exists, a newly approved member shows stats: null until someone triggers a
// fetch for them.
