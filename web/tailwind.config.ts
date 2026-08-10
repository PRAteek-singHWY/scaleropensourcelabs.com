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
        pop: "rgb(var(--pop) / <alpha-value>)",
        raise: "rgb(var(--raise) / <alpha-value>)",
        sunk: "rgb(var(--sunk) / <alpha-value>)",
        seam: "rgb(var(--seam) / <alpha-value>)",
        // The softer edge — card borders and the dot grid. See --edge in globals.css
        // for why it is a separate value from --seam rather than a reuse of it.
        edge: "rgb(var(--edge) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        haze: "rgb(var(--haze) / <alpha-value>)",
        dust: "rgb(var(--dust) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-soft": "rgb(var(--accent-soft) / <alpha-value>)",
        ember: "rgb(var(--ember) / <alpha-value>)",
        flag: "rgb(var(--flag) / <alpha-value>)",

      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        // Heavy condensed poster caps, for headlines only.
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        // Condensed caps for eyebrows, buttons and chips.
        label: ["var(--font-label)", "system-ui", "sans-serif"],
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
        // LINE HEIGHT, loosened a step across the whole scale.
        //
        // The old values were Apple's, measured: 84/80 = 1.05 at display size. They
        // are correct for Apple's face and wrong for ours. SF Pro has a compact
        // vertical footprint; Syne — the display face here — has tall ascenders, deep
        // descenders and, at 800, very heavy stems. At 1.08 a two-line heading like
        // "Somebody else picked them. GSoC, LFX Mentorship…" put the descender of
        // "picked" almost into the cap-height of the line beneath it, and the pair of
        // lines fused into one dark block that has to be decoded rather than read.
        //
        // The rule this follows: leading scales DOWN as size goes up, but the floor is
        // set by the face's own extenders, not by a ratio copied from another type
        // system. Every step below is one notch looser than the value it replaces, and
        // the ordering (1.12 < 1.22 < 1.32 < 1.62 < 1.72) is preserved — display type
        // still sets tighter than body, which is the part of Apple's system that does
        // transfer.
        // SIZE, raised a step on every sans-carrying entry — for a reason specific to
        // this typeface rather than a general "make it bigger".
        //
        // Plus Jakarta Sans is a geometric humanist with long ascenders and
        // descenders, and it spends that vertical room on the EXTENDERS rather than
        // on the x-height. So its lowercase sits visibly shorter in the line than a
        // large-x-height grotesque — Inter, Helvetica, SF — set at the identical px
        // value. Nothing here was "too small" by the numbers; the numbers were
        // inherited from a system built on a face that puts more of the em into the
        // part of the letter you actually read.
        //
        // The correction is therefore on font-size, not on some x-height trick:
        // `font-size-adjust` would reach the same rendered x-height by scaling the
        // face, but it does it invisibly — the computed size stays 16px while the
        // glyphs render as ~17px, so every later measurement, clamp and rem
        // calculation on this page would be reasoning about a number that is not what
        // is on screen. Stating the real size keeps the scale honest.
        //
        // Caps-only steps were deliberately NOT bumped by that pass: `label` below,
        // and .chip/.btn/.step/.num/.status-pill in globals.css. Capitals have no
        // x-height to be short of — they already fill from baseline to cap-height —
        // so the same increase there would just make the badges bigger for no
        // legibility gain. Nor was `xs`: 27 of its 28 uses in this codebase are
        // `font-mono`, and JetBrains Mono has a large x-height and does not have this
        // problem.
        //
        // THE +2px PASS BELOW OVERRIDES THAT EXEMPTION, and the reasoning above is
        // kept rather than deleted because the two passes are answering different
        // questions. The x-height correction was per-face and therefore selective:
        // only the steps carrying short lowercase were wrong, so only those moved.
        // "Raise everything by 2px" is a uniform instruction about the page as a
        // whole, and a scale where six steps grew and four held would no longer be
        // the scale either pass designed — the caps would end up a step small
        // relative to the sentences they sit beside, which is the reverse of the
        // problem the first pass fixed.
        // THE +2px PASS. Every step below is exactly 2px larger than the value it
        // replaces, per an explicit instruction to raise the whole page by that much.
        //
        // On the fluid steps that means `calc(<vw> + 0.125rem)` in the middle slot as
        // well as +2px on both ends, and the calc is the part worth not losing. Bump
        // only the min and max and the clamp still resolves to the RAW vw value at
        // every viewport between them — so the type would grow at the two extremes
        // and be unchanged across the middle of the range, which is most desktop
        // widths. The offset has to ride the interpolated term to be a real +2px
        // everywhere rather than at the endpoints only.
        "display-xl": ["clamp(2.875rem, calc(6.2vw + 0.125rem), 5.375rem)", { lineHeight: "1.12", letterSpacing: "-0.015em" }],
        "display-lg": ["clamp(2.0625rem, calc(3.6vw + 0.125rem), 3.125rem)", { lineHeight: "1.22", letterSpacing: "-0.003em" }],
        // Apple's tracking is POSITIVE below roughly 40px. Measured off
        // apple.com/mac: 80px/-1.2px (-0.015em), 48px/-0.144px (-0.003em), then it
        // crosses zero — 32px/+0.128px (+0.004em), 28px/+0.196px (+0.007em),
        // 24px/+0.216px (+0.009em). Every step here was negative, so everything
        // below the hero was being over-tightened. Optical sizing runs the other
        // way at text sizes: large type needs closing up, small type needs opening
        // out, and copying the display value downward is the usual mistake.
        "display-md": ["clamp(1.5rem, calc(2.1vw + 0.125rem), 1.9375rem)", { lineHeight: "1.32", letterSpacing: "0.006em" }],
        // Body copy gets the same treatment for a different reason: 1.5 is the WCAG
        // 1.4.8 floor for a block of text, not a comfortable value, and this page's
        // paragraphs run to a 44em measure. Long lines need more leading than short
        // ones to stop the eye returning to the line it just left.
        "body-lg": ["clamp(1.3125rem, calc(1.6vw + 0.125rem), 1.625rem)", { lineHeight: "1.62", letterSpacing: "0.008em" }],
        // 19px. Was 17px — Apple's body size, and the reference the tracking values
        // above were measured from. The tracking is deliberately NOT re-derived to
        // match the new size: optical sizing moves in fractions of an em across a 2px
        // step, and re-measuring one step of a scale that was taken from a single
        // source is how the halves of it start disagreeing.
        "body": ["1.1875rem", { lineHeight: "1.72", letterSpacing: "0.009em" }],
        "label": ["0.8125rem", { lineHeight: "1.3", letterSpacing: "0.18em" }],
        // Tailwind's own `sm`, overridden rather than left at its 0.875rem/1.25rem
        // default. 17 of its 22 uses here are sans — card body copy, form help text,
        // the FAQ answers — so it has the same short-lowercase problem as `body` and
        // needs the same correction. The lineHeight has to be restated: Tailwind's
        // default pairs a FIXED 1.25rem with this step, which at the new size would
        // compute to 1.33 and come out tighter than the value it replaced.
        "sm": ["1.0625rem", { lineHeight: "1.6" }],
        // `xs` now has to be stated too, and it did not before. It was left at
        // Tailwind's own 0.75rem because 27 of its 28 uses are font-mono and JetBrains
        // Mono has no x-height problem to correct — but "everything +2px" is a
        // different instruction from the x-height correction that shaped the steps
        // above, and an unstated step is one that would silently not move.
        //
        // The leading is a RATIO rather than the fixed 1rem Tailwind pairs with this
        // step. Carrying 1rem across to a 14px size gives 1.14 — a 12px step's leading
        // on a 14px glyph, which is the one way a font bump can make text harder to
        // read. 1.3333 is exactly the ratio the default pair described.
        "xs": ["0.875rem", { lineHeight: "1.3333" }],
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
        // Measured off apple.com/mac: their interaction transform runs
        // `transform 0.3s cubic-bezier(0, 0, 0.5, 1)` on 47 elements. Flatter out
        // of the gate than `glide` and it stops dead rather than easing in.
        apple: "cubic-bezier(0, 0, 0.5, 1)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(1.25rem)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // `float` AND `accent-pulse` ARE DELIBERATELY NOT HERE. Both are written
        // as plain @keyframes in globals.css, beside the .chip/.sticker/.card
        // rules that consume them.
        //
        // Not a style preference — declaring them here would silently break one
        // of the two. Tailwind emits a @keyframes block only when the matching
        // `animate-*` utility is actually generated from the content globs, and
        // `animate-accent-pulse` appears in no component: the card hover is
        // written as `animation: accent-pulse ...` in CSS. The keyframes would
        // have been purged, the declaration would have referenced a name that
        // does not exist, and the pulse would simply never run — with no build
        // error and nothing in the output to grep for.
        //
        // `float` would have survived only by accident, because Hero.tsx happens
        // to use `animate-float`. Delete those two badges and every margin
        // sticker and section eyebrow on the page stops floating, for reasons
        // located in a different file. Keyframes referenced from CSS belong in
        // CSS; the theme keeps only the `animate-float` shorthand below, which is
        // generated from theme.animation and does not need the keyframe here.
      },
      animation: {
        rise: "rise 900ms cubic-bezier(0.16, 1, 0.3, 1) both",
        // The shorthand for Hero.tsx's two corner badges. The keyframes it names
        // live in globals.css — see the note above.
        //
        // 3s stays. The badges are held out of phase by a 1.5s delay set inline
        // in Hero.tsx, and that number is half of this one — change the duration
        // here and the pair falls back into step without anything reporting it.
        float: "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
