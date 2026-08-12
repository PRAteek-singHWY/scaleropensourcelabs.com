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

// TYPED, NOT DRAWN — and this reverses an earlier decision for a stated reason.
//
// This control used to be an SVG icon, because before that it was a Unicode glyph
// (U+25D0, U+2600, U+263E) that rendered as an empty circle when the font had no
// glyph for it. Paths always render; glyphs from the reader's font stack do not.
//
// The OSC Figma draws this control as a bordered pill containing four mono
// characters, so it is text again — but text we SHIP the font for, self-hosted by
// next/font, which is the thing the Unicode version got wrong. JetBrains Mono is
// already loaded for the nav beside it, and Latin capitals are not an exotic
// codepoint. So this is not a return to the bug.
//
// The frames read "LGHT" on every one of the fourteen. I have kept that spelling
// rather than expanding it to LIGHT: four characters keeps all three states the same
// width, so the pill does not resize as the reader cycles it, and a control that
// changes width on click nudges the Join button beside it. SYS / LGHT / DARK is the
// set. See the note in the component for the accessible name, which is spelled out
// properly and is what a screen reader announces.
const GLYPH: Record<Mode, string> = {
  system: "SYS",
  light: "LGHT",
  dark: "DARK",
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
      // 44px tall on touch and 30px on pointer, which is the frames' height — the
      // touch-target floor still governs the small end, so the shrink is `min-h`
      // rather than a fixed height that would drop under it.
      className="flex h-11 min-w-[3.75rem] items-center justify-center rounded-full border border-seam px-3 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-haze transition-colors duration-300 ease-glide hover:border-accent/60 hover:text-ink sm:h-[1.875rem]"
    >
      {/* Suppress until the saved value is known, or the label flips on hydration.
          THE SPAN IS LOAD-BEARING BEYOND THE FLICKER: scripts/smoke.mjs proves the
          bundle actually ran by reading this element's computed opacity, because it
          is 1 only after the effect above has set `ready`. Removing the wrapper, or
          moving the opacity onto the button, silently turns the site's only
          hydration check into a check of nothing. */}
      <span
        aria-hidden
        className="flex items-center justify-center"
        style={{ opacity: ready ? 1 : 0 }}
      >
        {GLYPH[mode]}
      </span>
    </button>
  );
}
