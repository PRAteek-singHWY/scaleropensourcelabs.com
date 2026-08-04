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

type Kind = "squiggle" | "arrow" | "sparkle" | "underline" | "bolt";

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
};

export default function Doodle({
  kind,
  className = "",
}: {
  kind: Kind;
  className?: string;
}) {
  const p = PATHS[kind];
  return (
    <svg
      viewBox={p.box}
      className={className}
      aria-hidden
      focusable="false"
      fill={p.fill ? "currentColor" : "none"}
      stroke={p.fill ? "none" : "currentColor"}
      strokeWidth={p.fill ? undefined : 2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={p.d} />
    </svg>
  );
}
