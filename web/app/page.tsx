import Hero from "@/components/hero/Hero";
import Banner from "@/components/Banner";
import Doodle from "@/components/Doodle";
import Icon from "@/components/Icon";
import ProofPanel from "@/components/ProofPanel";
import Reveal from "@/components/Reveal";
import StickyCTA from "@/components/StickyCTA";
import Duo from "@/components/Duo";
import Nav from "@/components/Nav";
import Carousel from "@/components/Carousel";
import Eyebrow from "@/components/Eyebrow";
import Hall from "@/components/hall/Hall";
import ApplyForm from "@/components/ApplyForm";
import Mentors from "@/components/Mentors";
import Team from "@/components/Team";
import Sticker from "@/components/fx/Sticker";
import Note from "@/components/fx/Note";
import Term from "@/components/fx/Term";
import Console from "@/components/fx/Console";
import Glow from "@/components/fx/Glow";
import MediaSplit from "@/components/MediaSplit";
import CommunityBanner from "@/components/CommunityBanner";
import Ticker from "@/components/Ticker";
import Faq from "@/components/Faq";
import CountUp from "@/components/CountUp";
import {
  CULTURE,
  LOOKING_FOR,
  LINKS,
  OUTCOMES,
  PATH,
  PROGRAMMES,
  PROGRAMME_COLOUR,
  PROGRAMME_NAME,
  PROGRAMME_SHORT,
  PROJECTS,
  CALENDAR,
  COMPARISON,
  COMPARISON_NOTE,
  FAQ,
  INSTITUTIONAL,
  NOT_FOR,
  TEAM_SHADOWS,
  TRACKS,
  publishedMentors,
  teamSize,
  totals,
} from "@/content/club";
import type { Cell } from "@/content/club";

// Fully static. No database, no auth, no API routes — the site is HTML plus one
// lazily-loaded WebGL scene, so it renders identically anywhere and there is
// nothing to attack.
//
// Everything after the hero is deliberately quiet. The 3D moment only reads as
// premium if what follows it is disciplined; a second spectacle cancels the first.

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

