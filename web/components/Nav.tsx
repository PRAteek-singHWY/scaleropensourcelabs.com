"use client";

// Nav, as a floating glass plate rather than a bar welded to the top edge.
//
// The register is still quiet — a nav's job on a page like this is to be
// findable, not to announce itself; the hero is doing the announcing — but it is
// detached: inset from all three edges, rounded, and lifted off the page by a
// 4%-black shadow. That single change is most of what separates a 2019 site header
// from a current one, and it costs nothing structurally.
//
// The plate itself (fill, blur, shadow) is `.plate` in globals.css, shared with
// the outline panel. Two rules matter here:
//
//   * Its width matches the content measure (88rem), not the viewport. A plate
//     that runs edge to edge is a bar with rounded corners; one that lines up
//     with the copy underneath reads as part of the same layout, and the links
//     land directly above the text they lead to.
//
//   * Its bottom edge is 4.25rem from the top of the viewport (0.75rem inset +
//     3.5rem plate), 4.5rem at sm+. `scroll-padding-top: 5.5rem` and `.page-top`
//     in globals.css are both derived from that. Change the inset or the height
//     and they move too.
//
//     THE PLATE IS 3.5rem AND WAS 3rem. It grew for one reason: the Join button
//     has to be a 44px touch target, and 44 inside 48 leaves 2px of air either
//     side — a control wedged into a bar rather than sitting in one. The cheap fix
//     was shrinking the button to 40px, which passes every floor except the one
//     that applies (WCAG 2.5.5, and smoke.mjs asserts it). Three coupled numbers
//     moved instead of one accessibility floor.
//
// IT IS A CLIENT COMPONENT AGAIN, and for a new reason. It was one when the site
// had scroll-linked dark sections, went back to being a server component when
// those left, and is one now because the site is six routes instead of one long
// page: the only honest source for "which page am I on" is the router. The cost is
// small — the nav is a handful of links and the pathname hook is the whole of its
// interactivity.
//
// THE JOIN BUTTON IS WHY THE RIGHT-HAND GROUP IS ARRANGED THE WAY IT IS.
//
// It is pinned here rather than repeated down every page. When the form existed
// exactly once, 12,000px down a single scroll, a CTA that appeared past the hero
// was the only way to keep the action reachable. With a dedicated /join route and
// a bar that is always on screen, the action is never more than one click away
// from anywhere, so the bar carries it and the pages do not have to.
//
// "Subtle highlight", read literally: it is the only filled control in a strip of
// plain links. It does not pulse, grow, or change colour on scroll. A button that
// animates for attention on every page reads as desperate, and this one does not
// need to.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Outline from "@/components/Outline";
import ThemeToggle from "@/components/ThemeToggle";
import { DASHBOARD_HREF, JOIN_HREF, LINKS, PAGES } from "@/content/site";

/** The hamburger, and its open state. Three lines because a nav is a list.
 *  aria-hidden: the button carries the accessible name. */
