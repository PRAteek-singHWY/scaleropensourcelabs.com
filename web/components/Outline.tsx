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
// 2. It is OFF by default and the choice persists. It opens as a menu UNDER ITS
//    OWN TOGGLE rather than as a rail pinned to the right edge of the viewport,
//    which is the change worth explaining: a panel that appears in the far corner
//    is not visibly the answer to the button that was just pressed, and it read as
//    a second, unrelated piece of chrome that had floated in over the page.
//    Anchored to the control, it is plainly that control's list.
//
//    A menu covers the page rather than displacing it. The rail version reserved
//    15rem of `main` while it was open (`:root[data-outline="1"]`, now gone from
//    globals.css) so that nothing was underneath it — which cannot survive this
//    move: the panel's distance from the right edge is now whatever the nav's own
//    right-hand group measures, so no constant in CSS matches it, and a page that
//    shifts 240px sideways when a dropdown opens is worse than one that is briefly
//    covered. Selecting an entry closes it, so what it covers is uncovered by the
//    click that uses it.
//
//    Below `lg` the toggle is not rendered at all — there is no room for a
//    fourteen-item menu on a phone, and pretending otherwise would just cover the
//    page it is meant to be an index of.
//
// 3. Active section comes from IntersectionObserver, not a scroll handler doing
//    arithmetic on offsets. Offsets go stale whenever a section above changes
//    height, and this page's sections change height with the content in club.ts.
//
// 4. The panel is `position: absolute` inside a `relative` wrapper around the
//    toggle, and NOT `position: fixed` — which is the one piece of geometry here
//    with a trap in it. The nav carries `backdrop-filter` for its frosted plate,
//    and backdrop-filter — like transform, filter and will-change — makes an
//    element a containing block for its fixed descendants. So a fixed panel inside
//    the header resolves its offsets against the bar rather than the viewport,
//    which is how an earlier version came to be laid out from y -247 to 291: half
//    of it above the top of the screen, and the rest sitting exactly over the
//    toggle that was supposed to close it. That was fixed by portalling the panel
//    to <body> — the right answer for a viewport-pinned rail, and the wrong one
//    for a menu, because a portal puts the panel where the toggle is not and then
//    has to be told where the toggle is, in numbers that go stale the moment a nav
//    label changes length.
//
//    An absolute panel needs none of that. Its containing block is the wrapper it
//    shares with the button, so `right-0` IS "aligned to the toggle's right edge"
//    at every width, with nothing to measure and nothing to keep in sync. The
//    vertical offset is the one term NOT taken from the button — it comes off the
//    plate's centre, for the reason spelled out at the panel itself. Nothing clips
//    it: `.nav-plate` carries no overflow, which globals.css calls out as
//    deliberate, and the header's z-50 puts the whole bar and its menu over the
//    page.

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Item = { id: string; label: string };

const KEY = "osc-outline";

