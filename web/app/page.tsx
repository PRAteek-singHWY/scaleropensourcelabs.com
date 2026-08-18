import Hero from "@/components/hero/Hero";
import Doodle from "@/components/Doodle";
import Duo from "@/components/Duo";
import CountUp from "@/components/CountUp";
import CommitGraph from "@/components/CommitGraph";
import NumbersStrip from "@/components/NumbersStrip";
import MemberStory from "@/components/MemberStory";
import MediaSplit from "@/components/MediaSplit";
import CommunityBanner from "@/components/CommunityBanner";
import Note from "@/components/fx/Note";
import {
  COMPARISON,
  COMPARISON_NOTE,
  OUTCOMES,
  totals,
} from "@/content/club";
import type { Cell } from "@/content/club";
import {
  EVERYDAY,
  GLOSSARY,
  IMPACT,
  MAINTAINERS,
  MAINTAINERS_SOURCE,
  WHAT_IT_IS,
} from "@/content/essence";

// THE ESSENCE PAGE. What the club is, why it and not something else, and what it
// actually runs — then one way in.
//
// Fully static. No database, no auth, no API routes on this route — it is HTML and
// a handful of client components, so it renders identically anywhere and there is
// nothing to attack. The one place the site talks to a server is /join.
//
// Everything after the hero is deliberately quiet. The hero only reads as premium
// if what follows it is disciplined; a second spectacle cancels the first.
//
// WHAT THIS PAGE IS *NOT* CARRYING, and where each of those went, because the
// single-page version had all of it and a reader of this file will wonder:
//
//   the hall of selections   → /hall-of-fame
//   projects and upstream    → /projects
//   programmes, tracks, dates→ /programmes
//   team and mentors         → /team
//   what we look for, the
//     path, culture, FAQ     → /how-to-join
//   the application form     → /join
//   the institutional band   → the footer, on every route
//
// The four sections left here are the ones that answer "what is this and should I
// care", which is the only question a reader who has just arrived is asking.

/**
 * The citation links under a comparison cell.
 *
 * Local to this file because it is one shape used in one table, and pulling it
 * into components/ would mean a reader of that directory meets a component whose
 * only caller is here. Every claim in that section terminates in a third-party
 * link: with no testimonials and no placement data, external verifiability is
 * this page's substitute for social proof — and it is the only thing that makes
 * a comparison against two rival clubs fair rather than merely confident.
 */
function Sources({ cell }: { cell: Cell }) {
  if (!cell.sources?.length) return null;
  return (
    <span className="mt-3 flex flex-col items-start gap-1">
      {cell.sources.map((s) => (
        // NOT .tap, and that is a fix rather than an omission. .tap grows a target
        // with 14px of block padding and a matching -14px margin, which is correct
        // for a link that STANDS ALONE — its own comment in globals.css says so. In
        // this list they stack, so each link's padded box reached 14px up into its
        // neighbour's and the pair overlapped by 24px. The centre of "ICPC Regional
        // Rules" resolved to "ICPC 2025 standings": clicking the middle of the first
        // citation opened the second one. Measured with elementFromPoint, not
        // guessed, and invisible until the hover underline gave the row a visible
        // hover state to disagree with.
        //
        // 12px of SYMMETRIC padding instead. No negative margin, so no overlap, and
        // 19px of line box plus 24px lands at 43px — over the 40px floor scripts/qa.mjs
        // enforces, which is the stricter of the two numbers in play (WCAG 2.5.8 asks
        // 24px at AA; 2.5.5 and Apple's HIG want 44). A first pass used 3px and cleared
        // 24 but not 40, trading the overlap bug for a small-target one.
        // The cost is about 20px of extra height per citation, in the two cells that
        // carry more than one.
        <a
          key={s.url}
          href={s.url}
          target="_blank"
          rel="noreferrer"
          className="py-3 font-mono text-xs text-accent link-u hover:brightness-125"
        >
          {s.label} ↗
        </a>
      ))}
    </span>
  );
}