function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    >
      {open ? (
        <>
          <path d="M5 5l10 10" />
          <path d="M15 5L5 15" />
        </>
      ) : (
        <>
          <path d="M3 6h14" />
          <path d="M3 10h14" />
          <path d="M3 14h14" />
        </>
      )}
    </svg>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);

  // Close on navigation. Next keeps this component mounted across a client-side
  // route change, so without this the panel stays open over the page it just took
  // you to — which reads as the tap having done nothing.
  useEffect(() => setMenu(false), [pathname]);

  // Escape closes it, because a thing that covers the page has to be dismissible
  // without hunting for the control that opened it.
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menu]);

  return (
    <header className="fixed inset-x-0 top-3 z-50 px-3 sm:top-4 sm:px-6">
      <nav
        aria-label="Main"
        // 88rem, tracking `.section`. This number is not independent: the plate's
        // whole idea is that its width IS the content measure, so a section that
        // widened to 88rem while the nav stayed at 80rem would put the plate's edges
        // 64px inside every heading beneath it — visible on any screen wide enough
        // for the cap to bind, and exactly the kind of 64px misalignment that reads
        // as "slightly off" without being locatable.
        // nav-plate is the reading-progress rule along the bottom edge, and
        // nothing else — see the block in globals.css. It is a scroll-driven
        // pseudo-element, so it costs no state here and browsers without
        // animation-timeline get the bar exactly as it was.
        className="nav-plate plate mx-auto flex h-[56px] max-w-[88rem] items-center justify-between gap-3 rounded-tile border border-seam/70 px-3 sm:gap-4 sm:px-6"
      >
        <Link
          href="/"
          className="-my-[12px] inline-block shrink-0 py-[12px] text-sm font-extrabold tracking-tight text-ink transition-colors duration-200 ease-in-out hover:text-accent"
        >
          OSC
        </Link>

        {/* THE STRIP IS md+ ONLY NOW, AND BELOW THAT THERE IS A MENU.
            It used to scroll horizontally at every width, with a mask fading its right
            edge to say "there is more this way". That was a reasonable answer to "six
            links do not fit across 390px" and it did not work: measured at 390, the
            list was a 187px-wide window onto 407px of links, so four of the six
            destinations — Hall of Fame, Team, How to Join, and most of Programmes —
            were off-screen behind the fade, reachable only by dragging a strip most
            readers will not think to drag. A site whose nav hides two-thirds of itself
            on the commonest phone size does not have a nav on phones.

            So: the inline strip at md+, where all six genuinely fit, and a disclosure
            below it. The panel is the same list, stacked, with the two items the bar
            drops on small screens — GitHub and Sign in — put back, since they have
            nowhere else to be at that width.

            The mask stays for the md→lg band, where the strip is inline but can still
            run tight against the right-hand group. */}
        <ul className="scroll-strip hidden min-w-0 flex-1 items-center gap-4 overflow-x-auto [mask-image:linear-gradient(to_right,#000_calc(100%-1.75rem),transparent)] md:flex md:[mask-image:none] lg:flex-none lg:justify-center">
          {PAGES.map((p) => {
            // Exact match for "/", prefix match for the rest — so /projects marks
            // itself and "/" does not mark itself on every page.
            const current =
              p.href === "/" ? pathname === "/" : pathname.startsWith(p.href);
            return (
              <li key={p.href}>
                <Link
                  href={p.href}
                  aria-current={current ? "page" : undefined}
                  className={`nav-link -my-[12px] inline-block whitespace-nowrap py-[12px] ${
                    current ? "!text-accent" : ""
                  }`}
                >
                  {p.label}
                  {/* The current page carries a rule under it as well as heavier
                      ink. Colour alone is the only signal a colourblind reader would
                      get, and this bar has no other way of saying where you are. */}
                  {/* .nav-rule keeps that exactly as it was — the current page's
                      rule is at scaleX(1) in the first frame, so nothing about
                      where you are waits on a transition — and gives every other
                      link the same rule, drawn left to right on hover and on
                      focus. The state is read from aria-current above, so there is
                      no second source of truth for "here". */}
                  <span aria-hidden className="nav-rule mt-0.5 block h-px" />
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          {/* lg+ only. It was sm+ when the bar held six links and no button; the
              button is worth more than a link that is repeated in the footer. */}
          <a
            href={LINKS.github}
            target="_blank"
            rel="noreferrer"
            className="nav-link -my-[12px] hidden py-[12px] lg:inline-block"
          >
            GitHub ↗
          </a>
          {/* Renders its own toggle here and the panel as a fixed element. Only
              appears at lg+ — there is no room for a side rail on a phone. */}
          <Outline />
          <ThemeToggle />
          {/* Never marked as the current page, even on /join — it is an action, and
              an action that greys itself out at the moment it becomes relevant is a
              bug. It stays filled and clickable throughout.

              YELLOW, not the blue fill. The blue is `.btn-primary` and appears on
              in-page CTAs all over the site; if the bar wore it too, the one control
              that is on screen at every scroll position would look like every other
              button. Yellow makes it the single loudest thing in the chrome. */}
          {/* SIGNING IN IS NOT JOINING, and this link is the only place in the site's
              chrome that says so. The button beside it goes to the application form —
              no account, one submission, written by a stranger. A member who did that in
              August and just wants back in needs a different door, and the bar offered
              them none: an existing member on a new laptop, or after clearing their
              cookies, pressed the only control there was and landed on an application
              form with no sign-in anywhere on it. /join carries a line pointing at the
              dashboard as well, but a sentence above a form is not wayfinding — the bar
              is, and it is on screen at every scroll position.

              QUIET, AND DELIBERATELY NOT A SECOND BUTTON. Almost nobody reading this
              site is a member yet, and two filled controls side by side would ask every
              one of them to work out which of two things they are before they can act.
              A plain link is found by the person looking for it and skimmed past by
              everybody else, which is the right weighting for a returning-member
              affordance in a bar whose job is to recruit new ones.

              IT DOES NOT DEPEND ON THE SESSION. This link and the button beside it used
              to swap on `user` — the link vanished and the button relabelled itself to
              "Dashboard" once somebody was signed in. The bar does no access control and
              never did, so all that state bought was a control that read differently
              depending on which browser you opened the site in, and a member who WAS
              signed in lost the only door in the chrome that names the members' area.
              One label, every reader, every visit: /dashboard shows the sign-in card to
              a stranger and the dashboard to a member, which is where that branch
              belongs.

              sm+ ONLY, for the reason the GitHub link above is lg+ only: at 390px the
              route strip is already scrolling, and the bar's optional items yield before
              the plate is allowed to grow. A phone reader who presses "Join" still meets
              the sign-in line above the form on /join, and the footer carries it at
              every width. */}
          <Link
            href={DASHBOARD_HREF}
            className="nav-link -my-[12px] hidden shrink-0 whitespace-nowrap py-[12px] sm:inline-block"
          >
            Sign in
          </Link>
          <Link href={JOIN_HREF} className="btn btn-pop btn-compact shrink-0">
            Join
          </Link>

          {/* AFTER the Join button in source order, and that is deliberate: Join is
              the bar's one job, so it keeps the position closest to the thumb on a
              right-handed grip. The menu is the secondary control. */}
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-expanded={menu}
            aria-controls="nav-menu"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-inline text-ink transition-colors hover:text-accent md:hidden"
          >
            <span className="sr-only">{menu ? "Close menu" : "Open menu"}</span>
            <MenuIcon open={menu} />
          </button>
        </div>
      </nav>

      {/* THE PANEL, a sibling of the plate rather than a child of it. The plate is a
          flex row with a fixed 56px height and `overflow` behaviour of its own; a
          dropdown inside it would either stretch it or be clipped by it.

          Not a full-screen overlay: at this size the plate is 6px from the top of the
          viewport, so a panel hanging directly under it reads as belonging to the bar,
          and the page staying visible behind it is what tells a reader they have opened
          something rather than navigated. */}
      {menu && (
        <div
          id="nav-menu"
          className="plate-solid mt-2 rounded-tile border border-seam/70 p-2 md:hidden"
        >
          <ul className="flex flex-col">
            {PAGES.map((p) => {
              const current =
                p.href === "/" ? pathname === "/" : pathname.startsWith(p.href);
              return (
                <li key={p.href}>
                  <Link
                    href={p.href}
                    aria-current={current ? "page" : undefined}
                    // py-3 on a 24px line box is 48px — the row IS the target, so no
                    // `.tap` and no negative margin. Same reasoning as the dashboard
                    // sidebar's rows, and for the same reason: these paint a hover
                    // fill, so padding added by `.tap` would be visible and its
                    // matching negative margin would overlap the neighbouring row.
                    className={`block rounded-inline px-3 py-3 text-sm font-semibold transition-colors hover:bg-sunk ${
                      current ? "text-accent" : "text-ink"
                    }`}
                  >
                    {p.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          {/* The two the bar drops below sm. They have nowhere else to be at this
              width, and "Sign in" in particular is the returning member's only door. */}
          <div className="mt-2 flex flex-col border-t border-seam pt-2">
            <Link
              href={DASHBOARD_HREF}
              className="block rounded-inline px-3 py-3 text-sm font-semibold text-ink transition-colors hover:bg-sunk"
            >
              Sign in
            </Link>
            <a
              href={LINKS.github}
              target="_blank"
              rel="noreferrer"
              className="block rounded-inline px-3 py-3 text-sm font-semibold text-ink transition-colors hover:bg-sunk"
            >
              GitHub ↗
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
