// PROGRAMS — the product line.
//
// The site's job here is not to show that members got selected; it is to explain
// what these programmes ARE to someone who has never heard of them, and what they
// pay. Most students never apply because nobody told them the thing exists, pays
// real money, and takes applicants with almost no track record.
//
// ---------------------------------------------------------------------------
// WHY THERE IS NO LONGER A COLOUR PER PROGRAMME
//
// There used to be. Each programme carried its own hue, used for the roster dots
// and the programme headings, and club.ts carried a comment stating the set had
// been validated as a categorical palette. When the seventh programme was added,
// that claim was finally turned into a script — scripts/palette.mjs — and the
// existing five-colour set failed:
//
//   light theme, protanopia:  GSoC #1148D0 vs Outreachy #6B3FBF  =  dE 2.6
//   dark theme,  protanopia:  GSoC #4A86E8 vs Outreachy #8B6DE8  =  dE 5.9
//   light theme, normal:      the same pair                      =  dE 10.7
//
// The floor for a categorical set is 15 normal / 6 CVD. Blue and violet are
// adjacent hues, and under protanopia they are effectively one colour — which is
// the exact failure the old comment described itself as having avoided when it
// moved LFX from violet to magenta. Outreachy was added later, in violet, and
// walked straight back into it. Nobody noticed because no Outreachy selection has
// ever rendered.
//
// I then tried to establish how many hues WOULD fit, and that search is not in the
// repo because it could not be trusted. A greedy max-min search under these exact
// constraints returned twenty "passing" colours — #002d00, #3c003c, #693c69 — all
// near-black. dE2000 counts lightness, so inside a 42-point L* band the search
// happily separates swatches by darkness rather than by hue and reports success.
// The constraint set permits it; a reader would see mud. So the honest position is
// the measurement above and nothing more: the set we ship fails, and no claim is
// made here about what the maximum is.
//
// So colour now encodes the ONE distinction that actually changes a reader's
// decision — whether the programme pays and selects, or is open to walk into —
// and identity is carried typographically by the programme's name, which is what
// the site was already doing for trademark reasons. Two categories are trivially
// separable, by lightness as well as hue, and the system now scales to any number
// of programmes. Run `node scripts/palette.mjs` to re-check it.
//
// ---------------------------------------------------------------------------
// NO PROGRAMME LOGOS, anywhere. We render the programme NAME as type, never the
// official GSoC / Linux Foundation / Outreachy / DigitalOcean mark. Those are
// trademarks belonging to other organisations and putting them on a club site
// implies an endorsement nobody granted.
//
// STIPENDS are written as "published by the programme" rather than quoted as our
// own figures. They change year to year and we are not the source. A stale number
// on a page whose entire claim is accuracy costs more than it buys.

export type Programme =
  | "GSOC"
  | "LFX"
  | "OUTREACHY"
  | "C4GT"
  | "SOB"
  | "GSSOC"
  | "HACKTOBERFEST";

/**
 * `paid` — somebody else runs a selection process, and if they pick you, you are
 *   paid. This is the tier that is worth something to a recruiter precisely
 *   because you did not award it to yourself.
 * `open` — no selection. You participate by turning up and contributing. Real
 *   value for a first contribution, no signal value as a credential.
 *
 * The distinction is the most useful thing on the page for a first-year, because
 * the honest answer to "which of these can I do right now" is: the open ones,
 * today, and the paid ones after a few months of the open ones.
 */
export type Tier = "paid" | "open";

/** Full names, since the acronyms mean nothing to a general reader. */
export const PROGRAMME_NAME: Record<Programme, string> = {
  GSOC: "Google Summer of Code",
  LFX: "LFX Mentorship",
  OUTREACHY: "Outreachy",
  C4GT: "Code for GovTech",
  SOB: "Summer of Bitcoin",
  GSSOC: "GirlScript Summer of Code",
  HACKTOBERFEST: "Hacktoberfest",
};

export const PROGRAMME_SHORT: Record<Programme, string> = {
  GSOC: "GSoC",
  LFX: "LFX",
  OUTREACHY: "Outreachy",
  C4GT: "C4GT",
  SOB: "SoB",
  GSSOC: "GSSoC",
  HACKTOBERFEST: "Hacktoberfest",
};

export type ProgrammeInfo = {
  key: Programme;
  tier: Tier;
  /** Two lines, no more. What it is, in the reader's terms. */
  what: string;
  who: string;
  /** Rough shape of the year. No exact dates — they move annually. */
  timeline: string;
  /** Stipend or perk. Never our own figure. */
  pays: string;
  /** The concrete thing to do to start preparing. Not "get involved". */
  startPreparing: string;
  url: string;
};

