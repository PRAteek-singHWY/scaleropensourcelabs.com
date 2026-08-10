"use client";

// The persistent call to action — Apple's sticky buy bar, which is the single
// device that makes their product pages sell rather than merely describe.
//
// On a 26,000px page the join form exists exactly once. A reader who is convinced
// at the mentors section is 12,000px from the only place they can act, and asking
// them to scroll back is asking them to lose interest. This keeps the action one
// tap away from wherever conviction happens.
//
// Four rules, each of which is why the pattern is usually done badly:
//
// 1. It does not appear over the hero. The hero already carries both CTAs; a bar
//    repeating them on load is noise, and a page that starts by nagging reads as
//    desperate rather than confident.
//
// 2. It HIDES when the apply form is on screen. Pushing someone toward a form they
//    are already looking at is the clearest possible signal that nothing on the
//    page is paying attention to them.
//
// 3. It reserves its own space rather than covering the last section. A fixed bar
//    that permanently occludes the footer is a bug, not a CTA.
//
// 4. It states only what is true. If no cohort deadline is configured it says
//    nothing about timing — there is no invented countdown here, which is the
//    same rule the form itself follows.

import { useEffect, useState } from "react";
import CelebrateLink from "@/components/fx/CelebrateLink";

const DEADLINE = process.env.NEXT_PUBLIC_COHORT_DEADLINE ?? "";

function deadlineLabel(): string | null {
  if (!DEADLINE) return null;
  const d = new Date(DEADLINE);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

export default function StickyCTA() {
  const [show, setShow] = useState(false);
  const deadline = deadlineLabel();

  useEffect(() => {
    const hero = document.querySelector("header.section");
    const apply = document.querySelector("#apply");
    if (!hero || !apply) return;

    // Tracked as two independent booleans and combined, rather than one observer
    // toggling a single flag. With one flag, whichever element reported last would
    // win, so scrolling fast past the hero into apply could leave the bar showing
    // over the form.
    let heroSeen = true;
    let applySeen = false;
    const sync = () => setShow(!heroSeen && !applySeen);

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.target === hero) heroSeen = e.isIntersecting;
          if (e.target === apply) applySeen = e.isIntersecting;
        }
        sync();
      },
      { threshold: 0.01 },
    );
    io.observe(hero);
    io.observe(apply);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (show) root.setAttribute("data-cta", "1");
    else root.removeAttribute("data-cta");
    return () => root.removeAttribute("data-cta");
  }, [show]);

  return (
    <div
      // aria-hidden while off-screen, and pointer-events removed, so it is never a
      // tab stop the reader cannot see.
      aria-hidden={!show}
      className={`plate fixed inset-x-0 bottom-0 z-40 border-t border-seam transition-transform duration-500 ease-glide ${
        show ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
    >
      <div className="section flex items-center justify-between gap-4 py-3">
        <div className="min-w-0">
          {/* Two lengths rather than one truncated string. At 390px the full
              sentence plus the button left "no experi…" on screen, which is worse
              than saying less: a clipped promise reads as a broken page. */}
          <p className="text-sm font-medium">
            <span className="sm:hidden">Open to all years</span>
            <span className="hidden sm:inline">
              Open to all years, no experience needed
            </span>
          </p>
          {/* Only rendered when a real date is configured. */}
          {deadline && (
            <p className="mt-0.5 truncate text-[15px] text-ember">
              Applications close {deadline}
            </p>
          )}
        </div>
        <CelebrateLink
          href="#apply"
          className="btn btn-pop shrink-0"
          tabIndex={show ? 0 : -1}
        >
          Join the club
        </CelebrateLink>
      </div>
    </div>
  );
}
