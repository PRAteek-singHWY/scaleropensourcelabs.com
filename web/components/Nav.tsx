// Nav, in the register Apple actually uses: 12px, centred, evenly spaced, and
// near-invisible until you look for it.
//
// Measured off apple.com — their global nav is 12px with a muted grey fill and no
// weight. It works because a nav's job on a page like this is to be findable, not
// to announce itself; the hero is doing the announcing. Anything heavier competes
// with the one thing you want read first.
//
// The frosted plate is measured off apple.com rather than approximated. Their
// global nav computes to rgba(255,255,255,0.8) with
// `backdrop-filter: saturate(1.8) blur(20px)`. The saturate is the part that was
// missing here — a plain blur greys out whatever passes beneath it, and the 1.8
// boost is what makes Apple's glass look like glass rather than frosted plastic.
// Height 44px matches theirs exactly (h-11).
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
    <header className="plate fixed inset-x-0 top-0 z-50 border-b border-seam/60">
      <nav
        aria-label="Main"
        className="mx-auto flex h-11 max-w-[76rem] items-center justify-between gap-6 px-6 sm:px-8"
      >
        <Link
          href="/"
          className="-my-3 inline-block shrink-0 py-3 text-xs font-medium tracking-tight text-ink transition-colors duration-300 ease-glide hover:text-accent"
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
        <ul className="scroll-strip flex min-w-0 flex-1 items-center gap-6 overflow-x-auto sm:flex-none sm:justify-center sm:gap-7">
          {ITEMS.map((i) => (
            <li key={i.href}>
              <a
                href={i.href}
                className="-my-3 inline-block whitespace-nowrap py-3 text-xs text-haze transition-colors duration-300 ease-glide hover:text-ink"
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
            className="-my-3 hidden py-3 text-xs text-haze transition-colors duration-300 ease-glide hover:text-ink sm:inline-block"
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
