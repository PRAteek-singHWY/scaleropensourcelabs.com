"use client";

// The scrolling strip of programmes and ecosystems.
//
// The loop is two identical copies of one list translated by exactly half the
// track — see `.ticker` in globals.css for why that is the whole mechanic and
// why the separator has to live inside each item rather than being a gap.
//
// IT IS A CLIENT COMPONENT FOR ONE REASON: the pause button. Everything else
// here is static markup and would have been happier on the server, and the first
// version of this file was — pausing on `:hover` in CSS and calling that the
// stop mechanism.
//
// That is not sufficient. WCAG 2.2.2 (Pause, Stop, Hide, Level A) applies to
// content that moves automatically, runs for more than five seconds and sits
// beside other content; this moves forever. A hover rule serves a pointer and
// nobody else — there is nothing focusable inside the strip, so a keyboard user
// has no way to reach it, and `prefers-reduced-motion` only helps the people who
// have already found and set it. The criterion asks for a control, so there is a
// control. The hover rule stays as a convenience on top of it.
//
// NAMES, NOT LOGOS, and it is the same call this page already makes in the
// programmes section: those marks belong to Google, the Linux Foundation, the
// CNCF and others, and setting them in a row on a club's recruitment page states
// a relationship nobody granted. Typeset names say "this is the ecosystem the
// work lands in", which is true and checkable; a wall of trademarks says
// "partners", which is not.
//
// THE NON-ENDORSEMENT LINE THAT USED TO SIT UNDER THIS STRIP IS GONE, removed on
// request. The disclaimer itself is not lost — the footer carries it on every
// route ("Programme and organisation names are trademarks of their respective
// owners… not an endorsement by any programme or company"), which is a better
// home for it anyway: it is chrome, it is site-wide, and it no longer explains a
// decorative strip to a reader who had not yet wondered. If the footer note ever
// goes, this strip is one of the places that relied on it.
//
// THE STRIP IS HALF DERIVED AND HALF LOCAL, and the split is the point.
//
// The PROGRAMMES half is read out of club.ts, so this strip lists exactly the
// programmes /programmes documents — no more, no fewer. It used to name two of
// them by hand while that page described seven, which is the kind of drift that
// is invisible until somebody notices the ticker is advertising a shorter list
// than the page it sits two clicks from. Add a programme to PROGRAMMES and it
// appears here; remove one and it leaves.
//
// The PROJECTS half stays a local array, and deliberately does NOT move into
// club.ts. Everything in that file is data some other section derives a claim
// from, and a reader meeting this list there would reasonably assume the club
// has a relationship with each entry. It does not: this is the ecosystem the
// work lands in, which is a weaker and truer statement.
//
// NOTHING HERE IS A CLAIM ABOUT WORK DONE, and that now holds without exception.
// OWASP was briefly on this list because it is the one upstream project with a
// verified contribution behind it — which is exactly why it does not belong on a
// decorative strip. A real, checkable contribution is worth more stated as a
// contribution, where it links to the evidence, than dissolved into a scrolling
// band of names a reader cannot tell apart. It is already on /projects, ranked
// and sourced. Keep this list aspirational-but-honest: ecosystems, not receipts.

import { useState } from "react";
import { PROGRAMME_SHORT } from "@/content/club";

/** Every programme the site documents, in the order club.ts declares them. */
const PROGRAMMES_IN_STRIP = Object.values(PROGRAMME_SHORT);

/** Projects and foundations the work lands in. Names only — see the note above. */
const PROJECTS_IN_STRIP = [
  "Linux Foundation",
  "Kubernetes",
  "PyTorch",
  "CNCF",
  "Apache",
  "Mozilla",
  "Rust",
  "Node.js",
  "Django",
];