/** "who-not-for" -> "Who not for". Last-resort label only. */
function prettify(id: string): string {
  const s = id.replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Outline() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState<string>("");
  /* The toggle, so closing with Escape can put focus back where it came from.
     A menu that vanishes and leaves focus nowhere strands a keyboard reader at
     the top of the document. */
  const btn = useRef<HTMLButtonElement>(null);
  // The panel lives in the nav, which lives in the root layout, so it survives every
  // client-side navigation while the sections it indexes are swapped out from under
  // it. Without this the list was scanned once and then frozen: a reader who opened
  // it on /projects saw the home page's eight sections, clicked one, and got
  // nothing — the anchors pointed at ids that were no longer in the document.
  //
  // Re-scanning per route also means `active` has to be cleared, which the effect
  // below does implicitly by re-running: a stale id from the previous page would
  // otherwise keep one entry highlighted until the reader scrolled.
  const pathname = usePathname();

  /* One writer for the preference. Escape and a selected entry both close the
     panel, and a close that forgets to record itself is a panel that comes back
     on the next page load. */
  const set = useCallback((next: boolean) => {
    setOpen(next);
    localStorage.setItem(KEY, next ? "1" : "0");
  }, []);
  const toggle = () => set(!open);
  /* Memoised because the Escape effect below depends on it. A fresh closure each
     render would re-bind the listener on every render the panel is open for. */
  const close = useCallback(() => set(false), [set]);

  useEffect(() => {
    setOpen(localStorage.getItem(KEY) === "1");
    setReady(true);
  }, []);

  /* ESCAPE CLOSES IT. Cheap, and the one keyboard affordance a popover cannot do
     without — the toggle is the only other way out, and a reader who has tabbed
     into the list is fourteen stops away from it.
     Deliberately not paired with a close-on-outside-click: this panel survives
     client-side navigation on purpose (see the scan effect above), and a stray
     click anywhere on the page is not a request to lose it. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      close();
      btn.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
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
      found.push({
        id: s.id,
        label: label.length > 34 ? `${label.slice(0, 33)}…` : label,
      });
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
          .sort(
            (a, z) => a.boundingClientRect.top - z.boundingClientRect.top,
          )[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );
    document.querySelectorAll("section[id]").forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [pathname]);

  return (
    /* THE WRAPPER IS THE WHOLE POSITIONING MECHANISM, and the only reason this is
       a wrapper and not a fragment: `relative` here makes this element the
       containing block for the panel below, so the panel's offsets are measured
       from the toggle's own box rather than from the viewport or from whichever
       ancestor happens to be positioned. Nothing to compute, nothing to keep in
       step with the nav's contents.
       It carries the breakpoint too. The button was `hidden lg:flex` on its own,
       and a wrapper that stayed in the flow below lg would be a zero-width flex
       item in the nav's `gap-3 sm:gap-4` row — two gaps of dead space on a phone,
       around nothing. Hidden here, so there is no item to space. */
    <div className="relative hidden lg:flex">
      {/* aria-pressed rather than a checkbox: this is a control that changes the
          view, and a button carrying its own state is what a screen reader expects
          for that. The label states what it does, not what it currently is. */}
      <button
        ref={btn}
        type="button"
        onClick={toggle}
        aria-pressed={open}
        aria-controls="page-outline"
        aria-expanded={open}
        title="Outline view"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-seam text-haze transition-colors duration-200 ease-in-out hover:border-accent/60 hover:text-accent"
      >
        <span className="sr-only">
          {open ? "Hide the page outline" : "Show the page outline"}
        </span>
        <span
          aria-hidden
          className="flex items-center justify-center"
          style={{ opacity: ready ? 1 : 0 }}
        >
          <svg
            viewBox="0 0 16 16"
            width="13"
            height="13"
            fill="none"
            aria-hidden
          >
            <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M2 4h3M2 8h3M2 12h3" />
              <path
                d="M7.5 4h6.5M7.5 8h6.5M7.5 12h6.5"
                opacity={open ? "1" : "0.45"}
              />
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
      {ready && open && items.length > 0 && (
        <nav
          id="page-outline"
          aria-label="Page outline"
          /* `right-0` aligns it to the toggle's right edge, so it opens back
             across the bar rather than off the side of the screen.
             THE VERTICAL OFFSET IS MEASURED FROM THE PLATE, NOT FROM THE BUTTON,
             which is the one number here worth reading twice. `top-full` plus a
             margin looks like the obvious way to hang something under a control
             and is wrong on this bar: the plate is 56px in px on purpose — it has
             to hold a 44px touch target while the root scales to 75% (see the
             `html` block in globals.css) — while the button is 2.25rem, so the
             distance from the button's bottom edge to the plate's is a function
             of the root size, 14.5px at this one and 10px at a 16px root. A fixed
             margin therefore lands the panel below the glass at one root size and
             4px INSIDE it at another, which is what it did: two frosted plates
             overlapping by 4px along their edges.
             `50%` is the wrapper's centre, which is the plate's centre too since
             the bar centres its items — so half the plate (28px) reaches the glass
             exactly, and 0.5rem is the air below it. Both terms move only if the
             plate's height does, alongside `scroll-padding-top` in globals.css.
             The max-height is the rest of the viewport from there — 1rem of nav
             inset, the 56px it spans to that edge, the gap, and 1rem of air at the
             bottom — so a long list scrolls itself instead of running off the
             screen. */
          className="plate absolute right-0 top-[calc(50%+28px+0.5rem)] z-10 max-h-[calc(100vh-2.5rem-56px)] w-[13.5rem] overflow-y-auto rounded-tile border border-seam p-3"
        >
          <p className="label px-2 pb-2 pt-1">On this page</p>
          {/* CLOSING ON SELECTION is what makes an overlay acceptable here. The
              rail reserved page width for itself and so could stay open; a menu
              sits ON the page, and the one place a reader least wants it is over
              the section they just asked to be taken to. */}
          <ul className="space-y-px" onClick={close}>
            {items.map((i) => {
              const current = i.id === active;
              return (
                <li key={i.id}>
                  <a
                    href={`#${i.id}`}
                    aria-current={current ? "true" : undefined}
                    className={`block rounded-inline px-2 py-1.5 text-sm leading-snug transition-colors duration-200 ease-glide ${
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
        </nav>
      )}
    </div>
  );
}
