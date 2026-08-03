// The hero, as a thesis rather than a spectacle.
//
// It was a scroll-scrubbed WebGL rocket on a launchpad across 220vh, with a
// CSS fallback, capability detection and a stage machine. That is gone at the
// client's instruction, and what replaces it is the register both reference sites
// actually use: apple.com and Scaler's School of Business are type-led, with the
// claim doing the work and hard numbers immediately under it.
//
// Reading the SSB page closely, the pattern is consistent — a positioning
// sentence, two calls to action, and figures placed where the eye lands first. It
// is text-heavy on purpose and carries almost no imagery. So the strongest move
// here is to state the claim and then evidence it with the count of people who got
// in, which is the one number nobody else on campus can print.
//
// This is a server component: no canvas, no capability detection, no scroll
// listener, no state. The previous hero needed all four and could only be checked
// by rendering it. This one cannot fail in a way HTML cannot express.
//
// One height rule: it deliberately does NOT force h-screen. A viewport-locked hero
// pushes the evidence below the fold on a laptop, which is exactly where the
// argument dies.

import { PROGRAMME_COLOUR, PROGRAMME_SHORT, selectionStats } from "@/content/club";

export default function Hero() {
  const stats = selectionStats();

  return (
    <header
      className="section relative pb-24 pt-32 sm:pb-32 sm:pt-44"
      aria-label="Scaler Open Source Club"
    >
      <p className="label">Scaler School of Technology</p>

      {/* The largest type on the page, and the only place the accent appears at
          display size. Everything below it stays quiet — the restraint is what
          makes one accent read as deliberate. */}
      <h1 className="mt-7 text-display-xl font-semibold tracking-tightest text-balance">
        Open <span className="text-accent">Source</span>
      </h1>

      <p className="mt-8 max-w-3xl text-display-lg font-medium tracking-tight text-balance">
        We put student names in the commit log.
      </p>

      <p className="measure mt-6 text-body-lg text-haze">
        Members contribute to the projects the world already runs on, and get paid by
        Google, the Linux Foundation and others to do it. Every claim on this page is
        a link you can open.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <a
          href="#hall"
          className="rounded-full bg-ink px-7 py-3.5 text-sm font-medium text-bg transition-opacity duration-300 ease-glide hover:opacity-85"
        >
          See who got in
        </a>
        <a
          href="#apply"
          className="rounded-full border border-seam px-7 py-3.5 text-sm font-medium transition-colors duration-300 ease-glide hover:border-accent hover:text-accent"
        >
          Join the club
        </a>
      </div>

      {/* The evidence, in the hero, above the fold. Derived from the published list
          so it can never overstate — and hidden entirely when there is nothing to
          show, because "0 selected" is a worse first impression than no claim. */}
      {stats.total > 0 && (
        <div className="mt-16 flex flex-wrap items-baseline gap-x-8 gap-y-4 border-t border-seam pt-8 sm:mt-20">
          <p>
            <span className="text-display-lg font-semibold tracking-tightest tabular-nums">
              {stats.total}
            </span>
            <span className="ml-3 text-body text-haze">
              selected into international programmes
            </span>
          </p>
          <ul className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            {stats.programmes.map(({ programme, count }) => (
              <li key={programme} className="font-mono text-xs">
                <span style={{ color: PROGRAMME_COLOUR[programme] }}>
                  {PROGRAMME_SHORT[programme]}
                </span>
                <span className="ml-1.5 tabular-nums text-dust">×{count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
