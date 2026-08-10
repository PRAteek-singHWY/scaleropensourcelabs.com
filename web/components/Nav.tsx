// Nav, as a floating glass plate rather than a bar welded to the top edge.
//
// The register is still quiet — a nav's job on a page like this is to be
// findable, not to announce itself; the hero is doing the announcing — but it is
// now detached: inset from all three edges, rounded, and lifted off the page by
// a 4%-black shadow. That single change is most of what separates a 2019 site
// header from a current one, and it costs nothing structurally.
//
// The plate itself (fill, blur, shadow) is `.plate` in globals.css, shared with
// the outline panel. Two rules matter here:
//
//   * Its width matches the content measure (88rem), not the viewport. A plate
//     that runs edge to edge is a bar with rounded corners; one that lines up
//     with the copy underneath reads as part of the same layout, and the links
//     land directly above the text they scroll to.
//
//   * Its bottom edge is 3.75rem from the top of the viewport (0.75rem inset +
//     3rem plate), 4rem at sm+. `scroll-padding-top: 5rem` in globals.css is
//     derived from that. Change the inset or the height and it moves too.
//
// This was briefly a client component that watched for pinned-dark sections
// beneath it and swapped to their palette. With the 3D gone there are no
// pinned-dark sections, so every surface under the nav now follows the reader's
// theme and its own tokens already match. Back to a server component.

import Link from "next/link";
import Outline from "@/components/Outline";
import ThemeToggle from "@/components/ThemeToggle";

const ITEMS = [
  { href: "#hall", label: "Selected" },
  { href: "#programmes", label: "Programmes" },
  { href: "#calendar", label: "Timeline" },
  { href: "#team", label: "Team" },
  { href: "#faq", label: "FAQ" },
  { href: "#apply", label: "Apply" },
] as const;

export default function Nav() {
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
        className="plate mx-auto flex h-12 max-w-[88rem] items-center justify-between gap-4 rounded-2xl border border-seam/70 px-4 sm:gap-4 sm:px-6"
      >
        <Link
          href="/"
          className="-my-3 inline-block shrink-0 py-3 text-sm font-extrabold tracking-tight text-ink transition-colors duration-200 ease-in-out hover:text-accent"
        >
          OSC
        </Link>

        {/* Six 12px links plus a logo and a toggle do not fit across 390px. They
            previously overflowed and were clipped by the body's overflow-x:hidden,
            which took Apply — the one action on the page — and the theme control
            off-screen entirely, silently: nothing reported an overflow because
            nothing could scroll. The strip now scrolls, so every item stays
            reachable, and the logo and toggle stay pinned either side of it. A
            partially-cut last item is the scroll affordance. */}
        <ul className="scroll-strip flex min-w-0 flex-1 items-center gap-4 overflow-x-auto sm:flex-none sm:justify-center sm:gap-5">
          {ITEMS.map((i) => (
            <li key={i.href}>
              <a
                href={i.href}
                className="nav-link -my-3 inline-block whitespace-nowrap py-3"
              >
                {i.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-4">
          <a
            href="https://github.com/PRAteek-singHWY"
            target="_blank"
            rel="noreferrer"
            className="nav-link -my-3 hidden py-3 sm:inline-block"
          >
            GitHub ↗
          </a>
          {/* Renders its own toggle here and the panel as a fixed element. Only
              appears at lg+ — there is no room for a side rail on a phone. */}
          <Outline />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
