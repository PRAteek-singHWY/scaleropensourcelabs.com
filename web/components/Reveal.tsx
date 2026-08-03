"use client";

// Scroll reveals, at the values measured off apple.com/mac — `opacity, transform
// 0.32s ease`, which their sections carry on 31 elements.
//
// Renders nothing. It exists to opt the document in to the reveal styles and then
// drive them, which keeps every style decision in globals.css and every timing
// decision in one place.
//
// The ordering here is the important part. `reveal-on` is added to <html> FIRST,
// and only after that are targets marked and observed. The stylesheet's hidden
// state is scoped under `:root.reveal-on`, so until this component runs there is
// nothing hidden at all. If the bundle fails to load — which happened on this
// project for an entire session while every check still passed — the page is fully
// readable with no animation. The inverse arrangement, hiding in CSS and revealing
// with script, turns any JS failure into a blank page.
//
// Sections are targeted rather than individual elements. Revealing every card and
// paragraph separately produces a page that twitches continuously as you scroll;
// one settle per section is what Apple actually does.

import { useEffect } from "react";

export default function Reveal() {
  useEffect(() => {
    const root = document.documentElement;

    // Honour the OS setting by simply not participating. Cheaper and more certain
    // than animating to a zero duration.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("main > section, header.section"),
    );
    if (targets.length === 0) return;

    root.classList.add("reveal-on");
    targets.forEach((t) => t.setAttribute("data-reveal", ""));

    // Anything already on screen at load must not animate in — the hero would
    // otherwise fade up after paint, which reads as a slow page rather than a
    // considered one.
    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          // One-shot. Re-animating on every pass makes scrolling back up feel
          // broken, and keeps the observer working for the life of the page.
          obs.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 },
    );

    for (const t of targets) {
      const r = t.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) t.classList.add("is-in");
      else io.observe(t);
    }

    return () => {
      io.disconnect();
      root.classList.remove("reveal-on");
      targets.forEach((t) => {
        t.removeAttribute("data-reveal");
        t.classList.remove("is-in");
      });
    };
  }, []);

  return null;
}
