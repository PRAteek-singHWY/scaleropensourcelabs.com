// HALL OF FAME — four sections that must never be merged into one.
//
// They answer four different questions, and a combined "our team" grid answers
// none of them:
//
//   CORE TEAM      "who do I talk to on Saturday?"          — current, contactable
//   ALUMNI         "does this lead anywhere?"                — past, with outcomes
//   ACHIEVERS      "did anybody actually get selected?"      — the external proof
//   REPRESENTATION "how far does this reach?"                — the org wall
//
// Merging them also quietly launders the weakest claim into the strongest: a core
// team member who has not been selected for anything sitting in the same grid as a
// GSoC contributor reads as though both were selected. Keeping the sections
// labelled is an accuracy measure, not a layout preference.
//
// ---------------------------------------------------------------------------
// CONSENT IS NOT A FORMALITY HERE.
//
// Every entry below publishes a real student's name, and usually their face, to an
// international audience, attached to a specific organisation. `consented` must be
// true or the entry does not render — enforced in code rather than asked for in a
// comment.
//
// Do not set it on somebody's behalf because you think they would not mind. Some
// people do not want their name publicly attached to an employer, a programme, or
// this college. Ask them, show them the exact text that will ship, then set it.

import { type Programme } from "@/content/programs";

// ---------------------------------------------------------------------------
// 1. CURRENT CORE TEAM.

export type CoreMember = {
  name: string;
  /** Lead, Dev Lead, Design, Outreach… The job, not a title ladder. */
  role: string;
  /** Year and branch. */
  situation: string;
  /** One line on what they are actually responsible for. Not adjectives. */
  owns: string;
  photo?: string;
  github?: string;
  linkedin?: string;
  consented: boolean;
};

export const CORE_TEAM: CoreMember[] = [
  // ---- Awaiting real entries ----------------------------------------------
  // One per current core team member, each with their own consent.
];

const CORE_SCAFFOLD: CoreMember[] = [
  {
    name: "Placeholder Lead",
    role: "Lead",
    situation: "Year, branch",
    owns: "Replace with what this person is actually responsible for.",
    consented: true,
  },
  {
    name: "Placeholder Dev Lead",
    role: "Dev Lead",
    situation: "Year, branch",
    owns: "Replace with what this person is actually responsible for.",
    consented: true,
  },
  {
    name: "Placeholder Design",
    role: "Design",
    situation: "Year, branch",
    owns: "Replace with what this person is actually responsible for.",
    consented: true,
  },
  {
    name: "Placeholder Outreach",
    role: "Outreach",
    situation: "Year, branch",
    owns: "Replace with what this person is actually responsible for.",
    consented: true,
  },
  {
    name: "Placeholder Programs",
    role: "Programs",
    situation: "Year, branch",
    owns: "Replace with what this person is actually responsible for.",
    consented: true,
  },
];

export function publishedCore(): CoreMember[] {
  const real = CORE_TEAM.filter((m) => m.consented);
  if (real.length > 0) return real;
  return process.env.NODE_ENV === "production" ? [] : CORE_SCAFFOLD;
}

// ---------------------------------------------------------------------------
// 2. ALUMNI / PAST CORE MEMBERS.
//
// "Where they are now" is the single most persuasive column on this page for a
// first-year deciding whether any of this leads anywhere — and the one most
// tempting to inflate. Same rule: it is a statement of fact about a real person,
// with their permission, and it should be checkable on their public profile.

export type Alumnus = {
  name: string;
  /** Graduating batch, e.g. "2024". */
  batch: string;
  /** The role they held in the club. */
  roleHeld: string;
  /** Where they are now. A place, not a compliment. */
  nowAt: string;
  /** Optional one line, in their words or ours, about what the club did for them. */
  note?: string;
  photo?: string;
  github?: string;
  linkedin?: string;
  consented: boolean;
};

export const ALUMNI: Alumnus[] = [
  // ---- Awaiting real entries ----------------------------------------------
];

