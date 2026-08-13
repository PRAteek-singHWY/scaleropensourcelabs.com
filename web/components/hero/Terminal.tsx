"use client";

// The hero's right-hand column: the reader's first contribution, typed out.
//
// WHAT THIS REPLACED, AND WHY. This box used to be a live-looking feed of named
// students — "Prateek Singh 46 merged in OWASP/OpenCRE", "Ojas Maheshwari
// selected into GSoC", "+12 more this cohort". Every line was true and every
// line was read from content/club.ts, so it was not a factual problem. It was a
// FAIRNESS problem, and that is the harder one:
//
//   * Four names fit. Fifteen people are in the cohort. The four in the hero
//     were whoever the array happened to sort first — an editorial ranking the
//     club never made, printed in its largest, most-seen component.
//   * It is the first thing a prospective member reads, and it says "here are
//     the people who already made it." That is the exact belief the page spends
//     the rest of its length dismantling.
//
// So the box now addresses the reader instead of the alumni. It is the same
// object — dark terminal, mono, ambient indigo glow — running a session that
// belongs to whoever is looking at it. The session is the real workflow, in the
// real order, and it ends where the headline four inches to its left starts:
// your name in the commit log.
//
// The evidence did not go anywhere. It moved to where it was already stronger:
// the floating chips still carry the API-verified merge count and the cohort
// size (see Hero.tsx), the figure block under the hero states the total, and the
// hall names every one of them with links. Nobody lost a credit; the credit stopped
// being a leaderboard.
//
// NOTHING HERE IS A CLAIM. That is the other thing the change buys. A simulated
// shell typing `git commit` is self-evidently a demonstration, not an assertion
// about a person's record — so it cannot be checked and found false, which is
// what the old version's every line risked. The one placeholder that could read
// as a claim, the repo being cloned, is written as `<a-project-that-needs-help>`
// rather than a real slug, because naming one project in the hero would re-run
// the same favouritism at the repo level.
//
// The dark fill is FIXED rather than themed, unchanged from the previous
// version. A terminal is a terminal; inverting it in light mode would make it a
// white box with syntax colours, which is not the object being depicted. It also
// means the contrast pairs inside are measured once instead of once per theme —
// every colour below sits on #0F172A at 6.4:1 or better.

import { useEffect, useLayoutEffect, useState } from "react";

/* Sampled against #0F172A: dim 6.96, text 14.6, green 11.4, indigo 6.56,
   blue 7.02, amber 9.4, red 6.46. All clear the 4.5 floor for mono at this
   size — including the red, which is the one people assume fails. */
const DIM = "#94A3B8";
const TEXT = "#E2E8F0";
const OK = "#4ADE80";
const IND = "#A78BFA";
const KEY = "#60A5FA";
const NUM = "#FBBF24";
const WARN = "#F87171";

type Part = { t: string; c: string };
type Step = { kind: "cmd" | "out"; parts: Part[] };

/* THE SESSION.
 *
 * Coloured per fragment rather than by a syntax highlighter, because the typing
 * animation slices this array mid-word and a real tokeniser would be re-lexing a
 * half-written command sixty times a second to produce the same six colours.
 *
 * On the command choice: `git init` / `git add .` / `git commit` / `git push`
 * was the first draft and it is the wrong sequence for this page. `git init`
 * starts a NEW repository — it is what you run on your own empty folder. Nobody
 * joins open source that way; you clone something that already exists and add to
 * it, which is the entire point the club is making. The order below is what a
 * first contribution actually looks like, so a sixteen-year-old who copies it
 * verbatim ends up somewhere real. The commit message survived from that draft
 * intact, because it is the best line in the box.
 *
 * The opening `git log --author="you"` is what ties this to the headline. It
 * asks the page's question — is your name in here? — gets the honest answer for
 * a reader who has not started yet, and then spends five lines fixing it.
 */