export const PROGRAMMES: ProgrammeInfo[] = [
  {
    key: "GSOC",
    tier: "paid",
    what:
      "Google pays you to write code for one open-source organisation over a summer, with a mentor from that organisation assigned to you. It is the most widely recognised thing on this page.",
    who:
      "Anyone 18 or over who is new to the organisation. You do not need to be a student — that requirement was dropped in 2022 — and you do not need existing open-source experience.",
    timeline:
      "Organisations announced around February, proposals due a few weeks later, coding across the summer. Project sizes are roughly 90, 175 or 350 hours.",
    pays:
      "A stipend set by Google, scaled by country and project size. Check the current figure on the programme site.",
    startPreparing:
      "Pick two organisations from last year's list and get one small patch merged in each, now. Selection goes to people the maintainers already recognise — a good proposal in March cannot make up for a username nobody has seen.",
    url: "https://summerofcode.withgoogle.com/",
  },
  {
    key: "LFX",
    tier: "paid",
    what:
      "The Linux Foundation's mentorship programme, running across CNCF, Kubernetes, Node.js, PyTorch and the rest of its projects. Kubernetes-adjacent work on your GitHub is worth a lot in India's job market.",
    who:
      "Beginners are explicitly the target audience, and terms run several times a year — so missing one costs a few months rather than a whole year.",
    timeline:
      "Three terms annually, starting roughly March, June and September. There is almost always one open or about to open.",
    pays: "A stipend published by the Linux Foundation, scaled by region.",
    startPreparing:
      "Read the project list for the next term and pick one whose language you already write. Then get a single documentation or test fix merged before applications close, so your name is in the repo when they read your application.",
    url: "https://lfx.linuxfoundation.org/tools/mentorship/",
  },
  {
    key: "OUTREACHY",
    tier: "paid",
    what:
      "Paid, fully remote internships in open source, run specifically for people subject to systemic bias or underrepresentation in tech in their country. The application itself involves a contribution period, so you are doing real work before you are selected.",
    who:
      "Anyone eligible under Outreachy's own criteria, which are published in full and worth reading properly rather than guessing at. No degree required.",
    timeline:
      "Two cohorts a year. Initial application, then a contribution period of several weeks, then the internship — December to March, or May to August.",
    pays:
      "A stipend published by Outreachy, the same for every intern regardless of country, plus a travel allowance.",
    startPreparing:
      "Check the eligibility rules first, because they are specific and the answer decides everything else. Then, when the round opens, treat the contribution period as the actual application — it is.",
    url: "https://www.outreachy.org/",
  },
  {
    key: "C4GT",
    tier: "paid",
    what:
      "Code for GovTech: open-source contribution to digital public infrastructure, meaning the software Indian government services actually run on. Your code ends up in something used at national scale.",
    who:
      "Indian students, with a strong bias toward people who want their work used rather than starred.",
    timeline:
      "An annual summer cohort announced early in the year, plus year-round contribution windows.",
    pays: "A stipend published by the programme.",
    startPreparing:
      "Pick one DPI project and read its codebase properly — these are built for scale rather than for demos, which is a genuinely different reading exercise and the thing most applicants have never done.",
    url: "https://www.codeforgovtech.in/",
  },
  {
    key: "SOB",
    tier: "paid",
    what:
      "Summer of Bitcoin: a paid summer programme contributing to Bitcoin and Lightning open-source projects. Deep C++ and cryptography, and the hardest technical entry on this page.",
    who:
      "Students, with a real onboarding ramp for people who have never touched the codebase. The C++ is intimidating and the community knows it.",
    timeline:
      "Applications early in the year, a multi-week bootcamp, then coding over the summer.",
    pays: "A stipend published by the programme.",
    startPreparing:
      "Start the published onboarding curriculum. Almost nobody finishes it alone, which is most of the reason to do it inside a club rather than in your room.",
    url: "https://www.summerofbitcoin.org/",
  },
  {
    key: "GSSOC",
    tier: "open",
    what:
      "GirlScript Summer of Code: a three-month Indian open-source programme with assigned mentors and a points leaderboard. Beginner-focused by design, and much easier to get into than anything above.",
    who:
      "Open to beginners, including first-years with no merged work at all. This is usually the first name on this page that somebody can actually act on today.",
    timeline: "Registrations around the start of the edition, then roughly three months of contribution.",
    pays:
      "No stipend. Certificates, swag and a leaderboard — plus mentors, which is the part that is actually worth having.",
    startPreparing:
      "Nothing to prepare. Register when it opens and pick a project in a language you can already run. Use it to learn the mechanics — fork, branch, PR, review, merge — so that the paid programmes above are not also your first time using Git in anger.",
    url: "https://gssoc.girlscript.tech/",
  },
  {
    key: "HACKTOBERFEST",
    tier: "open",
    what:
      "A month-long event every October: get a handful of pull requests merged into participating repositories and you get swag. No selection, no application, no stipend.",
    who:
      "Anyone. This is the lowest possible barrier in open source, and the single best week of the year to make a first contribution because half the internet is reviewing PRs at once.",
    timeline: "October, every year. Registration opens in late September.",
    pays: "Swag, or a tree planted in your name. That is the whole reward.",
    startPreparing:
      "Have one project picked and built on your machine before 1 October, so you spend the month contributing rather than setting up. Come to a build day in September and we will do it with you.",
    url: "https://hacktoberfest.com/",
  },
];