const ALUMNI_SCAFFOLD: Alumnus[] = [
  {
    name: "Placeholder Alumnus One",
    batch: "2024",
    roleHeld: "Lead",
    nowAt: "Example Company",
    consented: true,
  },
  {
    name: "Placeholder Alumnus Two",
    batch: "2024",
    roleHeld: "Dev Lead",
    nowAt: "Example Company",
    consented: true,
  },
  {
    name: "Placeholder Alumnus Three",
    batch: "2023",
    roleHeld: "Design",
    nowAt: "Example Company",
    consented: true,
  },
  {
    name: "Placeholder Alumnus Four",
    batch: "2023",
    roleHeld: "Outreach",
    nowAt: "Example Company",
    consented: true,
  },
];

export function publishedAlumni(): Alumnus[] {
  const real = ALUMNI.filter((a) => a.consented);
  if (real.length > 0) return real;
  return process.env.NODE_ENV === "production" ? [] : ALUMNI_SCAFFOLD;
}

// ---------------------------------------------------------------------------
// 3. ACHIEVERS — the club's strongest claim.
//
// Getting students into GSoC, LFX Mentorship, C4GT and Outreachy is the most
// internationally legible thing a college open-source club can show. These
// programmes are recognised on sight by exactly the audience this site is for, and
// unlike a self-reported metric they cannot be manufactured: somebody else ran a
// selection process and picked your member.
//
// Hackathon wins live here too, tagged differently, because "won X" is a
// third-party judgement of the same kind.

export type Achievement =
  | { kind: "programme"; programme: Programme }
  | { kind: "hackathon"; event: string };

export type Achiever = {
  name: string;
  achievement: Achievement;
  year: string;
  /** The mentoring organisation, or the hackathon's host. */
  org: string;
  /** One line on what they actually built. Specific beats impressive. */
  work: string;
  photo?: string;
  github?: string;
  /** Proof link: the project page, the merged work, the announcement. */
  url?: string;
  consented: boolean;
};

export const ACHIEVERS: Achiever[] = [
  // ---- Awaiting real entries ----------------------------------------------
  // Each needs a name, what they were selected for, year, org, one line of work,
  // and that member's consent to being published.
];

/**
 * Development scaffold. The achievers section is a card grid whose alignment and
 * density can only be judged against a realistic number of entries — it was
 * designed once against three and fell apart at fourteen.
 *
 * Deliberately implausible names and organisations, so no screenshot can be
 * mistaken for a real claim, and gated on NODE_ENV so a production build cannot
 * ship them even by accident.
 */
const ACHIEVERS_SCAFFOLD: Achiever[] = [
  { name: "Placeholder One", achievement: { kind: "programme", programme: "GSOC" }, year: "2026", org: "Example Foundation", work: "Replace with what this member actually built, in one specific sentence.", consented: true },
  { name: "Placeholder Two", achievement: { kind: "programme", programme: "LFX" }, year: "2025", org: "Example Foundation", work: "Replace with what this member actually built, in one specific sentence.", consented: true },
  { name: "Placeholder Three", achievement: { kind: "programme", programme: "C4GT" }, year: "2026", org: "Example Foundation", work: "Replace with what this member actually built, in one specific sentence.", consented: true },
  { name: "Placeholder Four", achievement: { kind: "programme", programme: "SOB" }, year: "2025", org: "Example Foundation", work: "Replace with what this member actually built, in one specific sentence.", consented: true },
  { name: "Placeholder Five", achievement: { kind: "programme", programme: "OUTREACHY" }, year: "2026", org: "Example Foundation", work: "Replace with what this member actually built, in one specific sentence.", consented: true },
  { name: "Placeholder Six", achievement: { kind: "hackathon", event: "Example Hackathon" }, year: "2025", org: "Example Host", work: "Replace with what they built and what place they took.", consented: true },
  { name: "Placeholder Seven", achievement: { kind: "programme", programme: "GSOC" }, year: "2025", org: "Example Foundation", work: "Replace with what this member actually built, in one specific sentence.", consented: true },
  { name: "Placeholder Eight", achievement: { kind: "programme", programme: "GSSOC" }, year: "2025", org: "Example Foundation", work: "Replace with what this member actually built, in one specific sentence.", consented: true },
  { name: "Placeholder Nine", achievement: { kind: "hackathon", event: "Example Hackathon" }, year: "2026", org: "Example Host", work: "Replace with what they built and what place they took.", consented: true },
  { name: "Placeholder Ten", achievement: { kind: "programme", programme: "LFX" }, year: "2026", org: "Example Foundation", work: "Replace with what this member actually built, in one specific sentence.", consented: true },
];

