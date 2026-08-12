"use client";

// The stat figures, counted rather than simply present.
//
// These are the numbers the comparison section is built on — 8.4% of GSoC
// applicants accepted, 1,280 of 15,240, 3 students per college per year, and the
// unbounded one. They are the page's evidence, and they were arriving as static
// text inside a row that had already faded in, which spent them: a reader scanning
// a wide table has no reason to stop at a number that behaves exactly like the
// sentence beside it.
//
// SSR RENDERS THE FINAL VALUE, and that ordering is the same contract Reveal.tsx
// is built on. The server emits the real number, and script only ever takes it
// away to count it back. If the bundle fails — which the note at the top of
// Reveal.tsx says happened on this project for an entire session while every check
// still passed — the figures are simply there, which is the state anybody without
// JavaScript has been reading anyway. The inverse (render 0, count up with script)
// turns a bundle failure into a page that asserts 0% and 0 accepted contributors,
// and a wrong number is considerably worse than a still one.
//
// The visible-flash this risks — final, then 0, then counting — costs nothing in
// practice because every stat on this page is thousands of pixels below the fold.
// Hydration is long finished before any of them is scrolled to, and the observer
// below never fires until then.
//
// NON-NUMERIC VALUES ARE NOT A FAILURE CASE. One of the four stats is "∞", which
// is the whole argument of the row it sits in — there is no cap on how many people
// from one college get code merged. It cannot be counted to, so it gets the other
// half of the treatment: it pops in on the same trigger, at the same moment its
// numeric neighbours start moving.

import { useEffect, useRef, useState } from "react";

// Long enough to read as counting rather than as a glitch, short enough that a
// reader who scrolled to the number is not still waiting for it. Past about 1.5s
// the eye has already moved to the sentence underneath.
const DURATION = 1100;

type Parsed = {
  value: number;
  suffix: string;
  decimals: number;
  grouped: boolean;
};

// "8.4%" -> 8.4 + "%", "1,280" -> 1280 + "", "3" -> 3 + "", "∞" -> null.
//
// The decimals and grouping are read off the AUTHORED string rather than chosen
// here, so the count renders in the same shape as its final frame: 8.4% counts
// through 3.7% and not 3.70000001%, and 1,280 keeps its comma the whole way up.
// A number that gains a decimal place or a separator on its last frame reads as a
// glitch, and the fix would otherwise be a per-call-site format prop.
function parse(raw: string): Parsed | null {
  const m = raw.match(/^(-?[\d,]*\.?\d+)(.*)$/);
  if (!m) return null;

  const digits = m[1];
  const value = Number(digits.replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;

  return {
    value,
    suffix: m[2],
    decimals: (digits.split(".")[1] ?? "").length,
    grouped: digits.includes(","),
  };
}

function format(n: number, p: Parsed): string {
  return (
    n.toLocaleString("en-US", {
      minimumFractionDigits: p.decimals,
      maximumFractionDigits: p.decimals,
      useGrouping: p.grouped,
    }) + p.suffix
  );
}

export default function CountUp({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [text, setText] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Honour the OS setting by not participating, rather than by animating to a
    // zero duration — the same choice Reveal.tsx makes, and for the same reason:
    // there is then no state to reset and nothing that can be left mid-count.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const parsed = parse(value);
    let raf = 0;

    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          // One-shot. A figure that re-counts every time it is scrolled past
          // stops being evidence and starts being decoration.
          obs.unobserve(e.target);

          // "∞" and anything else unparseable: same trigger, different gesture.
          if (!parsed) {
            e.target.classList.add("is-pop");
            continue;
          }

          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min((now - start) / DURATION, 1);
            // easeOutCubic. The deceleration is the part that reads as a value
            // settling on its answer; a linear count reads as a loading spinner.
            const eased = 1 - Math.pow(1 - t, 3);
            // The last frame is written from the authored value, not from
            // value * 1 — floating point makes 8.4 * 1 land on 8.4 but there is
            // no reason to let the page's headline statistic depend on that.
            setText(t < 1 ? format(parsed.value * eased, parsed) : value);
            if (t < 1) raf = requestAnimationFrame(tick);
          };

          setText(format(0, parsed));
          raf = requestAnimationFrame(tick);
        }
      },
      // Half the figure visible. These sit at the top of a tall table cell, so a
      // 0.01 threshold fires while the number is still clipped by the fold and
      // the count is half over before it can be seen.
      { threshold: 0.5 },
    );

    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return (
    // tabular-nums is not cosmetic here: proportional digits change width as they
    // cycle, so a counting figure visibly breathes and nudges whatever follows it.
    <span ref={ref} className={`tabular-nums ${className}`}>
      {text}
    </span>
  );
}
