// Developer iconography, drawn inline.
//
// The brief names Lucide / Simple Icons / FontAwesome. None of them is installed,
// and none is added: this project's whole dependency list is next, react and
// react-dom, and pulling an icon package for four glyphs would ship a runtime and
// a tree-shaking problem to solve a drawing problem. These are the Lucide paths
// (ISC licensed) transcribed onto the same 24x24 grid with the same 2px round
// stroke, which is what makes them look like a set rather than four drawings.
//
// Same approach the existing Doodle component already takes on this page, for the
// same reasons: no request, no layout shift, no glyph that can go missing.
//
// currentColor throughout, so an icon inherits from whatever it sits inside — the
// pill, the button, the headline — and follows the theme with no per-icon rule.
// `em` sizing rather than px for the same reason: an icon in a 44px headline and
// an icon in a 15px button both want to be about the height of the text.

type Name = "git-pull-request" | "git-merge" | "dollar-sign" | "arrow-right";

const PATHS: Record<Name, JSX.Element> = {
  // The PR glyph: two nodes, a branch arcing into the trunk, one line running down.
  "git-pull-request": (
    <>
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 0 1 2 2v7" />
      <line x1="6" x2="6" y1="9" y2="21" />
    </>
  ),
  // The merge glyph, for the phrase about landing in the commit log.
  "git-merge": (
    <>
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M6 21V9a9 9 0 0 0 9 9" />
    </>
  ),
  "dollar-sign": (
    <>
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </>
  ),
  "arrow-right": (
    <>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </>
  ),
};

export default function Icon({
  name,
  className = "",
  size = "1em",
  strokeWidth = 2,
}: {
  name: Name;
  className?: string;
  size?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      // Decorative in every current use — each one sits beside text that already
      // says the same thing, so announcing it would just double the label.
      aria-hidden
      focusable="false"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
