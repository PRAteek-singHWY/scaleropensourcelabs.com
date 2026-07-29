// Scheduled refresh of published members' contribution data.
//
// Without this the site is a museum: profiles are only collected when an organiser
// happens to open a drill-down, so the leaderboard goes stale, the danger zone has
// no activity to measure, and the inactivity mailer has nothing to fire on.
//
// The hard constraint is GitHub's rate limit. One cold profile costs 50-70 API
// requests, so a job that tried to refresh a 60-member club in one pass would burn
// ~4,000 requests and trip the limit mid-run, leaving half the club with partial
// data. Instead each invocation refreshes a small batch, oldest-first, and the
// schedule does the rest: at 5 members every 15 minutes, a 60-member club fully
// refreshes in about 3 hours and never comes close to the ceiling.
//
// Oldest-first ordering means the job is self-correcting. If a run fails or is
// skipped, the members it missed are still the oldest next time, so they get picked
// up rather than starved.

import { prisma } from "@/lib/prisma";
import { loadDeepProfile } from "@/lib/deep-cache";
import { MissingTokenError } from "@/lib/github-deep";
import { PUBLIC_MEMBER_WHERE } from "@/lib/public";

/** Members refreshed per invocation. Deliberately small — see the note above. */
const DEFAULT_BATCH = 5;

function ttlMs(): number {
  const raw = Number(process.env.DEEP_PROFILE_TTL_HOURS);
  const hours = Number.isFinite(raw) && raw > 0 ? raw : 12;
  return hours * 3_600_000;
}

export type RefreshOutcome = {
  github: string;
  status: "refreshed" | "failed";
  reposEnriched?: number;
  partial?: boolean;
  error?: string;
};

export type RefreshReport = {
  /** Members eligible for refresh at the moment the job ran. */
  due: number;
  attempted: number;
  refreshed: number;
  failed: number;
  /** Still due after this run — how far behind the schedule is. */
  remaining: number;
  results: RefreshOutcome[];
  startedAt: string;
  finishedAt: string;
};

/**
 * Members whose cached profile is missing or older than the TTL, oldest first.
 *
 * "Missing" matters as much as "stale": a member who joined five minutes ago has
 * no ContribProfile row at all, and they are the ones most likely to be looking at
 * the site wondering why it says no data.
 */
async function findDue(limit: number): Promise<{ github: string }[]> {
  const published = await prisma.member.findMany({
    where: PUBLIC_MEMBER_WHERE,
    select: { github: true },
  });
  if (published.length === 0) return [];

  const logins = published.map((m) => m.github);
  const cutoff = new Date(Date.now() - ttlMs());

  const fresh = await prisma.contribProfile.findMany({
    where: { username: { in: logins }, fetchedAt: { gte: cutoff } },
    select: { username: true },
  });
  const freshSet = new Set(fresh.map((f) => f.username));
  const dueLogins = logins.filter((l) => !freshSet.has(l));
  if (dueLogins.length === 0) return [];

  // Order the stale ones by how long they've been waiting; never-fetched members
  // have no row at all, so they sort first.
  const existing = await prisma.contribProfile.findMany({
    where: { username: { in: dueLogins } },
    select: { username: true, fetchedAt: true },
  });
  const fetchedAt = new Map(existing.map((e) => [e.username, e.fetchedAt.getTime()]));

  return dueLogins
    .sort((a, b) => (fetchedAt.get(a) ?? 0) - (fetchedAt.get(b) ?? 0))
    .slice(0, limit)
    .map((github) => ({ github }));
}

/**
 * Refresh a batch. Each member is refreshed sequentially, not in parallel: the
 * fetcher already runs its own internal requests concurrently, and stacking
 * several members on top of that is how you trip GitHub's abuse detection rather
 * than its documented rate limit.
 */
export async function runRefresh(
  opts: { batchSize?: number } = {},
): Promise<RefreshReport> {
  const startedAt = new Date().toISOString();
  const batchSize = Math.max(1, Math.min(opts.batchSize ?? DEFAULT_BATCH, 25));

  const dueAll = await findDue(1000);
  const batch = dueAll.slice(0, batchSize);
  const results: RefreshOutcome[] = [];

  for (const { github } of batch) {
    try {
      const { profile } = await loadDeepProfile(github, { forceRefresh: true });
      results.push({
        github,
        status: "refreshed",
        reposEnriched: profile.repos.length,
        partial: profile.partial,
      });
    } catch (err) {
      // A single bad username must not abort the batch — the next member is
      // probably fine, and a permanently broken login would otherwise block the
      // queue forever since it stays the oldest.
      if (err instanceof MissingTokenError) {
        results.push({ github, status: "failed", error: err.message });
        // No token means nothing will succeed; stop rather than failing loudly N times.
        break;
      }
      results.push({
        github,
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const refreshed = results.filter((r) => r.status === "refreshed").length;

  return {
    due: dueAll.length,
    attempted: results.length,
    refreshed,
    failed: results.length - refreshed,
    remaining: Math.max(0, dueAll.length - refreshed),
    results,
    startedAt,
    finishedAt: new Date().toISOString(),
  };
}
