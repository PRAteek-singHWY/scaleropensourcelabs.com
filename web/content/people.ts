// PEOPLE, minus the people club.ts already owns.
//
// This module is what survived a merge between two versions of the site that had
// both grown their own roster. The rule applied throughout was that club.ts wins
// on anything both files describe, so what is here is strictly the half it did
// not have:
//
//   ALUMNI  — where members went after graduating. club.ts has no equivalent; it
//             tracks the current club and the selections it produced, and says
//             nothing about what happens to somebody two years later. That is the
//             single most persuasive thing on the site for a parent, and it was
//             about to be lost in the merge.
//
//   ORGS    — the organisations the club has a relationship with, and what kind.
//             Rendered as the representation wall.
//
// NOT HERE, and deliberately: the core team (club.ts TEAM_OFFICERS / TEAM_LEADS /
// TEAM_SHADOWS, which carries the shadow structure this file's CORE_TEAM did not)
// and the achievers (club.ts SELECTIONS, which carries the real GSoC cohort and
// runs to twenty-five). Import those from club.ts.
//
// THE RULE FOR EVERY FILE IN THIS DIRECTORY still applies: if you cannot open a
// URL that proves it, it does not go in. `consented` on anything naming a real
// person; not true, not rendered.

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

// ---------------------------------------------------------------------------
// DERIVED COUNTS, spanning this file and club.ts.
//
// They live here rather than in club.ts because they are the only figures that
// need BOTH rosters — club.ts owns the current team and the selections, this file
// owns the alumni, and a member count that ignores either is wrong. Importing
// club.ts from here is safe in the direction it runs: club.ts imports nothing.

import {
  TEAM_OFFICERS,
  TEAM_LEADS,
  TEAM_SHADOWS,
  publishedSelections,
  type Programme,
} from "@/content/club";

/**
 * How many people this club can actually name, deduplicated.
 *
 * COUNTING THE LISTS SEPARATELY AND ADDING THEM IS THE BUG THIS EXISTS TO PREVENT.
 * One person is routinely on three of them — a lead who was selected into GSoC and
 * also has upstream commits — and summing the arrays turns them into three members.
 * That is how a club claims sixty people and has twenty in the room, and it is the
 * single easiest number on this site to inflate by accident rather than intent.
 *
 * Names are the join key, lowercased and trimmed, which is imperfect and is the
 * right trade here: two different students with the same name would undercount by
 * one, whereas any id-based scheme needs an id maintained by hand across four
 * arrays and silently overcounts the moment somebody forgets.
 *
 * `extraNames` is for contributors known only from a project entry — pass
 * `publishedUpstream().map(u => u.member)` — so they count once and only once.
 */
export function memberCount(extraNames: string[] = []): number {
  const names = new Set<string>();
  for (const m of [...TEAM_OFFICERS, ...TEAM_LEADS, ...TEAM_SHADOWS]) {
    names.add(m.name.trim().toLowerCase());
  }
  for (const a of publishedAlumni()) names.add(a.name.trim().toLowerCase());
  for (const s of publishedSelections()) names.add(s.name.trim().toLowerCase());
  for (const n of extraNames) names.add(n.trim().toLowerCase());
  return names.size;
}

/**
 * Programme counts, derived so a headline can never drift from the list beneath it.
 *
 * Reads club.ts's SELECTIONS rather than a list of its own. Both halves of the
 * merge that produced this site had an achievements array; club.ts's is the one
 * that carries the real GSoC cohort and runs to twenty-five, so this is a view
 * over that rather than a second copy to keep in step.
 */
export function achieverStats() {
  const live = publishedSelections();
  const byProgramme = new Map<Programme, number>();
  for (const s of live) {
    byProgramme.set(s.programme, (byProgramme.get(s.programme) ?? 0) + 1);
  }
  return {
    total: live.length,
    gsoc: byProgramme.get("GSOC") ?? 0,
    programmes: [...byProgramme.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([programme, count]) => ({ programme, count })),
    orgs: new Set(live.map((s) => s.org)).size,
  };
}

/**
 * The club's own selections into a given programme.
 *
 * Reads club.ts's SELECTIONS for the same reason achieverStats does — one list of
 * selections, viewed from several angles, rather than several lists to keep in
 * step. Used by the programmes page to answer "has anybody here actually done
 * this", which is the question that separates a list of opportunities from a
 * claim the club can support.
 */
export function achieversFor(programme: Programme) {
  return publishedSelections().filter((s) => s.programme === programme);
}
