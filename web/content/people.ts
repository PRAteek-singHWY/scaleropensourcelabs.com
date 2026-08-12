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
// 1b. THE TEAM, AS AN ORG CHART — who actually runs the club.
//
// Sits beside CORE_TEAM rather than replacing it, and the split is the same one this
// file makes everywhere else: the two answer different questions. A CoreMember entry
// says what one person OWNS and how to contact them, with their consent and usually
// their face. This list says what the club's STRUCTURE is — which offices exist, who
// holds them, and who is being trained to take each one over. Rendered by
// components/Team.tsx on the Hall of Fame page.
//
// It is also distinct from an achiever's entry, and that distinction is load-bearing.
// An achiever's entry is justified by a public artifact: a merged patch, an official
// selection record. A team entry is justified by nothing except holding the office,
// so it claims nothing except the office. No "passionate about", no "shipped X" —
// that belongs in a list with a link to prove it.
//
// There is no `consented` field here, and that is deliberate rather than an
// oversight: holding an office is the club's own structure to state, which is the one
// thing a club can legitimately assert about itself without a third party. A PHOTO is
// still the person's to give — see public/people/README.md — so `photo` stays
// optional and Portrait draws a monogram when it is absent.
//
// Three tiers, because the club genuinely has three: the two officers, the four
// functional leads, and the shadows. A shadow is an understudy attached to one
// specific role who is being trained to take it over at handover — which is the only
// reason a student club survives its founders graduating, and therefore worth showing
// on the chart rather than hiding in a handbook.
//
// `shadowOf` holds the DESIGNATION, not the person. Roles outlast the people in them:
// when a Vice President hands over, the shadow relationship should not need
// re-pointing at a new name. Team.tsx resolves it against the tier above and
// positions the card in that role's column, so a typo here surfaces as a missing
// connector rather than a silently wrong one.

export type TeamMember = {
  name: string;
  /** The office, not a description of the person. Rendered above the name. */
  designation: string;
  /** Square crop — the frame is a circle. See public/people/README.md. */
  photo?: string;
  github?: string;
  /** Designation of the role this person shadows. Shadows only. */
  shadowOf?: string;
};

/** Tier 1. The two officers. */
export const TEAM_OFFICERS: TeamMember[] = [
  { name: "Abhinav Jha", designation: "President" },
  { name: "Rushab Mistry", designation: "Vice President" },
];

/** Tier 2. Functional leads. Order is left-to-right on the chart, not a ranking. */
export const TEAM_LEADS: TeamMember[] = [
  { name: "Mehul Agarwal", designation: "Training Head" },
  { name: "Prateek Singh", designation: "Mentorship Lead" },
  { name: "Bhumi N Deshpande", designation: "Repo Maintainer" },
  { name: "Kunal Saini", designation: "Events Lead" },
];

/** Tier 3. Each one attaches to exactly one role in a tier above. */
export const TEAM_SHADOWS: TeamMember[] = [
  { name: "Arnav Singh", designation: "Shadow", shadowOf: "Training Head" },
  { name: "Yash Virulkar", designation: "Shadow", shadowOf: "Vice President" },
];

/** Everyone on the chart, in chart order. */
export function teamRoster(): TeamMember[] {
  return [...TEAM_OFFICERS, ...TEAM_LEADS, ...TEAM_SHADOWS];
}