/**
 * The honest caveat about Hacktoberfest, kept next to it rather than buried.
 *
 * This is on the page because the club's position is not "do all of these". In
 * 2020 Hacktoberfest's reward structure produced enough junk pull requests that
 * maintainers publicly asked people to stop, and the programme changed its rules
 * in response. Recommending it without saying so would be the kind of omission
 * this site exists not to make — and a maintainer reading this page would spot it
 * instantly.
 */
export const HACKTOBERFEST_CAVEAT =
  "One warning, because we would rather say it than have a maintainer say it to you: the point is not four merged PRs. Hacktoberfest earned a bad reputation from people opening whitespace changes to farm swag, and maintainers still remember. Fix something that was actually broken, or do not open the PR.";

export const PAID = PROGRAMMES.filter((p) => p.tier === "paid");
export const OPEN_ENTRY = PROGRAMMES.filter((p) => p.tier === "open");

// ---------------------------------------------------------------------------
// THE REVERSE CLOCK — the only honest urgency device this club owns.
//
// Not a logistics footer, and not a countdown timer. The argument is arithmetic:
// organisations select contributors who already have months of commits in their
// repo, so an application written the week it opens is competing against people
// who started in autumn. "I'll do it next year" is not a delay, it is a skipped
// cycle. That is unanswerable and it needs no ticking clock.
//
// Deliberately no exact dates — they move every year.

export type CalendarRow = {
  programme: Programme;
  window: string;
  opens: string;
  /** When the work that actually gets you selected happens. */
  prepFrom: string;
  doingNow: string;
};

export const CALENDAR: CalendarRow[] = [
  {
    programme: "HACKTOBERFEST",
    window: "October",
    opens: "Registration late September",
    prepFrom: "September",
    doingNow:
      "Have a repo cloned and building before the month starts. This is the cheapest first contribution in the year.",
  },
  {
    programme: "GSSOC",
    window: "Varies by edition",
    opens: "Registration announced ahead of each edition",
    prepFrom: "A few weeks before",
    doingNow:
      "Nothing. Register, pick a project you can run, and use it to learn the mechanics before the paid programmes.",
  },
  {
    programme: "GSOC",
    window: "Feb – Aug",
    opens: "Organisations announced around February, proposals a few weeks later",
    prepFrom: "September – December",
    doingNow:
      "Pick two organisations and get one small patch merged in each. By the time proposals open, the maintainers reviewing yours should already recognise your username.",
  },
  {
    programme: "LFX",
    window: "Rolling, three terms",
    opens: "Terms start around March, June and September",
    prepFrom: "6 – 8 weeks before a term",
    doingNow:
      "The most forgiving entry point, because a miss costs months rather than a year. Choose the term matching what you already know instead of waiting for the perfect project.",
  },
  {
    programme: "OUTREACHY",
    window: "Two cohorts a year",
    opens: "Initial application, then a multi-week contribution period",
    prepFrom: "Before the round opens",
    doingNow:
      "Read the eligibility criteria properly — they decide everything else. Then treat the contribution period as the application, because it is.",
  },
  {
    programme: "C4GT",
    window: "Feb – Jun",
    opens: "Cohort announced early in the year",
    prepFrom: "November – January",
    doingNow:
      "Read one digital public infrastructure codebase properly. Built for national scale rather than for demos, which is a different reading exercise.",
  },
  {
    programme: "SOB",
    window: "Jan – Aug",
    opens: "Applications early in the year, then a multi-week bootcamp",
    prepFrom: "October – December",
    doingNow:
      "Start the onboarding curriculum. Almost nobody finishes it alone, which is most of the reason to do it inside a club.",
  },
];
