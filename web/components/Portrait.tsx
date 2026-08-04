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

/* The fallback tint comes from the BRAND, not from an arbitrary hue.
   The first version derived a hue from the name across the full 360 degrees, which
   was right for a neutral palette and wrong for this one: against cobalt and yellow,
   a wall of random pastels reads as a rendering accident. Rendered, they came out as
   washed-out yellow-greens that belonged to no part of the design.
   Two brand tints, chosen deterministically per name, gives a grid that varies
   without leaving the palette. Both are tints of tokens, so both follow the theme. */
const TINTS = [
  "rgb(var(--accent) / 0.22)",
  "rgb(var(--pop) / 0.34)",
] as const;

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
      <div
        className={`relative flex items-center justify-center overflow-hidden bg-sunk ring-1 ring-inset ring-seam ${className}`}
        role="img"
        aria-label={name}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `radial-gradient(125% 105% at 50% 118%, ${tint}, transparent 74%)`,
          }}
        />
        {/* 8cqw put the initials at a fraction of the frame and they read as a
            mistake in a 750px-tall card. They are the whole graphic — size them
            like it. */}
        <span
          aria-hidden
          className="relative select-none font-semibold tracking-tightest text-ink/40"
          style={{ fontSize: "clamp(2.5rem, 26cqw, 7rem)" }}
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
