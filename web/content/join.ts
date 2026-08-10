// HOW TO JOIN — four concrete entry paths, split by level.
//
// The reason there are four rather than one "join us" button: the single biggest
// reason people do not join a technical club is not lack of interest, it is not
// knowing which version of themselves the invitation is addressed to. A first-year
// who has never used Git and a third-year with merged PRs in a CNCF project both
// bounce off the same generic call to action, for opposite reasons.
//
// So each path states three things, and the third is the one most club pages skip:
//   WHO IT IS FOR      — an honest filter, so people self-select correctly
//   WEEK ONE           — literally what happens on the first day and the first week
//   WHAT YOU WALK AWAY WITH — the outcome, stated as an artefact, not a feeling
//
// "What you walk away with" is deliberately concrete and modest. "Confidence" is
// not an outcome; "your first merged pull request, and a repo you can build on your
// own machine" is one, and it is checkable a fortnight later.

export type Level = "beginner" | "intermediate";

export type Path = {
  /** Stable id. Used by the nav anchors and by the join form's preselect. */
  id: string;
  name: string;
  level: Level;
  /** The one-line pitch. */
  tagline: string;
  forWho: string;
  /** What the first day and first week actually look like. Specific. */
  weekOne: string[];
  /** The artefact you hold at the end. */
  walkAway: string;
  /** Anything they must bring. Kept honest and short. */
  bring?: string;
  /** An optional caveat or clarification about how this path actually runs. */
  note?: string;
};

export const PATHS: Path[] = [
  {
    id: "build-day",
    name: "Come to a hackathon or build day",
    level: "beginner",
    tagline: "No experience needed. You pair with a senior for the whole day.",
    forWho:
      "You have never contributed to open source and possibly never used Git for anything except pushing a college project. You are not sure you are good enough to be in the room. This path exists specifically for you, and it is how most of the club started.",
    weekOne: [
      "You turn up to a build day or one of our hackathons. Nothing to prepare, nothing to install beforehand — we will do the setup with you, because that is usually the part that defeats people alone.",
      "You get paired with somebody who has already landed work upstream. You sit next to them, not in an audience.",
      "Together you pick one open issue on a real project and read enough of the codebase to understand it. Reading is most of the work and nobody tells first-years that.",
      "By the end of the day you have a branch, a change, and a rough idea of why the change is correct. Whether it is merged that day does not matter.",
    ],
    walkAway:
      "A working local setup of a real project, one branch with a real change on it, and the name of a person you can message when you are stuck.",
    bring: "A laptop and a GitHub account. That is genuinely it.",
    /**
     * Hackathons are called out because the club runs them as an ON-RAMP rather than
     * as a competition, and that distinction is the reason this path works for
     * somebody who has never opened a pull request. A hackathon you are judged at is
     * a bad first experience of open source; a hackathon where you sit next to a
     * senior and land one small patch is the best one available.
     */
    note:
      "Our hackathons are not judged and nothing is ranked. They exist so that thirty people are stuck on the same setup problems in the same room, which is the fastest way past them.",
  },
  {
    id: "first-contribution",
    name: "First contribution sprint",
    level: "beginner",
    tagline: "A checklist, a club repo, and a reviewer who knows you are new.",
    forWho:
      "You want a merged pull request with your name on it and you would rather work through a list than improvise. Docs fixes, typos, failing edge cases and good-first-issues on the club's own repositories — starting on our repos because the person reviewing your PR is somebody you can find in person and ask.",
    weekOne: [
      "We give you the checklist: fork, clone, build, find an issue with the good-first-issue label, claim it in a comment so nobody duplicates your work.",
      "You make the change. Unglamorous is the point — a typo in the docs is a completely legitimate first contribution and always has been.",
      "Your mentor reviews it before a maintainer does, so the version that gets opened is already close to mergeable.",
      "You open the pull request. Then you find out that review comments are not criticism, which is the actual lesson of the week.",
    ],
    walkAway:
      "One merged pull request, a public commit under your name, and the whole mechanical loop — fork, branch, PR, review, merge — done once so it stops being frightening.",
    bring: "A laptop, a GitHub account, and about four hours across the week.",
  },
  {
    id: "fast-track",
    name: "Fast-track",
    level: "intermediate",
    tagline: "Already contributing somewhere? Show us the PRs and skip the ramp.",
    forWho:
      "You already have merged work in some project's repository, however small. There is no reason to put you through an introduction to Git. Send the links and you go straight onto a project team.",
    weekOne: [
      "Send us your merged pull requests. Not a resume — the PR links, so we can read the diffs and the review threads.",
      "We talk for twenty minutes about what you want to be working on and what you are avoiding.",
      "You join a project team directly, with a piece of work that is actually yours rather than a starter task.",
      "You start reviewing other people's patches in your first week, because that is the fastest way to learn a codebase and the club needs reviewers more than it needs contributors.",
    ],
    walkAway:
      "Ownership of a real piece of work, and a say in what the club builds. People on this path tend to end up maintaining something.",
  },
  {
    id: "program-track",
    name: "Program track",
    level: "intermediate",
    tagline: "The GSoC/LFX prep cohort, with mentors who have been through it.",
    forWho:
      "You are aiming at a paid programme — GSoC, LFX Mentorship, Outreachy — and you want to do it deliberately instead of writing a proposal the week it is due. Best joined six months before the application window, which for GSoC means starting in autumn.",
    weekOne: [
      "You pick two target organisations. Two, not one, because nobody reliably gets their first choice and the whole argument of this club is that these are competitive.",
      "You read both projects' contribution guides and build both codebases locally. This week is unglamorous on purpose.",
      "You find one small tractable issue in each and start on the first. The goal for the month is a merged patch in both, so the maintainers reading your application in March recognise your username.",
      "You join the weekly cohort session, where people read each other's proposals and say the blunt thing about them.",
    ],
    walkAway:
      "A months-long commit history in two organisations before applications open, a proposal that several people have already torn apart, and mentors who wrote a successful one recently.",
  },
];

