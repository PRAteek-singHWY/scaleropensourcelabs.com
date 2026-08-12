// The two-tone section headline.
//
// The pattern started as apple.com's: an assertion in ink followed by its
// qualifier in grey, identical size and weight, only the colour changing. That
// split still does the real work here — one line carries claim and elaboration
// without needing a subtitle underneath, which is why a section heading can be
// long and conversational instead of a terse label.
//
// What changed for the notyourcollege.com direction is the two things the pattern
// is built from:
//
//   * The trail is BLUE, not grey. Grey reads as "less important, keep moving";
//     the brand blue reads as the second half of the same sentence. Same
//     structure, opposite energy, and it is the device their whole page runs on.
//
//   * The face is the display face at 800. It used to be the display face IN
//     CAPS, and the caps are gone — this is the one place the type change forces
//     a real decision rather than a substitution.
//
//     Anton is condensed, so a two-clause sentence in caps still fitted two lines
//     at display size; that is what made the caps affordable. Plus Jakarta Sans
//     sets the same sentence about 60% wider, so the longest heading here — "Most
//     students never apply because nobody told them these exist." — went to three
//     full lines of 44px capitals. That is a wall, and a wall of capitals is
//     precisely the register this pass exists to get rid of.
//
//     So the rule across the site is now: CAPS ONLY WHERE THE STRING IS A LABEL —
//     the hero's two words, a badge, a button — and sentence case everywhere a
//     heading is a piece of language. Weight and the two-tone split carry the
//     hierarchy the capitals were carrying, and they do it without the shouting.
//
// Structural, not decorative: `lead` is always the assertion and `trail` the
// elaboration. Reversing them makes the sentence read backwards.
//
// `text-balance` stays and matters as much as ever: a two-clause sentence left to
// break wherever it lands produces a very uneven rag at this size.

import Doodle from "@/components/Doodle";

export default function Duo({
  lead,
  trail,
  as = "h2",
  className = "",
}: {
  lead: string;
  trail?: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  const Tag = as;
  return (
    <>
      <Tag
        // The leading is stated here rather than left to the font-size step, and it
        // has to stay in step with `display-lg` in tailwind.config.ts — every call
        // site passes that size in `className`, and this utility beats the size's own
        // lineHeight. Getting them out of sync is invisible in the config and obvious
        // on the page: this component is the site's most-repeated heading and the one
        // that most often runs to two or three lines.
        //
        // 1.22, up from 1.08. Set for Syne's long descenders and KEPT after the move
        // to Space Grotesk: the new face does not need the room, but a 44em measure
        // does — see the note in the config.
        className={`font-display font-bold leading-[1.22] tracking-[-0.02em] text-balance ${className}`}
      >
        <span className="text-ink">{lead}</span>
        {trail ? <span className="tone"> {trail}</span> : null}
      </Tag>
      {/* The hand-drawn rule under every section title.
          Rendered HERE rather than at each call site, so no section can forget it
          and none can drift to a different width — the same argument that put the
          caps rule in this component.

          Not inside the <Tag>: a heading's accessible name would then include an
          SVG, and more practically the underline has to sit below a heading that
          may be one line or three, which an inline element inside it cannot do.

          Fixed 7rem rather than the heading's width. A rule that stretches to the
          text is a border; one that runs a fixed distance from the left margin is
          a mark somebody drew.

          `draw` plots it stroke-first as the section arrives. This is the single
          best place on the page for that effect and close to the only defensible
          one: it is already the mark that says "a person made this", it appears
          exactly once per section, and a line that draws itself under a heading
          is doing the same job as the heading rather than competing with it. See
          the note on Doodle's `draw` prop for why it is not simply on by default. */}
      {/* INLINE-BLOCK, AND IT IS de-facto LOAD-BEARING RATHER THAN COSMETIC.
          Tailwind's preflight sets `svg { display: block }`, so this rule ignored
          `text-align` entirely and pinned itself to the left edge of whatever
          contained it. In the thirteen left-aligned sections that is invisibly
          correct — left edge and text start are the same place. In the centred
          "Want your name in the commit log?" section it is not: the heading centred
          and the rule stayed at the far left of a full-width block, stranded about
          700px from the words it belongs to, reading as a stray blue mark rather
          than as an underline.
          inline-block makes it inherit the alignment of the section it is in, so
          the one centred section centres it and the left-aligned ones are unchanged
          — no prop, no call-site override, and no way for a future centred section
          to reintroduce the same orphan.
          `align-top` is the other half: preflight also sets `vertical-align: middle`
          on svg, and an inline-block sitting on the text baseline adds a descender's
          worth of line box under it, which would put a few stray pixels of gap below
          every section heading on the page. */}
      {/* w-36/h-3, up from w-28/h-2.5, and the number is derived rather than
          nudged. Their section headings carry `decoration-3` — a 3px rule — and
          this SVG has no stroke-width of its own to set: Doodle draws every path
          at 2.4 user units inside a 120-unit box, so the rendered thickness is
          whatever the element's width scales that to. At 112px it came out at
          2.24px, which is thinner than their hairline and read as a scratch under
          a heading rather than as a mark somebody made. 144px scales the same
          stroke to 2.88px, which lands on their 3px by construction.
          The LENGTH is still fixed rather than matched to the text — see the note
          above for why that distinction is the whole point of the device. */}
      <Doodle
        kind="underline"
        draw
        className="mt-3 inline-block h-3 w-36 align-top text-accent"
      />
    </>
  );
}
