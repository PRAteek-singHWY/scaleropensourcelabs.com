import type { Metadata } from "next";
import Link from "next/link";
import Banner from "@/components/Banner";
import PRTimeline from "@/components/PRTimeline";
import Terminal from "@/components/Terminal";
import Doodle from "@/components/Doodle";
import Duo from "@/components/Duo";
import Faq from "@/components/Faq";
import NextAction from "@/components/NextAction";
import Note from "@/components/fx/Note";
import Sticker from "@/components/fx/Sticker";
import { JOIN_HREF } from "@/content/site";
import {
  CULTURE,
  FAQ,
  LINKS,
  LOOKING_FOR,
  NOT_FOR,
  PATH,
  totals,
} from "@/content/club";
// PATH and PATHS are both here and are not the same thing, which is worth stating
// once because the names are one character apart. PATH (club.ts) is the four steps
// every first contribution goes through, in order — a sequence. PATHS (join.ts) is
// the set of named entry routes a person can pick from, split by level, and it is
// what the join form's preselect is derived from. The page renders the choice
// first and the sequence second, because "which of these am I" comes before "what
// happens then".
import { LEVEL_LABEL, PATHS, type Level } from "@/content/join";

// The two level groups the paths are rendered in, in order.
//
// NOT `LEVELS` from join.ts, and the near-miss is worth naming: that export is the
// join form's experience dropdown — "Never contributed", "Some Git experience",
// "I have merged pull requests" — which is a different question with three answers
// rather than this one with two. Importing it here typechecks as an array and
// renders two sections titled after form options. Hence the explicit local name.
const PATH_LEVELS: Level[] = ["beginner", "intermediate"];

// HOW TO JOIN. Everything a student needs to have read before the form.
//
// THE ORDER IS A SEQUENCE OF OBJECTIONS, answered in the order they occur:
//
//   looking-for   "they must already be brilliant"      — no, here is the bar
//   path          "I would not know where to start"     — four steps, named
//   Banner        (the stop where that argument lands)
//   culture       "what is it actually like"            — Maggi and arguing
//   who-not-for   "is this a waste of my time"          — four honest reasons to leave
//   faq           everything left over
//
// The deterrent section leading is not an accident of layout. A grid of students
// selected into international programmes — which is what a reader arrives here
// from — is simultaneously this club's strongest claim and its biggest deterrent,
// and the private thought it produces is "I could never". That gets answered
// first, at the moment it occurs, rather than in an FAQ nobody scrolls to.
//
// WHO-NOT-FOR STAYS. Four reasons to walk away, on the page whose entire job is
// recruitment, is the section every instinct says to cut — and it is the one that
// makes the rest credible. A page that claims a club is for everybody is a page
// making a claim nobody believes.

/* The mini code frames on the bento cards. Ordinary git — commands any reader can
   run themselves — rather than simulated output. A fake `remote: 3 commits pushed`
   would be indistinguishable from the real figures the hero terminal reads out of
   the content file, and the two must not be confusable. */
const CODE_LINES: [string, string][] = [
  ["git clone <repo>", "# read it first"],
  ["git switch -c fix/typo", "# small first"],
  ["git commit -m '...'", "# say why, not what"],
  ["gh pr create", "# then read the review"],
  ["git pull --rebase", "# keep history clean"],
];

export const metadata: Metadata = {
  title: "How to Join",
  description:
    "What the club looks for, the four steps to a first contribution, what the sessions are actually like, and who this is not for.",
};

