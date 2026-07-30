"use client";

// Horizontal card scroller with a circular chevron, the way Apple's store sections
// work rather than stacking everything vertically.
//
// Built on native CSS scroll-snap, not a carousel library. That matters for how it
// degrades: with JavaScript disabled or failed, this is still a perfectly usable
// horizontally-scrollable region — trackpad, touch, shift-wheel and keyboard all
// work because the browser is doing the scrolling. The chevron is a convenience
// layered on top, not the mechanism.
//
// Accessibility notes, since horizontal scrollers are usually where this breaks:
//   * the track is focusable and labelled, so keyboard users can arrow through it
//   * the chevron is a real <button> with a label, and hides itself at the end
//     rather than sitting there doing nothing
//   * scroll-behaviour is smooth only when the reader hasn't asked otherwise

import { useCallback, useEffect, useRef, useState } from "react";

export default function Carousel({
  children,
  label,
  className = "",
}: {
  children: React.ReactNode;
  /** Describes the set for screen readers and for the chevron's label. */
  label: string;
  className?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 2);
    // A couple of pixels of tolerance: sub-pixel widths mean scrollLeft rarely
    // lands exactly on the maximum.
    setAtEnd(max <= 2 || el.scrollLeft >= max - 2);
  }, []);

  useEffect(() => {
    measure();
    const el = track.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure]);

  const nudge = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    // Scroll by roughly one card rather than a fixed pixel count, so it lands on
    // a snap point at every breakpoint.
    const card = el.querySelector<HTMLElement>("[data-card]");
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * step, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={track}
        tabIndex={0}
        role="group"
        aria-label={label}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      {/* Chevrons sit over the track edges. Each hides when it would do nothing. */}
      {!atStart && (
        <button
          type="button"
          onClick={() => nudge(-1)}
          aria-label={`Scroll ${label} backwards`}
          className="absolute -left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-seam bg-hull/90 text-rime backdrop-blur transition duration-300 ease-glide hover:border-plasma/60 sm:flex"
        >
          <span aria-hidden>‹</span>
        </button>
      )}
      {!atEnd && (
        <button
          type="button"
          onClick={() => nudge(1)}
          aria-label={`Scroll ${label} forwards`}
          className="absolute -right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-seam bg-hull/90 text-rime backdrop-blur transition duration-300 ease-glide hover:border-plasma/60 sm:flex"
        >
          <span aria-hidden>›</span>
        </button>
      )}
    </div>
  );
}
