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

/** Where the members' area is — and, because signing in happens there, where the
 *  chrome's "Sign in" link goes as well.
 *
 *  IT IS NOT JOIN_HREF's SIGNED-IN VARIANT, AND THAT IS THE POINT OF THE PAIR. These
 *  are two doors answering two different questions:
 *
 *    JOIN_HREF      the anonymous application form. A stranger asking to join: no
 *                   account, one submission, nothing to read back afterwards.
 *    DASHBOARD_HREF the members' area, which asks who you are and shows you your own
 *                   things. Reached by signing in with a college Google account.
 *
 *  So the bar renders BOTH for a signed-out reader — the loud button to the form, a
 *  quiet link to the door — and only this one for a member. Collapsing them is the bug
 *  this constant exists to keep fixed: a returning member sent to JOIN_HREF is handed
 *  an application they filled in months ago.
 *
 *  A CONSTANT RATHER THAN A STRING IN Nav.tsx, because three slots render it now: the
 *  bar's far-end button when there is a session, the bar's sign-in link when there is
 *  not, and the footer's route row. A rename that moved only one would leave exactly
 *  one kind of reader with a dead link and everybody else fine — which is the half
 *  nobody testing the site would click.
 *
 *  Absent from PAGES for the same reason /join is: it is one person's own destination,
 *  it already has its own slot in the bar, and listing it in the strip would put the
 *  same word in the nav twice. */
export const DASHBOARD_HREF = "/dashboard";
