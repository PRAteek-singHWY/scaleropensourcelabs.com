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
import { isAppRoute } from "@/components/ChromeGate";
import Outline from "@/components/Outline";
import ThemeToggle from "@/components/ThemeToggle";
import { DASHBOARD_HREF, JOIN_HREF, LINKS, PAGES } from "@/content/site";
import { useAuth } from "@/lib/auth";

export default function Nav() {
  const pathname = usePathname();

  // Only for the Join/Dashboard label at the far end of the bar. The nav does no access
  // control — see the note on that button below.
  const { user } = useAuth();

  // THE APP ROUTES GET THEIR OWN CHROME AND NOT THIS ONE. /dashboard is for somebody who
  // has already joined; six links back into the brochure and a yellow "Join" button are
  // for somebody deciding whether to. Rendering both made the dashboard read as another
  // page of the website, which is exactly what opening it in a new tab was meant to stop.
  // See components/ChromeGate.tsx, which does the same for the footer.
  //
  // AFTER THE HOOKS, NOT BEFORE THEM. This started life above useAuth() and broke the
  // rules of hooks outright: a component that returns early on some renders and calls a
  // hook on others changes its hook order between renders, which React cannot reconcile.
  // Caught by the linter rather than by a crash, which is the good outcome.
  if (isAppRoute(pathname)) return null;

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
          {/* xl+ ONLY, PROMOTED FROM lg+, AND THIS IS A MEASURED CHANGE RATHER THAN A
              PREFERENCE. It was sm+ when the bar held six links and no button, then lg+
              on the reasoning that the button is worth more than a link repeated in the
              footer. The Sign in control makes that same trade again and one step
              further: at exactly lg the links strip switches to `flex-none` and stops
              absorbing pressure, while this link and the Outline toggle BOTH appear — so
              the right-hand cluster grew by two items at the one width where nothing can
              give, and the Join button was pushed 36px past the edge of the plate across
              the whole 1024-1280 band.

              It was invisible because `body { overflow-x: hidden }` clips the overflow
              instead of producing a scrollbar, which is the same silent failure the
              scroll-strip note above describes. Caught by measuring the button's right
              edge against the plate's, not by looking. */}
          <a
            href={LINKS.github}
            target="_blank"
            rel="noreferrer"
            className="nav-link -my-3 hidden py-3 xl:inline-block"
          >
            GitHub ↗
          </a>
          {/* Renders its own toggle here and the panel as a fixed element. Only
              appears at lg+ — there is no room for a side rail on a phone. */}
          <Outline />
          <ThemeToggle />
          {/* SIGN IN. Signed out only, and it exists because there was previously no way
              into an account from the chrome at all: /join stopped being the sign-in gate
              when it went back to being the anonymous application form, and the only
              remaining door was a grey "already joined?" line in that page's body copy.
              A member returning on a phone had to read past a headline and a form to find
              it, or type /dashboard by hand.

              SECONDARY, NOT A SECOND YELLOW BUTTON. The bar gets exactly one loudest
              thing — the note below says why the Join button is the site's only yellow
              control — and two filled buttons side by side would make the reader choose
              between them instead of reading one as the offer and one as the way back.
              So this is the quiet one, and applying stays the shout.

              IT DISAPPEARS ONCE SIGNED IN rather than becoming an account menu. At that
              point the yellow button already reads "Dashboard" and goes to the same
              place, and two controls pointing at one destination is the bar spending its
              scarcest space saying the same thing twice.

              `user === undefined` renders it, matching the Join button's reasoning: the
              session is usually absent, showing it and letting it vanish a moment later
              is correct far more often than the reverse, and it cannot reflow the strip
              because the cluster is shrink-0. */}
          {/* OPENS IN A NEW TAB, so whatever the reader was doing on this one survives.
              `target="_blank"` on a real anchor click is NOT the thing popup blockers
              stop — that is script-driven window.open, which browsers refuse unless it is
              a direct response to a click, and which the Google sign-in popup has usually
              spent already. An anchor is always honoured.

              `rel="noopener"` even though this is same-origin: without it the opened tab
              gets a live `window.opener` handle back to this one, and it costs nothing to
              deny. The sr-only text is how a screen reader learns the same thing sighted
              readers learn from the tab appearing. */}
          {!user && (
            <Link
              href={DASHBOARD_HREF}
              target="_blank"
              rel="noopener"
              className="btn btn-secondary btn-compact shrink-0"
            >
              Sign in
              <span className="sr-only"> (opens in a new tab)</span>
            </Link>
          )}
          {/* Never marked as the current page, even on /join — it is an action, and
              an action that greys itself out at the moment it becomes relevant is a
              bug. It stays filled and clickable throughout.

              YELLOW, not the blue fill. The blue is `.btn-primary` and appears on
              in-page CTAs all over the site; if the bar wore it too, the one control
              that is on screen at every scroll position would look like every other
              button. Yellow makes it the single loudest thing in the chrome. */}
          {/* THE LABEL AND THE DESTINATION BOTH CHANGE ONCE SOMEBODY IS SIGNED IN.
              "Join" to a member who joined last month is the bar telling them to do a
              thing they have already done, which is how a site teaches people to ignore
              its one persistent control.

              THE DESTINATION USED TO STAY AT /join, and that was right only while the
              member's own screen lived there — the gate would show their details instead
              of a sign-in card. It does not any more: /join is the anonymous application
              form and /dashboard is the place a member comes back to. Sending a
              signed-in member to /join now hands them a blank application, which is the
              wrong screen for somebody who joined in March.

              THE SIGNED-OUT LABEL STAYS "JOIN" rather than becoming "Sign in", and the
              returning member is answered by the SEPARATE control above instead. That
              split is the point: making one button mean both things forces every
              first-time reader to work out which of the two they are, and they are
              overwhelmingly the first kind.

              `user === undefined` — the session is still being restored — deliberately
              renders "Join" rather than a spinner or an empty button: it is the correct
              label for the majority of readers, it never shifts the bar's width enough
              to reflow, and a member sees it settle to "Dashboard" a moment later. */}
          {/* THE NEW TAB IS FOR THE DASHBOARD ONLY. Signed out this button goes to /join,
              which is an ordinary page of this site and should navigate in place — opening
              the application form in a second tab would be the site losing the reader's
              place for no reason. So the target is conditional on the destination, not on
              the button. */}
          <Link
            href={user ? DASHBOARD_HREF : JOIN_HREF}
            target={user ? "_blank" : undefined}
            rel={user ? "noopener" : undefined}
            className="btn btn-pop btn-compact shrink-0"
          >
            {user ? "Dashboard" : "Join"}
            {user && <span className="sr-only"> (opens in a new tab)</span>}
          </Link>
        </div>
      </nav>
    </header>
  );
}
