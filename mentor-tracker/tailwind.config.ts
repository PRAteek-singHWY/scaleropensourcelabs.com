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
        // Space. Blue-cast rather than neutral grey so the cyan sits in the same
        // family as its ground instead of vibrating against it.
        void: "#05070D", // base
        hull: "#0B0F17", // raised surface
        seam: "#1A202C", // hairline
        rime: "#F2F5FA", // primary text
        haze: "#8B95A6", // secondary text
        dust: "#4E5769", // tertiary / disabled

        // Ignition.
        plasma: "#5FD4FF", // primary accent — full-burn exhaust
        "plasma-deep": "#1E7FA8", // low step of the plasma ramp
        ember: "#FF8A3D", // single signal colour, used sparingly
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      // A real scale, not arbitrary clamps scattered through the markup.
      fontSize: {
        // Sized so a three-line headline fits a 720px-tall viewport with room for
        // the sub-copy and buttons beneath it. The first pass used 11vw, which
        // rendered ~170px on a laptop and pushed the first and last lines off
        // screen entirely — a display scale has to be checked against the shortest
        // viewport it will meet, not just the widest.
        "display-xl": ["clamp(2.5rem, 6.2vw, 5.25rem)", { lineHeight: "0.94", letterSpacing: "-0.04em" }],
        "display-lg": ["clamp(1.875rem, 3.8vw, 3.25rem)", { lineHeight: "1.02", letterSpacing: "-0.032em" }],
        "display-md": ["clamp(1.375rem, 2.2vw, 1.875rem)", { lineHeight: "1.12", letterSpacing: "-0.022em" }],
        "body-lg": ["clamp(1.0625rem, 1.5vw, 1.375rem)", { lineHeight: "1.5", letterSpacing: "-0.011em" }],
        "body": ["1rem", { lineHeight: "1.6", letterSpacing: "-0.006em" }],
        "label": ["0.6875rem", { lineHeight: "1.3", letterSpacing: "0.18em" }],
      },
      letterSpacing: { tightest: "-0.045em" },
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
