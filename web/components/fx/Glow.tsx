// An ambient background orb — a blurred electric-blue wash behind a section.
//
// Two lines of markup, and it is a component rather than a bare <span> at each
// call site for one reason: the `aria-hidden` and the leaf-node discipline are
// not optional here, and both are the kind of thing that gets dropped the third
// time somebody copies the pattern. See `.glow-orb` in globals.css for why this
// must never wrap content — a background-image ancestor defers every text node
// under it to a per-element screenshot in the QA sweep.
//
// Size and position deliberately come from the caller. The orb has no intrinsic
// dimensions; where it sits and how far it bleeds is a decision about the
// section it lights, not about the device.

export default function Glow({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`glow-orb ${className}`} />;
}
