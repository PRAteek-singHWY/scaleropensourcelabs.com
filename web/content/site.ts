// Shared, site-wide content. Everything here appears on more than one page.
//
// THE RULE FOR EVERY FILE IN THIS DIRECTORY, unchanged from when all of it lived
// in one file: if you cannot open a URL that proves it, it does not go in. This
// site's whole argument is that its claims are checkable, and the audience
// includes maintainers who will click the link.
//
// Two mechanisms enforce it rather than a note asking people to remember:
//
//   * `consented` on anything naming a real person. Not true, not rendered.
//   * `published` on anything making a factual claim. Not true, not rendered.
//
// Where a page needs shape before there is real content — a grid cannot be
// designed against an empty array — each module exports a SCAFFOLD gated on
// NODE_ENV. Scaffold entries are deliberately implausible ("Placeholder One",
// "Example Foundation") so no screenshot can be mistaken for a real claim, and a
// production build cannot ship them even by accident.

export const LINKS = {
  /** The club's own repo. This site is one of the club's projects. */
  repo: "https://github.com/PRAteek-singHWY/scaleropensourcelabs.com",
  issues:
    "https://github.com/PRAteek-singHWY/scaleropensourcelabs.com/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22",
  contributing:
    "https://github.com/PRAteek-singHWY/scaleropensourcelabs.com/blob/main/CONTRIBUTING.md",
  github: "https://github.com/PRAteek-singHWY",
  email: "opensource@scaleropensourcelabs.com",
};

/** The five pages, in reading order. The nav and the footer both derive from this
    so a route can never be in one and missing from the other. */
export const PAGES = [
  { href: "/", label: "Essence" },
  { href: "/projects", label: "Projects" },
  { href: "/programs", label: "Programs" },
  { href: "/hall-of-fame", label: "Hall of Fame" },
  { href: "/how-to-join", label: "How to Join" },
] as const;

/** Where every Join button on every page goes. One destination, deliberately. */
export const JOIN_HREF = "/join";

// ---------------------------------------------------------------------------
// FOR FACULTY, SPONSORS AND MAINTAINERS.
//
// Two of this site's three audiences have no page of their own, and that is on
// purpose: all five pages are addressed to a student deciding whether to join, and
// a "for sponsors" band inserted into one of them would compete with the single
// next action that page is built around.
//
// So it lives in the footer, which is chrome rather than content and appears on
// every page. An anonymous club reads as vaporware to a faculty member and to a
// maintainer simultaneously, so this stays concrete, contactable, and makes exactly
// one small, specific, fundable ask.

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
