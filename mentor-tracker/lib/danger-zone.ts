// Members who have gone quiet.
//
// Organiser-only. This never appears on the public site: being quiet for two weeks
// during exams is not something to publish about a student.
//
// One honest limitation drives the wording everywhere this is displayed. GitHub's
// contribution calendar only counts PUBLIC activity, so a member grinding away on a
// private repo, a college submission, or an unmerged branch reads as "inactive"
// here. The flag therefore means "no public activity we can see", never "doing
// nothing" — and the nudge email is written on that basis.
//
// Members whose profile has not been collected yet are kept in a separate bucket.
// "We have not looked" and "they have not worked" are different facts, and merging
// them would put every new joiner in the danger zone on day one.

import { prisma } from "@/lib/prisma";

const DEFAULT_INACTIVE_DAYS = 15;

export function inactivityThresholdDays(): number {
  const raw = Number(process.env.INACTIVITY_DAYS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_INACTIVE_DAYS;
}

export type QuietMember = {
  id: string;
  github: string;
  displayName: string;
  batch: string | null;
  /** Private. Null unless the caller passed includeEmail. */
  email: string | null;
  /**
   * Whether an address exists at all — distinct from `email` being null because
   * the caller didn't ask for it. Without this the UI cannot tell "no address on
   * file" from "we never looked", and would report the second as the first.
   */
  hasEmail: boolean;
  notifyInactive: boolean;
  lastNudgedAt: string | null;
  lastContributionAt: string | null;
  daysSinceActivity: number | null;
  /** Set when they have never had a public contribution in the tracked window. */
  neverActive: boolean;
};

export type DangerZone = {
  thresholdDays: number;
  /** Past the threshold — the actual danger zone. */
  quiet: QuietMember[];
  /** Joined but never fetched. Not inactive; simply unknown. */
  awaitingData: { id: string; github: string; displayName: string }[];
  activeCount: number;
  /**
   * Everyone this covers: every APPROVED member, whether or not they consented to
   * a public listing. Deliberately NOT the same population as the leaderboard,
   * which is consent-gated — organisers track the whole club, not just the members
   * who opted into publicity. Callers must not mix the two counts in one sentence.
   */
  clubTotal: number;
};

function daysBetween(then: Date, now: Date): number {
  return Math.floor((now.getTime() - then.getTime()) / 86_400_000);
}

/**
 * Split the membership into quiet, awaiting-data, and active.
 *
 * `includeEmail` is explicit rather than always-on so a caller has to opt into
 * pulling private contact data. The admin page passes false — it does not need
 * addresses to render — and only the mailer passes true.
 */
export async function loadDangerZone(
  opts: { includeEmail?: boolean } = {},
): Promise<DangerZone> {
  const thresholdDays = inactivityThresholdDays();
  const now = new Date();

  const members = await prisma.member.findMany({
    where: { status: "APPROVED" },
    select: {
      id: true,
      github: true,
      displayName: true,
      batch: true,
      notifyInactive: true,
      lastNudgedAt: true,
      // Read regardless, reduced to a boolean below unless the caller opted in.
      // Knowing whether an address exists is not itself contact information, and
      // the alternative is a UI that cannot distinguish "none" from "not checked".
      email: true,
    },
    orderBy: { displayName: "asc" },
  });

  if (members.length === 0) {
    return {
      thresholdDays,
      quiet: [],
      awaitingData: [],
      activeCount: 0,
      clubTotal: 0,
    };
  }

  const profiles = await prisma.contribProfile.findMany({
    where: { username: { in: members.map((m) => m.github) } },
    select: { username: true, lastContributionAt: true, fetchedAt: true },
  });
  const byLogin = new Map(profiles.map((p) => [p.username, p]));

  const quiet: QuietMember[] = [];
  const awaitingData: DangerZone["awaitingData"] = [];
  let activeCount = 0;

  for (const m of members) {
    const profile = byLogin.get(m.github);

    // Never fetched → unknown, not inactive.
    if (!profile) {
      awaitingData.push({
        id: m.id,
        github: m.github,
        displayName: m.displayName,
      });
      continue;
    }

    const last = profile.lastContributionAt;
    const days = last ? daysBetween(last, now) : null;
    const isQuiet = last === null || (days !== null && days >= thresholdDays);

    if (!isQuiet) {
      activeCount += 1;
      continue;
    }

    quiet.push({
      id: m.id,
      github: m.github,
      displayName: m.displayName,
      batch: m.batch,
      email: opts.includeEmail ? (m.email ?? null) : null,
      hasEmail: m.email !== null && m.email !== "",
      notifyInactive: m.notifyInactive,
      lastNudgedAt: m.lastNudgedAt ? m.lastNudgedAt.toISOString() : null,
      lastContributionAt: last ? last.toISOString() : null,
      daysSinceActivity: days,
      neverActive: last === null,
    });
  }

  // Quietest first — that is the order an organiser wants to work down.
  quiet.sort((a, b) => {
    if (a.neverActive !== b.neverActive) return a.neverActive ? -1 : 1;
    return (b.daysSinceActivity ?? 0) - (a.daysSinceActivity ?? 0);
  });

  return {
    thresholdDays,
    quiet,
    awaitingData,
    activeCount,
    clubTotal: members.length,
  };
}
