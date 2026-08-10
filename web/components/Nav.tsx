"use client";

// The site nav. Five pages, one persistent action.
//
// It was a server component when the site was one page and every item was a hash
// link. A multi-page site needs the current page marked, and the only honest source
// for "which page am I on" is the router — so this is a client component now. The
// cost is small: the nav is a handful of links and the pathname hook is the whole
// of its interactivity.
//
// THE JOIN BUTTON IS THE POINT OF THIS COMPONENT.
//
// It is pinned here rather than repeated down the page or parked in a bottom bar.
// The previous design used Apple's sticky buy-bar pattern — a fixed strip that
// appeared past the hero and hid over the form — which made sense when the form
// existed exactly once, 12,000px down a single page. With a dedicated /join route
// reachable from a nav that is always on screen, that bar became a second control
// doing the same job, and two competing persistent CTAs is worse than one. The bar
// is gone, along with the reserved-height rule it needed in globals.css.
//
// "Subtle highlight", read literally: it is the accent-filled control in a bar of
// 12px grey links, and nothing else here is filled. It does not pulse, grow, or
// change colour on scroll. A button that animates to get attention on every page
// reads as desperate, and this one does not need to — it is the only filled thing
// in the bar.
//
// The frosted plate is measured off apple.com rather than approximated: their
// global nav computes to rgba(255,255,255,0.8) with
// `backdrop-filter: saturate(1.8) blur(20px)`. The saturate is the part usually
// missing — a plain blur greys out whatever passes beneath it, and the 1.8 boost is
// what makes their glass look like glass rather than frosted plastic.

import Link from "next/link";
import { usePathname } from "next/navigation";
import Outline from "@/components/Outline";
import ThemeToggle from "@/components/ThemeToggle";
import { JOIN_HREF, PAGES } from "@/content/site";

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="plate fixed inset-x-0 top-0 z-50 border-b border-seam/60">
      <nav
        aria-label="Main"
        className="mx-auto flex h-14 max-w-[76rem] items-center gap-4 px-6 sm:px-8"
      >
        <Link
          href="/"
          // Blue, not ink. In the frames the wordmark is the ONE accent-coloured
          // thing on the left of the bar, which is what separates it from the six
          // grey nav items rather than relying on weight alone.
          className="-my-3 inline-block shrink-0 py-3 font-display text-lg leading-none tracking-tight text-accent transition-opacity duration-300 ease-glide hover:opacity-70"
        >
          OSC
        </Link>

        {/* The link strip scrolls on narrow viewports rather than wrapping or being
            clipped. This is not hypothetical caution: at 390px the previous nav
            overflowed and the body's overflow-x:hidden silently ate the last two
            items — which were Apply and the theme control. Nothing reported an
            overflow because nothing could scroll.
    
            An earlier version of this comment claimed "a partially-cut last item is
            the affordance that says there is more this way". Measured across nine
            widths, that is simply not true, and it is least true where it matters
            most:
    
              360px  1/5 links visible, next item partially shown
              390px  2/5 links visible, next item NOT shown at all
              560px  4/5 links visible, next item NOT shown at all
              768px  5/5, no scrolling needed
    
            At 390px — the single most common phone width — three of the five pages
            were undiscoverable and the strip looked like it simply ended after
            "Projects". Whether a partial item happens to land in view is an accident
            of where a word boundary falls, not a design.
    
            So the affordance is explicit now: the strip's content fades out at its
            right edge while it is scrollable, and the fade is removed at `md`, which
            is where the measurement above shows scrolling stops being necessary.
            Done with mask-image rather than an overlaid gradient because the nav is a
            translucent frosted plate — a solid gradient in --bg would be a visible
            block over the blur, whereas a mask fades the links themselves and works
            over any backdrop.
    
            Two links at 390px is as good as this gets without cutting something the
            brief asks for. The strip only gets 129px there; the rest is spent on the
            logo, the theme toggle and the Join button, and tightening the gap changes
            nothing because the constraint is those fixed items rather than the
            spacing. Shortening the button to "Join" would buy a third link and was
            rejected — the persistent action's label is worth more than one more nav
            item, especially since the strip swipes and the footer lists all five
            pages. */}
        <ul className="scroll-strip flex min-w-0 flex-1 items-center gap-5 overflow-x-auto [mask-image:linear-gradient(to_right,#000_calc(100%-1.75rem),transparent)] sm:gap-6 md:[mask-image:none]">
          {PAGES.map((p) => {
            // Exact match for "/", prefix match for the rest, so /projects marks
            // itself and "/" does not mark itself on every page.
            const current = p.href === "/" ? pathname === "/" : pathname.startsWith(p.href);
            return (
              <li key={p.href}>
                <Link
                  href={p.href}
                  aria-current={current ? "page" : undefined}
                  // Mono caps, per the frames. `uppercase` is a CSS transform rather
                  // than a change to PAGES — the labels stay title-case in content,
                  // so the footer's page list and the document titles are unaffected.
                  className={`-my-3 inline-block whitespace-nowrap py-3 font-mono text-label uppercase transition-colors duration-300 ease-glide hover:text-ink ${
                    current ? "font-medium text-accent" : "text-haze"
                  }`}
                >
                  {p.label}
                  {/* The current page carries a rule under it as well as heavier
                      ink. Weight alone is a very quiet signal at 12px, and it is
                      the only signal a colourblind reader would get. */}
                  <span
                    aria-hidden
                    className={`mt-1 block h-px ${current ? "bg-accent" : "bg-transparent"}`}
                  />
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex shrink-0 items-center gap-3">
          {/* Only appears at lg+; there is no room for a side rail on a phone. */}
          <Outline />
          <ThemeToggle />
          {/* Never marked as the current page even when the reader is on /join —
              it is an action, and an action that greys itself out at the moment it
              is relevant is a bug. It stays filled and clickable throughout.

              YELLOW, not accent-filled. The frames make this the only yellow element
              in the bar; the earlier note here said "it is the accent-filled control
              in a bar of grey links, and nothing else here is filled", and that
              argument survives the colour change intact — what changed is which
              colour does the filling. Yellow also stops it competing with the blue
              wordmark at the other end of the same bar. */}
          <Link href={JOIN_HREF} className="btn btn-pop btn-compact shrink-0">
            Join the Club
          </Link>
        </div>
      </nav>
    </header>
  );
}
