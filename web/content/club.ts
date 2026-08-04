// The single source of content for the site.
//
// With the GitHub data engine removed, every figure on this site is a literal in
// this file. That has one hard consequence: nothing here may be aspirational.
// A site whose whole argument is "our claims are verifiable" cannot carry numbers
// nobody checked — an international audience includes maintainers who will click
// the link.
//
// So the rule for this file is: if you cannot open a URL that proves it, it does
// not go in. Everything below is either verified or explicitly marked as awaiting
// real content.

export type Project = {
  /** "owner/repo" as it appears on GitHub. */
  repo: string;
  url: string;
  /** What the upstream project actually is, in the reader's terms. */
  what: string;
  /** What our member did there. Specific, not "contributed to". */
  did: string;
  /** Who did it. */
  member: string;
  memberUrl?: string;
  /** Optional hard proof: a rank, a count. Only when verified. */
  proof?: { label: string; value: string };
  language?: string;
  /**
   * Card state tag. "security" claims the site's single signal colour, so it is
   * reserved for coordinated-disclosure work rather than applied for emphasis.
   */
  tag?: { label: string; tone: "merged" | "security" | "neutral" };
  /** Set false for entries still being written, so they don't render. */
  published: boolean;
};

/**
 * VERIFIED against the live GitHub API on 2026-07-29 via the contributors
 * endpoint and scoped search counts. These numbers were read from GitHub, not
 * estimated.
 */
export const PROJECTS: Project[] = [
  {
    repo: "OWASP/OpenCRE",
    url: "https://github.com/OWASP/OpenCRE",
    what:
      "OWASP's Common Requirement Enumeration — the open catalogue that maps security standards to each other.",
    did:
      "Second-highest contributor by commits on the default branch, out of forty. 74 pull requests opened, 46 merged.",
    member: "Prateek Singh",
    memberUrl: "https://github.com/PRAteek-singHWY",
    proof: { label: "Contributor rank", value: "#2 / 40" },
    language: "Python",
    tag: { label: "46 merged", tone: "merged" },
    published: true,
  },

  // ---- Awaiting real content ----------------------------------------------
  // Add one entry per member contribution, with a URL that proves it. Set
  // published: true only once the numbers have been checked against GitHub.
  // Delete this comment block when the list is real.
];

/**
 * Headline figures. Derived from PROJECTS rather than typed separately, so the
 * summary can never drift from the evidence underneath it.
 */
export function totals() {
  const live = PROJECTS.filter((p) => p.published);
  return {
    projects: live.length,
    members: new Set(live.map((p) => p.member)).size,
    ranked: live.filter((p) => p.proof).length,
  };
}

export type Track = {
  name: string;
  summary: string;
  detail: string;
  href?: string;
};

export const TRACKS: Track[] = [
  {
    name: "Mentored contribution",
    summary: "Where almost everyone starts.",
    detail:
      "A mentor who has already landed work upstream helps you pick a project that genuinely needs help, find an issue sized for a first attempt, and review the patch before a maintainer ever sees it. The goal is your second contribution — once you know a codebase, the next one is much faster.",
  },
  {
    name: "AI security",
    summary: "Higher difficulty. The work most likely to get you noticed.",
    detail:
      "Open-source AI tooling shipped fast and is now load-bearing. Members find real weaknesses — credentials committed into model configs, checkpoints that execute code on load, agent frameworks letting untrusted input reach a shell — and land the fix upstream through the project's own coordinated disclosure process.",
  },
  {
    name: "Club engineering",
    summary: "Software the club owns and runs.",
    detail:
      "This site is one of them, and it is open source. Working here is the lowest-friction way to get a first merged pull request, because the maintainer reviewing it is someone you can talk to in person.",
  },
];

/** Where a newcomer actually starts. Ordered, because it is a sequence. */
export const PATH: { step: string; body: string }[] = [
  {
    step: "Pick a project that needs help",
    body: "Not the most famous one. A project with open issues, a responsive maintainer, and a test suite that runs on your machine.",
  },
  {
    step: "Find an issue sized for a first attempt",
    body: "A failing edge case, a documentation gap, a small refactor. Unglamorous work gets merged; ambitious work gets stalled.",
  },
  {
    step: "Get it reviewed before you send it",
    body: "Your mentor reads the patch first, so the version a maintainer opens is already close to mergeable.",
  },
  {
    step: "Then do it again",
    body: "The first contribution is the hard one. Everything after it compounds, because you already know where things live.",
  },
];

