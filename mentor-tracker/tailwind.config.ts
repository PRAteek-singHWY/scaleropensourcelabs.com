import type { Config } from "tailwindcss";

// Design system for scaleropensourcelabs.com
//
// TYPE — one family, three weights, doing all the work.
// Apple's coherence doesn't come from pairing display and body faces; it comes
// from using a single grotesque everywhere and letting size, weight and spacing
// carry the hierarchy. So: Instrument Sans across the whole site, with JetBrains
// Mono reserved strictly for identifiers (repo names, counts, labels) where
// tabular figures and a technical register are doing real work.
//
// COLOUR — derived from the subject, not from taste.
// The hero is a rocket ascent, so the palette is deep space plus ignition. The
// accent is CYAN, because a rocket at full burn exhausts blue-white — orange
// flame is a low-temperature, cartoon reading of the same object. It also
// sidesteps the near-black-plus-acid-green and near-black-plus-vermilion pairs
// that every AI-generated dark site currently arrives at. Ember is the warm
// counterpoint and appears almost nowhere: one number, one state, then stop.

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Every colour resolves through a CSS variable, so a component never knows
        // which theme is active and light/dark can never drift apart. The variables
        // and their per-theme values live in app/globals.css.
        bg: "var(--bg)",
        raise: "var(--raise)",
        sunk: "var(--sunk)",
        seam: "var(--seam)",
        ink: "var(--ink)",
        haze: "var(--haze)",
        dust: "var(--dust)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        ember: "var(--ember)",

        // The always-dark set, for sections that stay night in both themes.
        void: "var(--void)",
        "void-raise": "var(--void-raise)",
        "void-seam": "var(--void-seam)",
        "void-ink": "var(--void-ink)",
        "void-haze": "var(--void-haze)",
        "void-dust": "var(--void-dust)",
        "void-accent": "var(--void-accent)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      // A real scale, not arbitrary clamps scattered through the markup.
      fontSize: {
        // Tracking measured off apple.com/in/store rather than guessed: their H1
        // is 80px with -1.2px letter-spacing, i.e. -0.015em. The first pass here
        // used -0.04em — nearly three times tighter — which is why it read as
        // cramped and shouty instead of composed. Apple is a far lighter touch
        // than it looks; the authority comes from size and space, not squeeze.
        //
        // Line-height likewise: theirs is 84/80 = 1.05, not the sub-1.0 crush.
        "display-xl": ["clamp(2.5rem, 6vw, 5rem)", { lineHeight: "1.05", letterSpacing: "-0.015em" }],
        "display-lg": ["clamp(1.75rem, 3.4vw, 2.75rem)", { lineHeight: "1.08", letterSpacing: "-0.014em" }],
        "display-md": ["clamp(1.25rem, 2vw, 1.625rem)", { lineHeight: "1.18", letterSpacing: "-0.012em" }],
        "body-lg": ["clamp(1.0625rem, 1.5vw, 1.375rem)", { lineHeight: "1.5", letterSpacing: "-0.011em" }],
        "body": ["1rem", { lineHeight: "1.6", letterSpacing: "-0.006em" }],
        "label": ["0.6875rem", { lineHeight: "1.3", letterSpacing: "0.18em" }],
      },
      letterSpacing: { tightest: "-0.015em" },
      transitionTimingFunction: {
        // The Apple feel lives here as much as anywhere: a long, slow ease-out
        // rather than the default's symmetric curve.
        glide: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(1.25rem)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        rise: "rise 900ms cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
