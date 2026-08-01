"use client";

// The hero: a tall scroll region where the reader's scroll drives the ascent, and
// the copy changes at altitude.
//
// Structure of the effect — a sticky viewport inside a tall spacer. The spacer's
// height IS the scroll budget; the sticky child stays put while it is consumed.
// This is the mechanism behind every scroll-scrubbed Apple product page, and it is
// worth doing this way rather than with a scroll library because it degrades
// perfectly: with JavaScript off, or WebGL unavailable, the sticky child is simply
// a well-composed static screen.
//
// The 3D canvas is loaded lazily and only after we've confirmed WebGL exists, so
// the bundle cost lands on capable devices only.

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const Ascent = dynamic(() => import("./Ascent"), { ssr: false });

/** Altitude markers. These are the club's real milestones, not filler. */
type Stage = { at: number; altitude: string; line: string };

const STAGES: Stage[] = [
  { at: 0.0, altitude: "T-00:00", line: "Ignition" },
  { at: 0.28, altitude: "First stage", line: "A student opens their first pull request" },
  { at: 0.55, altitude: "Separation", line: "A maintainer merges it" },
  { at: 0.8, altitude: "Orbit", line: "Their name is in the commit log, permanently" },
];

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function hasWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return Boolean(
      c.getContext("webgl2") ??
        c.getContext("webgl") ??
        c.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}

function isLowEnd(): boolean {
  if (typeof navigator === "undefined") return false;
  const cores = navigator.hardwareConcurrency ?? 4;
  // deviceMemory is Chromium-only; absence is not evidence of a weak device.
  const mem = (navigator as { deviceMemory?: number }).deviceMemory;
  return cores <= 4 || (typeof mem === "number" && mem <= 4);
}

export default function Hero() {
  const track = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const [stage, setStage] = useState(0);

  // Resolved on the client only — every one of these checks touches window.
  const [caps, setCaps] = useState<{
    ready: boolean;
    webgl: boolean;
    reduced: boolean;
    lowEnd: boolean;
  }>({ ready: false, webgl: false, reduced: false, lowEnd: false });

  useEffect(() => {
    setCaps({
      ready: true,
      webgl: hasWebGL(),
      reduced: prefersReducedMotion(),
      lowEnd: isLowEnd(),
    });
  }, []);

  useEffect(() => {
    if (!caps.ready) return;

    // Under reduced motion the scene is parked at apex and never scrubbed.
    if (caps.reduced) {
      progress.current = 0.8;
      setStage(STAGES.length - 1);
      return;
    }

    let raf = 0;
    const onScroll = () => {
      // Read layout inside rAF, never in the scroll handler itself — measuring
      // getBoundingClientRect on every scroll event is how these go janky.
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = track.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        if (total <= 0) return;
        const p = Math.min(1, Math.max(0, -rect.top / total));
        progress.current = p;

        // Copy swaps at thresholds rather than every frame, so React re-renders a
        // handful of times across the whole hero instead of sixty times a second.
        let next = 0;
        for (let i = 0; i < STAGES.length; i++) if (p >= STAGES[i].at) next = i;
        setStage((prev) => (prev === next ? prev : next));
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [caps.ready, caps.reduced]);

  const showCanvas = caps.ready && caps.webgl;
  const current = STAGES[stage];

  return (
    <section
      ref={track}
      // Tall on capable devices to give the scrub room; collapsed to a single
      // screen when there's nothing to scrub.
      // 320vh left the vehicle out of frame for most of the scroll, so the tail
      // of the hero was dead space. 220vh keeps the ascent occupying the whole
      // budget.
      className={`night ${showCanvas && !caps.reduced ? "relative h-[220vh]" : "relative h-screen"}`}
      aria-label="Scaler Open Source Club"
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        {/* ---- 3D layer, or a static composition standing in for it ---- */}
        <div className="absolute inset-0" aria-hidden>
          {showCanvas ? (
            <Ascent progress={progress} reduced={caps.reduced} lowEnd={caps.lowEnd} />
          ) : (
            // No WebGL: a CSS-only stand-in. Not an apology for the 3D — a
            // composition that holds the same shape so the layout never breaks.
            <div className="absolute inset-0">
              <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(95,212,255,0.14),transparent_62%)]" />
              <div className="absolute left-1/2 top-1/2 h-[70vh] w-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-accent/45 to-transparent" />
            </div>
          )}
        </div>

        {/* Ground haze, so the vehicle reads as leaving something. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-bg via-bg/50 to-transparent"
        />

        {/* ---- Copy ----
            Apple's store hero is asymmetric: one enormous word on the left, a
            short right-aligned statement opposite, and nothing in between. The
            confidence comes from the imbalance and the empty middle. Copied here
            structurally — the big word states the subject, the statement opposite
            makes the claim. */}
        <div className="section relative z-10 w-full">
          <div className="grid gap-10 lg:grid-cols-[auto_1fr] lg:items-start lg:gap-20">
            <div>
              <p className="label animate-rise">Scaler School of Technology</p>
              <h1 className="mt-4 text-display-xl font-semibold animate-rise">
                Open
                <br />
                <span className="text-accent">Source</span>
              </h1>
            </div>

            <div className="animate-rise lg:pt-14 lg:text-right">
              <p className="measure text-body-lg text-ink lg:ml-auto">
                We put student names in the commit log.
              </p>
              <p className="measure mt-4 text-body text-haze lg:ml-auto">
                Members contribute to the projects the world already runs on. Every
                claim on this page is a link you can open.
              </p>

              {/* Altitude readout — mono, tabular, advances as the vehicle climbs. */}
              <div
                className="mt-8 flex items-center gap-4 lg:justify-end"
                aria-live="polite"
                aria-atomic="true"
              >
                <span className="font-mono text-label uppercase tabular-nums text-accent">
                  {current.altitude}
                </span>
                <span className="h-px w-8 bg-seam" aria-hidden />
                <span className="font-mono text-sm text-haze transition-opacity duration-500 ease-glide">
                  {current.line}
                </span>
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-3 lg:justify-end">
                <a
                  href="#projects"
                  className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-void transition duration-300 ease-glide hover:bg-accent"
                >
                  See what we shipped
                </a>
                <a
                  href="#join"
                  className="rounded-full border border-seam px-6 py-3 text-sm font-semibold text-ink transition duration-300 ease-glide hover:border-accent/60"
                >
                  Join the club
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll affordance — only where there is something to scroll. */}
        {showCanvas && !caps.reduced && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-dust">
              scroll to launch
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
