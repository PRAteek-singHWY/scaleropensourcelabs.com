// The two-tone section headline.
//
// Measured off apple.com/in/store, where it appears on every section: "Help is
// here." in near-black followed by "Whenever and however you need it." in grey —
// identical size, identical weight, only the colour changes.
//
// It is the most recognisable typographic pattern on that page and it does real
// work: the first clause is the claim, the second is the qualifier, and the colour
// split lets one line carry both without a subtitle underneath. It also means a
// section heading can be long and conversational instead of a terse label.
//
// Structural, not decorative: `lead` should always be the assertion and `trail`
// the elaboration. Reversing them makes the sentence read backwards.

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
    <Tag className={className}>
      <span className="text-ink">{lead}</span>
      {trail ? <span className="text-haze"> {trail}</span> : null}
    </Tag>
  );
}
