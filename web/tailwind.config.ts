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
        //
        // The rgb(... / <alpha-value>) wrapper is required, not stylistic: Tailwind
        // substitutes the alpha into that slot for modifiers like bg-bg/70. Written
        // as a bare var(--bg) the modifier produces an invalid colour and the
        // element silently renders transparent.
        bg: "rgb(var(--bg) / <alpha-value>)",
        band: "rgb(var(--band) / <alpha-value>)",
        raise: "rgb(var(--raise) / <alpha-value>)",
        sunk: "rgb(var(--sunk) / <alpha-value>)",
        seam: "rgb(var(--seam) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        haze: "rgb(var(--haze) / <alpha-value>)",
        dust: "rgb(var(--dust) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-soft": "rgb(var(--accent-soft) / <alpha-value>)",
        ember: "rgb(var(--ember) / <alpha-value>)",

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
        "display-lg": ["clamp(1.75rem, 3.4vw, 2.75rem)", { lineHeight: "1.08", letterSpacing: "-0.003em" }],
        // Apple's tracking is POSITIVE below roughly 40px. Measured off
        // apple.com/mac: 80px/-1.2px (-0.015em), 48px/-0.144px (-0.003em), then it
        // crosses zero — 32px/+0.128px (+0.004em), 28px/+0.196px (+0.007em),
        // 24px/+0.216px (+0.009em). Every step here was negative, so everything
        // below the hero was being over-tightened. Optical sizing runs the other
        // way at text sizes: large type needs closing up, small type needs opening
        // out, and copying the display value downward is the usual mistake.
        "display-md": ["clamp(1.25rem, 2vw, 1.625rem)", { lineHeight: "1.18", letterSpacing: "0.006em" }],
        "body-lg": ["clamp(1.0625rem, 1.5vw, 1.375rem)", { lineHeight: "1.5", letterSpacing: "0.008em" }],
        "body": ["1rem", { lineHeight: "1.6", letterSpacing: "0.009em" }],
        "label": ["0.6875rem", { lineHeight: "1.3", letterSpacing: "0.18em" }],
      },
      // -0.015em is Apple's 80px value exactly, so it belongs on display-xl only.
      letterSpacing: { tightest: "-0.015em" },
      borderRadius: {
        // Apple's tiles measured 18px on /store and 28px on /mac — small cards and
        // large feature panels respectively. Ours were 10-14px, which reads as a
        // different, tighter system.
        tile: "18px",
        panel: "28px",
      },
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
