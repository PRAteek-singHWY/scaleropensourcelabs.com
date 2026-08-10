// PAGE 1 — ESSENCE.
//
// The flow is fixed and the order is the argument: what open source IS, then what it
// does to your life, then the club's own numbers, then one person saying it in their
// own words, then the ask. Moving the ask earlier is the obvious temptation and it
// would break the page — nobody joins a club for a thing they cannot yet describe.
//
// Fully static. No database, no API routes, no client JavaScript on this page beyond
// the shared nav and the scroll settle, so it renders identically anywhere.

import Hero from "@/components/hero/Hero";
import CommitGraph from "@/components/CommitGraph";
import Duo from "@/components/Duo";
import Doodle from "@/components/Doodle";
import NumbersStrip from "@/components/NumbersStrip";
import MemberStory from "@/components/MemberStory";
import NextAction from "@/components/NextAction";
import {
  EVERYDAY,
  GLOSSARY,
  IMPACT,
  MAINTAINERS,
  MAINTAINERS_SOURCE,
  POSITIONING,
  TRADE_OFFS,
  WHAT_IT_IS,
} from "@/content/essence";
import { JOIN_HREF } from "@/content/site";

export default function Essence() {
  return (
    <>
      <Hero />

      <main id="main">
        {/* ---- 1. What open source actually is ---------------------------------
            Opening with the reader's own laptop rather than a definition. "Software
            built in public" is abstract; "the editor you have open on the other
            monitor is one of these, here is its source" is not, and it does the
            convincing before the definition arrives. */}
        <section id="what-it-is" className="section pt-24 sm:pt-32" aria-label="What open source is">
          <p className="flex items-center gap-2">
            <span className="chip">What it is</span>
            <Doodle kind="squiggle" className="h-5 w-8 text-accent" />
          </p>
          <Duo
            className="mt-6 max-w-4xl text-display-lg"
            lead="You have been using it all day."
            trail="Nobody told you that you could change it."
          />
          <p className="measure mt-7 text-body-lg text-haze">
            Open source is software written in public, by anyone, for everyone to use.
            Not a niche category — the things below are four of the most widely used
            pieces of software on earth, and you can read every line of all of them
            right now.
          </p>

          <ul className="mt-14 grid gap-4 sm:grid-cols-2">
            {EVERYDAY.map((e) => (
              <li
                key={e.name}
                className="flex flex-col rounded-tile border border-seam bg-raise p-7"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-display-md uppercase leading-none tracking-[-0.005em]">
                    {e.name}
                  </h3>
                  {/* Same reason as the build-day cards: shrink-0 on text from a
                      data file is a viewport overflow waiting for a longer value. */}
                  <span className="min-w-0 text-right font-mono text-[11px] uppercase tracking-[0.16em] text-dust">
                    {e.language}
                  </span>
                </div>
                <p className="mt-4 text-body text-haze">{e.what}</p>
                <p className="mt-4 text-body text-ink">{e.fact}</p>
                {/* The spacing lives on the wrapper, not on the link. `.tap` sets
                    margin-block and padding-block to build a 44px target, so a
                    margin or padding utility on the same element either loses to it
                    or breaks its compensation. See the note on .tap in globals.css. */}
                <div className="mt-auto pt-6">
                <a
                  href={e.repo}
                  target="_blank"
                  rel="noreferrer"
                  className="tap group inline-flex items-baseline gap-2 font-mono text-xs text-accent transition hover:brightness-125"
                >
                  Read the source
                  <span
                    aria-hidden
                    className="transition-transform duration-300 ease-glide group-hover:translate-x-1"
                  >
                    ↗
                  </span>
                </a>
                </div>
              </li>
            ))}
          </ul>

          {/* The definition, arriving after the examples have done the work. */}
          <div className="mt-20 grid gap-x-14 gap-y-9 sm:grid-cols-3">
            {WHAT_IT_IS.map((w) => (
              <div key={w.title} className="border-t border-seam pt-6">
                <h3 className="text-body-lg font-semibold">{w.title}</h3>
                <p className="mt-3 text-body text-haze">{w.body}</p>
              </div>
            ))}
          </div>

          {/* And the mechanic, drawn. This is the one idea that is genuinely hard to
              say in a sentence, which is the test for whether a diagram earns space. */}
          <div className="mt-20 rounded-panel border border-seam bg-raise p-8 sm:p-12">
            <p className="label">How a change actually gets in</p>
            <Duo
              className="mt-5 max-w-2xl text-display-md"
              lead="You do not edit the project."
              trail="You propose a change to it."
            />
            <CommitGraph className="mt-12" />
          </div>
        </section>

        {/* ---- 1b. Who actually maintains it ----------------------------------
            Placed before the career argument on purpose. A page that only ever says
            "this is good for your resume" produces the contributor maintainers
            complain about — four pull requests in October and never seen again. This
            is the counterweight, and it is what makes the section after it readable
            as a consequence rather than as the point. */}
        <section
          id="maintainers"
          className="section pt-24 sm:pt-32"
          aria-label="Who maintains open source"
        >
          <p className="chip">Who is on the other side</p>
          <Duo
            className="mt-6 max-w-4xl text-display-lg"
            lead="There is a person at the other end of your pull request."
            trail="Usually an unpaid one."
          />
          <p className="measure mt-7 text-body-lg text-haze">
            This is the part that changes how you behave, and almost nobody explains it
            before somebody&apos;s first contribution.
          </p>

          <div className="mt-14 grid gap-x-14 gap-y-10 sm:grid-cols-3">
            {MAINTAINERS.map((m) => (
              <div key={m.title} className="border-t border-seam pt-6">
                <h3 className="text-body-lg font-semibold">{m.title}</h3>
                <p className="mt-3 text-body text-haze">{m.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <a
              href={MAINTAINERS_SOURCE.url}
              target="_blank"
              rel="noreferrer"
              className="tap inline-block font-mono text-xs text-accent transition hover:brightness-125"
            >
              {MAINTAINERS_SOURCE.label} ↗
            </a>
          </div>
        </section>

        {/* ---- 1c. The vocabulary --------------------------------------------
            The most open-source-specific thing on the site. The barrier to a first
            contribution is very often linguistic rather than technical: a second-year
            who writes fine Python still will not open a PR when the contributing guide
            says "rebase onto upstream/main and squash before we triage". */}
        <section
          id="vocabulary"
          className="band section pb-24 pt-24 sm:pb-32 sm:pt-32"
          aria-label="The vocabulary of open source"
        >
          <p className="flex items-center gap-2">
            <span className="chip">The words</span>
            <Doodle kind="squiggle" className="h-5 w-8 text-accent" />
          </p>
          <Duo
            className="mt-6 max-w-4xl text-display-lg"
            lead="Nobody is going to explain these to you."
            trail="So here they are."
          />
          {/* The count is DERIVED. Written as "Twelve words" it was a number in prose
              that silently goes wrong the first time somebody adds a thirteenth term —
              the same class of drift the numbers strip is built to avoid. */}
          <p className="measure mt-7 text-body-lg text-haze">
            {GLOSSARY.length} words that get used constantly and explained never. Not
            knowing them is the most common reason a capable person never opens their
            first pull request, and every one of us had to work them out{" "}
            <span className="mark">by being confused in public</span>.
          </p>

          {/* A definition list, because that is what it is. Two columns at lg so
              twelve terms do not become a twelve-screen scroll on a laptop. */}
          <dl className="mt-14 grid gap-x-14 gap-y-px sm:grid-cols-2 lg:gap-x-20">
            {GLOSSARY.map((g) => (
              <div key={g.term} className="border-t border-seam py-6">
                <dt className="font-mono text-body-lg text-accent">{g.term}</dt>
                <dd className="mt-2.5 text-body text-haze">{g.meaning}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ---- 2. How it changes your life ------------------------------------ */}
        <section
          id="impact"
          className="band section pb-24 pt-24 sm:pb-32 sm:pt-32"
          aria-label="How open source changes your career"
        >
          <p className="chip">Why it matters</p>
          <Duo
            className="mt-6 max-w-4xl text-display-lg"
            lead="Nobody is going to read your college projects."
            trail="They will read your commits."
          />
          <p className="measure mt-7 text-body-lg text-haze">
            This is the part that sounds like a pitch and is not. Every line below is a
            mechanism you can trace, and the reason it works is boring: open source is
            the only part of your CV that a stranger has already{" "}
            <span className="mark">checked for you</span>.
          </p>

          <div className="mt-14 grid gap-x-14 gap-y-11 sm:grid-cols-2">
            {IMPACT.map((i) => (
              <div key={i.title} className="border-t border-seam pt-7">
                <h3 className="text-display-md font-semibold leading-tight">
                  {i.title}
                </h3>
                <p className="mt-4 text-body text-haze">{i.body}</p>
                {i.aside && (
                  <p className="mt-4 flex gap-3 text-sm leading-relaxed text-ink">
                    <Doodle
                      kind="sparkle"
                      className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                    />
                    {i.aside}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* ---- The comparison a student is actually making -------------------
              Left in place from the previous design because it is the strongest
              sourced argument on the site, and because every number in it survived a
              round of fact-checking that cut two better-sounding claims. */}
          <div className="mt-24">
            <p className="label">Choosing a club</p>
            <Duo
              className="mt-6 max-w-4xl text-display-md"
              lead="Competitive programming has a fixed number of winners."
              trail="Open source does not."
            />

            {/* Two kinds of row live here and an earlier layout treated them as one:
                claims that cite a figure, and the reasoning connecting them. Rows
                without a stat were rendered into the same stat column as an empty
                cell, so a reader scanning the numbers hit blank space and read it as
                missing data. Now one hairline runs the height of the section with the
                figures pinned along it — a row with no figure continues the line
                rather than breaking it, and steps down to haze, so the hierarchy says
                which sentences have a source behind them. */}
            <div className="mt-12 border-t border-seam pt-10">
              {POSITIONING.map((c, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-0">
                  <div className="sm:pr-8 sm:text-right">
                    {c.stat && (
                      <p className="text-display-md font-semibold text-accent">
                        {c.stat}
                      </p>
                    )}
                  </div>
                  <div
                    className={`sm:border-l sm:border-seam sm:pl-8 ${
                      i === POSITIONING.length - 1 ? "pb-0" : "pb-10"
                    }`}
                  >
                    <p
                      className={`measure text-body-lg ${
                        c.stat ? "text-ink" : "text-haze"
                      }`}
                    >
                      {c.line}
                    </p>
                    {/* Every claim terminates in a third-party link. With no
                        testimonials and no placement data, external verifiability is
                        the substitute for social proof — and the only thing that
                        makes criticising a rival activity fair. */}
                    {c.source && (
                      <div className="mt-3">
                        <a
                          href={c.source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="tap inline-block font-mono text-xs text-accent transition hover:brightness-125"
                        >
                          {c.source.label} ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* The honest cost. A comparison listing only our advantages gets
                discounted wholesale; naming what we are worse at is what makes the
                rest of it believable. */}
            <div className="mt-14 rounded-tile border border-seam bg-raise p-8 sm:p-10">
              <h3 className="text-display-md font-semibold">What we are worse at</h3>
              <p className="measure mt-3 text-body text-haze">
                Every one of these is a real reason to join the competitive programming
                club instead. Doing both is the correct answer.
              </p>
              <ul className="mt-8 space-y-5">
                {TRADE_OFFS.map((t) => (
                  <li key={t} className="flex gap-4">
                    <span
                      aria-hidden
                      className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-ember"
                    />
                    <span className="text-body text-haze">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ---- 3. The club in numbers ----------------------------------------- */}
        <section id="numbers" className="section pt-24 sm:pt-32" aria-label="The club in numbers">
          <p className="chip">Where we are</p>
          <Duo
            className="mt-6 max-w-3xl text-display-lg"
            lead="Small, new, and counting honestly."
          />
          <p className="measure mt-7 text-body-lg text-haze">
            Everything here is derived from the other four pages rather than typed in
            by hand, so it cannot say more than the evidence does. Click through and
            check any of it.
          </p>
          <NumbersStrip />
        </section>

        {/* ---- 4. One member, first person ------------------------------------ */}
        <section
          id="story"
          className="band section pb-24 pt-24 sm:pb-32 sm:pt-32"
          aria-label="A member's story"
        >
          <p className="chip">In their words</p>
          <Duo
            className="mt-6 max-w-4xl text-display-lg"
            lead="One person, unedited."
            trail="Including the part where it was confusing."
          />
          <MemberStory />
        </section>

        {/* ---- 5. The one action --------------------------------------------- */}
        <NextAction
          eyebrow="Next"
          lead="You do not need to be good yet."
          trail="You need a laptop and a GitHub account."
          body="Everybody on the other four pages started exactly where you are, including the ones with merged code in projects you have heard of. The form takes two minutes, there is nothing to prepare, and it opens on the beginner path."
          href={`${JOIN_HREF}?path=build-day`}
          cta="Join the club"
        />
      </main>
    </>
  );
}
