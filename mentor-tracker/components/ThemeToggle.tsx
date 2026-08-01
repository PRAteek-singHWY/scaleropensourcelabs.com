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

const ICON: Record<Mode, string> = { system: "◐", light: "☀", dark: "☾" };
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
      className="flex h-7 w-7 items-center justify-center rounded-full border border-seam text-xs text-haze transition-colors duration-300 ease-glide hover:border-accent/60 hover:text-ink"
    >
      {/* Suppress until the saved value is known, or the icon flips on hydration. */}
      <span aria-hidden style={{ opacity: ready ? 1 : 0 }}>
        {ICON[mode]}
      </span>
    </button>
  );
}
