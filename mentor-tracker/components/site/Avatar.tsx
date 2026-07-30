"use client";

import { useEffect, useRef, useState } from "react";

// GitHub avatar with an initials fallback.
//
// `github.com/<login>.png` is convenient but not guaranteed: the account may have
// been renamed or deleted, the image host can fail, and a blocked third-party
// request leaves nothing behind. Without a fallback the page renders an empty
// bordered box, which reads as broken rather than as "no picture" — and on a
// leaderboard of real students, a row that looks broken looks like it is about
// them.
//
// Initials on a flat surface degrade honestly and need no network.

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({
  github,
  name,
  size = 32,
  className = "",
  rounded = "full",
}: {
  github: string;
  /** Used for the initials fallback and the accessible label. */
  name: string;
  size?: number;
  className?: string;
  rounded?: "full" | "lg" | "2xl";
}) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // `onError` alone is not enough on a server-rendered page. The browser starts
  // fetching the image from the HTML before React hydrates, so a 404 can land
  // before the handler is ever attached — and then nothing fires and the fallback
  // never shows. This checks the element's own state on mount: a request that has
  // finished (`complete`) with no pixels (`naturalWidth === 0`) has failed.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  const radius =
    rounded === "full" ? "rounded-full" : rounded === "lg" ? "rounded-lg" : "rounded-2xl";

  if (failed) {
    return (
      <span
        aria-hidden
        className={`inline-flex shrink-0 select-none items-center justify-center bg-site-raise font-mono font-semibold text-site-dim ring-1 ring-site-line ${radius} ${className}`}
        style={{ width: size, height: size, fontSize: Math.max(10, size * 0.34) }}
      >
        {initials(name)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={`https://github.com/${encodeURIComponent(github)}.png`}
      alt=""
      width={size}
      height={size}
      // Not lazy: a lazily-loaded image that fails below the fold never reports
      // back, so the fallback would only appear once it scrolled into view.
      onError={() => setFailed(true)}
      className={`shrink-0 bg-site-raise object-cover ring-1 ring-site-line ${radius} ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