export default function Home() {
  const t = totals();

  return (
    <>
      <Hero />

      <main id="main">
        {/* ---- 1. What open source actually is ---------------------------------
            Opening with the reader's own laptop rather than a definition. "Software
            built in public" is abstract; "the editor you have open on the other
            monitor is one of these, here is its source" is not, and it does the
            convincing before the definition arrives. */}
        {/* STAGGERED RATHER THAN SETTLED, and every section on this page now is.
            The settle — the whole section moving 12px as one object — was the
            default because revealing every card and paragraph separately makes a
            page that twitches continuously as you scroll. That is still true of
            revealing every ELEMENT, and it is not what a group does: the container
            holds still and its direct children arrive in order, which on a section
            is eyebrow, then headline, then rule, then standfirst, then the grid.
            Four steps, once per section.
            It also switches on the two effects that only exist inside a group —
            the heading rule plotting itself and the highlighter wiping across a
            marked phrase — which were reaching four sections out of fourteen. */}
        <section
          id="what-it-is"
          className="section pt-24 sm:pt-32"
          aria-label="What open source is"
          data-reveal-group
        >
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

          {/* A group of its own so the four tiles deal themselves out rather than
              arriving as one slab. Nested inside the section's group, which skips it
              as an item — see Reveal.tsx — so the grid does not also slide. */}
          <ul className="mt-14 grid gap-4 sm:grid-cols-2" data-reveal-group>
            {EVERYDAY.map((e) => (
              <li
                key={e.name}
                // .lift and not .card: these tiles carry `border-seam`, and .card
                // would silently beat that utility with its own --edge border. The
                // lift alone leaves the edge as designed. See globals.css.
                className="lift flex flex-col rounded-tile border border-seam bg-raise p-7"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-display-md font-bold leading-[1.3] tracking-[-0.02em]">
                    {e.name}
                  </h3>
                  {/* Same reason as the build-day cards: shrink-0 on text from a
                      data file is a viewport overflow waiting for a longer value. */}
                  <span className="min-w-0 text-right font-mono text-[13px] uppercase tracking-[0.16em] text-dust">
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
          <div className="mt-20 grid gap-x-14 gap-y-9 sm:grid-cols-3" data-reveal-group>
            {WHAT_IT_IS.map((w) => (
              // .rise is the hover for a block whose only furniture is its own
              // hairline: the rule goes accent and the block lifts 2px. There is no
              // card here to lift and no fill to tint, which is why this shape had
              // no hover state anywhere on the site until now.
              <div key={w.title} className="rise border-t border-seam pt-6">
                <h3 className="text-body-lg font-semibold">{w.title}</h3>
                <p className="mt-3 text-body text-haze">{w.body}</p>
              </div>
            ))}
          </div>

          {/* And the mechanic, drawn. This is the one idea that is genuinely hard to
              say in a sentence, which is the test for whether a diagram earns space. */}
          <div className="lift mt-20 rounded-panel border border-seam bg-raise p-8 sm:p-12">
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
          data-reveal-group
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

          <div className="mt-14 grid gap-x-14 gap-y-10 sm:grid-cols-3" data-reveal-group>
            {MAINTAINERS.map((m) => (
              <div key={m.title} className="rise border-t border-seam pt-6">
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
              className="tap link-u inline-block font-mono text-xs text-accent transition hover:brightness-125"
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
          data-reveal-group
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
          {/* Twelve terms, so the stagger's eight-step cap does the work it was
              added for: the last four share the eighth delay and come up together
              rather than the twelfth waiting 1.2s. See MAX_STAGGER_STEPS. */}
          <dl className="mt-14 grid gap-x-14 gap-y-px sm:grid-cols-2 lg:gap-x-20" data-reveal-group>
            {GLOSSARY.map((g) => (
              <div key={g.term} className="rise border-t border-seam py-6">
                <dt className="font-mono text-body-lg text-accent">{g.term}</dt>
                <dd className="mt-2.5 text-body text-haze">{g.meaning}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ---- Thesis ------------------------------------------------------ */}
        <section className="section pt-12 sm:pt-16" data-reveal-group>
          <p className="chip">What this is</p>
          <Duo
            className="mt-4 max-w-4xl text-display-lg"
            lead="A club is easy to start."
            trail="Getting a stranger to merge your code is not."
          />
          <div className="measure mt-5 space-y-5 text-body-lg text-haze">
            <p>
              Most student open-source groups measure attendance. We measure the
              quality and number of pull requests a maintainer accepted, because
              that is what somebody outside the room had to agree to.
            </p>
            <p>
              Everything on this page links to the upstream repository. If a claim
              here cannot be checked in one click, it should not be here.
            </p>
          </div>

          {/* Outcomes merged in here rather than living as its own section. Two
              philosophy blocks separated by Programmes broke the momentum twice,
              and this argument is the evidence for the claim above — it belongs
              in the same breath as it. */}
          <p className="label mt-10">Beyond the stipend</p>
          <Duo
            className="mt-4 max-w-4xl text-display-md"
            lead="The money is the smallest part."
            trail="What lasts is who ends up knowing your work."
          />
          <div className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2" data-reveal-group>
            {OUTCOMES.map((o) => (
              <div key={o.title} className="rise border-t border-seam pt-6">
                <h3 className="text-body-lg font-semibold">{o.title}</h3>
                <p className="mt-3 text-body text-haze">{o.body}</p>
              </div>
            ))}
          </div>

        </section>


        {/* ---- 2. How it changes your life ------------------------------------ */}
        <section
          id="impact"
          className="band section pb-24 pt-24 sm:pb-32 sm:pt-32"
          aria-label="How open source changes your career"
          data-reveal-group
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

          <div className="mt-14 grid gap-x-14 gap-y-11 sm:grid-cols-2" data-reveal-group>
            {IMPACT.map((i) => (
              <div key={i.title} className="rise border-t border-seam pt-7">
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
        </section>

        {/* ---- Why this and not the CP club ---------------------------------
            The one place on the page that argues against a rival activity, and
            now the only one. It used to be preceded by a column of sourced
            claims making the same case in prose; the two read as the same
            argument made twice, so the prose went and the table stayed. It is
            the half that cites its cells AND stays legible at a glance. */}
        <section
          id="why-us"
          className="section relative pt-12 sm:pt-16"
          data-reveal-group
        >
          {/* The table below is the argument; this is the one line of it a
              reader would keep. Void measured at 240px tall, 238px clear.

              anchor 59, THE ONE ON THIS PAGE THAT IS NOT SET BY ITS OWN INK, and
              the reason is a width nobody samples. This heading is the only one
              here that wraps to FILL its max-w-4xl cap: at 1180 the trail line
              "Open source does not." ends at 896px, i.e. flush with the column's
              own right edge, where at 1440 it ends at 724 and at 1024 at 786. An
              anchor derived from the wide measurement (52 was the first attempt)
              therefore reads clear at 1024, 1280, 1440 and 1800 and sits ON the
              headline at 1180 — which is exactly what scripts/tmp-notes-check.mjs
              caught, and nothing else would have.
              So it is anchored off the CAP (896 + 24 of padding + 24 of air)
              rather than off any measured line. The cost is that on a wide monitor
              it stands further out than its neighbours; the alternative is a note
              through a headline on a 1180px laptop. */}
          <Note
            place="flow"
            tone="orange"
            paper="ruled"
            title="No fixed podium."
            body="A contest has a set number of winners. This does not."
            tilt={-4}
            anchor={59}
            className="top-8"
          />
          <p className="chip">Choosing a club</p>
          <Duo
            className="mt-4 max-w-4xl text-display-lg"
            lead="Competitive programming has a fixed number of winners."
            trail="Open source does not."
          />

          <p className="measure mt-4 text-body-lg text-haze">
            Three clubs on this campus want the same four years of your evenings.
            Here are six questions, asked of all three.
          </p>

          {/* A THREE-WAY TABLE, where this used to be a single column of claims
              stacked down a hairline.

              The old layout could only ever assert. Every row was a sentence about
              open source with a competitive-programming fact quoted inside it, so
              the comparison lived in the prose and the reader had to hold both
              halves in their head to see it. A grid does that work structurally:
              the row says which question is being asked, and the three cells are
              the three answers side by side. Nothing has to be claimed, because
              "unbounded" sitting in the same row as "three, per college, per year"
              is the argument.

              It is a real <table> rather than a grid of divs. The content IS
              tabular — six questions crossed with three clubs — and that means a
              screen reader can announce "OSC club, what it pays" when it lands in
              a cell, which is precisely the orientation a sighted reader gets for
              free from the column being under a heading.

              The horizontal scroll on narrow screens is the same trade the
              calendar table above makes: six rows of three paragraphs cannot be
              honestly reflowed into one phone column without either dropping the
              side-by-side reading or duplicating the whole table in a second
              markup path that then drifts from this one. */}
          <div className="mt-8 overflow-x-auto">
            {/* table-fixed, and it is load-bearing. Under auto layout the three
                w-1/3 data columns claim the entire width between them and the
                question column is squeezed to whatever is left — "How many can
                win" came out four lines tall in a 5rem gutter. Fixed layout
                honours the one declared width and splits the remainder equally,
                which is the intent: one narrow label column, three equal answers. */}
            <table className="w-full min-w-[58rem] table-fixed border-collapse text-left">
              <caption className="sr-only">
                Competitive programming, AI/ML and open source compared across six
                questions
              </caption>
              <thead>
                <tr>
                  {/* Empty corner cell. It heads the column of row questions, and
                      those are already marked up as row headers, so it has nothing
                      to say — but it must still exist or every data cell in the
                      table shifts one column left of its heading. */}
                  <th scope="col" className="w-[13rem] px-3 pb-5" />
                  <th scope="col" className="px-5 pb-5 align-bottom">
                    <span className="chip chip-quiet chip-true">CP club</span>
                  </th>
                  <th scope="col" className="px-5 pb-5 align-bottom">
                    <span className="chip chip-quiet chip-true">AI/ML club</span>
                  </th>
                  {/* The one column wearing colour. Same device as the "what we
                      look for" pair below the hall: the answer is the one with the
                      tint, the border and the weight, and it is the same mint so a
                      reader who has scrolled past that section already knows what
                      the green means. */}
                  <th scope="col" className="px-5 pb-5 align-bottom">
                    <span className="chip chip-mint chip-true">OSC club</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.axis} className="row-live border-t border-seam align-top">
                    <th
                      scope="row"
                      className="px-3 py-7 pr-6 text-body font-semibold text-ink"
                    >
                      {row.axis}
                    </th>
                    {[row.cp, row.aiml].map((c, i) => (
                      <td key={i} className="px-5 py-7">
                        {c.stat && (
                          <p className="mb-2 text-display-md font-semibold text-dust">
                            <CountUp value={c.stat} />
                          </p>
                        )}
                        <p className="text-body text-haze">{c.line}</p>
                        <Sources cell={c} />
                      </td>
                    ))}
                    {/* flag-good rather than a `bg-emerald-500/5` utility, for the
                        reason spelled out over that class: the QA sweep reads a
                        translucent fill as its own un-composited colour and scores
                        the text on it against a surface that does not exist. */}
                    <td className="flag-good border-x px-5 py-7">
                      {row.osc.stat && (
                        <p className="mb-2 text-display-md font-semibold text-accent">
                          <CountUp value={row.osc.stat} />
                        </p>
                      )}
                      <p className="text-body font-medium text-ink">{row.osc.line}</p>
                      <Sources cell={row.osc} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="measure mt-7 text-body-lg text-haze">
            {COMPARISON_NOTE.line}{" "}
            <a
              href={COMPARISON_NOTE.source.url}
              target="_blank"
              rel="noreferrer"
              className="tap font-mono text-xs text-accent link-u hover:brightness-125"
            >
              {COMPARISON_NOTE.source.label} ↗
            </a>
          </p>
        </section>


        {/* ---- 3. The club in numbers ----------------------------------------- */}
        {/* The strip itself is one item and stays one item — the tiles are 1px apart
            over a grey ground, so staggering them would show a row of grey slots
            filling in. The figures inside count instead. See NumbersStrip. */}
        <section
          id="numbers"
          className="section pt-24 sm:pt-32"
          aria-label="The club in numbers"
          data-reveal-group
        >
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


        {/* ---- 4. Members, first person ----------------------------------------
            The heading deliberately does not count them. The rail renders whatever
            has consent, so "six people" would be a claim that goes stale the first
            time somebody adds or pulls a story. */}
        <section
          id="story"
          className="band section pb-24 pt-24 sm:pb-32 sm:pt-32"
          aria-label="Member stories"
          data-reveal-group
        >
          <p className="chip">In their words</p>
          <Duo
            className="mt-6 max-w-4xl text-display-lg"
            lead="Their words, not ours."
            trail="Including the parts where it was confusing."
          />
          <MemberStory />
        </section>

        {/* ---- What the club actually runs ----------------------------------
            Placed after the culture bento and before the tracks, which is where
            it answers the question the bento raises. "It is mostly people
            arguing about code with Maggi" says what the room feels like; this
            says what is actually ON, in four named formats, next to the faces of
            the people running them. */}
        <MediaSplit />

        {/* ---- The community banner -----------------------------------------
            Sits directly under the media split so the section ends on an action.
            It is the second of only two places the join CTA appears outside the
            form itself — the hero and here — because a page that repeats its own
            call to action every screen reads as nagging rather than confident. */}
        <CommunityBanner />
      </main>
    </>
  );
}