export default function Home() {
  const t = totals();
  const projects = PROJECTS.filter((p) => p.published);

  return (
    <>
      <Nav />
      {/* Renders nothing; opts the document in to the scroll reveals. */}
      <Reveal />
      <Hero />

      <main>
        {/* ---- Apply, immediately below the hero ----------------------------
            The form cannot live INSIDE the hero: that hero is sticky and
            scroll-scrubbed, and animating a background under someone who is
            filling in fields is hostile. Scaler's hero carries its form because
            their hero is static. So the form gets the very next band instead —
            one scroll, still the second thing you meet, and it keeps both
            mechanics intact. */}
        {/* `relative` so the sticker below anchors to this section rather than to
            the page. Each sticker is positioned against the section it belongs to,
            so none of them can drift when a section above changes height. */}
        <section id="apply" className="section relative pt-12 sm:pt-16">
          {/* THE THREE STICKERS, and the rule they all now follow.
              A negative inset only means "hang into the margin" when a margin
              exists. `.section` caps at 88rem, so below ~1600px viewport there is
              no gutter at all and a negative offset hangs off the SCREEN instead:
              the bottom-right sticker was pushing the document 16-40px wider than
              the viewport across the entire 1024-1360px band, which covers most
              laptops.
              It went unseen because `body { overflow-x: hidden }` clips the strip
              rather than producing a scrollbar, and because the QA sweep tests
              390, 834 and 1440 — the band sits exactly between the last two.
              So: flush insets by default, negative ones only past 1600px.

              AND A FLUSH INSET IS INSIDE THE TEXT COLUMN, which is the half of
              that rule the vertical position has to answer for. `left-0` on a
              container whose gutter has not appeared yet does not mean "in the
              margin" — it means "on top of the first thing in the left column",
              and the only reason it ever looked otherwise was that `top-14`
              landed inside this section's 96px of top padding. A later spacing
              pass cut that padding to 48/64px and the sticker came to rest
              exactly on the "Applications open" eyebrow, at EVERY width from
              1024 up.
              So a flush sticker needs a band that is empty in both axes, not
              just a corner. */}
          {/* Sticker 1 of 3. Bottom of the left column, where that column runs
              out of copy and the form beside it keeps going — 350-450px of dead
              space at every width this sticker is visible at, which is the only
              part of this section wide enough and empty enough to hold it. */}
          <Sticker
            text="Works on my machine 💻"
            rotate={-3}
            effect="wobble"
            className="left-0 bottom-24 min-[1600px]:-left-8"
          />
          {/* Opposite gutter, level with the form itself — it answers the first
              thing anybody wonders while looking at a sign-up form.

              THE POINT IS THE ABSENT SECOND TIER, not the price. "Free" alone is
              a word every programme on the internet uses about its entry level,
              and a reader who has met a few of those hears it as "free until the
              part that matters". What is actually unusual here is that there is
              no part that matters more — nobody is kept out of a room because of
              where they sit in the club — so the note says that instead, and the
              price follows from it. The "Free" tile a few inches away already
              carries the fee.

              IT IS SPECIFICALLY *SESSIONS* THAT ARE UNDIVIDED, AND SPECIFICALLY
              REPOS THAT ARE NOT. An earlier draft read "same mentors, same
              repos, everyone", which is not true and is not even the thing being
              claimed: #tracks below sorts the work into three named difficulties
              on purpose, because handing a first-timer an advanced codebase
              helps nobody. That division is a match to what you can currently
              read, and it moves as you do. The division this note rules out is
              the other kind — a rank inside the club that decides which room you
              are allowed into. Keep those two apart in any rewrite; collapsing
              them either makes the club sound undifferentiated or makes the
              tracks sound like tiers. */}
          <Note
            place="gutter"
            tone="mint"
            paper="grid"
            fold
            title="No premium tier."
            body="Every session is open to everyone. Repos differ by level, not by rank."
            tilt={4}
            className="-right-40 top-24"
          />
          {/* An even 1fr/1fr split, up from 1fr/26rem. The form was a fixed
              416px column against a fluid one, so every pixel the container
              gained went to the prose and none to the fields — at 88rem the
              argument ran to 780px while the inputs stayed at 416px and the two
              org fields underneath were squeezed into 172px each.

              Even halves put roughly 600px on each side at the cap, which is
              what lets those paired fields breathe and stops the form reading
              as a sidebar bolted to an essay. */}
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-8">
            {/* The one section whose stagger group is NOT the <section>. Its
                header lives a level down inside this two-column grid, so the
                group goes here and the section keeps its ordinary settle. */}
            <div data-reveal-group>
              <p className="label">Applications open</p>
              <Duo
                className="mt-4 max-w-2xl text-display-lg"
                lead="You do not need to be good yet."
                trail="You need a laptop and a GitHub account."
              />
              <p className="measure mt-4 text-body-lg text-haze">
                Most people arrive having never opened a pull request. That is the
                normal starting point, not a disqualification — every name further
                down this page began there.
              </p>

              {/* The two questions every prospective member asks first, answered
                  before they have to ask. Straight from the reference, where they
                  sit under the hero as tiles. */}
              <div className="mt-6 grid max-w-lg grid-cols-2 gap-3">
                <div className="card rounded-tile bg-raise px-5 py-4">
                  <p className="text-body-lg font-semibold text-accent">Free</p>
                  <p className="mt-1 text-sm text-haze">No fee, ever</p>
                </div>
                <div className="card rounded-tile bg-raise px-5 py-4">
                  <p className="text-body-lg font-semibold text-accent">All years</p>
                  <p className="mt-1 text-sm text-haze">No prior experience</p>
                </div>
              </div>
            </div>

            <ApplyForm />
          </div>
        </section>

        {/* ---- The hall: selections into international programmes ----------
            Placed first because it is the strongest thing the club can say. A
            named student next to "GSoC 2026" is proof somebody else ran a
            selection and picked them; everything below is elaboration. */}
        <section
          id="hall"
          className="relative"
          aria-label="Students selected into international programmes"
        >
          {/* The section's ambient lighting, matching the hero's. Placed high and
              right, so it sits behind the heading and the top of the card grid
              rather than washing the whole thing — the glow is there to lift the
              moment the reader arrives at the strongest claim on the page, and a
              wash spread evenly down 25 cards would just be a tinted background.

              This section is already `relative`, which is what the orb positions
              against. It is NOT a `.band`, so there is no band pseudo-element at
              the same z-index to paint over it.

              Flush right until 1600px, for the same reason the sticker above it
              is — see the note over Sticker 1. A right-hand negative inset with
              no gutter to hang into widens the document instead.

              Sized down on a phone, matching the hero's pair — see the note
              there for why an orb wider than the viewport is a real overflow
              defect and not just a heavy-handed wash. */}
          <Glow className="right-0 top-16 h-[20rem] w-[20rem] sm:h-[38rem] sm:w-[38rem]" />

          {/* #hall's header sits in its own container so the Hall grid below can
              break out of it, so the group goes here rather than on the section —
              which keeps its ordinary settle.

              IT IS ALSO WHAT THE TWO DECORATIONS BELOW ARE POSITIONED AGAINST,
              and that is not tidiness. This section is NOT a `.section` — the
              container is this inner div — so the section box is the full
              viewport, and a margin inset measured against it is measured
              against the wrong edge: `-left-36` put the note at x = -144, i.e.
              entirely off the left of the screen, and the sticker's
              `min-[1600px]:-right-4` ran 17px past the right.

              Neither showed up anywhere. `body { overflow-x: hidden }` clips an
              escaped element instead of producing a scrollbar, so an element
              parked outside the viewport is simply invisible — the note looked
              like a note that had failed to render.

              `relative` here, decorations inside, and both insets now mean what
              they mean in every other section on the page. */}
          <div className="section relative pt-12 sm:pt-16" data-reveal-group>
            {/* Sticker 2 of 3. Right, level with the "Selected" eyebrow.
                `top-28` put it across the headline from 1024 to about 1140: the
                Duo below is capped at max-w-4xl, so its right edge is pinned at
                920px whatever the window does, and a 182px sticker flush right
                needs the window past ~1140 before the two stop meeting. Nothing
                catches that — it is not overflow, and the QA sweep samples 1440,
                which is clear.

                The eyebrow's row is the right band to use and the padding strip
                above it is not, which is worth writing down because the padding
                looks like the safer choice: it is empty at every width, whereas
                this row is only empty to the RIGHT of a 130px chip. But a
                section's top padding is shared space — it reads as the gap after
                the section above, and parked there this sticker sat against the
                bottom corner of the apply form and looked like a comment on
                somebody's half-filled sign-up form.
                Level with the eyebrow it is unambiguously part of the hall, and
                the chip beside it is short at every width there is. */}
            <Sticker
              text="git push --force 🚀"
              rotate={4}
              tone="violet"
              effect="bounce"
              className="right-0 top-14 min-[1600px]:-right-4"
            />
            {/* Left gutter — the right one is already carrying the sticker and
                the glow. Pinned rather than taped, so the two decorations either
                side of this heading are not one object mirrored.

                Deliberately NOT a figure. Note has no slot for a source link, so
                a number parked in one is a claim the reader cannot follow up from
                where it sits, and this is the worst section on the page for that:
                the hall below is a wall of other people's decisions, so anything
                numeric in the margin has to be taken on trust exactly where a
                sceptical reader is least willing to.

                What it says instead is the CALENDAR's argument, moved to the
                moment a reader is most likely to accept it. That argument —
                selection goes to people whose commits the maintainers already
                recognise, so a proposal written the week it opens is already
                behind — is the club's central claim, and it reads as excuse-making
                in the abstract. Beside a wall of people it actually worked for, it
                reads as instruction. The prep windows underneath it are the real
                ones from CALENDAR (Sep–Dec against a late-Mar GSoC deadline), so
                "months before" is that data and not a figure of speech.

                It also clears the bar for a note rather than a sticker (see
                Note.tsx): the paragraph below says the club cannot award these
                selections, which is about who decides. This says when the work
                that earns them happens, which the section never mentions.

                It deliberately does NOT send the reader to the calendar. A margin
                remark that ends in an instruction to go and read another section
                is doing the job of a link, and this component has no link — so the
                sentence has to land on its own or not be here. Copy stays short
                anyway, because a gutter note is w-40. */}
            <Note
              place="gutter"
              tone="sky"
              fixing="pin"
              paper="ruled"
              title="Start early"
              body="These names were contributing months before they applied."
              tilt={-4}
              className="-left-40 top-44"
            />
            <p className="flex items-center gap-2">
              <span className="chip">Selected</span>
              <Doodle kind="sparkle" className="h-5 w-5 text-accent" />
            </p>
            <Duo
              className="mt-4 max-w-4xl text-display-lg"
              lead="Somebody else picked them."
              trail="GSoC, LFX Mentorship, C4GT, Summer of Bitcoin."
            />
            <p className="measure mt-4 text-body-lg text-haze">
              These are competitive, international selection processes run by other
              organisations. Getting in is not something a club can award itself.
            </p>
          </div>
          {/* Hall used to sit outside the container because the WebGL stage was
              full-bleed. It is a normal grid now, so it belongs inside the same
              measure as every other section.

              The `pb` is inherited work, not decoration. A "Every selection"
              table used to close this section and carried `pb-28 sm:pb-40` as
              the hall's bottom breathing room; removing the table took that with
              it and left 25 cards ending flush, with only the ticker's own
              `pt-12` under them. Kept here at the same values so the boundary
              below the densest block on the page still reads as a boundary.
              Roster.tsx is unmounted, not deleted — it has uncommitted changes
              in it. */}
          <div className="section pb-28 sm:pb-40">
            <Hall />
          </div>
        </section>

        {/* ---- The ticker ---------------------------------------------------
            Between the hall and the section that answers it, and that position is
            the reason it earns a place rather than being movement for its own
            sake: the reader has just met a grid of names next to programme
            credentials, and the strip names the ecosystems those credentials
            belong to before "we are not checking whether you can already code"
            takes the pressure back off.

            It is also the only continuously moving element on the page. One is a
            pulse; two would be a fairground, which is the same argument the hero
            comment makes about a second spectacle cancelling the first. */}
        <Ticker />

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
              <div key={o.title} className="border-t border-seam pt-6">
                <h3 className="text-body-lg font-semibold">{o.title}</h3>
                <p className="mt-3 text-body text-haze">{o.body}</p>
              </div>
            ))}
          </div>

        </section>

        {/* ---- Projects ---------------------------------------------------- */}
        <section
          id="projects"
          className="band section pt-12 pb-12 sm:pt-16 sm:pb-16"
          aria-label="Upstream work"
          data-reveal-group
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="label">Upstream work</p>
              <Duo
                as="h2"
                className="mt-4 text-display-lg"
                lead="Where our code went."
                trail="Every line links upstream."
              />
            </div>
            {t.projects > 0 && (
              <p className="font-mono text-sm tabular-nums text-dust">
                {t.projects} project{t.projects === 1 ? "" : "s"} · {t.members}{" "}
                member{t.members === 1 ? "" : "s"}
              </p>
            )}
          </div>

          {projects.length === 0 ? (
            <div className="mt-7 rounded-tile border border-dashed border-seam px-8 py-8 text-center">
              <p className="text-display-md font-semibold">Nothing published yet.</p>
              <p className="measure mx-auto mt-4 text-body text-haze">
                This fills in as members land work upstream. Each card carries a link
                to the merged pull request.
              </p>
            </div>
          ) : (
            <>
              {/* The section's lead visual. Apple puts an image under the headline;
                  there is no image to put, so the evidence itself is the visual —
                  see ProofPanel for why that is the honest substitute rather than a
                  stock photo. */}
              <ProofPanel />
              <Carousel label="Upstream contributions" className="mt-8">
              {projects.map((p) => (
                <article
                  key={p.repo}
                  data-card
                  /* 18px radius, measured off Apple's cards. */
                  className="card flex w-[19rem] shrink-0 snap-start flex-col rounded-tile bg-raise p-7 sm:w-[23rem]"
                >
                  {p.tag ? (
                    <Eyebrow tone={p.tag.tone}>{p.tag.label}</Eyebrow>
                  ) : (
                    <Eyebrow>Contribution</Eyebrow>
                  )}

                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="tap group mt-3 inline-flex items-baseline gap-2 font-mono text-body-lg text-ink transition-colors duration-300 ease-glide hover:text-accent"
                  >
                    {p.repo}
                    <span
                      aria-hidden
                      className="text-dust transition-transform duration-300 ease-glide group-hover:translate-x-1"
                    >
                      ↗
                    </span>
                  </a>

                  <p className="mt-4 text-sm leading-relaxed text-haze">{p.what}</p>
                  <p className="mt-4 text-sm leading-relaxed text-ink">{p.did}</p>

                  {/* The proof, given the weight it deserves, pinned to the base
                      so cards of differing text length still align. */}
                  {p.proof && (
                    <div className="mt-auto pt-5">
                      <Eyebrow>{p.proof.label}</Eyebrow>
                      <p className="mt-2 font-mono text-display-md font-medium text-accent">
                        {p.proof.value}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 border-t border-seam pt-4 font-mono text-xs text-dust">
                    {p.memberUrl ? (
                      <a
                        href={p.memberUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="tap inline-block text-haze transition-colors hover:text-accent"
                      >
                        {p.member}
                      </a>
                    ) : (
                      <span className="text-haze">{p.member}</span>
                    )}
                    {p.language && <span>{p.language}</span>}
                  </div>
                </article>
                ))}
              </Carousel>
            </>
          )}
        </section>

        {/* ---- The programmes: what they are, and what we do about it ------ */}
        <section
          id="programmes"
          /* `relative` for the note below — it anchors to this section, so it
             cannot drift when a section above it changes height. */
          className="section relative pt-12 sm:pt-16"
          data-reveal-group
        >
          {/* Right gutter. A reader who has just been told these programmes are
              paid files them next to the internships they are already chasing,
              and then assumes the usual shape — a company, a manager, work that
              belongs to somebody else the day you leave.

              SAID AS WHAT THIS IS RATHER THAN AS WHAT IT IS NOT. The earlier
              draft opened "Not an internship", which spends the loudest line on
              the page's margin telling a reader their existing ambition is the
              wrong one. Most students here want an internship and should; the
              distinction worth drawing is that this particular work stays
              theirs afterwards, which is a thing to gain rather than a thing to
              be corrected about. */}
          <Note
            place="gutter"
            tone="pink"
            fold
            title="You keep the work."
            body="No boss, no timesheet. Everything you write stays public, and stays yours."
            tilt={4}
            className="-right-40 top-28"
          />
          <p className="chip">The programmes</p>
          {/* NO max-w-4xl here, unlike its neighbours, and the reason is this
              heading's length rather than taste. At 56rem the sentence needs four
              lines however it wraps, and `text-balance` then equalises them to
              about 26 characters each — so it set at roughly 645px inside an
              896px cap inside a 1408px container, and left a band of white running
              from the full stop out to the gutter note.

              At the container's own width it balances to two lines of about 53
              characters, which is a normal headline measure and matches the
              programme rows underneath — those are full-width, so a heading that
              stopped at 56rem was also the only thing in the section not aligned
              with its own content. */}
          <Duo
            className="mt-4 text-display-lg"
            lead="Paid, competitive, and open to beginners."
            trail="Most students never apply because nobody told them these exist."
          />

          <div className="mt-8 space-y-px overflow-hidden rounded-tile bg-seam">
            {PROGRAMMES.map((pg) => (
              <div key={pg.key} className="bg-raise p-8 sm:p-10">
                <div className="grid gap-5 lg:grid-cols-[16rem_1fr] lg:gap-8">
                  <div>
                    {/* Programme name as type, tinted to match its planet in the
                        system above — never the official logo. Those marks belong
                        to Google, the Linux Foundation and others, and using them
                        implies an endorsement nobody granted. */}
                    <p
                      className="text-display-md font-semibold leading-none"
                      style={{ color: PROGRAMME_COLOUR[pg.key] }}
                    >
                      {PROGRAMME_SHORT[pg.key]}
                    </p>
                    <p className="mt-2 font-mono text-xs text-dust">
                      {PROGRAMME_NAME[pg.key]}
                    </p>
                    <a
                      href={pg.url}
                      target="_blank"
                      rel="noreferrer"
                      className="tap mt-4 inline-block font-mono text-xs text-accent link-u hover:brightness-125"
                    >
                      Official site ↗
                    </a>
                  </div>

                  <dl className="grid gap-4 sm:grid-cols-2">
                    {[
                      ["What it is", pg.what],
                      ["Who gets in", pg.who],
                      ["When it runs", pg.when],
                      ["What it pays", pg.pays],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt className="label">{k}</dt>
                        <dd className="mt-2 text-sm leading-relaxed text-haze">{v}</dd>
                      </div>
                    ))}
                    <div className="sm:col-span-2 border-t border-seam pt-5">
                      <dt className="label" style={{ color: PROGRAMME_COLOUR[pg.key] }}>
                        What the club does
                      </dt>
                      <dd className="mt-2 text-sm leading-relaxed text-ink">{pg.weDo}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Calendar -----------------------------------------------------
            The only honest urgency device the club owns. The argument is
            arithmetic, not a countdown: organisations select contributors who
            already have months of commits in their repo, so "next year" is a
            skipped cycle rather than a delay. No exact dates — they move annually
            and a stale date costs more than it buys on a page claiming accuracy. */}
        <section
          id="calendar"
          className="band section relative pt-12 pb-12 sm:pt-16 sm:pb-16"
          data-reveal-group
        >
          {/* Left gutter, beside the argument it compresses. The proverb is the
              whole section in two lines, and it is deliberately undated: every
              other timing claim on this page avoids naming a month for the same
              reason the table does, and a note that says "start in October" is
              wrong for eleven months of the year.

              KEPT SHORT, which is a constraint the gutter imposes rather than a
              style. A note is 160px wide and hangs 16px inside a container whose
              padding is the only thing between it and the text; every line it
              gains grows it downward past the eyebrow and alongside the heading,
              where that 16px is all the clearance there is. Four lines is the
              working limit.

              top-28, beside the heading, which is where a gutter note belongs.
              It spent a while at top-80 for one reason only: a flow note used to
              sit in the opposite margin at the top of this band, and two notes
              at one height read as a symmetrical ornament flanking the heading
              rather than as two separate remarks (see the vertical spacing note
              in Note.tsx). That note is gone, so the constraint is gone with it
              and this one is the only decoration in the section. */}
          <Note
            place="gutter"
            fixing="pin"
            paper="ruled"
            title="Best day: last autumn."
            body="Second best: today. Those are the two options."
            tilt={-4}
            className="-left-40 top-28"
          />
          {/* The void to the right of this heading is deliberately empty. It held
              a flow note ("No exact dates.") that said in two lines what the
              section header above already says in a sentence and the table below
              says in a column — the one decoration on the page that annotated
              nothing. Left clear, the heading and the table read as one block.

              If a note ever goes back here: the band is 288px tall with 405px of
              clear width at 1024, 1280 and 1800 alike, the heading's longest line
              ends at 789px from the container's left edge, and the gutter note
              above has to move back down out of its level. */}
          <p className="chip">The reverse clock</p>
          <Duo
            className="mt-4 max-w-4xl text-display-lg"
            lead="Applications are decided months before they open."
            trail="Which is why starting now is the whole trick."
          />
          <p className="measure mt-4 text-body-lg text-haze">
            Organisations pick contributors they already recognise. By the time a
            proposal window opens, the people who get in have been committing to
            that repository since autumn. Waiting a year does not delay you by a
            year — it costs you the cycle.
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-seam">
                  {["Window", "Programme", "Opens", "Start prepping", "What you do first"].map((h) => (
                    <th key={h} scope="col" className="px-3 py-3 text-left font-mono text-[13px] font-medium uppercase tracking-[0.14em] text-dust">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CALENDAR.map((r) => (
                  <tr key={r.programme} className="row-live border-b border-seam/60 align-top last:border-0">
                    <td className="px-3 py-5 font-mono text-xs text-accent">{r.window}</td>
                    <td className="px-3 py-5 font-medium text-ink">{r.programme}</td>
                    <td className="px-3 py-5 text-haze">{r.opens}</td>
                    <td className="px-3 py-5 font-mono text-xs text-ember">{r.prepFrom}</td>
                    <td className="max-w-sm px-3 py-5 text-haze">{r.doingNow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---- Why this and not the CP club --------------------------------- */}
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
                    <span className="chip chip-mint chip-true">OSC club 🟢</span>
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

        {/* ---- Tracks ------------------------------------------------------
            A CARD GRID, not the stacked full-width rows this used to be.

            The rows were three near-identical bands of text: a heading in a 20rem
            left column, a paragraph in the right, repeated down the page. Nothing
            about that shape said "these are three parallel choices, pick one" —
            read top to bottom it looked like a sequence, which is the opposite of
            what the section means. Three cards side by side ARE the argument:
            equal weight, equal size, one decision.

            Three columns rather than the reference's four, because there are three
            tracks. A four-column grid with three cards leaves a hole in the row,
            and inventing a fourth to fill it would put a programme on the page
            that the club does not run. */}
        <section
          id="tracks"
          className="section pt-12 sm:pt-16"
          data-reveal-group
        >
          <p className="chip">Pick your path</p>
          <Duo
            className="mt-4 text-display-lg"
            lead="What you can work on."
            trail="Start where you are."
          />

          <div
            className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            data-reveal-group
          >
            {TRACKS.map((track, i) => (
              // `group` so the arrow in the footer link moves with a hover anywhere
              // on the card; flex-col so the dark frame, the tags and the link line
              // up across all three cards whatever the paragraph above them
              // measures — see the flex-1 on the detail.
              <article
                key={track.name.trail}
                className={`bento tint-${track.tint} group flex flex-col p-7`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* A label, NOT a ranking. The tracks are parallel choices a
                      member picks from by their own level, so the order carries no
                      information and the headline no longer claims it does — each
                      card states its own difficulty in `summary` and `tags`
                      instead. The numeral stays because the card header is a
                      two-item row (mark left, doodle right) and it reads as an
                      index, but if it ever starts reading as 1st/2nd/3rd it should
                      go rather than the headline bending back to an order. */}
                  <span className="track-num" aria-hidden>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Doodle
                    kind="squiggle"
                    className="mt-1 w-8 shrink-0"
                    style={{ color: "var(--tint)" }}
                  />
                </div>

                {/* Two-tone and two-line, which is the device the section headings
                    already use (see Duo) at card scale. The break is authored in
                    the content file rather than left to the wrap, so all three
                    headings are two lines deep at every width and the cards keep a
                    common baseline. */}
                <h3 className="mt-5 font-display text-display-md font-bold leading-[1.3] tracking-[-0.02em]">
                  {track.name.lead}
                  <br />
                  <span style={{ color: "var(--tint)" }}>
                    {track.name.trail}
                  </span>
                </h3>

                <p
                  className="mt-3 font-mono text-xs"
                  style={{ color: "var(--tint)" }}
                >
                  {track.summary}
                </p>

                {/* flex-1: the three paragraphs are 2, 4 and 2 sentences, so without
                    it the code frames sit at three different heights and the row
                    stops reading as a set. */}
                <p className="mt-4 flex-1 text-body text-haze">{track.detail}</p>

                {/* The dark frame, in place of the reference's screenshot panel —
                    but a terminal rather than a mocked dashboard, because a fake UI
                    on a page whose whole argument is verifiable evidence is the one
                    thing this design cannot afford. Every line is a command a
                    reader can run; see the note on Track.preview in club.ts.

                    Fixed dark fill on both themes, like the other code frames on
                    this page: a terminal is a terminal. */}
                <div
                  aria-hidden
                  className="mt-4 overflow-hidden rounded-xl border border-white/10"
                  style={{ background: "#0F172A" }}
                >
                  <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
                    <span className="h-2 w-2 rounded-full bg-[#475569]" />
                    <span className="h-2 w-2 rounded-full bg-[#475569]" />
                    <span className="h-2 w-2 rounded-full bg-[#475569]" />
                    <span
                      // 11px, not 10 — scripts/qa.mjs treats anything below that
                      // as too small to read on a phone, and it flags every line of
                      // these preview frames. Same fix already applied to the bento
                      // frames further up this file.
                      className="ml-1.5 font-mono text-[13px]"
                      style={{ color: "#94A3B8" }}
                    >
                      {track.preview.title}
                    </span>
                  </div>
                  <div className="space-y-1 p-3 font-mono text-[13px] leading-relaxed">
                    {track.preview.lines.map((l) => (
                      <p
                        key={l.text}
                        style={{
                          color: l.kind === "cmd" ? "#E2E8F0" : "#94A3B8",
                        }}
                      >
                        {l.kind === "cmd" && (
                          <span style={{ color: "#4ADE80" }}>$ </span>
                        )}
                        {l.text}
                      </p>
                    ))}
                  </div>
                </div>

                <ul className="mt-5 flex flex-wrap gap-2">
                  {track.tags.map((tag) => (
                    <li key={tag} className="tag">
                      {tag}
                    </li>
                  ))}
                </ul>

                {track.cta && (
                  <a
                    href={track.cta.href}
                    {...(track.cta.external
                      ? { target: "_blank", rel: "noreferrer" }
                      : {})}
                    className="tap mt-5 inline-flex items-center gap-2 self-start font-label text-sm font-extrabold uppercase tracking-[0.06em]"
                    style={{ color: "var(--tint)" }}
                  >
                    {track.cta.label}
                    {/* Three links reading "How it goes" / "Where it lands" / "The
                        repo" are clear beside their headings and useless in a screen
                        reader's list of links, where they arrive with no card around
                        them. The suffix gives each one its destination. */}
                    <span className="sr-only">
                      {" "}
                      — {track.cta.external ? "opens GitHub, " : ""}
                      {track.name.lead} {track.name.trail}
                    </span>
                    <Icon
                      name="arrow-right"
                      className="transition-transform duration-200 group-hover:translate-x-1"
                    />
                  </a>
                )}
              </article>
            ))}
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

        {/* ---- Mentors ------------------------------------------------------ */}
        {/* THE WHOLE SECTION IS GATED, not just its list. Mentors.tsx used to
            carry an empty state — a dashed box reading "No mentors listed yet" —
            and with MENTORS empty that was the entire visible content of this
            section: a chip, a headline, a paragraph promising that "each entry
            says what they shipped", and then a box admitting there are no
            entries. Deleting only the box would have left the promise standing
            over nothing, which reads worse than the box did.

            So the gate lives here rather than in the component, because the copy
            it has to suppress lives here too. Add a mentor to content/club.ts and
            the section returns in full, unchanged — nothing about it was deleted.

            aria-label because this section has no nav link — "Team" took that
            slot — so the outline panel is how it gets reached. */}
        {publishedMentors().length > 0 && (
          <section
            id="mentors"
            className="section relative pt-12 sm:pt-16"
            aria-label="Mentors"
            data-reveal-group
          >
            {/* "Not professors" is the headline; this is the part of it that
                actually matters to somebody deciding whether the advice will be
                current. Void: 240px tall, 320px clear.

                anchor 59, the largest on the page, because this headline's trail
                is the longest — its ink reaches 900px from the container's left
                edge. 44px of gap, same as the rest; the number differs because
                the sentence does. */}
            <Note
              place="flow"
              tone="lime"
              fixing="pin"
              paper="ruled"
              title="Two years ahead, not twenty."
              /* SHORT because the title is long. This void is 240px and a
                 four-line title already spends 90 of it; the first draft's body
                 ran to five lines and put the note 37px through the paragraph
                 below. The band has no give — the copy has to. */
              body="All of them went through one themselves."
              tilt={-3.5}
              anchor={59}
              className="top-2"
            />
            <p className="chip">Who reads your code</p>
            <Duo
              className="mt-4 max-w-4xl text-display-lg"
              lead="Not professors."
              trail="People who did this recently, under the same constraints."
            />
            <p className="measure mt-4 text-body-lg text-haze">
              Every mentor here has been through one of these programmes
              themselves. What they offer is narrow and recent: they wrote the
              proposal, sat through the review comments and landed the patch,
              from this campus, within the last couple of years. Each entry says
              what they shipped, links the public record, and names the few
              things they are genuinely useful for.
            </p>
            <Mentors />
          </section>
        )}

        {/* ---- The team -------------------------------------------------------
            Directly after Mentors, and that adjacency is the point: both sections
            answer "who are the humans here", so they belong in one spread rather
            than scattered either side of an argument. Mentors goes first because a
            prospective member cares more about who reviews their patch than who
            books the room.

            Deliberately NOT near the top. Eight named office-holders ahead of the
            hall would be the club introducing itself before it has shown that
            anybody outside it agreed — the same reason the hall leads the page.
            Placed here it also sets up #institutional below, which asks a faculty
            member to email organisers this section has just named.

            aria-label, despite the section having a visible eyebrow: Outline names
            a section from its aria-label first, then a `.label` eyebrow, then its
            heading — and this eyebrow is a `.chip`. Without this the outline entry
            would be the Duo headline cut at 33 characters ("8 people run this club.
            2 are sha…"). It is also the landmark's accessible name, and matches the
            nav link that points here. */}
        <section
          id="team"
          className="section relative pt-12 sm:pt-16"
          aria-label="Team"
          data-reveal-group
        >
          {/* The section's own paragraph says this page exists to answer one
              question; the note says which one, in the margin, for anybody who
              scrolled past the paragraph to look at the faces.

              THIS IS THE ORIGINAL COPY, RESTORED. It was briefly "Not the
              President. A patch review is the Repo Maintainer." — which cleared
              the bar in Note.tsx that a note must say something the section does
              not, but spent the margin explaining the org chart rather than
              pointing at the one question the chart exists to answer. The
              overlap with the standfirst below is the known cost of this
              version; keep the two in step if either is ever reworded.

              anchor 49: the headline's second clause ends at 737px, so 784 sits
              47px off it. */}
          <Note
            place="flow"
            tone="orange"
            fold
            title="Who to ask."
            body="That is the only question this section exists to answer."
            tilt={3.5}
            anchor={49}
            className="top-12"
          />
          <p className="chip">Who runs it</p>
          <Duo
            className="mt-4 max-w-4xl text-display-lg"
            lead={`${teamSize()} people run this club.`}
            trail={`${TEAM_SHADOWS.length} are shadows, training to take over.`}
          />
          <p className="measure mt-4 text-body-lg text-haze">
            This page exists to answer one
            question: <span className="mark">who to ask</span>. 
          </p>
          <Team />
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

        {/* ---- Join -------------------------------------------------------- */}
        <section
          id="join"
          className="band section relative pt-12 pb-12 sm:pt-16 sm:pb-16"
        >
          <div className="seam-fade" />
          {/* The last note on the page, and the only one that is a list rather
              than a sentence — it is the packing list for the paragraph beside
              it, and the third item being unticked is the joke.

              A GUTTER note, where this was briefly a flow one. The section looks
              like a narrow centred column and is not: the paragraph under the
              headline carries `.measure`, which is 44em of its OWN font-size —
              about 1050px at body-lg — so the free space either side is ~80px
              and the note was sitting 100px on top of the copy. There is no
              inside-the-container position here that works, so it hangs in the
              margin like the others. See the placement note in Note.tsx. */}
          <Note
            place="gutter"
            tone="sky"
            paper="grid"
            title="Bring:"
            tilt={-4}
            className="-left-40 top-40"
          >
            <ul className="note-list">
              <li>
                <span aria-hidden>☑</span> A laptop
              </li>
              <li>
                <span aria-hidden>☑</span> A GitHub account
              </li>
              <li>
                <span aria-hidden>☐</span> Confidence (optional)
              </li>
            </ul>
          </Note>
          {/* Centred, unlike every other section here, because this one is
              structurally an Apple tile rather than an argument: short headline,
              one supporting line, two pills. Seen in Chrome on their homepage —
              the iPhone tile is exactly this shape, centred, with a filled and an
              outlined pill side by side.

              The other thirteen sections stay left-aligned deliberately. Apple
              centres short tile copy, not paragraphs; our headlines are two-clause
              arguments over three lines and centred ragged text is measurably
              harder to read. Copying the alignment everywhere would be copying the
              look without the reason. */}
          {/* The group is this inner block, not the section: the section's other
              child is the seam hairline, and a 1px rule sliding 20px up is the
              one thing on the page that would read as a rendering fault. */}
          <div className="pt-10 text-center sm:pt-14" data-reveal-group>
            <Duo
              className="mx-auto max-w-3xl text-display-lg"
              lead="Want your name in the commit log?"
              trail="Start here."
            />
            <p className="measure mx-auto mt-4 text-body-lg text-haze">
              Bring a laptop and a GitHub account. You do not need to be good yet —
              a first contribution is mostly about learning how the process works.
            </p>

            <div className="mt-11 flex flex-wrap items-center justify-center gap-3">
              <a
                href={`mailto:${LINKS.email}`}
                className="btn btn-primary"
              >
                Get in touch
              </a>
              <a
                href={LINKS.github}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
              >
                Our GitHub
              </a>
            </div>
          </div>
        </section>

        {/* ---- For faculty, sponsors and maintainers -------------------------
            Two of this site's three audiences previously had nowhere to land. An
            anonymous club reads as vaporware to a faculty member and a maintainer
            at the same time, so this band is concrete, contactable, and makes
            exactly one ask — and that ask is for PEOPLE rather than a budget
            line. See the note over INSTITUTIONAL in club.ts. */}
        <section id="institutional" className="section pt-12 sm:pt-16">
          <div
            className="card card-still rounded-tile bg-raise p-8 sm:p-12"
            data-reveal-group
          >
            <p className="chip">For faculty, sponsors and maintainers</p>
            <Duo
              className="mt-4 max-w-3xl text-display-md"
              lead="What this club is, in plain terms."
            />
            <div className="mt-6 grid gap-x-8 gap-y-8 sm:grid-cols-3">
              {INSTITUTIONAL.map((i) => (
                <div key={i.title}>
                  <h3 className="text-body-lg font-semibold">{i.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-haze">{i.body}</p>
                </div>
              ))}
            </div>
            <a
              href={`mailto:${LINKS.email}`}
              className="mt-6 inline-block rounded-md border border-seam px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-accent/60"
            >
              Email the organisers
            </a>
          </div>
        </section>

        {/* ---- Footer ------------------------------------------------------ */}
        <footer className="section pb-16 pt-12 sm:pt-16">
          <div className="seam-fade" />
          <div className="flex flex-wrap items-start justify-between gap-5 pt-6">
            <div>
              <p className="font-semibold">Scaler Open Source Club</p>
              <p className="mt-2 max-w-sm text-sm text-haze">
                A student club at Scaler School of Technology.
              </p>
            </div>
            <p className="font-mono text-xs text-dust">scaleropensourcelabs.com</p>
          </div>

          {/* The easter egg, at the very bottom, as a reward for getting here.
              Deliberately NOT fixed to the viewport: StickyCTA already occupies
              `fixed bottom-0` and already reserves body padding to keep from
              covering this footer, and two permanently docked bars on a phone is
              most of the screen. */}
          <Console />
        </footer>
      </main>

      {/* Appears once past the hero, hides over the apply form. */}
      <StickyCTA />
    </>
  );
}
