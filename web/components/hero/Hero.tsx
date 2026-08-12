// The hero, as a thesis rather than a spectacle.
//
// It was a scroll-scrubbed WebGL rocket on a launchpad across 220vh, with a CSS
// fallback, capability detection and a stage machine. That is gone at the client's
// instruction, and what replaces it is the register the reference sites actually
// use: type-led, with the claim doing the work and hard evidence immediately under
// it.
//
// A server component. No canvas, no capability detection, no scroll listener, no
// state — the previous hero needed all four and could only be checked by rendering
// it. This one cannot fail in a way HTML cannot express.
//
// One height rule: it deliberately does NOT force h-screen. A viewport-locked hero
// pushes the evidence below the fold on a laptop, which is exactly where the
// argument dies.
//
// The two buttons are the one place on the site where a second action is allowed
// alongside Join, and the reason is that they are not competing: a first-year who
// has just landed here does not yet know what open source is, so "start at the
// beginning" is a more honest primary than "apply". Join is one tap away in the nav
// regardless, which is what makes the softer hero affordable.

import Link from "next/link";
import { JOIN_HREF } from "@/content/site";

export default function Hero() {
  return (
    <header
      className="section page-top relative pb-20 pt-20 sm:pb-28 sm:pt-28"
      aria-label="Scaler Open Source Club"
    >
      <p className="chip">Scaler School of Technology</p>

      {/* Heavy condensed caps with the second word in the accent. Two tones
          mid-headline is what stops display type at this size reading as a wall of
          letters. */}
      <h1 className="mt-7 font-display text-[clamp(3rem,9.5vw,7.5rem)] uppercase leading-[0.86] tracking-[-0.01em]">
        Open <span className="tone">Source</span>
      </h1>

      <p className="mt-8 max-w-3xl text-display-lg font-semibold tracking-tight text-balance">
        Software the whole world runs on, written in public — and{" "}
        {/* The marker carries the emphasis while the text itself stays ink, so the
            yellow never has to be legible for the sentence to be. */}
        <span className="mark">you can edit it</span>.
      </p>

      <p className="measure mt-7 text-body-lg text-haze">
        Not eventually. This week. We are a student club that helps you get your first
        change merged into a real project, and then helps you get paid to do it by
        Google, the Linux Foundation and others.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <a href="#what-it-is" className="btn btn-pop">
          Start at the beginning →
        </a>
        <Link href={JOIN_HREF} className="btn btn-secondary">
          Join the club
        </Link>
      </div>

      <p className="mt-9 font-mono text-xs leading-relaxed text-dust">
        Every claim on this site links to something you can open and check. If one
        does not, that is a bug —{" "}
        <a
          href="https://github.com/PRAteek-singHWY/scaleropensourcelabs.com/issues"
          target="_blank"
          rel="noreferrer"
          className="text-haze underline decoration-seam underline-offset-4 transition-colors hover:text-accent"
        >
          tell us
        </a>
        .
      </p>
    </header>
  );
}