export function publishedAchievers(): Achiever[] {
  const real = ACHIEVERS.filter((a) => a.consented);
  if (real.length > 0) return real;
  return process.env.NODE_ENV === "production" ? [] : ACHIEVERS_SCAFFOLD;
}

/**
 * Everyone from the club selected into a given programme.
 *
 * DERIVED, and the Programs page renders it directly — so "who from our club has done
 * this" can never disagree with the Hall of Fame. The alternative was a `whoDidIt`
 * field on each programme, which is the same fact written twice and therefore a fact
 * that goes stale the first time somebody adds an achiever and forgets the other file.
 */
export function achieversFor(programme: Programme): Achiever[] {
  return publishedAchievers().filter(
    (a) => a.achievement.kind === "programme" && a.achievement.programme === programme,
  );
}

/**
 * How many people the club can actually name, deduplicated across every list.
 *
 * A person appearing as core team AND as a GSoC achiever AND as an upstream
 * contributor is ONE member, and counting them three times is the easiest possible
 * way to inflate a headline figure by accident. Upstream contributors are passed in
 * rather than imported, so this module does not have to depend on projects.ts.
 */
export function memberCount(extraNames: string[] = []): number {
  const names = new Set<string>();
  for (const m of publishedCore()) names.add(m.name.trim().toLowerCase());
  for (const a of publishedAlumni()) names.add(a.name.trim().toLowerCase());
  for (const a of publishedAchievers()) names.add(a.name.trim().toLowerCase());
  for (const n of extraNames) names.add(n.trim().toLowerCase());
  return names.size;
}

/** Counts, derived so a headline can never drift from the list beneath it. */
export function achieverStats() {
  const live = publishedAchievers();
  const byProgramme = new Map<Programme, number>();
  for (const a of live) {
    if (a.achievement.kind !== "programme") continue;
    const p = a.achievement.programme;
    byProgramme.set(p, (byProgramme.get(p) ?? 0) + 1);
  }
  return {
    total: live.length,
    gsoc: byProgramme.get("GSOC") ?? 0,
    programmes: [...byProgramme.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([programme, count]) => ({ programme, count })),
    hackathons: live.filter((a) => a.achievement.kind === "hackathon").length,
    orgs: new Set(live.map((a) => a.org)).size,
  };
}

// ---------------------------------------------------------------------------
// 4. GLOBAL REPRESENTATION.
//
// A LOGO WALL RENDERED AS TYPE, not as images, for the same two reasons the
// projects page gives: these marks are other organisations' trademarks, and the
// site's Content-Security-Policy allows `img-src 'self' data:` only, so a remote
// logo would be blocked and render broken.
//
// A MAP WAS CONSIDERED AND REJECTED. A world map with dots on it is the obvious
// visual, and it would be the least honest thing on the site: a handful of
// contributions renders as a nearly empty globe, which understates the work, and
// the moment you scale the dots to look respectable you are drawing a picture of
// data you do not have. A named list of organisations with a link each is smaller,
// duller, and checkable.
//
// `relation` is the load-bearing field. "Contributed to" and "works at" are very
// different claims and collapsing them into one wall of names would be the exact
// kind of quiet inflation this file exists to prevent.

export type Org = {
  name: string;
  /** Where the reader can go and check. */
  url: string;
  relation: "contributed" | "employs" | "mentored";
  /** Country or region, for the "how far does this reach" reading. */
  region?: string;
  /** Which member, so the claim is attributable rather than institutional. */
  via?: string;
  published: boolean;
};

export const ORGS: Org[] = [
  {
    name: "OWASP",
    url: "https://owasp.org/",
    relation: "contributed",
    region: "Global (US-based foundation)",
    via: "Prateek Singh",
    published: true,
  },
  // ---- Awaiting real entries ----------------------------------------------
  // One per organisation, with the relation stated accurately and a member named.
];

export function publishedOrgs(): Org[] {
  return ORGS.filter((o) => o.published);
}

export const RELATION_LABEL: Record<Org["relation"], string> = {
  contributed: "Code merged upstream",
  employs: "Alumni working there",
  mentored: "Mentored one of our members",
};
