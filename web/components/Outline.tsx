"use client";

// Outline: a heading-based navigation panel for the side of the page.
//
// Justified by length rather than fashion. This page is a little over 26,000px on
// a laptop, and the main nav jumps to six of its fourteen sections — so eight
// sections are reachable only by scrolling past everything else. That is the case
// a table of contents exists for.
//
// Three decisions worth stating:
//
// 1. The list is DERIVED FROM THE DOM, not declared here. A hardcoded copy of the
//    section list is a second source of truth that silently goes stale the first
//    time somebody reorders page.tsx — and the failure mode is an outline that
//    lies about the page. Reading `section[id]` on mount cannot drift.
//
// 2. It is OFF by default and the choice persists. The panel is fixed and, at
//    common laptop widths, overlaps the right edge of the widest content (the
//    roster and calendar tables). That is an acceptable trade for something the
//    reader opted into and can put away; it would not be acceptable if it were
//    imposed. Below `lg` the toggle is not rendered at all — there is no room for
//    a side rail on a phone, and pretending otherwise would just cover the page.
//
// 3. Active section comes from IntersectionObserver, not a scroll handler doing
//    arithmetic on offsets. Offsets go stale whenever a section above changes
//    height, and this page's sections change height with the content in club.ts.
//
// 4. The panel is PORTALLED to <body> even though the toggle lives in the nav.
//    It has to be. The nav carries `backdrop-filter` for its frosted plate, and
//    backdrop-filter — like transform, filter and will-change — makes an element
//    a containing block for its `position: fixed` descendants. Rendered inside
//    the header, `top-1/2` resolved against a 44px-tall bar instead of the
//    viewport, so the panel was laid out from y -247 to 291: half of it above the
//    top of the screen, and the remaining half sitting exactly over the toggle
//    that was supposed to close it. Measured, not guessed — the geometry is the
//    only thing that showed this.

// 5. The item list is REBUILT ON EVERY NAVIGATION. This component sits in the
//    shared layout, which does not remount when the router changes route, so a
//    mount-only scan would leave every page after the first showing the home
//    page's section list — an outline that confidently lies about the page, which
//    is worse than no outline. Same failure mode the DOM-derivation in note 1 was
//    meant to prevent, arriving by a different door.

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";

type Item = { id: string; label: string };

const KEY = "osc-outline";

/** "who-not-for" -> "Who not for". Last-resort label only. */
function prettify(id: string): string {
  const s = id.replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Outline() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState<string>("");
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    setOpen(localStorage.getItem(KEY) === "1");
    setReady(true);
  }, []);

  // The flag the stylesheet reads to reserve room for the panel. Kept in an
  // effect rather than set inside the click handler so it also applies on load
  // from a persisted preference, and is cleaned up if this ever unmounts.
  useEffect(() => {
    const root = document.documentElement;
    if (open) root.setAttribute("data-outline", "1");
    else root.removeAttribute("data-outline");
    return () => root.removeAttribute("data-outline");
  }, [open]);

  useEffect(() => {
    // Reset before rescanning, so a page with no id'd sections shows nothing
    // rather than the previous page's list.
    setActive("");
    const found: Item[] = [];
    for (const s of document.querySelectorAll<HTMLElement>("section[id]")) {
      // aria-label FIRST, then the eyebrow. The eyebrow usually is the section's
      // own short name, which is why it was preferred originally — but
      // `querySelector(".label")` takes the first match anywhere inside, and
      // `.label` is also the class on field labels INSIDE cards. So a section whose
      // eyebrow is a `.chip` rather than a `.label` gets named after whatever card
      // label happens to come first: #team listed itself as "President", and
      // #mentors becomes "Ask them about" as soon as MENTORS has entries.
      //
      // An aria-label is an explicit statement by the author about what a section
      // is called; a `.label` found by descendant search is an inference. When both
      // exist the explicit one should win, which also means a bad outline entry is
      // now always fixable by naming the section rather than by reordering its
      // internals. A section with neither still falls through to its heading.
      const aria = s.getAttribute("aria-label")?.trim();
      const eyebrow = s.querySelector(".label")?.textContent?.trim();
      const heading = s.querySelector("h2, h3")?.textContent?.trim();
      const label = aria || eyebrow || heading || prettify(s.id);
      found.push({ id: s.id, label: label.length > 34 ? `${label.slice(0, 33)}…` : label });
    }
    setItems(found);

    if (found.length === 0) return;

    // A band across the upper-middle of the viewport: the section occupying that
    // band is the one being read. Using the whole viewport would mark two or three
    // sections active at once on a page with sections this tall.
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, z) => a.boundingClientRect.top - z.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );
    document.querySelectorAll("section[id]").forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [pathname]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    localStorage.setItem(KEY, next ? "1" : "0");
  };

  return (
    <>
      {/* aria-pressed rather than a checkbox: this is a control that changes the
          view, and a button carrying its own state is what a screen reader expects
          for that. The label states what it does, not what it currently is. */}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={open}
        aria-controls="page-outline"
        title="Outline view"
        className="hidden h-11 w-11 items-center justify-center rounded-full border border-seam text-haze transition-colors duration-300 ease-glide hover:border-accent/60 hover:text-ink lg:flex lg:h-9 lg:w-9"
      >
        <span className="sr-only">
          {open ? "Hide the page outline" : "Show the page outline"}
        </span>
        <span
          aria-hidden
          className="flex items-center justify-center"
          style={{ opacity: ready ? 1 : 0 }}
        >
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden>
            <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M2 4h3M2 8h3M2 12h3" />
              <path d="M7.5 4h6.5M7.5 8h6.5M7.5 12h6.5" opacity={open ? "1" : "0.45"} />
            </g>
          </svg>
        </span>
      </button>

      {/* Conditionally rendered rather than hidden with an attribute. The first
          version set `hidden` AND carried `lg:block`, and `[hidden]{display:none}`
          is a UA-stylesheet rule that ANY author display declaration beats — so at
          lg+ the panel was never hidden at all. It sat over the page and
          intercepted the clicks meant for its own toggle.
          Absent from the DOM is unambiguous: nothing to override, nothing to tab
          into, nothing to intercept. */}
      {ready &&
        open &&
        items.length > 0 &&
        createPortal(
          <nav
            id="page-outline"
            ref={panel}
            aria-label="Page outline"
            // Anchored below the nav rather than vertically centred, so it cannot
            // reach the header at any viewport height or list length.
            className="plate fixed right-5 top-[4.25rem] z-40 hidden max-h-[calc(100vh-6rem)] w-[13.5rem] overflow-y-auto rounded-tile border border-seam p-3 lg:block"
          >
            <p className="label px-2 pb-2 pt-1">On this page</p>
            <ul className="space-y-px">
              {items.map((i) => {
              const current = i.id === active;
              return (
                <li key={i.id}>
                  <a
                    href={`#${i.id}`}
                    aria-current={current ? "true" : undefined}
                    className={`block rounded-md px-2 py-1.5 text-[13px] leading-snug transition-colors duration-200 ease-glide ${
                      current
                        ? "bg-sunk font-medium text-ink"
                        : "text-haze hover:text-ink"
                    }`}
                  >
                    {i.label}
                  </a>
                </li>
              );
            })}
            </ul>
          </nav>,
          document.body,
        )}
    </>
  );
}
