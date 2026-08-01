// Nav, in the register Apple actually uses: 12px, centred, evenly spaced, and
// near-invisible until you look for it.
//
// Measured off apple.com — their global nav is 12px with a muted grey fill and no
// weight. It works because a nav's job on a page like this is to be findable, not
// to announce itself; the hero is doing the announcing. Anything heavier competes
// with the one thing you want read first.

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

const ITEMS = [
  { href: "#hall", label: "Selected" },
  { href: "#programmes", label: "Programmes" },
  { href: "#outcomes", label: "Why" },
  { href: "#culture", label: "The club" },
  { href: "#join", label: "Join" },
] as const;

export default function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-seam/60 bg-bg/70 backdrop-blur-xl">
      <nav
        aria-label="Main"
        className="mx-auto flex h-11 max-w-[76rem] items-center justify-between gap-6 px-6 sm:px-8"
      >
        <Link
          href="/"
          className="text-xs font-medium tracking-tight text-ink transition-colors duration-300 ease-glide hover:text-accent"
        >
          OSC
        </Link>

        <ul className="flex items-center gap-7">
          {ITEMS.map((i) => (
            <li key={i.href}>
              <a
                href={i.href}
                className="text-xs text-haze transition-colors duration-300 ease-glide hover:text-ink"
              >
                {i.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4">
          <a
            href="https://github.com/PRAteek-singHWY"
            target="_blank"
            rel="noreferrer"
            className="hidden text-xs text-haze transition-colors duration-300 ease-glide hover:text-ink sm:block"
          >
            GitHub ↗
          </a>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
