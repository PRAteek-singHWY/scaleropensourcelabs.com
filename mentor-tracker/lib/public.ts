// The boundary between "anyone on the internet may read this" and everything else.
//
// This site is public at the root and private under /admin. Members are real
// students, and the private side holds their email addresses. So the public
// boundary is enforced two ways, deliberately redundant:
//
//   1. PUBLIC_MEMBER_SELECT is a Prisma `select` that lists ONLY public columns.
//      Public queries never read `email` out of Postgres at all — it is not
//      fetched and then stripped, it is never in the result object to begin with.
//   2. toPublicMember() constructs the outgoing shape field by field, so a new
//      column added to the Member model is invisible publicly until someone adds
//      it here on purpose.
//
// A whitelist, not a blacklist. The failure mode of a blacklist is that adding a
// field leaks it by default; the failure mode of a whitelist is that adding a
// field is invisible until you opt in. Only one of those is safe.

import type { Prisma } from "@prisma/client";
import type { DeepProfile, RepoContribution } from "@/lib/github-deep";

/**
 * Prisma select for any member read on a public code path.
 *
 * Do NOT add `email` or any future private field here. If a public page needs
 * more data, add the column to the Member model as public and add it below with
 * a comment explaining why it is safe to publish.
 */
export const PUBLIC_MEMBER_SELECT = {
  id: true,
  github: true,
  displayName: true,
  batch: true,
  bio: true,
  role: true,
  // Needed so the UI can show "member since"; a join date is not sensitive.
  createdAt: true,
} satisfies Prisma.MemberSelect;

export type PublicMemberRow = Prisma.MemberGetPayload<{
  select: typeof PUBLIC_MEMBER_SELECT;
}>;

export type PublicMember = {
  id: string;
  github: string;
  displayName: string;
  batch: string | null;
  bio: string | null;
  role: string | null;
  joinedAt: string;
};

export function toPublicMember(row: PublicMemberRow): PublicMember {
  return {
    id: row.id,
    github: row.github,
    displayName: row.displayName,
    batch: row.batch,
    bio: row.bio,
    role: row.role,
    joinedAt: row.createdAt.toISOString(),
  };
}

/**
 * Only APPROVED members who personally consented are publishable. Both
 * conditions, always — an admin approving someone does not create consent, and
 * someone consenting does not bypass review.
 */
export const PUBLIC_MEMBER_WHERE = {
  status: "APPROVED",
  publicConsent: true,
} satisfies Prisma.MemberWhereInput;

// ---- Public contribution stats ---------------------------------------------

/** The subset of a contribution profile that is safe and useful to publish. */
export type PublicContribStats = {
  github: string;
  displayName: string | null;
  avatarUrl: string;
  profileUrl: string;

  reposContributedTo: number;
  commitsInWindow: number;
  totalPRs: number;
  totalMergedPRs: number;
  totalIssues: number;
  mergeRate: number;
  reviewsInWindow: number;

  /** Best rank achieved on any repo they don't own — the headline achievement. */
  bestRank: {
    repo: string;
    repoUrl: string;
    rank: number;
    totalContributors: number | null;
    contributorsExact: boolean;
  } | null;

  /** Top code languages by lines added. Config/docs excluded. */
  topLanguages: string[];

  /** Public repos they contribute to, for the profile page. */
  repos: RepoContribution[];

  fetchedAt: string;
  partial: boolean;
};

/**
 * A member's single most impressive ranked contribution: their best position on a
 * repo they do NOT own. Own-repo ranks are excluded because being sole author of
 * your own project is not a competitive placement, and publishing it as one would
 * make the leaderboard meaningless.
 */
export function bestExternalRank(
  repos: RepoContribution[],
): PublicContribStats["bestRank"] {
  const ranked = repos.filter(
    (r) =>
      !r.isOwnRepo &&
      r.rankStatus === "ranked" &&
      r.rank !== null &&
      (r.totalContributors ?? 0) > 1,
  );
  if (ranked.length === 0) return null;

  // Lowest rank number wins; ties break toward the larger contributor pool,
  // since #3 of 200 is a stronger result than #3 of 12.
  ranked.sort((a, b) => {
    if (a.rank !== b.rank) return (a.rank ?? 0) - (b.rank ?? 0);
    return (b.totalContributors ?? 0) - (a.totalContributors ?? 0);
  });
  const top = ranked[0];
  return {
    repo: top.nameWithOwner,
    repoUrl: top.url,
    rank: top.rank as number,
    totalContributors: top.totalContributors,
    contributorsExact: top.contributorsExact,
  };
}

export function toPublicStats(p: DeepProfile): PublicContribStats {
  return {
    github: p.username,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    profileUrl: p.profileUrl,

    reposContributedTo: p.reposContributedTo,
    commitsInWindow: p.commitsInWindow,
    totalPRs: p.totalPRs,
    totalMergedPRs: p.totalMergedPRs,
    totalIssues: p.totalIssues,
    mergeRate: p.totalPRs > 0 ? p.totalMergedPRs / p.totalPRs : 0,
    reviewsInWindow: p.reviewsInWindow,

    bestRank: bestExternalRank(p.repos),
    topLanguages: (p.stack?.entries ?? [])
      .filter((e) => e.kind === "code")
      .slice(0, 4)
      .map((e) => e.label),
    repos: p.repos,

    fetchedAt: p.fetchedAt,
    partial: p.partial,
  };
}

/** A member plus their published stats. Stats are null until first fetched. */
export type LeaderboardEntry = {
  member: PublicMember;
  stats: PublicContribStats | null;
};

/**
 * Leaderboard ordering. Merged PRs lead because they represent work someone else
 * accepted — the closest available proxy for contribution that landed, and much
 * harder to inflate than commit or PR counts.
 */
export function rankLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    const am = a.stats?.totalMergedPRs ?? -1;
    const bm = b.stats?.totalMergedPRs ?? -1;
    if (am !== bm) return bm - am;
    const ac = a.stats?.commitsInWindow ?? 0;
    const bc = b.stats?.commitsInWindow ?? 0;
    if (ac !== bc) return bc - ac;
    return a.member.displayName.localeCompare(b.member.displayName);
  });
}