export const LINKS = {
  github: "https://github.com/PRAteek-singHWY",
  security: "/security",
  email: "opensource@scaleropensourcelabs.com",
};

// ---------------------------------------------------------------------------
// SELECTIONS — the club's strongest claim.
//
// Getting students into GSoC, LFX Mentorship, C4GT and Summer of Bitcoin is the
// most internationally legible thing a college open-source club can show. These
// programmes are recognised on sight by exactly the audience this site is for, and
// unlike a self-reported metric they cannot be manufactured: somebody else ran a
// selection process and picked your member.
//
// Two rules, both non-negotiable.
//
// 1. CONSENT. Each entry publishes a real student's face and name to an
//    international audience. That needs their explicit permission, and `consented`
//    must be true or the entry does not render — the same rule the old dashboard
//    enforced in the database, applied here in the content file.
//
// 2. NO PROGRAMME LOGOS. We render the programme NAME as type, never the official
//    GSoC/Linux Foundation/C4GT mark. Those are trademarks belonging to other
//    organisations, and putting them on a club site implies an endorsement nobody
//    granted. Typographic treatment says the same thing and is ours to use.

export type Programme = "GSOC" | "LFX" | "C4GT" | "SOB" | "OUTREACHY";

/** Full names, since the acronyms mean nothing to a general reader. */
export const PROGRAMME_NAME: Record<Programme, string> = {
  GSOC: "Google Summer of Code",
  LFX: "LFX Mentorship",
  C4GT: "Code for GovTech",
  SOB: "Summer of Bitcoin",
  OUTREACHY: "Outreachy",
};

/**
 * Programme colours, used to tint each planet in the system.
 *
 * Validated as a categorical set against the #05070D surface with the dataviz
 * validator — lightness band, chroma floor, normal-vision separation and contrast
 * all pass. Adjacent-pair CVD separation lands at ΔE 6.5 under deuteranopia, which
 * is the floor band and legal ONLY with secondary encoding, so every planet also
 * carries its programme name as a direct label. Colour never carries identity
 * alone here.
 *
 * The obvious palette — Google blue for GSoC next to a violet for LFX — failed
 * badly: ΔE 2.5 under protanopia, effectively one colour for a red-green
 * colourblind viewer. Blue and violet are adjacent hues; magenta buys the
 * separation that violet cannot.
 */
/* Programme colours resolve through CSS custom properties rather than literals,
   because the same hue cannot serve both themes: the dark set was validated
   against #05070D and measures 3.22–3.83:1 on white, i.e. all four fail AA as
   the 11px text they are used for. The variables are defined per theme in
   globals.css. Anything drawn in the DOM must use this map so it follows the
   theme. */
export const PROGRAMME_COLOUR: Record<Programme, string> = {
  GSOC: "var(--prog-gsoc)",
  LFX: "var(--prog-lfx)",
  C4GT: "var(--prog-c4gt)",
  SOB: "var(--prog-sob)",
  OUTREACHY: "var(--prog-outreachy)",
};

/* WebGL cannot read custom properties — a shader uniform needs a real number. The
   solar system is inside .night in both themes, so it always wants the dark set,
   which is exactly what these are. Do not use these in the DOM. */
export const PROGRAMME_COLOUR_HEX: Record<Programme, string> = {
  GSOC: "#4A86E8",
  LFX: "#D64FA0",
  C4GT: "#1F9D6B",
  SOB: "#B8871F",
  OUTREACHY: "#8B6DE8",
};

export const PROGRAMME_SHORT: Record<Programme, string> = {
  GSOC: "GSoC",
  LFX: "LFX",
  C4GT: "C4GT",
  SOB: "SoB",
  OUTREACHY: "Outreachy",
};

