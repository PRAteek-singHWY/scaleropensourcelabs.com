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
        // THERE WAS A +2px PASS AFTER THAT ONE, AND IT HAS BEEN REVERSED. It raised
        // every step below — the caps ones too, overriding the exemption above on the
        // grounds that "raise the whole page by 2px" is a uniform instruction and a
        // scale where six steps grew and four held is no longer the scale either pass
        // designed. That reasoning was sound and the result was still too big: on a
        // 1280px viewport it put 19px under every card row and 16px under every
        // eyebrow, and the page read as though it were being viewed at 110% zoom.
        //
        // So every step is back down by exactly 2px, which is the inverse of the
        // instruction that raised it — not a fresh set of numbers. What that lands on
        // is the scale the x-height pass produced and nothing earlier: 17px body,
        // which is Apple's body size and the reference the tracking values here were
        // measured from, 15px sm, 12px xs, 11px label. The per-face correction that
        // put them there is untouched, because it was answering a different question
        // and it was right.
        //
        // On the fluid steps the reversal is `calc(<vw> + 0.125rem)` back to a raw
        // `<vw>`, as well as -2px on both ends, and the calc is the part worth not
        // getting wrong in either direction. Move only the min and max and the clamp
        // still resolves to the RAW vw value at every viewport between them — so the
        // type would change at the two extremes and hold across the middle of the
        // range, which is most desktop widths. The offset has to ride the interpolated
        // term to be a real 2px everywhere rather than at the endpoints only.
        // THE vw TERMS ARE BACK AT THEIR FULL VALUE. They were multiplied by 0.75 to
        // ride the `html { font-size: 75% }` that used to sit in globals.css, so that
        // headings shrank across the middle of the viewport range along with the rem
        // ends. That root is gone — it was making the whole site render at three
        // quarters of the sizes measured below — so a 0.75 vw term would now hold the
        // OLD size across most desktop widths while the ends grew, which is the exact
        // failure the note above describes, in reverse.
        "display-xl": ["clamp(2.75rem, 6.2vw, 5.25rem)", { lineHeight: "1.12", letterSpacing: "-0.015em" }],
        "display-lg": ["clamp(1.9375rem, 3.6vw, 2.9375rem)", { lineHeight: "1.22", letterSpacing: "-0.003em" }],
        // Apple's tracking is POSITIVE below roughly 40px. Measured off
        // apple.com/mac: 80px/-1.2px (-0.015em), 48px/-0.144px (-0.003em), then it
        // crosses zero — 32px/+0.128px (+0.004em), 28px/+0.196px (+0.007em),
        // 24px/+0.216px (+0.009em). Every step here was negative, so everything
        // below the hero was being over-tightened. Optical sizing runs the other
        // way at text sizes: large type needs closing up, small type needs opening
        // out, and copying the display value downward is the usual mistake.
        "display-md": ["clamp(1.375rem, 2.1vw, 1.8125rem)", { lineHeight: "1.32", letterSpacing: "0.006em" }],
        // Body copy gets the same treatment for a different reason: 1.5 is the WCAG
        // 1.4.8 floor for a block of text, not a comfortable value, and this page's
        // paragraphs run to a 44em measure. Long lines need more leading than short
        // ones to stop the eye returning to the line it just left.
        "body-lg": ["clamp(1.1875rem, 1.6vw, 1.5rem)", { lineHeight: "1.62", letterSpacing: "0.008em" }],
        // 17px — Apple's body size, and the reference the tracking values above were
        // measured from. It spent a while at 19px and is back. The tracking was
        // deliberately NOT re-derived when it went up and is not re-derived now that
        // it has come down: optical sizing moves in fractions of an em across a 2px
        // step, and re-measuring one step of a scale that was taken from a single
        // source is how the halves of it start disagreeing.
        "body": ["1.125rem", { lineHeight: "1.72", letterSpacing: "0.009em" }],
        // THE BOTTOM THREE STEPS ARE RE-CUT, and it is a spacing fix rather than a
        // resize. They were 0.9167 / 0.9583 / 1.0625rem — 14.7, 15.3 and 17px — three
        // steps inside 2.3px, which is not a hierarchy anybody can see. Worse, the gap
        // they left at 1rem was filled by hand: `text-sm` is the single most common
        // type utility in the codebase, 74 uses, a ninth size with no token.
        //
        // 13 / 14 / 16 / 18 gives four steps a reader can actually tell apart, and it
        // puts a token exactly where those 74 hand-written uses already are.
        //
        // THE TRACKING IS ALSO A MERGE. `label` carried 0.18em here while `.label` in
        // globals.css carried 0.07em — the same name, two values, both in use, because
        // the CSS class and the Tailwind token were written separately. 0.12em is one
        // value for one name: still clearly letterspaced small caps, without the gappiness
        // 0.18em gave a 13px glyph.
        "label": ["0.8125rem", { lineHeight: "1.3", letterSpacing: "0.12em" }],
        // 16px. The workhorse: card body copy, form help text, FAQ answers, most UI
        // labels. It overrides Tailwind's own `sm` (0.875rem paired with a FIXED
        // 1.25rem), and the lineHeight has to be restated for that reason — a fixed
        // 1.25rem against a 16px glyph is 1.25, tighter than the 1.6 a block of prose
        // at this size wants.
        "sm": ["1rem", { lineHeight: "1.6" }],
        // 14px, for genuinely secondary text — captions, footnotes, table meta. The
        // leading stays a RATIO rather than the fixed 1rem Tailwind pairs with its own
        // `xs`, so the step cannot silently retighten if the size moves again: 1rem on
        // a 14px glyph is 1.14, which is a caption set solid.
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
