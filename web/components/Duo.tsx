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
//   * The face is the display face in caps. Poppins semibold was a body face doing
//     a headline's job; Anton is condensed enough that a two-clause sentence still
//     fits on two lines at display size, which is what makes the caps affordable.
//
// Structural, not decorative: `lead` is always the assertion and `trail` the
// elaboration. Reversing them makes the sentence read backwards.
//
// Caps are applied here rather than left to the caller so no section can opt out
// and drift. `text-balance` matters more now — condensed caps produce very uneven
// rag if the line breaks are left to chance.

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
    <Tag
      className={`font-display uppercase leading-[0.94] tracking-[-0.005em] text-balance ${className}`}
    >
      <span className="text-ink">{lead}</span>
      {trail ? <span className="tone"> {trail}</span> : null}
    </Tag>
  );
}
