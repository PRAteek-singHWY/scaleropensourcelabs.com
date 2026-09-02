// Site-wide structure. What the nav and the footer both derive from.
//
// This file exists because the site stopped being one page. Everything that is
// still CONTENT lives in club.ts — this is only the shape of the thing: which
// routes there are, what they are called, and where the one persistent action
// goes. Two consumers read it (Nav and Footer), which is the whole reason it is a
// module rather than an array declared inside the nav: a route that appears in the
// bar and not in the footer is a route half the readers cannot find.
//
// LINKS and INSTITUTIONAL are re-exported rather than moved. They live in club.ts
// beside the rest of the content and are imported here so a component that needs
// "the site's chrome" has one import instead of two. Moving them would have split
// the content file along a line that only makes sense from the footer's point of
// view.

export { LINKS, INSTITUTIONAL } from "@/content/club";

/**
 * The six pages, in reading order, as the nav and footer render them.
 *
 * THE ORDER IS AN ARGUMENT, not an inventory. It walks a reader who has just
 * arrived through what the club is, then what it has actually produced, then who
 * is behind it, and only then how to get in — so that by the time "How to Join"
 * is the next item, every reason to want to has already been made.
 *
 * `/join` is deliberately absent. It is an action rather than a destination, it
 * has its own filled button at the other end of the bar, and listing it here would
 * put the same word in the nav twice.
 */
export const PAGES = [
  { href: "/", label: "Essence" },
  { href: "/projects", label: "Projects" },
  { href: "/programmes", label: "Programmes" },
  { href: "/hall-of-fame", label: "Hall of Fame" },
  { href: "/team", label: "Team" },
  { href: "/how-to-join", label: "How to Join" },
] as const;

/** Where every Join button on every page goes. One destination, deliberately. */
export const JOIN_HREF = "/join";

/** Where the nav's far-end button goes for somebody who is already signed in.
 *
 *  A SECOND CONSTANT RATHER THAN A SECOND STRING IN Nav.tsx, because these two are a
 *  pair: the bar renders one or the other from the same slot, and a route rename that
 *  moved only one of them would leave a signed-in member with a dead button and
 *  everybody else fine — which is the half nobody testing the site would click.
 *
 *  Absent from PAGES for the same reason /join is: it is one person's own destination,
 *  it already has the filled button at the end of the bar, and listing it in the strip
 *  would put the same word in the nav twice. */
export const DASHBOARD_HREF = "/dashboard";
