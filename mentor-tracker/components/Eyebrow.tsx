// The tiny coloured tag above a card headline.
//
// Apple uses these to flag state — NEW in orange, LIMITED TIME in red, Free
// Engraving in orange — sitting above the card's title in 11-12px uppercase.
//
// Two rules kept from the palette's discipline:
//   * `ember` is the site's single signal colour and appears almost nowhere else,
//     so it is reserved for the tag that genuinely needs urgency (a security fix).
//   * colour never carries meaning alone — the label text always says what the
//     state is, so a colourblind reader loses nothing.

export type EyebrowTone = "merged" | "security" | "neutral";

const TONE: Record<EyebrowTone, string> = {
  merged: "text-plasma",
  security: "text-ember",
  neutral: "text-dust",
};

export default function Eyebrow({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: EyebrowTone;
}) {
  return (
    <p
      className={`font-mono text-[11px] uppercase tracking-[0.16em] ${TONE[tone]}`}
    >
      {children}
    </p>
  );
}
