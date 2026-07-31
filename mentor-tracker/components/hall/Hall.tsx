"use client";

// The hall: the rocket flies through, and each student it passes is a selection.
//
// Layout mechanic — a tall section with a sticky full-viewport canvas behind it and
// the selection cards in normal document flow on top. Cards alternate sides, and
// the rocket's weave is phased so it crosses toward whichever card is arriving.
// Scroll is never intercepted: the page scrolls down exactly as the reader expects
// and everything else is driven from the resulting offset.
//
// That vertical choice is deliberate over a horizontal rail. A horizontal hall
// requires translating vertical scroll into sideways motion, which breaks trackpad
// and keyboard expectations, fights the native gesture on mobile, and is the single
// most-abandoned pattern of its kind. The lateral feeling comes from the flight
// path instead, which costs nothing.

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Portrait from "@/components/Portrait";
import {
  PROGRAMME_NAME,
  PROGRAMME_SHORT,
  publishedSelections,
  selectionStats,
} from "@/content/club";

const Flight = dynamic(() => import("./Flight"), { ssr: false });

function hasWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function Hall() {
  const people = publishedSelections();
  const stats = selectionStats();

  const track = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const [active, setActive] = useState(0);
  const [caps, setCaps] = useState({ ready: false, webgl: false, reduced: false, lowEnd: false });

  useEffect(() => {
    setCaps({
      ready: true,
      webgl: hasWebGL(),
      reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      lowEnd: (navigator.hardwareConcurrency ?? 8) <= 4,
    });
  }, []);

  useEffect(() => {
    if (!caps.ready || caps.reduced || people.length === 0) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      // Measure inside rAF, never in the scroll handler — reading layout on every
      // scroll event is what makes these janky.
      raf = requestAnimationFrame(() => {
        const el = track.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const span = rect.height - window.innerHeight;
        if (span <= 0) return;
        const p = Math.min(1, Math.max(0, -rect.top / span));
        progress.current = p;
        // round, not floor. Card i is centred in the viewport at p = i/n, so
        // flooring marks it active from the instant it centres until the NEXT one
        // centres — i.e. it stays lit for the whole time it is drifting up and out
        // of frame. Rounding makes "active" mean "nearest to centre", which is what
        // the reader is actually looking at.
        const next = Math.min(
          people.length - 1,
          Math.max(0, Math.round(p * people.length)),
        );
        setActive((prev) => (prev === next ? prev : next));
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
  }, [caps.ready, caps.reduced, people.length]);

  if (people.length === 0) {
    return (
      <div className="section mt-14">
        <div className="rounded-[18px] border border-dashed border-seam px-8 py-20 text-center">
          <p className="text-display-md font-semibold">No selections published yet.</p>
          <p className="measure mx-auto mt-4 text-body text-haze">
            Each entry needs the student&apos;s own permission before their name and
            photograph go on a public, international site. Nothing appears here
            without it.
          </p>
        </div>
      </div>
    );
  }

  const showFlight = caps.ready && caps.webgl;

  return (
    <div ref={track} className="relative" style={{ height: `${(people.length + 1) * 100}vh` }}>
      {/* Sticky stage: the flight and the persistent tally stay put while the
          cards scroll through. */}
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0" aria-hidden>
          {showFlight ? (
            <Flight
              progress={progress}
              stations={people.length}
              reduced={caps.reduced}
              lowEnd={caps.lowEnd}
            />
          ) : (
            <div className="absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(95,212,255,0.1),transparent_65%)]" />
          )}
        </div>

        {/* Programme tally, pinned. The count is the argument the hall is making,
            so it should never scroll out of view mid-hall. */}
        <div className="section pointer-events-none relative flex h-full flex-col justify-between py-10">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <p className="label">The hall</p>
            <p className="font-mono text-xs text-haze tabular-nums">
              {String(active + 1).padStart(2, "0")} / {String(people.length).padStart(2, "0")}
            </p>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
            <p>
              <span className="text-display-lg font-semibold tracking-tightest text-rime">
                {stats.total}
              </span>
              <span className="ml-3 text-body text-haze">
                selected into international programmes
              </span>
            </p>
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {stats.programmes.map(({ programme, count }) => (
                <li key={programme} className="font-mono text-xs">
                  <span className="text-rime">{PROGRAMME_SHORT[programme]}</span>
                  <span className="ml-1.5 text-dust tabular-nums">×{count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Cards in normal flow, overlaying the sticky stage. Alternating sides so
          the weaving rocket passes between them. */}
      <div className="absolute inset-x-0 top-0">
        {people.map((s, i) => {
          const right = i % 2 === 1;
          return (
            <div
              key={`${s.name}-${s.programme}-${s.year}`}
              /* pt clears the fixed 44px nav so a centred card never tucks under
                 it; max-h keeps a tall card inside the viewport instead of
                 clipping at the top. */
              className="flex h-screen items-center pt-11"
            >
              <div className="section w-full">
                <article
                  /* 220ms, and opacity/transform only.
                   *
                   * At 700ms with transition-all the card never actually arrived:
                   * `active` changes once per viewport of scroll, so a normal scroll
                   * swapped it again before the previous transition finished, and
                   * measuring found every card parked mid-tween (0.76, 0.49) — the
                   * active card was never once seen at full opacity.
                   *
                   * `blur` is gone too. Blurring a large element every frame is a
                   * real GPU cost, and a half-applied blur is exactly what made the
                   * in-between states look muddy rather than deliberate. Opacity and
                   * scale alone read cleaner and settle instantly.
                   */
                  className={`max-h-[calc(100vh-6rem)] w-full max-w-[24rem] overflow-hidden transition-[opacity,transform] duration-[220ms] ease-glide ${
                    right ? "ml-auto" : "mr-auto"
                  } ${
                    /* The active card has to READ as the subject. bg-hull/85 over a
                       near-black field is dark-on-dark, so "active" was landing
                       correctly and still looking dim — the state was right and the
                       contrast was wrong. Active now gets a solid surface, a plasma
                       edge and a lift; inactive recedes much further so the
                       difference is unmistakable rather than subtle. */
                    active === i
                      ? "scale-100 opacity-100"
                      : "scale-[0.96] opacity-40"
                  }`}
                  style={{ containerType: "inline-size" }}
                >
                  <div
                    className={`overflow-hidden rounded-[18px] border transition-[border-color,box-shadow] duration-[220ms] ease-glide ${
                      active === i
                        ? "border-plasma/35 bg-hull shadow-[0_0_0_1px_rgba(95,212,255,0.10),0_40px_90px_-40px_rgba(0,0,0,0.95)]"
                        : "border-seam bg-hull/70"
                    }`}
                  >
                    <div className="relative aspect-[5/4] w-full overflow-hidden">
                      <Portrait
                        name={s.name}
                        photo={s.photo}
                        priority={i < 2}
                        className="absolute inset-0 h-full w-full"
                      />
                      <div
                        aria-hidden
                        className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-hull via-hull/80 to-transparent"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-6">
                        {/* The programme is the largest element: "GSoC" is the word
                            this audience recognises on sight. */}
                        <p className="text-display-md font-semibold leading-none text-rime">
                          {PROGRAMME_SHORT[s.programme]}
                        </p>
                        <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-plasma">
                          {s.year} · {s.org}
                        </p>
                      </div>
                    </div>

                    <div className="p-6">
                      <p className="font-semibold text-rime">{s.name}</p>
                      <p className="mt-2 text-sm leading-relaxed text-haze">{s.work}</p>
                      <div className="mt-5 flex items-center gap-4 border-t border-seam pt-4 font-mono text-xs">
                        <span className="text-dust">{PROGRAMME_NAME[s.programme]}</span>
                        {s.url && (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            className="pointer-events-auto ml-auto text-haze transition-colors hover:text-plasma"
                          >
                            Proof ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
