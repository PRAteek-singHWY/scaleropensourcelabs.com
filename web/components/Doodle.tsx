// Hand-drawn accents.
//
// Their page is scattered with them — squiggles, arrows, sparkles, underlines — and
// they are doing a real job rather than decorating: on a page of flat blocks and
// straight rules, a wobbly line is the only thing that reads as made by a person.
// That is the entire difference in register between a student club and a
// prospectus.
//
// Authored as SVG paths rather than sourced as images for three reasons: no network
// request, they inherit `currentColor` so they theme themselves, and they scale
// without assets. The wobble is deliberate and hand-plotted — a mathematically
// smooth bezier reads as a corporate flourish, which is the opposite of the point.
//
// Every one is aria-hidden. They carry no information; a screen reader announcing
// "squiggle" would be pure noise.

import type { CSSProperties } from "react";

type Kind =
  | "squiggle"
  | "arrow"
  | "sparkle"
  | "underline"
  | "bolt"
  | "crown"
  | "curve-arrow";

const PATHS: Record<Kind, { d: string; box: string; fill?: boolean }> = {
  // Two short strokes, as they use beside a heading.
  squiggle: {
    box: "0 0 34 22",
    d: "M2 15c4-6 7-9 10-8s2 7 6 6 5-6 9-9M4 20c3-4 6-6 8-5",
  },
  // A hand-drawn arrow, for pointing at an action.
  arrow: {
    box: "0 0 40 24",
    d: "M2 14c8-6 16-9 25-8m0 0-6-4m6 4-5 5M30 6c3 1 6 3 8 5",
  },
  // A four-point star, the "this bit matters" mark.
  sparkle: {
    box: "0 0 24 24",
    d: "M12 2c1 6 3 8 9 10-6 2-8 4-9 10-1-6-3-8-9-10 6-2 8-4 9-10Z",
    fill: true,
  },
  // The rough underline that sits beneath an emphasised phrase.
  underline: {
    box: "0 0 120 12",
    d: "M2 7c20-4 44-5 74-3 14 1 25 3 42 5",
  },
  bolt: {
    box: "0 0 20 26",
    d: "M11 2 3 15h6l-2 9 10-14h-6l2-8Z",
    fill: true,
  },
  // A three-point crown, for sitting above the top badge. Filled rather than
  // stroked: at the 20px this renders at, a 2.4px outline closes up the notches
  // between the points and the whole thing reads as a blob.
  crown: {
    box: "0 0 28 20",
    d: "M2 17 4 4l6 6 4-8 4 8 6-6 2 13H2Z",
    fill: true,
  },
  // A long curved arrow, for pointing at a button from above. Deliberately drawn
  // with an uneven arc and a slightly crooked head — a symmetrical one reads as a
  // UI glyph, which is the opposite of what a hand-drawn accent is for.
  "curve-arrow": {
    box: "0 0 64 40",
    d: "M4 6c14 2 26 9 33 21m0 0 1-9m-1 9-9-3",
  },
};

export default function Doodle({
  kind,
  className = "",
  style,
  draw = false,
}: {
  kind: Kind;
  className?: string;
  // For the one caller that colours a doodle from a CSS variable rather than a
  // token utility: the track cards each set their own --tint, and a Tailwind
  // arbitrary value cannot read a custom property that is scoped to an ancestor.
  style?: CSSProperties;
  // Opt this doodle in to the draw-on-scroll stroke animation — the line plots
  // itself left to right as its section arrives, which is the one piece of motion
  // that actually looks like somebody drawing rather than a box sliding.
  //
  // Opt-IN rather than automatic, for the same reason the reveals target sections
  // and not paragraphs: there are doodles inside list rows and card corners, and a
  // page where nine little squiggles redraw themselves on every scroll is a page
  // that fidgets. It is on the rule under each section heading and nowhere else.
  //
  // Meaningless on a filled kind (sparkle, bolt, crown) — those have no stroke to
  // dash — so the attribute is only emitted for the stroked ones, which keeps the
  // stylesheet from matching an element it cannot affect.
  draw?: boolean;
}) {
  const p = PATHS[kind];
  return (
    <svg
      viewBox={p.box}
      className={className}
      style={style}
      aria-hidden
      focusable="false"
      fill={p.fill ? "currentColor" : "none"}
      stroke={p.fill ? "none" : "currentColor"}
      strokeWidth={p.fill ? undefined : 2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...(draw && !p.fill ? { "data-draw": "" } : {})}
    >
      {/* pathLength={1} is what makes ONE stylesheet rule serve every path here.
          stroke-dasharray is in user units, so drawing a line by dashing it
          normally means knowing that line's length — which differs per path, is
          not in this file, and would mean a getTotalLength() call per doodle at
          runtime. Declaring the length as 1 tells the renderer to scale all
          dash arithmetic to that, so `stroke-dasharray: 1; stroke-dashoffset: 1`
          is "one dash the length of the whole path, pushed entirely off the
          end" — an empty line — for any path, at any viewBox, forever.

          Set unconditionally rather than only when drawing: with no dasharray
          against it the attribute changes nothing at all, and a conditional
          would mean the SVG differs between the two modes for no gain. */}
      <path d={p.d} pathLength={1} />
    </svg>
  );
}
