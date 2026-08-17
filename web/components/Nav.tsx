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

import Link from "next/link";
import { usePathname } from "next/navigation";
import Outline from "@/components/Outline";
import ThemeToggle from "@/components/ThemeToggle";
import { JOIN_HREF, LINKS, PAGES } from "@/content/site";
import { useAuth } from "@/lib/auth";

export default function Nav() {
  const pathname = usePathname();
  // Only for the Join/Profile label at the far end of the bar. The nav does no
  // access control — see the note on that button below.
  const { user } = useAuth();

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
        className="nav-plate plate mx-auto flex h-14 max-w-[88rem] items-center justify-between gap-3 rounded-2xl border border-seam/70 px-3 sm:gap-4 sm:px-6"
      >
        <Link
          href="/"
          className="-my-3 inline-block shrink-0 py-3 text-sm font-extrabold tracking-tight text-ink transition-colors duration-200 ease-in-out hover:text-accent"
        >
          OSC
        </Link>

        {/* Six links plus a logo, a toggle and a filled button do not fit across
            390px, and the failure mode used to be silent: they overflowed, the body's
            overflow-x:hidden clipped them, and the last items simply were not there.
            Nothing reported an overflow because nothing could scroll.

            So the strip scrolls, and the affordance for that is EXPLICIT rather than
            left to chance. An earlier version relied on a partially-cut last item to
            say "there is more this way", which is only true when a word boundary
            happens to fall in the right place — measured across widths it was false
            at 390px, the single most common phone size, where the strip looked like
            it simply ended.

            The fade is mask-image rather than an overlaid gradient because the nav is
            a translucent plate: a solid gradient in --bg would be a visible block
            sitting over the blur, whereas a mask fades the links themselves and works
            over any backdrop. Removed at md, where there is room for all six. */}
        <ul className="scroll-strip flex min-w-0 flex-1 items-center gap-4 overflow-x-auto [mask-image:linear-gradient(to_right,#000_calc(100%-1.75rem),transparent)] sm:gap-5 md:[mask-image:none] lg:flex-none lg:justify-center">
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
                  className={`nav-link -my-3 inline-block whitespace-nowrap py-3 ${
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
            className="nav-link -my-3 hidden py-3 lg:inline-block"
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
          {/* THE LABEL CHANGES ONCE SOMEBODY IS SIGNED IN, and the destination does
              not. "Join" to a member who joined last month is the bar telling them to
              do a thing they have already done, which is how a site teaches people to
              ignore its one persistent control. Signed in it reads "Profile" and takes
              them to the same route, where the gate shows their details instead of a
              sign-in card.

              `user === undefined` — the session is still being restored — deliberately
              renders "Join" rather than a spinner or an empty button: it is the correct
              label for the majority of readers, it never shifts the bar's width enough
              to reflow, and a member sees it settle to "Profile" a moment later. */}
          <Link href={JOIN_HREF} className="btn btn-pop btn-compact shrink-0">
            {user ? "Profile" : "Join"}
          </Link>
        </div>
      </nav>
    </header>
  );
}