export type Selection = {
  name: string;
  programme: Programme;
  year: string;
  /** The mentoring organisation that selected them. */
  org: string;
  /** One line on what they actually built. Specific beats impressive. */
  work: string;
  /** Path under /public/people. Falls back to a monogram when absent. */
  photo?: string;
  github?: string;
  /** Proof link: the project page, the merged work, the announcement. */
  url?: string;
  /** Must be true to render. See rule 1 above. */
  consented: boolean;
};

// Awaiting real entries. Each needs a name, programme, year, org, one line of
// work, and that member's consent to being published.
export const SELECTIONS: Selection[] = [];

/**
 * Scaffold for local development only.
 *
 * The hall is a scroll-driven, multi-station layout — it cannot be designed or
 * reviewed against an empty array, because the weave, the alternating sides and the
 * active-card transitions only exist once there are stations to fly past.
 *
 * These are deliberately NOT plausible: obvious placeholder names and organisations,
 * so nobody can mistake a screenshot for a real claim. And they are gated on
 * NODE_ENV, so a production build cannot ship them even by accident — the guard is
 * structural rather than a note asking someone to remember.
 */
const SCAFFOLD: Selection[] = [
  {
    name: "Placeholder One",
    programme: "GSOC",
    year: "2026",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Two",
    programme: "LFX",
    year: "2025",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Three",
    programme: "C4GT",
    year: "2026",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Four",
    programme: "SOB",
    year: "2025",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Five",
    programme: "GSOC",
    year: "2026",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Six",
    programme: "LFX",
    year: "2025",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Seven",
    programme: "GSOC",
    year: "2026",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Eight",
    programme: "C4GT",
    year: "2025",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Nine",
    programme: "SOB",
    year: "2026",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Ten",
    programme: "GSOC",
    year: "2025",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Eleven",
    programme: "LFX",
    year: "2026",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Twelve",
    programme: "C4GT",
    year: "2025",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Thirteen",
    programme: "GSOC",
    year: "2026",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
  {
    name: "Placeholder Fourteen",
    programme: "SOB",
    year: "2025",
    org: "Example Foundation",
    work: "Replace with what this member actually built, in one specific sentence.",
    consented: true,
  },
];

export function publishedSelections(): Selection[] {
  const real = SELECTIONS.filter((s) => s.consented);
  if (real.length > 0) return real;
  return process.env.NODE_ENV === "production" ? [] : SCAFFOLD;
}

/** Programme counts, derived so the headline can never drift from the list. */
export function selectionStats() {
  const live = publishedSelections();
  const byProgramme = new Map<Programme, number>();
  for (const s of live) {
    byProgramme.set(s.programme, (byProgramme.get(s.programme) ?? 0) + 1);
  }
  return {
    total: live.length,
    programmes: [...byProgramme.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([programme, count]) => ({ programme, count })),
    orgs: new Set(live.map((s) => s.org)).size,
  };
}

// ---------------------------------------------------------------------------
// WHAT THE CLUB LOOKS FOR.
//
// Added on the founder's suggestion, and it is the highest-value thing on the page
// after the selections themselves — because it removes the one belief that stops
// people applying: "I am not good enough at coding yet."
//
// The claim was already here, buried as FAQ item twelve ("Do I need to be good at
// DSA? No. Different skill."). Nobody reaching a decision reads to item twelve.
//
// Worded as what the club VALUES, not as a test it administers. Nothing else on
// this site claims a screening process — the form is an application, not an exam —
// so "we assess your reasoning" would be inventing a mechanic that does not exist.
// The distinction matters: one is a statement of what predicts success here, the
// other is a promise about a process nobody has designed.
//
// Both columns are concrete and checkable against a real first contribution. That
// is the test for anything in this list: if a line could sit on any club's page, it
// is too vague to be here.

export type LookingFor = { not: string; yes: string };

export const LOOKING_FOR: LookingFor[] = [
  {
    not: "A contest rating, or fluency in DSA",
    yes: "Reading code you did not write and working out what it does",
  },
  {
    not: "Knowing a particular framework already",
    yes: "Turning a vague problem into one small change you can defend",
  },
  {
    not: "Prior open-source experience, or any merged work",
    yes: "Following a review thread and understanding why a change was refused",
  },
  {
    not: "A tidy GitHub profile with a streak",
    yes: "Saying \"I do not understand this yet\" early instead of late",
  },
];

// ---------------------------------------------------------------------------
// PROGRAMMES — the product line.
//
// The site's job is not only to show that members got selected; it is to explain
// what these programmes ARE to someone who has never heard of them, and what they
// pay. Most students don't apply because nobody told them the thing exists, pays
// real money, and takes applicants with almost no track record.
//
// Stipends are deliberately written as "published by the programme" rather than
// quoted as our own figures. They change year to year and we are not the source.

export type ProgrammeInfo = {
  key: Programme;
  what: string;
  who: string;
  /** Rough shape of the year — not exact dates, which move annually. */
  when: string;
  pays: string;
  /** What OSC specifically does to get you in. This is the product. */
  weDo: string;
  url: string;
};

export const PROGRAMMES: ProgrammeInfo[] = [
  {
    key: "GSOC",
    what: "Google pays you to write code for an open-source organisation over a summer, with a mentor from that organisation assigned to you.",
    who: "Anyone 18+ who is new to the organisation. You do not need to be a student, and you do not need existing open-source experience.",
    when: "Organisations announced early in the year, applications a few weeks later, coding over the summer.",
    pays: "A stipend set by Google, varying by country and project size. Check the current figure on the programme site.",
    weDo: "We start six months early. Selection goes to people the maintainers already recognise, so the work is contributing steadily before applications open — not writing a good proposal in March.",
    url: "https://summerofcode.withgoogle.com/",
  },
  {
    key: "LFX",
    what: "The Linux Foundation's mentorship programme, running across CNCF, Kubernetes, Node.js and the rest of its projects.",
    who: "Beginners are explicitly the target. Terms run several times a year, so a miss is a few months rather than a year.",
    when: "Three terms annually, so there is almost always one open or opening.",
    pays: "A stipend published by the Linux Foundation, scaled by region.",
    weDo: "Help you pick a term and project that matches what you already know, and get a first contribution merged into that project before the application closes.",
    url: "https://lfx.linuxfoundation.org/tools/mentorship/",
  },
  {
    key: "C4GT",
    what: "Code for GovTech: open-source contribution to digital public infrastructure — the software Indian government services actually run on.",
    who: "Indian students, with a strong bias toward people who want their work used at national scale rather than starred on GitHub.",
    when: "An annual summer cohort plus year-round contribution windows.",
    pays: "A stipend published by the programme.",
    weDo: "Point you at the DPI projects with responsive maintainers, and help you read a codebase built for scale rather than for demos.",
    url: "https://www.codeforgovtech.in/",
  },
  {
    key: "SOB",
    what: "Summer of Bitcoin: a paid summer programme contributing to Bitcoin and Lightning open-source projects.",
    who: "Students, with a real ramp for people who have never touched the codebase. The C++ is intimidating and the community knows it.",
    when: "Applications early in the year, coding over the summer.",
    pays: "A stipend published by the programme.",
    weDo: "Work through the onboarding curriculum together, because almost nobody finishes it alone.",
    url: "https://www.summerofbitcoin.org/",
  },
];

// ---------------------------------------------------------------------------
// WHAT YOU ACTUALLY GET — the argument that outlasts the stipend.
//
// The stipend is the smallest part. A student who lands one of these ends up with
// a public track record, a named maintainer who knows their work, and a reference
// from outside their university. That is what turns into an internship.

export const OUTCOMES: { title: string; body: string }[] = [
  {
    title: "A maintainer who knows your name",
    body: "You spend a summer being reviewed by someone senior at a real project. They remember who ships. That relationship does not expire when the programme ends — it is the single most valuable thing here, and it is not the money.",
  },
  {
    title: "A public record an employer can read",
    body: "Merged pull requests in a project a company already depends on. Not a certificate, not a course completion — code they can open and read, with your name on the commit.",
  },
  {
    title: "A reference from outside your college",
    body: "Every student in your batch has the same professors. Almost none of them have someone at a foundation willing to vouch for their work.",
  },
  {
    title: "The people doing it with you",
    body: "The others in this club apply to the same programmes, review each other's patches, and share which maintainers actually reply. That network is why the second selection is easier than the first.",
  },
];

// ---------------------------------------------------------------------------
// HOW THE CLUB ACTUALLY RUNS.
//
// Written plainly and specifically. "Vibrant community" tells a reader nothing;
// coffee and Maggi at eleven at night tells them exactly what walking in is like.

export const CULTURE: { title: string; body: string }[] = [
  {
    title: "Discussions, not lectures",
    body: "Sessions are people arguing about a codebase with a laptop open, not slides. If you have a question halfway through, that is the session.",
  },
  {
    title: "Coffee and Maggi are on the club",
    body: "Working sessions run late and nobody codes well hungry. There is always chai, coffee and Maggi, and you do not have to ask.",
  },
  {
    title: "Work where you like",
    body: "Library, lab, hostel common room, or the campus spot everyone knows. We pick the location by what the group wants that week, not by what was booked.",
  },
  {
    title: "Nobody is behind",
    body: "People join knowing wildly different amounts. Sitting in on a session you only half follow is a completely normal way to start, and everyone here did it.",
  },
];

// ---------------------------------------------------------------------------
// POSITIONING against the other club a student is choosing between.
//
// EVERY NUMBER HERE IS VERIFIED AGAINST A PRIMARY SOURCE AND CARRIES ITS LINK.
// That is not fussiness — this section attacks a rival activity, so it is the
// first place a sceptical reader will go looking for an exaggeration. One
// unsupported figure here retroactively discredits every other claim on a site
// whose whole thesis is "you can check this".
//
// Two claims were CUT during research because they did not hold up:
//   * "only ~9 people per college make ICPC" — no rule or dataset produces 9.
//     The real numbers (3 by rule, ~5.6 in practice, 30 nationally) are both
//     true and more striking, so the invented figure bought nothing.
//   * "open source is an easier door than ICPC" — false. GSoC 2025 accepted
//     1,280 of 15,240 applicants, about 8.4%. Comparable brutality.
//
// So the argument is deliberately NOT "our thing is easier to win". It is that
// open source pays out below the top prize and competitive programming mostly
// does not. That is the floor, not the ceiling, and it is defensible.

export type Claim = {
  stat?: string;
  line: string;
  source?: { label: string; url: string };
};

export const POSITIONING: Claim[] = [
  {
    stat: "3",
    line: "Only one team from a given institution may advance to the ICPC World Finals. Three students, per college, per year. That is the rulebook, not our opinion.",
    source: {
      label: "ICPC Regional Rules",
      url: "https://icpc-iiitdm.vercel.app/onsite-rules.pdf",
    },
  },
  {
    stat: "30",
    line: "Ten Indian teams reached the 2025 World Finals in Baku. Thirty students, for the entire country. They earned every place. The door is simply that narrow by design.",
    source: { label: "ICPC 2025 standings", url: "https://cphof.org/standings/icpc/2025" },
  },
  {
    line: "There is no rule capping how many people from your college can get code merged into Kubernetes. Competitive programming is a sport with a fixed number of podium places. Open source is a backlog with an unbounded number of open issues.",
  },
  {
    stat: "8.4%",
    // 1,280 not 1,272. Google's May announcement said 1,272; the August final
    // statistics post — which is what we link — says 1,280. Citing one figure and
    // linking a source that states another is the exact failure this whole section
    // exists to avoid, so the number now matches the page it points at.
    line: "GSoC accepted 1,280 people from 15,240 applicants in 2025. This is not the soft option, and we will not pretend it is. The difference is what you are left holding if you do not get in — a rating graph, or commits with your name on them.",
    source: {
      label: "Google Open Source Blog",
      url: "https://opensource.googleblog.com/2025/08/google-summer-of-code-2025-contributor-statistics.html",
    },
  },
  {
    line: "ICPC eligibility runs out: five regional years, two World Finals, and you must still be enrolled. Your commit history has no eligibility clause, and GSoC dropped its student-only requirement in 2022.",
    source: {
      label: "GSoC eligibility change",
      url: "https://opensource.googleblog.com/2021/11/expanding-google-summer-of-code-in-2022.html",
    },
  },
  {
    line: "India now has the largest open-source contributor base in the world. American developers still contribute more per head. That gap is the entire reason this club exists.",
    source: {
      label: "GitHub Octoverse 2025",
      url: "https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/",
    },
  },
];

/**
 * What we are worse at.
 *
 * This is on the page on purpose. A comparison that lists only our advantages
 * reads as marketing and gets discounted wholesale; naming the real cost is what
 * makes the paragraph above believable. The DSA point goes first because it is
 * the single strongest honest argument for joining the CP club instead, and
 * burying it would be the tell.
 */
export const TRADE_OFFS: string[] = [
  "We will not prepare you for the DSA round. That is the filter on most campus placements, and the competitive programming club is straightforwardly better at it. Do both.",
  "Feedback is slow and depends on strangers. A pull request can sit for three weeks; a judge answers in thirty seconds. If a tight loop is what keeps you going, this is the harder room.",
  "There is no single number for your resume. Nothing sorts. A recruiter has to actually open your GitHub, and some will not.",
  "Getting started takes longer. Building the project, finding a tractable issue and reading enough code to be useful can take weeks. Your first submission on a judge takes ten minutes.",
  "If you are aiming at quant or high-frequency trading, contest standing is the recognised route and we are not a substitute for it.",
];

// ---------------------------------------------------------------------------
// MENTORS.
//
// A student mentor is not a professor, and a page that implies otherwise is
// detectable in one line. The programmes that handle peer mentorship credibly all
// redefine authority away from rank: Outreachy states mentor eligibility purely as
// hours committed, GSoC defines a mentor by duty rather than qualification, and
// Recurse Center establishes seniority by naming an artifact, attaching a number,
// and stopping.
//
// So each entry here is: a named artifact, a public link that proves it, an
// explicit boundary on what they are useful for, and a bounded availability. No
// adjectives describing the person. Recency and a checkable record are the honest
// basis of a senior's authority, and they are enough.
//
// On "lifelong mentors": the word never appears. Asserting duration spends it and
// proves nothing. Instead each entry can carry who mentored THEM — after two or
// three cohorts that lineage renders as a visible graph, which demonstrates the
// same thing and cannot be faked.

export type Mentor = {
  name: string;
  /** Present tense, no adjectives. "Final year, CSE." / "Graduated 2024. …" */
  situation: string;
  /** The credential: programme, year, org, and the official public archive link. */
  credential: { programme: Programme; year: string; org: string; url?: string };
  /** One sentence naming a subsystem, not a domain. Links the merged work. */
  shipped: string;
  shippedUrl?: string;
  /** The boundary of their authority. This is what makes the inside believable. */
  askAbout: string[];
  /** A stated commitment, not a disposition. Only publish what will hold. */
  around: string;
  github?: string;
  /** Who taught them. Needs BOTH people's consent — it discloses about both. */
  mentoredBy?: string;
  /** Publication consent, per person. No consent, no entry. */
  consented: boolean;
};

export const MENTORS: Mentor[] = [];

export function publishedMentors(): Mentor[] {
  return MENTORS.filter((m) => m.consented);
}

// ---------------------------------------------------------------------------
// THE CALENDAR — the only honest urgency device this club owns.
//
// Not a logistics footer. The argument is arithmetic: organisations select
// contributors who already have months of commits in their repo, so an
// application written the week it opens is competing against people who started
// in autumn. "I'll do it next year" is therefore not a delay, it is a skipped
// cycle. That is unanswerable and it needs no countdown timer.
//
// Deliberately no exact dates. They move every year, and a stale date on a page
// whose whole claim is accuracy costs more than it buys. Each row states the
// typical window and — the part that matters — what you should already be doing
// months before it opens.

export type CalendarRow = {
  window: string;
  programme: string;
  opens: string;
  /** The month range when the work that actually gets you selected happens. */
  prepFrom: string;
  doingNow: string;
};

export const CALENDAR: CalendarRow[] = [
  {
    window: "Jan – Apr",
    programme: "Google Summer of Code",
    opens: "Organisations announced late Feb, proposals due late Mar",
    prepFrom: "Sep – Dec",
    doingNow:
      "Pick two organisations and get one small patch merged in each. By the time proposals open, the maintainers reviewing yours should already recognise your username.",
  },
  {
    window: "Rolling, three terms",
    programme: "LFX Mentorship",
    opens: "Terms start around Mar, Jun and Sep",
    prepFrom: "6–8 weeks before a term",
    doingNow:
      "The most forgiving entry point, because a miss costs months rather than a year. Choose the term that matches what you already know instead of waiting for the perfect project.",
  },
  {
    window: "Feb – Jun",
    programme: "Code for GovTech",
    opens: "Cohort announced early in the year",
    prepFrom: "Nov – Jan",
    doingNow:
      "Read a digital public infrastructure codebase properly. These are built for national scale rather than for demos, and that is a different reading exercise.",
  },
  {
    window: "Jan – Aug",
    programme: "Summer of Bitcoin",
    opens: "Applications early in the year, then a multi-week bootcamp",
    prepFrom: "Oct – Dec",
    doingNow:
      "Start the onboarding curriculum. Almost nobody finishes it alone, which is most of the reason to do it inside a club.",
  },
];

// ---------------------------------------------------------------------------
// WHO THIS IS NOT FOR.
//
// An explicit filter immediately before the ask. Stating who should not join
// makes the invitation read as selective rather than desperate, and it saves
// everyone the wasted month — including us.

export const NOT_FOR: string[] = [
  "Anyone who wants a certificate. There isn't one. The output is a public commit history, which is worth more and photographs worse.",
  "Anyone optimising purely for the DSA round. Go to the competitive programming club — they are better at it — and come here as well if you have the hours.",
  "Anyone who wants to be told exactly what to do each week. You get a mentor and a direction, not a syllabus.",
  "Anyone counting pull requests. Chasing PR count is how Hacktoberfest became something maintainers publicly asked people to stop doing. We are not running that.",
];

// ---------------------------------------------------------------------------
// FAQ.
//
// Seven questions, no more. Every one is a real reason somebody decides not to
// join, and the Scaler-funnel question is the one that silently loses exactly the
// sceptical students most worth having.

export const FAQ: { q: string; a: string }[] = [
  {
    q: "Do I need to be good at DSA?",
    a: "No. Different skill. Reading an unfamiliar codebase, writing a small correct change and surviving review is what this needs, and none of it is competitive programming.",
  },
  {
    q: "How many hours a week?",
    a: "Four to six once you're going, and more in the weeks around an application deadline. During exams people go quiet and nobody minds — say so and pick it back up.",
  },
  {
    q: "Is this free?",
    a: "Yes, and there is nothing to upsell you. The coffee is on the club.",
  },
  {
    q: "Is this a Scaler product or a marketing funnel?",
    a: "It is a student club at Scaler School of Technology, run by students. Nothing here is a paid programme and nothing here sells you one.",
  },
  {
    q: "I'm in my final year — is it too late?",
    a: "For this year's GSoC cycle, most likely. For LFX Mentorship, no: terms run three times a year and GSoC dropped its student-only requirement in 2022, so graduating does not end your eligibility.",
  },
  {
    q: "What language or stack do I need?",
    a: "One you can already write and run. Projects exist in Python, Go, Rust, TypeScript, C++ and more; we pick the project around you rather than the other way round.",
  },
  {
    q: "What if my pull request gets rejected?",
    a: "It will, sometimes. Ours do — 46 of 74 merged on our largest project, which is a normal ratio and the reason we publish it rather than rounding it up.",
  },
];

// ---------------------------------------------------------------------------
// FOR FACULTY, SPONSORS AND MAINTAINERS.
//
// Two of this site's three audiences previously had no real estate at all. An
// anonymous club reads as vaporware to a faculty member and to a maintainer
// simultaneously, so this band exists to be concrete and contactable, and to make
// exactly one small, specific, fundable ask.

export const INSTITUTIONAL: { title: string; body: string }[] = [
  {
    title: "What we produce",
    body: "Public, attributable contributions to projects outside the university, plus students selected into internationally competitive mentorship programmes. Every claim on this site links to the upstream record.",
  },
  {
    title: "How we run",
    body: "Weekly working sessions, open to any student, no selection at the door. Mentors are seniors and alumni who have been through the same programmes.",
  },
  {
    title: "What we need",
    body: "A room with power and a projector, and a small budget for the domain and refreshments. Travel support for one conference would be transformative but is not the ask.",
  },
];
