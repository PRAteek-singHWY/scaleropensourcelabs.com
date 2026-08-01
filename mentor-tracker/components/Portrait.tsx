"use client";

// A member's portrait, with a monogram fallback that is a designed state rather
// than an error state.
//
// This matters more here than on an avatar in a table. These portraits are the
// hero of the page, so a missing image cannot be allowed to read as broken — the
// fallback has to look like a deliberate treatment. So it is: the initials set in
// the display face over a soft plasma field, at the same aspect and radius as a
// real photograph. A wall of them reads as a considered graphic choice; a wall of
// grey boxes reads as an unfinished website.
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
        className={`relative flex items-center justify-center overflow-hidden bg-raise ${className}`}
        role="img"
        aria-label={name}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `radial-gradient(115% 95% at 50% 118%, hsl(${h} 68% 30%), hsl(${h} 60% 12%) 62%, transparent 78%)`,
          }}
        />
        <span
          aria-hidden
          className="relative select-none font-semibold tracking-tightest text-ink/70"
          style={{ fontSize: "clamp(1.75rem, 8cqw, 5rem)" }}
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
