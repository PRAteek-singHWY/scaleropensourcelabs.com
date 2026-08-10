"use client";

// A member's portrait, with a monogram fallback that is a designed state rather
// than an error state.
//
// This matters more here than on an avatar in a table. These portraits are the
// hero of the page, so a missing image cannot be allowed to read as broken — the
// fallback has to look like a deliberate treatment. So it is: the initials set
// large in the display face over a soft tinted field, at the same aspect and
// radius as a real photograph. A wall of them reads as a considered graphic
// choice; a wall of grey boxes reads as an unfinished website.
//
// The tint is derived from the name but composited at low alpha over the theme's
// own recessed surface, which is what makes it survive both grounds. The first
// version hardcoded two dark HSL stops because the hall was pinned dark; when the
// hall started following the reader's theme, that fallback rendered on white as a
// bottom-heavy dark green blob with the initials nearly invisible over it — the
// precise failure this component exists to prevent. Nothing here may assume the
// surface behind it is dark.
//
// The failure detection is the same lesson learned earlier in this project:
// `onError` alone never fires for an image the browser already finished failing
// before React hydrated, so the element's own state is checked on mount too.

import { useEffect, useRef, useState } from "react";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Stable per-person index, so the same name always gets the same treatment. */
function pick(name: string, n: number): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 9973;
  return h % n;
}

/* Four pastel gradients, chosen deterministically per name.
   An earlier version composited two brand tints at low alpha over the theme's own
   recessed surface, so the fallback followed light and dark automatically. That
   was the correct answer for a page of grey tiles and the wrong one for a page of
   stickers: at 22% over --sunk the whole wall came out as barely-tinted grey,
   which is exactly the "unfinished website" reading this component exists to
   avoid.

   These are opaque and FIXED — they do not follow the theme, and that is the
   decision worth stating. A portrait placeholder stands in for a photograph, and
   a photograph does not invert; a wall of light pastel frames on a dark page
   reads as a wall of pictures, which is what it is. It also means the monogram's
   contrast is a single known pair rather than one per theme (see INITIAL_INK).

   Four rather than two because a five-column grid of twenty-five cards shows a
   two-way alternation as obvious banding. Four with a hash-derived index reads as
   variety. */
/* Each entry is a BASE colour plus the gradient painted over it, and the split is
   not decorative — see the note on the render below for what it costs to merge
   them. The base is always the gradient's first stop, so the two agree. */
const TINTS = [
  { base: "#A5F3FC", grad: "linear-gradient(140deg, #A5F3FC 0%, #FBCFE8 100%)" },
  { base: "#DDD6FE", grad: "linear-gradient(140deg, #DDD6FE 0%, #A5F3FC 100%)" },
  { base: "#FDE68A", grad: "linear-gradient(140deg, #FDE68A 0%, #FBCFE8 100%)" },
  { base: "#D9F99D", grad: "linear-gradient(140deg, #D9F99D 0%, #A5F3FC 100%)" },
] as const;

/* Slate-900 at 45%, hardcoded rather than --ink, because the field underneath is
   always light. --ink inverts and would have put a near-white monogram on cyan in
   dark mode. Every stop above is light enough that this pair clears its floor in
   both themes, which is the point of fixing the gradients. */
const INITIAL_INK = "rgb(15 23 42 / 0.45)";

export default function Portrait({
  name,
  photo,
  className = "",
  priority = false,
}: {
  name: string;
  photo?: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(!photo);
  const img = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) {
    const tint = TINTS[pick(name, TINTS.length)];
    return (
      // The gradient is painted by a SIBLING LAYER over an opaque base colour,
      // not by `background: <gradient>` on this element, and it is worth knowing
      // why before merging the two — they look identical on screen.
      //
      // scripts/qa.mjs resolves what is behind a text node by climbing ancestors,
      // and it treats any ancestor carrying a background-IMAGE as unmeasurable:
      // the pair gets deferred to a per-element pixel screenshot, because the
      // painted colour of a gradient cannot be read out of the cascade. Putting
      // the gradient directly on this div did exactly that to every monogram on
      // the page — twenty-five in the hall plus the team chart — and turned a
      // ~40-second eight-viewport sweep into an hour of individual element
      // captures, each one scrolling the page to its target.
      //
      // With an opaque base here, the climb stops at this element's
      // background-color and the pair is measured from the cascade like every
      // other one. The base is the gradient's own first stop, so what is measured
      // is a colour that is genuinely under the text rather than a convenient
      // stand-in.
      <div
        className={`relative flex items-center justify-center overflow-hidden ring-1 ring-inset ring-black/5 ${className}`}
        role="img"
        aria-label={name}
        style={{ backgroundColor: tint.base }}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ backgroundImage: tint.grad }}
        />
        {/* 8cqw put the initials at a fraction of the frame and they read as a
            mistake in a 750px-tall card. They are the whole graphic — size them
            like it. */}
        <span
          aria-hidden
          className="relative select-none font-extrabold tracking-tightest"
          style={{ fontSize: "clamp(2.625rem, calc(26cqw + 0.125rem), 7.125rem)", color: INITIAL_INK }}
        >
          {initials(name)}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={img}
      src={photo}
      alt={name}
      loading={priority ? "eager" : "lazy"}
      onError={() => setFailed(true)}
      className={`object-cover shadow-[inset_0_0_0_1px_rgba(0,0,0,0.10)] ${className}`}
    />
  );
}