export function teamSize(): number {
  return teamRoster().length;
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
  /** The PROGRAMME year — which edition selected them. Not their year of study. */
  year: string;
  /** Year of study at the time of selection, e.g. "3rd year". */
  studyYear?: string;
  /**
   * The mentoring organisation, or the hackathon's host.
   *
   * Optional, and that is a concession to how the list actually gets filled in:
   * the names arrive first, from someone who knows the cohort, and the org and the
   * proof link get chased down per person afterwards. Requiring it up front would
   * mean inventing one, and an invented org on this page is exactly the kind of
   * unverifiable claim this file's opening rule exists to keep out. A missing org
   * renders as nothing; a wrong one renders as a lie.
   */
  org?: string;
  /** One line on what they actually built. Specific beats impressive. Optional for
      the same reason as `org`. */
  work?: string;
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
 * The staging list, rendered in local development only.
 *
 * This USED to be pure invention — "Placeholder One" at "Example Foundation" — and
 * the fifteen GSoC entries below are no longer that. They are real students, named
 * by the club, and the rest of the list is still placeholder padding so the grid can
 * be laid out against a full five rows.
 *
 * That mix is why the NODE_ENV gate matters more now, not less. It used to stop a
 * production build shipping obvious nonsense; now it stops it shipping fifteen real
 * people's names before two things exist for each of them:
 *
 *   1. That student's explicit consent to being named on a public page. See the
 *      consent rule at the top of this file — it is not satisfied by someone else
 *      supplying the list, however well they know the cohort.
 *   2. A URL that proves the selection. The whole page argues "somebody else picked
 *      them, go and check"; an unlinked name is the one claim on this site a reader
 *      cannot verify.
 *
 * PROMOTING AN ENTRY: move it out of here and into ACHIEVERS above, with `org`, a
 * one-line `work`, a proof `url`, and `consented: true`. The moment ACHIEVERS has a
 * single entry, publishedAchievers() switches to it wholesale and this entire list
 * stops rendering — so promote the cohort together, not one at a time, or the page
 * will show one card where it used to show twenty-five.
 *
 * Grouped, not interleaved: GSoC runs first, then LFX, then C4GT, then SoB. That is
 * the order the grid reads in anyway, and it puts the heaviest programme where the
 * eye lands first. Twenty-five entries is exactly five rows of five in the grid, so
 * the layout gets reviewed against full rows rather than a ragged tail.
 */

/* The 2026 GSoC cohort, as supplied by the club. `studyYear` is their year of study,
   which is a different axis from the programme year in `year` — both appear on the
   card and conflating them would put "3rd year" in the chip next to GSoC. */
const GSOC_2026: [name: string, studyYear: string][] = [
  ["Prateek Singh", "3rd year"],
  ["Ojas Maheshwari", "3rd year"],
  ["Parth Dagia", "3rd year"],
  ["Raj Prakash", "3rd year"],
  ["Shubham Kumar", "3rd year"],
  ["Shiva Gupta", "3rd year"],
  ["Kartik Jangid", "3rd year"],
  ["Vivek Singh Solanki", "3rd year"],
  ["Ujjawal Prabhat", "3rd year"],
  ["Piyush Goenka", "3rd year"],
  ["Kartik Deshpande", "3rd year"],
  ["Amrinder Singh", "3rd year"],
  ["Vansh Dobhal", "3rd year"],
  ["Kumar Amityush", "2nd year"],
];

const GSOC_2025: [name: string, studyYear: string][] = [
  ["Sauhard Gupta", "3rd year"],
];

/* Padding for the programmes with no names supplied yet. Deliberately implausible,
   so a screenshot can never be mistaken for a claim — which is the property the GSoC
   entries above have now lost, and the reason the gate below is load-bearing.

   The counts hold the total at twenty-five: fifteen real GSoC entries plus five LFX,
   three C4GT and two SoB. SoB dropped from three to two when the GSoC cohort came in
   at fifteen rather than fourteen, purely to keep the grid at five clean rows. */
const PLACEHOLDER_MIX: { programme: Programme; count: number }[] = [
  { programme: "LFX", count: 5 },
  { programme: "C4GT", count: 3 },
  { programme: "SOB", count: 2 },
];

/* Spelled out rather than numbered. "Placeholder 07" reads like a real identifier
   at a glance; "Placeholder Seven" cannot be mistaken for one. */
const PLACEHOLDER_ORDINALS = [
  "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
];

const ACHIEVERS_SCAFFOLD: Achiever[] = [
  ...GSOC_2026.map(([name, studyYear]): Achiever => ({
    name,
    achievement: { kind: "programme", programme: "GSOC" },
    year: "2026",
    studyYear,
    consented: true,
  })),
  ...GSOC_2025.map(([name, studyYear]): Achiever => ({
    name,
    achievement: { kind: "programme", programme: "GSOC" },
    year: "2025",
    studyYear,
    consented: true,
  })),
  ...PLACEHOLDER_MIX.flatMap(({ programme, count }) =>
    Array.from({ length: count }, () => programme),
  ).map((programme, i): Achiever => ({
    // Falls back to the index if the mix ever outgrows the ordinal list, so a bumped
    // count degrades to an ugly name rather than `Placeholder undefined`.
    name: `Placeholder ${PLACEHOLDER_ORDINALS[i] ?? i + 1}`,
    achievement: { kind: "programme", programme },
    // Alternating, so the year column has something to actually sort.
    year: i % 2 === 0 ? "2026" : "2025",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  })),
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
 *
 * The org chart is counted too, and the dedup is doing real work there rather than
 * being defensive: a lead who is also in the GSoC cohort — which is currently true of
 * one of them — is named twice on the site and is still one member.
 */
export function memberCount(extraNames: string[] = []): number {
  const names = new Set<string>();
  for (const m of publishedCore()) names.add(m.name.trim().toLowerCase());
  for (const m of teamRoster()) names.add(m.name.trim().toLowerCase());
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
    // Compacted before counting, because `org` is optional now. Mapping it straight
    // into a Set puts one `undefined` in there and reports "1 org" for a cohort whose
    // organisations are, accurately, not recorded yet.
    orgs: new Set(live.flatMap((a) => (a.org ? [a.org] : []))).size,
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
