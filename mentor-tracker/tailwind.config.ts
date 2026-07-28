import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ---- Internal dashboard (/admin). Unchanged. ----
        ink: "#0a0a14", // near-black base with a cool cast
        panel: "#12121f", // raised surface
        edge: "#242438", // hairline borders
        muted: "#8b8fa7", // secondary text
        pink: "#ec4899", // primary accent
        blue: "#3b82f6", // secondary accent
        sky: "#38bdf8", // bright blue for links/hover

        // ---- Public site (ScalerOpenSourceLabs.com) ----
        //
        // A separate palette on purpose: the public site is the club's brand, the
        // dashboard is an internal tool, and they do not need to look the same.
        //
        // Violet leads because in this subject's world it is the colour of a merged
        // pull request — GitHub stamps accepted work purple. The entire site argues
        // "our members get work merged", so the accent is derived from the claim
        // rather than chosen for taste. Amber is the only signal colour, reserved
        // for the single most important number on a screen and nothing else.
        site: {
          bg: "#0B0D12", // base
          raise: "#151922", // cards, raised surfaces
          line: "#232935", // hairlines
          ink: "#EDF0F6", // primary text
          dim: "#98A1B3", // secondary text
          faint: "#5A6376", // tertiary text, disabled
          violet: "#7C5CFF", // primary accent — "merged"
          "violet-dim": "#4A3A9E", // low step of the violet ramp
          amber: "#F2A93B", // signal, used sparingly
        },
      },
      fontFamily: {
        // Archivo for display: a wide grotesque that reads institutional rather
        // than startup-y — this is an official club site with a budget line.
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        // IBM Plex Sans/Mono share a design origin in engineering documentation,
        // which is the register this site wants.
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(236,72,153,0.35), 0 8px 30px -12px rgba(59,130,246,0.45)",
        "site-lift": "0 1px 0 0 rgba(255,255,255,0.04), 0 18px 40px -24px rgba(0,0,0,0.9)",
      },
      backgroundImage: {
        "pink-blue": "linear-gradient(120deg, #ec4899 0%, #a855f7 45%, #3b82f6 100%)",
      },
      letterSpacing: {
        tightest: "-0.045em",
      },
      keyframes: {
        "grid-in": {
          "0%": { opacity: "0", transform: "scale(0.6)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "grid-in": "grid-in 320ms cubic-bezier(0.2, 0.7, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
