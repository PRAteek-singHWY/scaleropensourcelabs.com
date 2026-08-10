// PAGE 5 — HOW TO JOIN OSC.
//
// Four paths, split by level, each stating who it is for, what week one looks like,
// and what you walk away with.
//
// The four exist because the biggest reason people do not join a technical club is
// not lack of interest — it is not knowing which version of themselves the invitation
// is addressed to. A first-year who has never used Git and a third-year with merged
// CNCF patches bounce off the same generic "join us" for opposite reasons.
//
// BEGINNER PATHS GO FIRST and the levels are labelled in plain words rather than as
// "Level 1 / Level 2". A page that opens with the fast-track tells the person it was
// written for that they are behind before they have read a sentence.
//
// Each path's closing action is the same form with a different path preselected, so
// this page still ends with one action rather than four buttons.

import type { Metadata } from "next";
import Link from "next/link";
import Duo from "@/components/Duo";
import Doodle from "@/components/Doodle";
import PRTimeline from "@/components/PRTimeline";
import Terminal from "@/components/Terminal";
import NextAction from "@/components/NextAction";
import { JOIN_HREF, LINKS } from "@/content/site";
import {
  CULTURE,
  FAQ,
  LEVEL_LABEL,
  LOOKING_FOR,
  NOT_FOR,
  PATHS,
  type Level,
} from "@/content/join";

export const metadata: Metadata = {
  title: "How to Join",
  description:
    "Four concrete ways into the Scaler Open Source Club, split by level: build days, a first contribution sprint, a fast-track for people already contributing, and the GSoC/LFX prep cohort.",
};

const LEVELS: Level[] = ["beginner", "intermediate"];