export const LEVEL_LABEL: Record<Level, string> = {
  beginner: "Never contributed before",
  intermediate: "Some experience already",
};

// ---------------------------------------------------------------------------
// WHAT THE CLUB LOOKS FOR.
//
// This removes the one belief that stops people applying: "I am not good enough at
// coding yet." Worded as what the club VALUES, not as a test it administers —
// nothing on this site claims a screening process, the form is an application
// rather than an exam, so "we assess your reasoning" would invent a mechanic that
// does not exist.
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
    yes: 'Saying "I do not understand this yet" early instead of late',
  },
];

// ---------------------------------------------------------------------------
// HOW THE CLUB ACTUALLY RUNS.
//
// "Vibrant community" tells a reader nothing. Coffee and Maggi at eleven at night
// tells them exactly what walking in is like.

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
// WHO THIS IS NOT FOR.
//
// An explicit filter immediately before the ask. Stating who should not join makes
// the invitation read as selective rather than desperate, and it saves everyone the
// wasted month — including us.

export const NOT_FOR: string[] = [
  "Anyone who wants a certificate. There isn't one. The output is a public commit history, which is worth more and photographs worse.",
  "Anyone optimising purely for the DSA round. Go to the competitive programming club — they are better at it — and come here as well if you have the hours.",
  "Anyone who wants to be told exactly what to do each week. You get a mentor and a direction, not a syllabus.",
  "Anyone counting pull requests. Chasing PR count is how Hacktoberfest earned its bad reputation, and maintainers still remember. We are not running that.",
];

// ---------------------------------------------------------------------------
// FAQ. Seven questions, no more. Every one is a real reason somebody decides not
// to join, and the Scaler-funnel question is the one that silently loses exactly
// the sceptical students most worth having.

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
    a: "For this year's GSoC cycle, most likely. For LFX Mentorship, no: terms run three times a year, and GSoC dropped its student-only requirement in 2022, so graduating does not end your eligibility.",
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
// THE JOIN FORM'S OPTIONS.
//
// Kept here rather than inline in the component so the form and the rest of the
// site cannot disagree about what the four paths are called — the form's path
// options are DERIVED from PATHS above, which is the only way a fifth path can be
// added without silently missing from the form.

export const LEVELS = [
  { value: "none", label: "Never contributed to open source" },
  { value: "some-git", label: "Some Git experience, no merged PRs" },
  { value: "merged", label: "I have merged pull requests already" },
] as const;

export const INTERESTS = [
  { value: "web", label: "Web" },
  { value: "ml", label: "ML / AI" },
  { value: "systems", label: "Systems" },
  { value: "design", label: "Design" },
  { value: "docs", label: "Docs / writing" },
] as const;

export const HEARD_FROM = [
  { value: "senior", label: "A senior or friend" },
  { value: "session", label: "A club session or build day" },
  { value: "poster", label: "A poster or campus screen" },
  { value: "social", label: "Instagram / LinkedIn / Discord" },
  { value: "search", label: "Found this site myself" },
  { value: "other", label: "Something else" },
] as const;
