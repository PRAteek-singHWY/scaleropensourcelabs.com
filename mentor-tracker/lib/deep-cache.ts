// Server-only Postgres cache in front of getDeepProfile().
//
// A deep profile costs ~50-70 GitHub API requests, so it is never fetched on a
// page render. This module owns the read-through cache:
//
//   fresh row      → serve it, no API calls
//   stale/missing  → fetch, persist, serve
//   fetch failed   → serve the stale row if we have one, flagged, rather than
//                    showing the mentor an error page over a transient 403
//
// Rows are keyed by GitHub login, not by mentee id, so two leads tracking the
// same username share one entry. Everything cached here is public GitHub data,
// so that sharing leaks nothing — and the API route still refuses to look up a
// username that isn't one of the calling lead's own mentees.

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getDeepProfile,
  type DeepProfile,
  type RankStatus,
  type RepoContribution,
  type StackEntry,
  type StackProfile,
} from "@/lib/github-deep";

const DEFAULT_TTL_HOURS = 12;

function ttlMs(): number {
  const raw = Number(process.env.DEEP_PROFILE_TTL_HOURS);
  const hours = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_HOURS;
  return hours * 3_600_000;
}

export type CachedDeepProfile = {
  profile: DeepProfile;
  /** true → served from Postgres without touching the GitHub API. */
  cached: boolean;
  /** Set when a refetch failed and we fell back to an older cached copy. */
  staleReason: string | null;
  ttlHours: number;
};

type ProfileRow = Prisma.ContribProfileGetPayload<{
  include: { repos: true; stackScan: true };
}>;

const RANK_STATUSES: RankStatus[] = [
  "ranked",
  "unranked",
  "outside-window",
  "unresolved",
];

function toRankStatus(raw: string): RankStatus {
  return (RANK_STATUSES as string[]).includes(raw)
    ? (raw as RankStatus)
    : "unresolved";
}

/** Json column → StackEntry[], defensively: a bad row must not crash the page. */
function toStackEntries(raw: Prisma.JsonValue): StackEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: StackEntry[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    if (typeof o.label !== "string") continue;
    out.push({
      label: o.label,
      ext: typeof o.ext === "string" ? o.ext : "",
      files: typeof o.files === "number" ? o.files : 0,
      additions: typeof o.additions === "number" ? o.additions : 0,
      deletions: typeof o.deletions === "number" ? o.deletions : 0,
      share: typeof o.share === "number" ? o.share : 0,
    });
  }
  return out;
}

function rowToProfile(row: ProfileRow): DeepProfile {
  const repos: RepoContribution[] = [...row.repos]
    .sort((a, b) => a.position - b.position)
    .map((r) => ({
      nameWithOwner: r.nameWithOwner,
      url: r.url,
      description: r.description,
      stars: r.stars,
      primaryLanguage: r.primaryLanguage,
      isOwnRepo: r.isOwnRepo,
      isFork: r.isFork,
      commits: r.commits,
      issuesOpened: r.issuesOpened,
      issuesClosed: r.issuesClosed,
      prsOpened: r.prsOpened,
      prsMerged: r.prsMerged,
      prsOpen: r.prsOpen,
      prsClosed: r.prsClosed,
      reviews: r.reviews,
      rank: r.rank,
      rankStatus: toRankStatus(r.rankStatus),
      totalContributors: r.totalContributors,
      contributorsExact: r.contributorsExact,
      lastActivityAt: r.lastActivityAt ? r.lastActivityAt.toISOString() : null,
    }));

  const stack: StackProfile | null = row.stackScan
    ? {
        prsScanned: row.stackScan.prsScanned,
        filesSeen: row.stackScan.filesSeen,
        entries: toStackEntries(row.stackScan.entries),
        truncated: row.stackScan.truncated,
      }
    : null;

  return {
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl ?? `https://github.com/${row.username}.png`,
    profileUrl: row.profileUrl ?? `https://github.com/${row.username}`,
    followers: row.followers,
    publicRepos: row.publicRepos,
    windowDays: row.windowDays,
    commitsInWindow: row.commitsInWindow,
    prsInWindow: row.prsInWindow,
    issuesInWindow: row.issuesInWindow,
    reviewsInWindow: row.reviewsInWindow,
    totalPRs: row.totalPRs,
    totalMergedPRs: row.totalMergedPRs,
    totalIssues: row.totalIssues,
    reposContributedTo: row.reposContributedTo,
    repos,
    stack,
    partial: row.partial,
    note: row.note,
    fetchedAt: row.fetchedAt.toISOString(),
  };
}

