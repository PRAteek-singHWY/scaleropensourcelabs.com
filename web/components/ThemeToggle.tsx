"use client";

// Theme switch: system → light → dark → system.
//
// "System" is a real, selectable state rather than just the starting value. If the
// only options are light and dark, choosing one permanently detaches the site from
// the reader's OS preference — including from their automatic sunset switch — with
// no way back.
//
// The chosen value is written to <html data-theme>, which beats the
// prefers-color-scheme media query in BOTH directions. That matters: a reader on a
// dark-set machine who picks light has to actually get light.
//
// Anti-flash is handled by an inline script in the layout that runs before paint.
// Doing it here would be too late — the page would render light, then snap to dark
// on hydration.

import { useEffect, useState } from "react";

type Mode = "system" | "light" | "dark";
const ORDER: Mode[] = ["system", "light", "dark"];
const KEY = "osc-theme";

function apply(mode: Mode) {
  const root = document.documentElement;
  if (mode === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
}

// Drawn, not typed. These were Unicode glyphs (U+25D0, U+2600, U+263E) until a
// headless render showed an empty circle: the font had no glyph, so the only
// visual the control has silently vanished. A symbol that depends on the
// reader's installed fonts is not a reliable icon. Paths always render.
const ICON: Record<Mode, JSX.Element> = {
  system: (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 2.5a5.5 5.5 0 0 0 0 11z" fill="currentColor" />
    </svg>
  ),
  light: (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="3.1" stroke="currentColor" strokeWidth="1.4" />
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M8 1v1.7M8 13.3V15M15 8h-1.7M2.7 8H1M12.9 3.1l-1.2 1.2M4.3 11.7l-1.2 1.2M12.9 12.9l-1.2-1.2M4.3 4.3 3.1 3.1" />
      </g>
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden>
      <path
        d="M13.5 9.9A5.8 5.8 0 0 1 6.1 2.5a5.8 5.8 0 1 0 7.4 7.4z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  ),
};
const LABEL: Record<Mode, string> = {
  system: "Match system",
  light: "Light",
  dark: "Dark",
};

export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(KEY) as Mode | null;
    if (saved && ORDER.includes(saved)) setMode(saved);
    setReady(true);
  }, []);

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
    setMode(next);
    localStorage.setItem(KEY, next);
    apply(next);
  };

  return (
    <button
      type="button"
      onClick={cycle}
      // The label states the CURRENT setting, not the next one — a control that
      // announces what it will become is guesswork for a screen reader user.
      aria-label={`Theme: ${LABEL[mode]}. Activate to change.`}
      title={`Theme: ${LABEL[mode]}`}
      className="flex h-11 w-11 items-center justify-center sm:h-9 sm:w-9 rounded-full border border-seam text-xs text-haze transition-colors duration-300 ease-glide hover:border-accent/60 hover:text-ink"
    >
      {/* Suppress until the saved value is known, or the icon flips on hydration. */}
      <span
        aria-hidden
        className="flex items-center justify-center"
        style={{ opacity: ready ? 1 : 0 }}
      >
        {ICON[mode]}
      </span>
    </button>
  );
}