const SCRIPT: Step[] = [
  {
    kind: "cmd",
    parts: [
      { t: "git log ", c: TEXT },
      { t: "--author=", c: DIM },
      { t: '"you"', c: NUM },
    ],
  },
  { kind: "out", parts: [{ t: "fatal: no commits found — yet", c: WARN }] },
  {
    kind: "cmd",
    parts: [
      { t: "git clone ", c: TEXT },
      { t: "<a-project-that-needs-help>", c: KEY },
    ],
  },
  {
    kind: "cmd",
    parts: [
      { t: "git checkout ", c: TEXT },
      { t: "-b ", c: DIM },
      { t: "my-first-contribution", c: IND },
    ],
  },
  {
    kind: "cmd",
    parts: [
      { t: "git commit ", c: TEXT },
      { t: "-m ", c: DIM },
      { t: '"open source journey loading..."', c: OK },
    ],
  },
  {
    kind: "cmd",
    parts: [
      { t: "git push ", c: TEXT },
      { t: "origin HEAD", c: DIM },
    ],
  },
  {
    kind: "out",
    parts: [
      { t: "remote: ", c: DIM },
      { t: "pull request opened ✓", c: OK },
    ],
  },
  { kind: "out", parts: [{ t: "your name is in the commit log.", c: TEXT }] },
];

/* Milliseconds. CHAR is deliberately not uniform-fast: 26ms is about 38 keys a
   second, which reads as a person typing rather than a paste. ENTER is the beat
   after a command finishes and before the next line appears — without it the
   whole session runs together into one paragraph that happens to have prompts
   in it. HOLD leaves the finished session on screen long enough to be read by
   someone who arrived halfway through the run. */
const CHAR = 26;
const ENTER = 420;
const OUT = 320;
const HOLD = 4200;

const LEN = (parts: Part[]) => parts.reduce((n, p) => n + p.t.length, 0);

/** The first `n` characters of a coloured line, still coloured. */
function slice(parts: Part[], n: number): Part[] {
  const out: Part[] = [];
  let left = n;
  for (const p of parts) {
    if (left <= 0) break;
    out.push(left >= p.t.length ? p : { ...p, t: p.t.slice(0, left) });
    left -= p.t.length;
  }
  return out;
}

/* useLayoutEffect on the client, useEffect on the server — the standard dodge
   for React's SSR warning, and here it is load-bearing rather than cosmetic.
   The component renders the COMPLETED session first (see below), so the effect
   that rewinds it to empty has to run before the browser paints. With a plain
   useEffect there is one frame in which the whole script is visible at once,
   which looks like a flash of broken layout every hard refresh. */
const useIsoEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function Terminal() {
  /* {step, chars}: every step before `step` is fully printed, `step` itself is
     mid-type at `chars` characters.

     It starts AT THE END — step === SCRIPT.length, the whole session already
     run. That initial state is what the server renders and what a browser with
     JavaScript disabled keeps, so the no-JS rendering is not an empty black box
     but the finished session, which is the actual message. The animation is an
     enhancement on top of a complete static component. */
  const [at, setAt] = useState({ step: SCRIPT.length, chars: 0 });
  const [animate, setAnimate] = useState(false);

  useIsoEffect(() => {
    // Reduced motion keeps the finished session and never schedules a timer.
    // The global block in globals.css zeroes CSS durations, but this loop is
    // JavaScript and would run straight through it — a looping type-out is
    // exactly the kind of unstoppable movement that preference exists to stop.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setAnimate(true);
    setAt({ step: 0, chars: 0 });
  }, []);

  useEffect(() => {
    if (!animate) return;
    const { step, chars } = at;

    // One timer in flight at a time, cleared on every state change. The whole
    // loop is driven by this effect re-running on its own output, which means
    // there is no interval to leak and no ref holding a queue of pending steps.
    const wait = (ms: number, next: typeof at) => {
      const t = window.setTimeout(() => setAt(next), ms);
      return () => window.clearTimeout(t);
    };

    if (step >= SCRIPT.length) return wait(HOLD, { step: 0, chars: 0 });

    const cur = SCRIPT[step];
    // Output lines land whole. Nothing types them — the machine printed them.
    if (cur.kind === "out") return wait(OUT, { step: step + 1, chars: 0 });
    if (chars < LEN(cur.parts)) return wait(CHAR, { step, chars: chars + 1 });
    return wait(ENTER, { step: step + 1, chars: 0 });
  }, [at, animate]);

  const done = at.step >= SCRIPT.length;

  return (
    <div
      // aria-hidden, and this is a deliberate accessibility call rather than an
      // oversight. Two reasons, either of which is sufficient: a screen reader
      // would announce a re-typing command line on a loop with no way to stop
      // it, and the same sequence already exists as real prose in the "how you
      // actually start" list further down the page (PATH in content/club.ts).
      // This is a decorative restatement of that list.
      aria-hidden
      className="overflow-hidden rounded-panel border border-white/10"
      style={{
        background: "#0F172A",
        // Ambient indigo rather than neutral, so the card looks lit by the
        // headline gradient beside it instead of merely raised.
        boxShadow: "0 20px 50px rgba(99, 102, 241, 0.25)",
      }}
    >
      {/* Title bar. The three dots are the one piece of pure decoration here,
          and they earn it: they are what makes the box read as a terminal in
          the quarter-second before anyone reads a word of it. */}
      <div
        className="flex items-center gap-2 border-b border-white/10 px-4 py-3"
        // #161E30 is what rgba(255,255,255,0.03) composites to over #0F172A —
        // written out rather than layered, because the QA contrast walker reads
        // backgroundColor from the cascade and takes the first three channels of
        // whatever it finds. Given "rgba(255,255,255,0.03)" it reads WHITE,
        // ignores the alpha, and scores this label at 2.56:1 against a surface
        // that does not exist. Pre-composited it measures the real 6.5:1.
        style={{ background: "#161E30" }}
      >
        <span className="flex gap-1.5">
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <span
              key={c}
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: c }}
            />
          ))}
        </span>
        <span
          className="ml-2 font-mono text-[13px] tracking-wide"
          style={{ color: DIM }}
        >
          your-first-contribution — bash
        </span>
      </div>

      <div className="space-y-2 px-4 py-5 font-mono text-xs leading-relaxed sm:px-5">
        {SCRIPT.map((s, i) => {
          const reached = i <= at.step;
          const full = i < at.step || (i === at.step && s.kind === "out");
          const shown = full
            ? s.parts
            : i === at.step
              ? slice(s.parts, at.chars)
              : [];

          return (
            // EVERY LINE RENDERS AT EVERY MOMENT, empty ones included, and the
            // min-height is why. An unreached step is a <p> with a non-breaking
            // space in it, so the card is exactly as tall on the first frame as
            // on the last. Rendering only the printed lines would grow the box
            // by ~20px per step, and because the hero grid is `items-center`
            // that growth pushes against the headline column and re-centres the
            // whole row on every keystroke.
            <p key={i} className="min-h-[1.6em] break-words">
              {reached && s.kind === "cmd" && (
                <span style={{ color: OK }}>$ </span>
              )}
              {shown.map((p, j) => (
                <span key={j} style={{ color: p.c }}>
                  {p.t}
                </span>
              ))}
              {i === at.step && s.kind === "cmd" && <Caret />}
              {!reached && " "}
            </p>
          );
        })}

        {/* The resting prompt, only once the session has finished. Before that
            the caret is out in the script above, and two carets on screen would
            read as two cursors rather than one moving one. */}
        <p className="min-h-[1.6em] pt-1">
          {done ? (
            <>
              <span style={{ color: OK }}>$ </span>
              <Caret />
            </>
          ) : (
            " "
          )}
        </p>
      </div>
    </div>
  );
}

/* Steady rather than blinking. A blink is an animation that never settles, and
   this one is already moving whenever it has something to say — it walks across
   the line as the command types. At rest, a solid block is a cursor waiting;
   a blinking one is a page still trying to get your attention. */
function Caret() {
  return (
    <span
      className="ml-0.5 inline-block h-3.5 w-2 translate-y-0.5"
      style={{ background: DIM }}
    />
  );
}