async function persist(username: string, p: DeepProfile): Promise<void> {
  const scalars = {
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    profileUrl: p.profileUrl,
    followers: p.followers,
    publicRepos: p.publicRepos,
    windowDays: p.windowDays,
    commitsInWindow: p.commitsInWindow,
    prsInWindow: p.prsInWindow,
    issuesInWindow: p.issuesInWindow,
    reviewsInWindow: p.reviewsInWindow,
    totalPRs: p.totalPRs,
    totalMergedPRs: p.totalMergedPRs,
    totalIssues: p.totalIssues,
    reposContributedTo: p.reposContributedTo,
    partial: p.partial,
    note: p.note,
    fetchedAt: new Date(p.fetchedAt),
  };

  // One transaction so a reader never sees a profile whose repo rows are half
  // replaced: the old set is dropped and the new one written atomically.
  await prisma.$transaction(async (tx) => {
    const row = await tx.contribProfile.upsert({
      where: { username },
      create: { username, ...scalars },
      update: scalars,
      select: { id: true },
    });

    await tx.repoContrib.deleteMany({ where: { profileId: row.id } });
    if (p.repos.length > 0) {
      await tx.repoContrib.createMany({
        data: p.repos.map((r, i) => ({
          profileId: row.id,
          position: i,
          nameWithOwner: r.nameWithOwner,
          url: r.url,
          description: r.description,
          stars: r.stars,
          primaryLanguage: r.primaryLanguage,
          isOwnRepo: r.isOwnRepo,
          isFork: r.isFork,
          commits: r.commits,
          issuesOpened: r.issuesOpened,
          issuesClosed: r.issuesClosed,
          prsOpened: r.prsOpened,
          prsMerged: r.prsMerged,
          prsOpen: r.prsOpen,
          prsClosed: r.prsClosed,
          reviews: r.reviews,
          rank: r.rank,
          rankStatus: r.rankStatus,
          totalContributors: r.totalContributors,
          contributorsExact: r.contributorsExact,
          lastActivityAt: r.lastActivityAt ? new Date(r.lastActivityAt) : null,
        })),
      });
    }

    // Only overwrite a previous stack scan when this run produced one —
    // a rate-limited run shouldn't wipe a good earlier scan.
    if (p.stack) {
      const stackData = {
        prsScanned: p.stack.prsScanned,
        filesSeen: p.stack.filesSeen,
        entries: p.stack.entries as unknown as Prisma.InputJsonValue,
        truncated: p.stack.truncated,
        scannedAt: new Date(),
      };
      await tx.stackScan.upsert({
        where: { profileId: row.id },
        create: { profileId: row.id, ...stackData },
        update: stackData,
      });
    }
  });
}

/**
 * Read-through cache. Pass forceRefresh to bypass a fresh row (the UI's
 * "Refresh" button); everything else is handled here.
 */
export async function loadDeepProfile(
  username: string,
  opts: { forceRefresh?: boolean } = {},
): Promise<CachedDeepProfile> {
  const key = username.toLowerCase();
  const hours = ttlMs() / 3_600_000;

  const existing = await prisma.contribProfile.findUnique({
    where: { username: key },
    include: { repos: true, stackScan: true },
  });

  if (
    existing &&
    !opts.forceRefresh &&
    Date.now() - existing.fetchedAt.getTime() < ttlMs()
  ) {
    return {
      profile: rowToProfile(existing),
      cached: true,
      staleReason: null,
      ttlHours: hours,
    };
  }

  try {
    const fresh = await getDeepProfile(username);
    await persist(key, fresh);
    // Re-read so a cached hit and a fresh fetch render from identical data, and
    // so a stack scan preserved from an earlier run is included.
    const saved = await prisma.contribProfile.findUnique({
      where: { username: key },
      include: { repos: true, stackScan: true },
    });
    return {
      profile: saved ? rowToProfile(saved) : fresh,
      cached: false,
      staleReason: null,
      ttlHours: hours,
    };
  } catch (err) {
    // A transient GitHub failure shouldn't blank out a profile we already have.
    if (existing) {
      const why = err instanceof Error ? err.message : "refresh failed";
      return {
        profile: rowToProfile(existing),
        cached: true,
        staleReason: why,
        ttlHours: hours,
      };
    }
    throw err;
  }
}