// INTERLEAVED rather than concatenated. Two solid blocks would scroll past as
// "here are the programmes… and now here are the projects", which invites the
// reader to treat the second block as a partner list. Alternating them keeps the
// strip reading as one undifferentiated ecosystem band, which is what it is.
//
// zip-longest rather than zip: the two lists are different lengths (7 and 10) and
// a plain pairwise walk would silently drop the tail of the longer one.
const ECOSYSTEM = Array.from(
  { length: Math.max(PROGRAMMES_IN_STRIP.length, PROJECTS_IN_STRIP.length) },
  (_, i) => [PROGRAMMES_IN_STRIP[i], PROJECTS_IN_STRIP[i]],
)
  .flat()
  .filter(Boolean) as string[];

/**
 * One copy of the list.
 *
 * The second copy is `aria-hidden`: it is a rendering trick to make the loop
 * seamless, and a screen reader announcing the whole list twice would be
 * reporting the trick rather than the content. (It said "six organisations" when
 * the list was hardcoded at six; the count is derived now, so naming it here
 * would just be a number to forget to update.)
 */
function Row({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <ul className="ticker-row" aria-hidden={duplicate || undefined}>
      {ECOSYSTEM.map((name) => (
        <li key={name} className="ticker-item">
          <span>{name}</span>
          {/* Decorative in both copies — it is a bullet, and "sparkle sparkle
              sparkle" between every name is noise in the accessibility tree. */}
          <span aria-hidden className="ticker-sep">
            ✦
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function Ticker() {
  const [paused, setPaused] = useState(false);

  return (
    <div className="section pt-12 sm:pt-16">
      {/* Inside the measure rather than full-bleed. A band that runs edge to edge
          has to carry the `50% - 50vw` offsets AND their correction for the
          reserved outline panel (see the :root[data-outline="1"] block in
          globals.css); a strip that stops at the container needs neither and
          reads as an object on the page, which suits the black keyline and hard
          shadow the rest of this design gives its physical tiles. */}
      {/* THE FRAME AND THE MASKED VIEWPORT ARE TWO ELEMENTS, and they have to be.
          `.ticker` carries a mask that fades its own left and right edges, and a
          mask applies to every descendant — with the button inside it, the
          control fades out exactly as it approaches the edge it is pinned to.
          So the frame holds the border, the shadow and the button, and the
          masked, clipped viewport is a child of it.

          `data-paused` also lives out here so it can sit above the mask. */}
      <div
        className="relative rounded-tile border-2 border-black bg-raise shadow-[4px_4px_0_0_#000]"
        data-paused={paused ? "true" : undefined}
      >
        <div className="ticker rounded-tile py-4">
          <div className="ticker-track">
            <Row />
            <Row duplicate />
          </div>
        </div>

        {/* Pinned over the right-hand fade, which is the one strip of the frame
            where no name is ever fully opaque — so the control never lands on
            top of readable content.

            The label is the STATE THE PRESS WILL PRODUCE, not the current one:
            a button announced as "paused" while the strip is moving describes
            the world backwards. The glyphs are aria-hidden and the button gets
            its whole accessible name from the label, so nothing depends on a
            screen reader making sense of "❚❚". */}
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          aria-label={
            paused
              ? "Resume the scrolling list of programmes"
              : "Pause the scrolling list of programmes"
          }
          // THE BUTTON IS 44px AND THE CIRCLE INSIDE IT IS 32px. Same split as
          // `.tap` further down globals.css, for the same reason: the hit area is
          // the floor WCAG 2.5.5 asks for and scripts/qa.mjs enforces, while the
          // drawn control stays small enough not to look like a call to action on
          // a strip that carries no information.
          //
          // A single 32px button would have been a real defect rather than a
          // reported one — this is the only way to stop the marquee, so it is the
          // last control on the page that should be hard to hit.
          className="group absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center"
        >
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-full border border-seam bg-raise text-[13px] leading-none text-haze transition-colors duration-200 group-hover:border-accent/60 group-hover:text-accent"
          >
            {paused ? "▶" : "❚❚"}
          </span>
        </button>
      </div>

    </div>
  );
}