export default function HowToJoin() {
  const t = totals();

  return (
    <main id="main">
      <header className="section page-top pb-4" data-reveal-group>
        <p className="chip">The way in</p>
        <Duo
          as="h1"
          className="mt-6 max-w-4xl text-display-xl"
          lead="There is no bar to clear."
          trail="There is a first pull request to open."
        />
        <p className="measure mt-4 text-body-lg text-haze">
          No interview, no test, no selection at the door. What follows is what the
          club actually looks for, the four steps everybody goes through, and an
          honest account of who tends to leave.
        </p>
      </header>

      {/* ---- The four paths --------------------------------------------------- */}
      {PATH_LEVELS.map((level, levelIndex) => (
        <section
          key={level}
          id={level === "beginner" ? "beginner-paths" : "intermediate-paths"}
          className={
            levelIndex === 1
              ? "band section pb-24 pt-24 sm:pb-32 sm:pt-32"
              : "section pt-20 sm:pt-24"
          }
          aria-label={`${LEVEL_LABEL[level]} — entry paths`}
          data-reveal-group
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

          <div className="mt-12 space-y-4" data-reveal-group>
            {PATHS.filter((p) => p.level === level).map((p, i) => (
              <article
                key={p.id}
                id={p.id}
                className="lift rounded-panel border border-seam bg-raise p-7 sm:p-10"
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
                    <h3 className="mt-4 font-display text-display-md font-bold leading-[1.3] tracking-[-0.02em]">
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
                        className="tap link-u inline-block font-mono text-xs text-accent transition hover:brightness-125"
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

                    <div className="rise border-t border-seam pt-6">
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
        data-reveal-group
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

        {/* ---- What we look for ---------------------------------------------
            Placed directly after the hall on purpose. A grid of named students
            selected into international programmes is the page's strongest claim
            AND its biggest deterrent — the immediate private thought is "they must
            already be brilliant, I could never". This answers that at the exact
            moment it occurs, rather than in an FAQ nobody scrolls to. */}
        <section
          id="looking-for"
          className="band section relative pt-12 pb-12 sm:pt-16 sm:pb-16"
          aria-label="What the club looks for"
          /* Staggers its own children instead of settling as one block — see
             Reveal.tsx for the two modes and why a section is never both. The
             sticker is skipped automatically (it is absolutely positioned) and
             the card pair below is its own group, so it waits until it is
             actually on screen rather than running on this section's trigger. */
          data-reveal-group
        >
          {/* Sticker 3 of 3. No hover effect on this one: three stickers that all
              react is a page that fidgets. */}
          <Sticker
            text="Green Wall Loading... 🟩"
            rotate={-2}
            tone="mint"
            effect="none"
            className="right-0 bottom-16 min-[1600px]:-right-10"
          />
          <p className="flex items-center gap-2">
            <span className="chip">What we look for</span>
            <Doodle kind="squiggle" className="h-5 w-8 text-accent" />
          </p>
          <Duo
            className="mt-4 max-w-4xl text-display-lg"
            lead="We are not checking whether you can already code."
            trail="We are checking how you think."
          />
          <p className="measure mt-4 text-body-lg text-haze">
            Syntax is a few weeks of work. Reading somebody else&apos;s codebase and
            reasoning about it is the part that actually decides whether your first
            patch gets merged — and it is{" "}
            <span className="mark">not what any exam measures</span>. There is no
            test to pass here and no interview to prepare for. This is simply what
            the work turns out to reward.
          </p>

          {/* A contrast rather than a list. "We value reasoning" alone is the kind
              of thing every club says; setting each value against the credential it
              replaces is what makes it specific enough to be believed.

              TWO CARDS, where this used to be one stack of paired rows. The pairing
              is still real — index i on the left is the credential index i on the
              right replaces — but it is now carried by ORDER rather than by
              adjacency, which is the one thing this layout gives up. What it buys
              is that each side reads as a single position you can take in at a
              glance, and that the right-hand card can be visibly the answer: it is
              the one with the border, the tint and the weight.

              Both lists are rendered from the same array in the same order, so they
              cannot drift; if a future entry breaks the correspondence, it breaks
              in the content file rather than here.

              ORDER is only half of it, though. The right-hand lines set two deep
              and the left-hand ones set one, so left row 3 was drifting a whole
              line above its own replacement — the correspondence was true but
              unreadable. So the rows are pinned instead of flowed: both cards are
              grid items in one row and therefore already equal height, each card
              is a column that hands its leftover height to the list, and each list
              divides that height into N equal tracks. Pair i then begins at the
              same y on both sides no matter how either line wraps.

              The track count comes off the array rather than being written out, so
              a fifth pair cannot silently land in a four-row grid. */}
          {/* Its own group rather than one more child of the section's: the pair
              sits a screen below the heading that introduces it, and on the
              section's trigger both cards would have finished arriving before
              anybody scrolled far enough to see either. */}
          <div className="mt-8 grid gap-5 lg:grid-cols-2 lg:gap-6" data-reveal-group>
            {/* Left: the discarded measure, now tinted red. Deliberately the
                quieter card — no lift, everything struck through. It is here to be
                dismissed and it should look dismissed.

                The tints are 4%/6% washes rather than the soft pastels the brief
                sketches, because these are large fills behind long paragraphs. At
                the strength a badge wants, a full card of red reads as an error
                state — and the whole point of the copy inside is that having a
                contest rating is not a failure, it is simply the wrong measure.
                The border carries the colour instead; the fill only has to keep
                the two sides from being the same object. */}
            <div className="card card-still flag-bad flex flex-col rounded-panel p-7 sm:p-8">
              {/* self-start, or the pill spans the whole card. `.chip` is
                  `display: inline-block`, but these cards are `flex flex-col` and
                  flexbox BLOCKIFIES an inline-level child — so the chip becomes a
                  block-level flex item and the default `align-items: stretch`
                  runs it edge to edge. It renders as a full-width bar with the
                  label at one end, which reads as a section header rather than a
                  sticker. Same fix on the emerald card below. */}
              <p className="chip chip-red chip-true self-start">Old way 🚩</p>
              <ul
                className="mt-4 grid flex-1 gap-4"
                style={{
                  gridTemplateRows: `repeat(${LOOKING_FOR.length}, minmax(0, 1fr))`,
                }}
              >
                {LOOKING_FOR.map((r) => (
                  <li key={r.not} className="flex items-start gap-3">
                    {/* A struck-through circle rather than a red cross. These are
                        not failures — they are simply the wrong measure, and an
                        error icon against "a contest rating" insults every reader
                        who has one. The rule through it says "crossed off"; a
                        cross would say "wrong". */}
                    <span
                      aria-hidden
                      // 11px, not 10: the QA sweep flags anything under 11px as
                      // too small to read on a phone, and a decorative glyph is
                      // not a reason to make an exception nobody can see.
                      className="mt-0.5 flex h-[1.15rem] w-[1.15rem] shrink-0 items-center justify-center rounded-full border border-haze/40 text-[13px] leading-none text-haze"
                    >
                      ✕
                    </span>
                    <p className="text-body text-dust line-through decoration-dust/40">
                      {r.not}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: what actually counts. Louder on every axis — emerald tint
                and border, mint sticker, heavier type, and a star per line that
                carries a real glow (see .star-glow) rather than just a colour. */}
            <div className="card flag-good flex flex-col rounded-panel p-7 sm:p-8">
              <p className="chip chip-mint chip-true self-start">OSC way 🟢</p>
              <ul
                className="mt-4 grid flex-1 gap-4"
                style={{
                  gridTemplateRows: `repeat(${LOOKING_FOR.length}, minmax(0, 1fr))`,
                }}
              >
                {LOOKING_FOR.map((r) => (
                  <li key={r.yes} className="flex items-start gap-3">
                    <Doodle
                      kind="sparkle"
                      className="star-glow mt-1.5 h-4 w-4 shrink-0 text-[#059669]"
                    />
                    <p className="text-body-lg font-medium text-ink">{r.yes}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ---- The path. Numbered because it genuinely is a sequence. ------- */}
        <section
          id="path"
          className="band section relative pt-12 pb-12 sm:pt-16 sm:pb-16"
          data-reveal-group
        >
          {/* A FLOW note rather than a gutter one, and this is the section that
              makes the case for that mode existing. The list below is capped at
              max-w-3xl inside an 88rem container, so there are roughly 450px of
              empty container to its right at 1280 and never fewer than 190 at
              lg — the note sits INSIDE that, and therefore appears for everyone
              on a laptop instead of waiting for a 1600px monitor.

              It also has something to say here: the headline points at "the
              third" and then the steps make you count to find it.

              anchor 49: step 03's own body text ends at 733px at 1024, 1280 and
              1440 alike — a capped column's ink does not move — so 784 puts the
              note 51px off the step it is talking about at every width. It used
              to hang against the container edge, which at 1800 was 429px away
              from that step and pointing at nothing. */}
          <Note
            place="flow"
            tone="pink"
            paper="grid"
            fold
            title="Step 03 is the one."
            body="Show a mentor the patch before a maintainer ever sees it."
            tilt={4}
            anchor={49}
            className="top-56"
          />
          {/* The void here runs the full 864px of the section, so the note takes
              the middle of it and a sticker takes the foot. Two decorations in
              one column only works because that column is measured empty end to
              end — see scripts and the placement note in Note.tsx. */}
          <Sticker
            text="LGTM ✅"
            rotate={-4}
            tone="mint"
            effect="bounce"
            className="right-4 bottom-16"
          />
          <p className="chip">How a first contribution actually goes</p>
          <Duo
            className="mt-4 max-w-3xl text-display-lg"
            lead="Four steps."
            trail="The third is the one people skip."
          />

          {/* Numbered markers are usually decoration, and were nearly cut for that
              reason. They stay because here the order is the content: the headline
              points at "the third", so a reader has to be able to find which step
              that is.

              Which is exactly what the previous 2x2 grid prevented. Four numbered
              items in two columns can be read across (01, 02 / 03, 04) or down
              (01, 03 / 02, 04), and nothing on screen said which — so the one
              sentence above it that depends on position was unresolvable. A single
              column has one reading order. It also costs nothing: these are four
              short steps, not a dense grid needing the horizontal room. */}
          <ol className="mt-8 max-w-3xl">
            {PATH.map((s, i) => (
              <li
                key={s.step}
                className="grid gap-x-6 gap-y-3 sm:grid-cols-[3.2rem_1fr]"
              >
                {/* The numeral was 12px mono in the margin. It is a filled blue
                    block now — the sequence has to survive being scanned, and the
                    headline above it points at "the third", so finding step three
                    at a glance is the whole job. */}
                <span className="step sm:justify-self-end" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                {/* The gap has to live INSIDE the bordered element. With the padding
                    on the <li> the rule only spanned each text block and broke in
                    every gap between steps — four detached ticks instead of one
                    line through the sequence. */}
                <div
                  className={`sm:border-l sm:border-seam sm:pl-8 ${
                    i === PATH.length - 1 ? "pb-0" : "pb-9"
                  }`}
                >
                  <h3 className="font-display text-display-md font-bold leading-[1.3] tracking-[-0.02em]">
                    {s.step}
                  </h3>
                  <p className="mt-3 text-body text-haze">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* A deliberate stop, placed where the argument has just finished: the
            reader has learned how a first contribution goes, so "start one" lands
            here. See Banner for why this is not redundant with the sticky bar. */}
        <div className="pt-12 sm:pt-16">
          <Banner />
        </div>

        {/* ---- How the club actually runs ----------------------------------- */}
        <section
          id="culture"
          className="band section relative pt-12 pb-12 sm:pt-16 sm:pb-16"
          data-reveal-group
        >
          {/* The sticky note, in the left gutter beside this section's heading.
              The first one on the page, and the reason the rest exist.

              An earlier version of it overlapped the heading by 124px at EVERY
              width from 1280 up, including 1920 — it claimed to be "taped to the
              left gutter" while sitting almost entirely inside the content
              column, because its offset was a 24px nudge rather than the note's
              own width and its gate was `xl:`, which is exactly the width at
              which the gutter is ZERO.

              None of the automated checks can catch that. Overlap is not
              overflow, not contrast, not a tap target; the QA sweep passed clean
              through every version of the bug. It took looking at the page —
              which is why the arithmetic now lives in Note.tsx, where the next
              note added cannot get it wrong by being written from memory. */}
          {/* The copy uses `children` rather than `body` for one word of mono,
              which is the only place a note does that. It earns it: the joke is
              that the register this club keeps is a real command the reader can
              run, and setting it in the same face as the sentence around it
              would leave that as a claim instead of a thing you can type.

              13px mono, matching the body line it replaces — the sweep flags
              anything under 11px, and JetBrains Mono's large x-height means it
              sets visibly bigger than the sans at the same size rather than
              smaller. */}
          {/* top-32, level with the headline it is a remark about. It sat at
              top-56 while a flow note ("Laptop open.") held the opposite margin
              — two notes at one height read as one symmetrical ornament either
              side of a headline rather than as two remarks, so this was the one
              that moved. That note now lives beside #what-we-run, which is the
              section that actually lists the sessions it describes, so this is
              the only decoration in the band again and it can sit where it
              belongs. */}
          <Note
            place="gutter"
            fold
            title="No roll call."
            className="-left-40 top-32"
          >
            <p className="leading-snug">
              The only register here is{" "}
              <code className="font-mono">git log</code>, and it never forgets.
            </p>
          </Note>

          <p className="chip">What it&apos;s like</p>
          <Duo
            className="mt-4 max-w-4xl text-display-lg"
            lead="It is mostly people arguing about code with Maggi."
            trail="Which is the point."
          />

          {/* THE BENTO. Two columns at 1.5rem gap, per the brief.
              CULTURE holds five entries and a 2-column grid takes four, so the
              last one spans both columns rather than sitting in a half-empty row.
              That is what a bento grid IS — cells of different spans on one
              rhythm — so the odd count is an opportunity here rather than the
              ragged tail it would be in a uniform grid. */}
          {/* The bento cards come up one after another rather than as a block.
              This is the grid the effect was worth adding for: five cells of
              unequal span on one rhythm, so a sequence reads as the grid being
              dealt out, where a single fade reads as a slab. */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2" data-reveal-group>
            {CULTURE.map((c, i) => (
              <div
                key={c.title}
                className={`bento flex gap-5 p-7 ${
                  i === CULTURE.length - 1 && CULTURE.length % 2 === 1
                    ? "sm:col-span-2"
                    : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span className="num">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 font-display text-body-lg font-bold">
                    {c.title}
                  </h3>
                  <p className="mt-3 text-body text-haze">{c.body}</p>
                </div>

                {/* The dark code frame on the right of each card.
                    Generic git, not invented output: every line here is a command
                    anybody can run, so there is nothing in it that could be read
                    as a claim about what this club has done. The one place this
                    page shows real numbers is the hero terminal, which reads them
                    from the content file.
                    sm-and-up only — at 320px of card width the frame would take
                    half the cell and leave the sentence in a gutter. */}
                <div
                  aria-hidden
                  // 11px, not 10: the sweep flags anything below that as too
                  // small to read on a phone, and a decorative frame is no reason
                  // to make an exception. The comment strings were shortened to
                  // suit, rather than the frame widened into the sentence.
                  className="hidden w-44 shrink-0 self-start overflow-hidden rounded-xl border border-white/10 p-3 font-mono text-[13px] leading-relaxed lg:block"
                  style={{ background: "#0F172A" }}
                >
                  <p style={{ color: "#4ADE80" }}>
                    ${" "}
                    <span style={{ color: "#E2E8F0" }}>
                      {CODE_LINES[i % CODE_LINES.length][0]}
                    </span>
                  </p>
                  <p className="mt-1" style={{ color: "#94A3B8" }}>
                    {CODE_LINES[i % CODE_LINES.length][1]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Who this is not for ------------------------------------------
            An explicit filter immediately before the ask. Stating who should not
            join makes the invitation read as selective rather than desperate. */}
        <section
          id="who-not-for"
          className="band section relative pt-12 pb-12 sm:pt-16 sm:pb-16"
          data-reveal-group
        >
          {/* Placed low, level with the end of the list rather than its start —
              the joke only works once you have read all four reasons to leave.
              Flow placement: the list is max-w-3xl, so the room is already
              there.

              anchor 52: the thing to clear here is the list's own right edge
              rather than any line of text — max-w-3xl is 768 inside 24px of
              padding, so the boundary is a hard 792 at every width, and 832 keeps
              40px off it. */}
          <Note
            place="flow"
            tone="mint"
            paper="ruled"
            fold
            title="Read all four and still here?"
            body="Then it is probably for you. That was the whole test."
            tilt={-4}
            anchor={52}
            className="bottom-28"
          />
          {/* Head of the same column, where the note is at the foot of it. */}
          <Sticker
            text="// TODO: decide"
            rotate={3}
            tone="violet"
            effect="wobble"
            className="right-4 top-12"
          />
          <p className="chip">Be honest with yourself</p>
          <Duo
            className="mt-4 max-w-4xl text-display-lg"
            lead="This is not for everyone."
            trail="Four reasons to walk away now."
          />
          <ul className="mt-7 max-w-3xl space-y-4">
            {NOT_FOR.map((n) => (
              <li key={n} className="flex gap-4 border-t border-seam pt-6">
                <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-ember" />
                <span className="text-body text-haze">{n}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ---- FAQ ---------------------------------------------------------- */}
        <section
          id="faq"
          className="section relative pt-12 sm:pt-16"
          data-reveal-group
        >
          {/* Beside the answers, where somebody who has run out of them is
              looking. It is the only note on the page that asks for anything,
              and it asks for the smallest possible thing.

              anchor 52, off the accordion's right edge — the same fixed 792 the
              #who-not-for list gives, for the same reason. */}
          <Note
            place="flow"
            fixing="pin"
            paper="ruled"
            title="Not on the list?"
            body="Ask us. If we answer it twice, it ends up here."
            tilt={3.5}
            anchor={52}
            className="top-64"
          />
          <Sticker
            text="ask, don't guess 💬"
            rotate={-3}
            effect="bounce"
            className="right-4 bottom-16"
          />
          <p className="chip">Questions</p>
          <Duo
            className="mt-4 max-w-4xl text-display-lg"
            lead="The seven things people actually ask."
          />
          <Faq items={FAQ} />
        </section>

      <NextAction
        eyebrow="Applications open"
        lead="You do not need to be good yet."
        trail="You need a laptop and a GitHub account."
        body="Most people arrive having never opened a pull request. That is the normal starting point, not a disqualification — every name in the hall of fame began there."
        href={JOIN_HREF}
        cta="Apply now"
      />
    </main>
  );
}
