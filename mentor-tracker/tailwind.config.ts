import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a14",       // near-black base with a cool cast
        panel: "#12121f",     // raised surface
        edge: "#242438",      // hairline borders
        muted: "#8b8fa7",     // secondary text
        pink: "#ec4899",      // primary accent
        blue: "#3b82f6",      // secondary accent
        sky: "#38bdf8",       // bright blue for links/hover
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(236,72,153,0.35), 0 8px 30px -12px rgba(59,130,246,0.45)",
      },
      backgroundImage: {
        "pink-blue": "linear-gradient(120deg, #ec4899 0%, #a855f7 45%, #3b82f6 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
