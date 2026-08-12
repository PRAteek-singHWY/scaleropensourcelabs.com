// The margin stickers — three developer in-jokes stuck into the empty gutters.
//
// A server component. There is no state here and no drag: the brief says
// "draggable / hover", and hover is the half worth building. A dragged sticker
// needs pointer capture, a position store, a touch story and a decision about what
// happens on reload, and the payoff is that one reader in a thousand moves a joke
// two inches. The wobble costs four lines of CSS and every reader gets it.
//
// TWO RULES THIS COMPONENT EXISTS TO ENFORCE, both learned the hard way on this
// page:
//
//   1. lg AND UP ONLY. These are absolutely positioned into margins that only
//      exist on a wide screen. On a phone they land on top of the copy or off the
//      left edge — and `body { overflow-x: hidden }` means an escaped element is
//      clipped silently rather than reported by the overflow check in
//      scripts/qa.mjs. Nothing catches this but looking at it.
//
//   2. The VISIBILITY AND POSITION LIVE ON THIS WRAPPER, never on the `.chip`
//      inside it. `.chip` declares `display: inline-block`, and globals.css is
//      emitted after Tailwind's utilities layer, so a `hidden lg:block` on the
//      chip itself loses the specificity tie and applies nothing at all.
//
// aria-hidden throughout: these are jokes, not information, and read aloud between
// a heading and its paragraph they are pure interruption.

export default function Sticker({
  text,
  rotate,
  tone = "blue",
  effect = "wobble",
  className = "",
}: {
  text: string;
  /** Degrees. Small: past about 5 it stops reading as "stuck on" and starts reading as "broken". */
  rotate: number;
  /** "blue" is the bare `.chip` — was called "lime" until the badge itself turned
      electric blue, and a tone named after a colour it no longer is costs more
      than a rename. No call site passed it explicitly; all three stickers on the
      page either take the default or ask for violet/mint. */
  tone?: "blue" | "violet" | "mint";
  effect?: "wobble" | "bounce" | "none";
  className?: string;
}) {
  const toneClass =
    tone === "violet" ? "chip-violet" : tone === "mint" ? "chip-mint" : "";

  return (
    <span
      aria-hidden
      className={`sticker absolute z-10 hidden lg:block ${className}`}
      // The rest angle is an inline custom property rather than a class, so the
      // hover keyframes below can return to it exactly. A hard-coded rotate in the
      // animation would snap every sticker to the same angle mid-wobble.
      style={{ ["--rest" as string]: `${rotate}deg` }}
      data-effect={effect}
    >
      <span
        className={`chip chip-true ${toneClass} shadow-[0_6px_16px_rgba(0,0,0,0.10)]`}
      >
        {text}
      </span>
    </span>
  );
}
