// A technical term with a joke attached — Linux, GSoC, Google and friends.
//
// NOT a `title` attribute, and that is most of why this component exists. `title`
// cannot be styled, waits about a second to appear, never appears on touch, and is
// announced by some screen readers as the element's accessible NAME — which would
// replace the word "Linux" in the reading order with "Penguin approved". The
// spoken sentence would stop matching the printed one.
//
// THE STRUCTURE, which is doing more work than it looks:
//
//   <button>            focusable, so this is not a hover-only affordance
//     <span>Linux</span>
//     <span class=term-note>Penguin approved 🐧</span>   ← inside the button
//   </button>
//
// The note lives INSIDE the button rather than beside it with aria-describedby,
// because describedby needs a generated id and this is a server component with no
// useId available. Nesting gets the same result with no id at all: the note is
// part of the button's accessible name, so it is announced with the term, and the
// reading is "Linux Penguin approved" rather than a word that silently does
// something.
//
// That is also why the hidden state is `opacity: 0` and NOT `visibility: hidden`
// or `display: none` — both of those would drop the note out of the accessibility
// tree, which is the entire thing this arrangement is buying. See .term-note in
// globals.css.
//
// CSS-only on :hover and :focus-visible. No state, no listeners, no client
// boundary — this stays a server component and costs nothing at runtime.

export default function Term({
  children,
  note,
}: {
  children: React.ReactNode;
  /** The joke. Kept short: this is an aside, not a footnote. */
  note: string;
}) {
  return (
    <button type="button" className="term">
      <span className="term-word">{children}</span>
      {/* TWO COPIES OF THE NOTE, and the split is not redundancy.
          The sr-only one is the accessible one: 1px, clipped, always present, so
          the button's name is "Linux — Penguin approved" whether or not anything
          is hovered.
          The visible one is `display: none` until hover — which it HAS to be,
          because an always-laid-out absolute bubble beside a word near the right
          edge of its column extends past the viewport. That is not theoretical:
          it pushed the document to 863px inside an 834px tablet and was caught by
          the overflow check as a 29px page-level overflow.
          Keeping one element and switching visibility cannot solve both: the
          properties that take it out of layout (display/visibility) also take it
          out of the accessibility tree, and the one that does not (opacity) leaves
          it occupying space. Two elements, one job each. */}
      <span className="sr-only"> — {note}</span>
      <span aria-hidden className="term-note">
        {note}
      </span>
    </button>
  );
}
