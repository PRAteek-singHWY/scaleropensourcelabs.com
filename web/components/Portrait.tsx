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

/** Deterministic hue offset per person, so a wall of monograms isn't uniform. */
function tilt(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

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
    const h = tilt(name);
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
            background: `radial-gradient(125% 105% at 50% 118%, hsl(${h} 62% 50% / 0.30), hsl(${h} 62% 50% / 0.08) 58%, transparent 76%)`,
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