export default function HowToJoin() {
  return (
    <main id="main">
      <header className="section page-top pb-4 pt-20 sm:pt-24">
        <p className="flex items-center gap-2">
          <span className="chip">How to join</span>
          <Doodle kind="arrow" className="h-5 w-9 text-accent" />
        </p>
        <h1 className="mt-7 font-display text-display-xl uppercase leading-[0.9] tracking-tightest">
          Four doors, <span className="tone">all of them open</span>
        </h1>
        <p className="measure mt-7 text-body-lg text-haze">
          Pick the one that describes you today, not the one you wish described you.
          Nobody checks which door you came through, and people move between them
          constantly.
        </p>
      </header>

      {/* ---- The four paths --------------------------------------------------- */}
      {LEVELS.map((level, levelIndex) => (
        <section
          key={level}
          id={level === "beginner" ? "beginner-paths" : "intermediate-paths"}
          className={
            levelIndex === 1
              ? "band section pb-24 pt-24 sm:pb-32 sm:pt-32"
              : "section pt-20 sm:pt-24"
          }
          aria-label={`${LEVEL_LABEL[level]} — entry paths`}
        >
          <div className="border-b border-seam pb-5">
            <p className="label">{LEVEL_LABEL[level]}</p>
            <Duo
              className="mt-4 max-w-3xl text-display-lg"
              lead={
                level === "beginner"
                  ? "Two ways in from zero."
                  : "Two ways in if you have done some of this."
              }
            />
          </div>

          <div className="mt-12 space-y-4">
            {PATHS.filter((p) => p.level === level).map((p, i) => (
              <article
                key={p.id}
                id={p.id}
                className="rounded-panel border border-seam bg-raise p-7 sm:p-10"
              >
                <div className="grid grid-cols-1 gap-10 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-14">
                  <div>
                    <span className="step" aria-hidden>
                      {String(
                        // Numbered 01–04 across BOTH sections rather than restarting
                        // at each level, because the brief presents them as four
                        // paths and two independent "01"s would read as two lists.
                        levelIndex * 2 + i + 1,
                      ).padStart(2, "0")}
                    </span>
                    <h3 className="mt-4 font-display text-display-md uppercase leading-none tracking-[-0.005em]">
                      {p.name}
                    </h3>
                    <p className="mt-3 text-body text-accent">{p.tagline}</p>

                    {p.bring && (
                      <p className="mt-6 rounded-md border border-seam bg-sunk px-4 py-3 font-mono text-xs leading-relaxed text-haze">
                        Bring: {p.bring}
                      </p>
                    )}

                    {/* Per-path entry into the same form. Not a competing action —
                        it is the page's one action, addressed to whichever path the
                        reader has just finished reading. */}
                    <div className="mt-6">
                      <Link
                        href={`${JOIN_HREF}?path=${p.id}`}
                        className="tap inline-block font-mono text-xs text-accent transition hover:brightness-125"
                      >
                        Apply on this path →
                      </Link>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <p className="label">Who it&apos;s for</p>
                      <p className="mt-2.5 text-body text-haze">{p.forWho}</p>
                    </div>

                    <div>
                      <p className="label">What week one looks like</p>
                      <ol className="mt-4 space-y-3.5">
                        {p.weekOne.map((w, wi) => (
                          <li key={wi} className="flex gap-4">
                            <span
                              aria-hidden
                              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                            />
                            <span className="text-body text-haze">{w}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="border-t border-seam pt-6">
                      <p className="label flex items-center gap-2 text-accent">
                        What you walk away with
                        <Doodle kind="sparkle" className="h-3.5 w-3.5" />
                      </p>
                      <p className="mt-2.5 text-body-lg text-ink">{p.walkAway}</p>
                    </div>

                    {/* Only the hackathon path carries one today. Rendered as a quiet
                        aside rather than a highlighted callout — it is a
                        clarification about how the thing runs, not a selling point. */}
                    {p.note && (
                      <p className="flex gap-3 rounded-md border border-seam bg-sunk p-5 text-sm leading-relaxed text-haze">
                        <span
                          aria-hidden
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-dust"
                        />
                        {p.note}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      {/* ---- What actually happens to a pull request -------------------------
          Placed here rather than on the home page on purpose: it answers the
          question the four paths above have just raised, which is "yes but what
          literally happens when I press the button". */}
      <section
        id="the-loop"
        className="section pt-24 sm:pt-32"
        aria-label="What happens to a pull request"
      >
        <p className="chip">The loop</p>
        <Duo
          className="mt-6 max-w-4xl text-display-lg"
          lead="What happens after you press submit."
          trail="Including the scary step."
        />
        <p className="measure mt-7 text-body-lg text-haze">
          The reason first contributions feel frightening is that nobody describes this
          part, so it feels like posting an exam to a stranger. It is five steps and one
          of them is somebody asking you to change something, which is{" "}
          <span className="mark">the normal case, not a failure</span>.
        </p>

        {/* Equal columns, not a 24rem sidebar. The longest command in the terminal is
            about 484px of `white-space: pre` that must not wrap — a shell command broken
            across lines is ambiguous about whether the break is a newline — and 24rem is
            384px, so it was silently clipped on desktop with no scrollbar visible to say
            there was more. Half of 1152px is 576px, which fits it. */}
        <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          <PRTimeline />

          <div>
            <p className="label">And the commands, for real</p>
            <p className="mt-3 text-body text-haze">
              These work today against this website&apos;s own repository. The prompts
              are excluded from what you copy.
            </p>
            <Terminal
              className="mt-6"
              title="your first contribution"
              label="Commands to fork, build and branch the club's website repository"
              lines={[
                { kind: "note", text: "fork it on GitHub first, then:" },
                { kind: "cmd", text: "git clone https://github.com/<you>/scaleropensourcelabs.com.git" },
                { kind: "cmd", text: "cd scaleropensourcelabs.com/web" },
                { kind: "cmd", text: "npm install" },
                { kind: "cmd", text: "npm run dev" },
                { kind: "out", text: "ready on http://localhost:3000" },
                { kind: "note", text: "then, for the change itself:" },
                { kind: "cmd", text: "git checkout -b fix-the-thing" },
                { kind: "cmd", text: "npm run typecheck" },
                { kind: "cmd", text: "git commit -am 'Fix the thing'" },
                { kind: "cmd", text: "git push origin fix-the-thing" },
              ]}
            />
            <div className="mt-5">
              <a
                href={LINKS.contributing}
                target="_blank"
                rel="noreferrer"
                className="tap inline-block font-mono text-xs text-accent transition hover:brightness-125"
              >
                The full CONTRIBUTING.md ↗
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ---- What we look for ------------------------------------------------
          Immediately after the paths, because that is exactly where the private
          thought "they must already be brilliant, I could never" occurs. Answering
          it in an FAQ item nobody scrolls to is answering it nowhere. */}
      <section
        id="looking-for"
        className="band section pb-24 pt-24 sm:pb-32 sm:pt-32"
        aria-label="What the club looks for"
      >
        <p className="chip">What we look for</p>
        <Duo
          className="mt-6 max-w-4xl text-display-lg"
          lead="We are not checking whether you can already code."
          trail="We are checking how you think."
        />
        <p className="measure mt-7 text-body-lg text-haze">
          Syntax is a few weeks of work. Reading somebody else&apos;s codebase and
          reasoning about it is what actually decides whether your first patch gets
          merged, and it is not what any exam measures. There is no test to pass here
          and no interview to prepare for — this is simply what the work turns out to
          reward.
        </p>

        {/* A contrast rather than a list. "We value reasoning" is what every club
            says; setting each value against the credential it replaces is what makes
            it specific enough to be believed. */}
        <ul className="mt-14 space-y-px overflow-hidden rounded-panel bg-seam">
          {LOOKING_FOR.map((r) => (
            <li
              key={r.yes}
              className="grid gap-4 bg-raise p-6 sm:grid-cols-2 sm:gap-10 sm:p-8"
            >
              <div className="flex items-start gap-3">
                {/* Not a red cross. These are not failures — they are the wrong
                    measure, and colouring them as errors would insult the people who
                    have them. */}
                <span aria-hidden className="mt-1 h-px w-4 shrink-0 bg-dust sm:mt-2.5" />
                <p className="text-body text-dust line-through decoration-dust/40">
                  {r.not}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Doodle
                  kind="sparkle"
                  className="mt-0.5 h-4 w-4 shrink-0 text-accent sm:mt-1.5"
                />
                <p className="text-body-lg font-medium text-ink">{r.yes}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- What it's actually like ------------------------------------------ */}
      <section id="culture" className="section pt-24 sm:pt-32" aria-label="What the club is like">
        <p className="chip">What it&apos;s like</p>
        <Duo
          className="mt-6 max-w-4xl text-display-lg"
          lead="Mostly people arguing about code with Maggi."
          trail="Which is the point."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {CULTURE.map((c) => (
            <div key={c.title} className="rounded-tile border border-seam bg-raise p-7">
              <h3 className="text-body-lg font-semibold">{c.title}</h3>
              <p className="mt-3 text-body text-haze">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Who this is not for ---------------------------------------------
          An explicit filter before the ask. Stating who should not join makes the
          invitation read as selective rather than desperate, and saves everybody the
          wasted month — including us. */}
      <section
        id="not-for"
        className="band section pb-24 pt-24 sm:pb-32 sm:pt-32"
        aria-label="Who this is not for"
      >
        <p className="chip">Be honest with yourself</p>
        <Duo
          className="mt-6 max-w-4xl text-display-lg"
          lead="This is not for everyone."
          trail="Four reasons to walk away now."
        />
        <ul className="mt-12 max-w-3xl space-y-6">
          {NOT_FOR.map((n) => (
            <li key={n} className="flex gap-4 border-t border-seam pt-6">
              <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-ember" />
              <span className="text-body text-haze">{n}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- FAQ -------------------------------------------------------------- */}
      <section id="faq" className="section pt-24 sm:pt-32" aria-label="Questions">
        <p className="chip">Questions</p>
        <Duo className="mt-6 max-w-4xl text-display-lg" lead="The seven things people actually ask." />
        <dl className="mt-12 max-w-3xl">
          {FAQ.map((f) => (
            <div key={f.q} className="border-t border-seam py-7">
              <dt className="text-body-lg font-semibold">{f.q}</dt>
              <dd className="measure mt-3 text-body text-haze">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <NextAction
        eyebrow="Next"
        lead="Pick a door and send the form."
        trail="Two minutes."
        body="It asks which path you want, but that is a default and not a commitment — people reclassify themselves constantly and nobody minds. If you are not sure, choose the build day."
        href={JOIN_HREF}
        cta="Fill in the form"
      />
    </main>
  );
}
