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

type Name =
  // The originals, used on the marketing pages.
  | "git-pull-request"
  | "git-merge"
  | "dollar-sign"
  | "arrow-right"
  // The dashboard set — the app shell's sidebar, and one per panel header.
  | "grid"
  | "folder"
  | "settings"
  | "help"
  | "log-out"
  | "chart"
  | "megaphone"
  | "compass"
  | "user"
  | "pin"
  | "info"
  | "external"
  | "check"
  | "plus"
  | "calendar"
  | "network";

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

  // ---------------------------------------------------------------------------
  // THE DASHBOARD SET. Added for the app shell and its panel headers, drawn to the
  // same rules as the four above: a 24x24 box, no fills, strokes that inherit
  // currentColor and round caps, so one <Icon> renders identically at 14px beside a
  // label and at 20px inside a tinted disc.
  //
  // Deliberately geometric rather than illustrative. These sit next to mono
  // uppercase labels doing the same job the label does, so anything with more
  // detail than a signpost competes with the words it is announcing.
  // ---------------------------------------------------------------------------
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  folder: (
    <path d="M4 20a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2Z" />
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.2 9.2a2.8 2.8 0 0 1 5.5.8c0 1.9-2.7 2.4-2.7 4" />
      <path d="M12 17.5h.01" />
    </>
  ),
  "log-out": (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="M7 15v-3M12 15V8M17 15v-6" />
    </>
  ),
  megaphone: (
    <>
      <path d="m3 11 15-6v14L3 13Z" />
      <path d="M3 11v2a2 2 0 0 0 2 2h1l1.5 5H10l-1.5-5" />
      <path d="M21 10v4" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5Z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  pin: (
    <>
      <path d="M12 17v5" />
      <path d="M9 3h6l-1 6 3 3v2H7v-2l3-3Z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.5h.01" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  network: (
    <>
      <rect x="9" y="3" width="6" height="5" rx="1" />
      <rect x="2" y="16" width="6" height="5" rx="1" />
      <rect x="16" y="16" width="6" height="5" rx="1" />
      <path d="M12 8v4M5 16v-2h14v2" />
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
