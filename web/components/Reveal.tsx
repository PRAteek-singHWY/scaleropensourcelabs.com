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
// TWO MODES, and which one a section gets is authored in the JSX rather than
// decided here:
//
//   * SETTLE (the default). The section moves as one, 12px in 0.32s. This is what
//     every section got before, and it stays the default for the same reason it
//     was chosen: revealing every card and paragraph separately produces a page
//     that twitches continuously as you scroll.
//
//   * STAGGER, for anything carrying `data-reveal-group`. The container itself
//     stays put and its direct children come up one after another, 20px in 0.5s
//     at 0.1s apart. Used on section header blocks (eyebrow, headline, rule,
//     standfirst) and on card grids, where the parts genuinely are a sequence and
//     seeing them arrive in order is the difference between a page that reads as
//     laid out and one that reads as typeset.
//
// A group is never ALSO a settle target — the children carry the motion, and
// doing both fades the whole block up and then fades every piece of it again.
//
// Then a third thing that is not a mode: THE STICKY NOTES, which both modes skip
// by design and which therefore need their own observer at the foot of this
// effect. They do not settle or stagger — they get stuck on. See the block there.

import { useEffect } from "react";

// 0.1s per child, but not past this many. The hall grid runs to twenty-five
// cards and the last one would otherwise begin its entrance two and a half
// seconds after the first — long enough that a reader scrolling at any speed
// arrives to find the bottom of the grid still empty, which reads as a page
// still loading rather than one arriving. Past the cap everything shares the
// last delay and comes up together.
const MAX_STAGGER_STEPS = 8;

export default function Reveal() {
  useEffect(() => {
    const root = document.documentElement;

    // Honour the OS setting by simply not participating. Cheaper and more certain
    // than animating to a zero duration.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const groups = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal-group]"),
    );

    // Sections that have opted in to staggering their own children are excluded
    // here rather than left to fight the group rule in the stylesheet.
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("main > section, header.section"),
    ).filter((s) => !s.hasAttribute("data-reveal-group"));

    if (groups.length === 0 && sections.length === 0) return;

    root.classList.add("reveal-on");
    sections.forEach((s) => s.setAttribute("data-reveal", ""));

    // Children are marked from here rather than in the JSX. The index has to be
    // computed anyway — it is the stagger — and once script is assigning that, a
    // hand-written `data-reveal-item` on each child would be a second list of the
    // same elements that can silently disagree with this one. Authors mark the
    // container; the container's children are the sequence, which is also exactly
    // what a reader of the JSX would assume.
    const items: (HTMLElement | SVGElement)[] = [];

    for (const group of groups) {
      let i = 0;
      for (const child of Array.from(group.children)) {
        if (!(child instanceof HTMLElement || child instanceof SVGElement)) continue;

        // A nested group runs its own sequence. Animating it here too would slide
        // the whole grid up and then slide every card inside it again.
        if (child.hasAttribute("data-reveal-group")) continue;
        if (child.hasAttribute("data-reveal-skip")) continue;

        // Stickers, the taped note, the full-bleed band tint: things pinned over
        // a section rather than set in its vertical rhythm. They are placed
        // against a corner, so sliding them 20px up their own inset reads as a
        // wobble in the decoration rather than as the section arriving. Detected
        // by computed position instead of by a list of class names, so a future
        // absolute child is handled without anybody remembering this.
        const position = getComputedStyle(child).position;
        if (position === "absolute" || position === "fixed") continue;

        child.style.setProperty(
          "--reveal-i",
          String(Math.min(i, MAX_STAGGER_STEPS)),
        );
        child.setAttribute("data-reveal-item", "");
        items.push(child);
        i++;
      }
    }

    // THE NOTES GET THEIR OWN PASS, and they have to: the loop above skips every
    // absolutely positioned child (see the comment there), which is every note on
    // the page. That skip is right — sliding a pinned decoration 20px up its own
    // inset reads as a wobble — but it left the notes as the only things on a
    // page of arriving sections that were simply always there.
    //
    // So they animate as what they are instead: a hand sticking one on. The whole
    // gesture lives in the `note-stick` keyframes; this only decides WHEN, and
    // in what order.
    //
    // Indexed within the SECTION rather than the document, because the stagger is
    // only ever answering one question — does a section carrying two notes stick
    // them on in unison — and a running document-wide index would have the
    // fourteenth note waiting 1.5s before it appeared at all.
    const notes = Array.from(document.querySelectorAll<HTMLElement>(".note"));
    const perSection = new Map<Element | null, number>();
    const noteIo = new IntersectionObserver(
      (entries, obs) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-stuck");
          obs.unobserve(e.target);
        }
      },
      // A note is 160-240px tall inside a band of its own, so it can be fully on
      // screen while the section it belongs to is still arriving. -15% holds it
      // until it is properly in the page rather than clipped to the bottom edge.
      { rootMargin: "0px 0px -15% 0px", threshold: 0.4 },
    );
    for (const n of notes) {
      const section = n.closest("section");
      const i = perSection.get(section) ?? 0;
      perSection.set(section, i + 1);
      const r = n.getBoundingClientRect();
      // Already in view at load: leave it alone, for the same reason the sections
      // below do. Nothing that a reader is currently looking at should animate.
      if (r.top < window.innerHeight && r.bottom > 0) continue;
      n.style.setProperty("--stick-i", String(Math.min(i, 1)));
      noteIo.observe(n);
    }

    // Anything already on screen at load must not animate in — the hero would
    // otherwise fade up after paint, which reads as a slow page rather than a
    // considered one. It is also what keeps the marker fills from flashing: those
    // paint at full width in the first frame, before this component has run, so
    // an above-the-fold pill told to wipe would visibly empty itself first.
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

    for (const t of [...sections, ...groups]) {
      const r = t.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) t.classList.add("is-in");
      else io.observe(t);
    }

    return () => {
      io.disconnect();
      noteIo.disconnect();
      notes.forEach((n) => {
        n.classList.remove("is-stuck");
        n.style.removeProperty("--stick-i");
      });
      root.classList.remove("reveal-on");
      sections.forEach((s) => {
        s.removeAttribute("data-reveal");
        s.classList.remove("is-in");
      });
      groups.forEach((g) => g.classList.remove("is-in"));
      items.forEach((el) => {
        el.removeAttribute("data-reveal-item");
        el.style.removeProperty("--reveal-i");
      });
    };
  }, []);

  return null;
}
