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
      <p className="chip">Scaler School of Technology</p>

      {/* Heavy condensed caps in the display face, with the second word in blue.
          Two tones mid-headline is what stops display type at this size reading as
          a wall of letters — and it is the device their whole page is built on. */}
      <h1 className="mt-7 font-display text-[clamp(3.25rem,10vw,8rem)] uppercase leading-[0.86] tracking-[-0.01em]">
        Open <span className="tone">Source</span>
      </h1>

      <p className="mt-8 max-w-3xl text-display-lg font-semibold tracking-tight text-balance">
        We put student names in the{" "}
        {/* The marker carries emphasis; the text itself stays ink, so the yellow is
            never what conveys the meaning. */}
        <span className="mark">commit log</span>.
      </p>

      <p className="measure mt-6 text-body-lg text-haze">
        Members contribute to the projects the world already runs on, and{" "}
        <span className="mark font-medium text-ink">get paid</span> by Google, the
        Linux Foundation and others to do it. Every claim on this page is a link you
        can open.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <a href="#hall" className="btn btn-pop">
          See who got in →
        </a>
        <a
          href="#apply"
          className="btn btn-secondary"
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
            <span className="text-display-lg font-semibold tracking-tightest">
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
                <span className="ml-1.5 text-dust">×{count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
