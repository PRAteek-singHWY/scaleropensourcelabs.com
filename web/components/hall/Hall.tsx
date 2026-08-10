// The hall: every student who was selected, as a grid of cards.
//
// This replaced a WebGL solar system in which each selection was an orbiting
// planet and a rocket flew past them on scroll. The 3D is gone at the client's
// instruction, and the honest accounting is that it cost about a thousand lines,
// a 15,000px section, a three.js dependency, and a scroll mechanic that could
// only ever be verified by rendering it — to say one thing: these people got in.
//
// It went through a one-per-row feature layout in between, which was a mistake worth
// recording: at 440px a portrait plus its text filled a viewport, so seeing fourteen
// people meant scrolling fourteen screens. That buries the very argument the count
// is making. A grid says "these are all of them" at a glance.
//
// Still ZERO JavaScript — no state, no scroll listener, no canvas — so this stays a
// server component and the whole section is HTML and CSS.
//
// There are deliberately no 01/02/03 markers. Order carries no meaning in a list
// of people — numbering them would imply a ranking that does not exist, which is
// the exact thing the client removed the leaderboard to avoid.

import Portrait from "@/components/Portrait";
import ContribWall from "@/components/hall/ContribWall";
import {
  PROGRAMME_COLOUR,
  PROGRAMME_NAME,
  PROGRAMME_SHORT,
  PROJECTS,
  publishedSelections,
  selectionStats,
} from "@/content/club";

export default function Hall() {
  const people = publishedSelections();
  const stats = selectionStats();
  // Indexed by member name so a card can find its own recorded work in one
  // lookup rather than scanning PROJECTS per person inside the map below.
  const workByMember = new Map(
    PROJECTS.filter((p) => p.published).map((p) => [p.member, p]),
  );

  if (people.length === 0) {
    return (
      <div className="mt-8 rounded-tile border border-dashed border-seam px-8 py-8">
        <p className="text-display-md font-semibold">No selections published yet.</p>
        <p className="measure mt-4 text-body text-haze">
          Each entry needs that person&apos;s own permission, the organisation that
          selected them, and a public link that proves it. Nothing appears here on
          the strength of a claim alone.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* The count is the argument the section makes, so it leads. Derived from the
          list rather than typed, so the headline can never drift from the entries
          below it. */}
      {/* The number is the whole argument, so it is now sized like one: its own
          clamp up to 4.5rem rather than the shared display-lg step, which topped
          out at 2.75rem and let a two-digit figure sit at the same weight as the
          sentence explaining it. 800 is the ceiling of Plus Jakarta Sans — a
          `font-black` here would ask for a 900 the family does not ship and get
          either a synthetic smear or the same 800 back, so it is stated honestly.

          Baseline-aligned rather than centred: the figure and the clause are one
          sentence, and a 72px numeral vertically centred against 20px text reads
          as two unrelated elements sharing a row. */}
      <div className="mt-7 flex flex-wrap items-end gap-x-5 gap-y-3 border-t border-seam pt-6">
        <p className="flex items-baseline gap-3">
          <span className="font-display text-[clamp(3.625rem,calc(6vw_+_0.125rem),4.625rem)] font-bold leading-[0.85] tracking-[-0.04em]">
            {stats.total}
          </span>
          <span className="text-body-lg text-haze">
            selected into international programmes
          </span>
        </p>
        {/* Each programme as a tag rather than a line of mono text. The programme
            colour stays on the TEXT rather than becoming the fill: the five
            programme colours were each validated against the page ground, and
            re-hosting them as fills would need five new pairs proved instead.

            --raise, NOT --sunk, and the difference is 0.25 of a contrast point.
            The first version used the recessed fill, which is #F5F6F8 in light —
            barely darker than the page, and enough to drop C4GT's teal from
            4.65:1 to 4.37:1 and fail the sweep at every light breakpoint. These
            colours have no margin to give away, so a tag built from them has to
            sit on the LIGHTEST surface available, not a tinted one. Anything that
            darkens --raise in light theme has to re-check this. */}
        <ul className="flex flex-wrap items-center gap-2">
          {stats.programmes.map(({ programme, count }) => (
            <li
              key={programme}
              className="flex items-center gap-1.5 rounded-full border border-edge bg-raise px-3 py-1.5 font-mono text-xs"
            >
              <span
                className="font-medium"
                style={{ color: PROGRAMME_COLOUR[programme] }}
              >
                {PROGRAMME_SHORT[programme]}
              </span>
              <span className="text-dust">×{count}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* A grid, so every achiever is on screen at once.
          The one-per-row feature layout showed one person per viewport — fourteen
          screens to see fourteen people, which buries the argument the count is
          making. A grid says "these are all of them" in a glance, which is the
          whole point of the section.

          Chrome-less cards, taken from apple.com/store: their product cards
          measure transparent background, no border, no radius — the image IS the
          card, and the surrounding box is what makes a grid look templated. So the
          portrait carries the tile radius and the text sits beneath it in open
          space rather than inside a panel.

          Hover lifts the card on their measured curve — transform 0.3s
          cubic-bezier(0, 0, 0.5, 1) — and only at the pointer, never on touch.

          FOUR across at the top end, per the client, down from five. The row is
          the unit of reading here and four is the count that still divides cleanly
          into the list while giving each card room: at the 76rem container, four
          columns is roughly 265px a card against five columns' 208px, which is the
          difference between a two-word name setting on one line at display-md and
          setting on two. There is no xl step any more — lg is the top of the
          ladder, so the grid stops widening once the cards are comfortable rather
          than adding a column the moment the window allows one.
          The ladder below it steps one column at a time — a two-column jump halves
          the card width in a single breakpoint and the text visibly reflows as the
          window resizes. Mobile stays at one, unchanged: two 155px cards side by
          side is where the name and the work sentence stop being readable at all. */}
      <ul className="mt-8 grid gap-x-7 gap-y-12 sm:mt-16 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {people.map((p, i) => {
          const work = workByMember.get(p.name);
          return (
          <li key={`${p.name}-${p.programme}-${p.year}`} className="flex">
            {/* Full-height flex column so the action row can be pinned to the
                bottom. Grid already stretches the cells to equal height, which made
                the card BOTTOMS align and hid the real problem: with sentences of
                realistic length the "See the work" links floated at a 77px spread
                across a row of three. The placeholder data all being the same
                length made it measure as perfectly aligned. */}
            <article className="group flex w-full flex-col">
              {/* The portrait frame IS this card's tile — the entry has no other
                  chrome — so it takes the border and the lift. card-still is not
                  used here: this is the outermost interactive surface, not a
                  panel nested inside one.

                  `relative` for the tooltip below; `tilt` for the 3D rotation on
                  hover, which is applied HERE rather than on the <article> so the
                  name and programme underneath stay on a flat plane. Text on a
                  rotated surface loses subpixel antialiasing and goes visibly
                  fuzzy, which is a poor trade for a caption. */}
              <div className="card tilt relative [container-type:inline-size] overflow-hidden rounded-panel">
                <Portrait
                  name={p.name}
                  photo={p.photo}
                  priority={i < 3}
                  className="aspect-[4/5] w-full"
                />

                {/* The hover detail.
                    The brief asks for "their top merged pull request". Exactly one
                    person in this list has one recorded — the OWASP/OpenCRE entry
                    in PROJECTS, with figures read from the GitHub API — and the
                    other fourteen have a name, a programme and a year. Inventing a
                    PR for them would put a fabricated contribution record on a
                    real student's photograph, which is the one thing on this page
                    that could actually cost somebody something if a maintainer
                    went looking.

                    So the tooltip shows the real work where it exists and the real
                    credential where it does not. Both are worth surfacing; only
                    one of them is a pull request. */}
                <span aria-hidden className="card-tip">
                  {work ? (
                    <>
                      <span className="text-[#4ADE80]">✓ {work.tag?.label}</span>{" "}
                      <span className="text-[#94A3B8]">in</span>{" "}
                      <span className="text-[#60A5FA]">{work.repo}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[#A78BFA]">
                        {PROGRAMME_SHORT[p.programme]} {p.year}
                      </span>{" "}
                      <span className="text-[#94A3B8]">
                        · {p.studyYear ?? "selected"}
                      </span>
                    </>
                  )}
                </span>
              </div>

              {/* Programme and year as a chip: it is the credential, so it should
                  read as a badge rather than a caption. Violet and untilted, not
                  the electric-blue sticker the section eyebrows wear — this one is a fact
                  about a person rather than a label the site applied to itself,
                  and against a photograph's straight edge a tilt would read as a
                  misalignment rather than as a sticker. */}
              <p className="mt-5">
                <span className="chip chip-violet chip-true">
                  {PROGRAMME_SHORT[p.programme]} {p.year}
                </span>
              </p>

              {/* Reserves two lines, so a long name cannot push everything below
                  it down in that one card.
                  Sentence case rather than capitals now, and here the reason is
                  arithmetic as much as tone: at xl the grid is five columns of
                  roughly 220px, and Plus Jakarta Sans sets "PRATEEK SINGH" in
                  caps at about 243px. Every name of that length or more would
                  have taken both reserved lines, and a longer one a third. */}
              {/* min-h is in `lh` units, so the two reserved lines grow with the
                  leading on their own — the reservation stays exactly two lines of
                  this heading whatever the number below is. That is the reason for
                  the unit, and it is why loosening the leading here needed no second
                  edit to keep the card bottoms aligned. */}
              <h3 className="mt-3.5 min-h-[2lh] font-display text-display-md font-bold leading-[1.3] tracking-[-0.02em]">
                {p.name}
              </h3>

              {/* Year of study and organisation share one mono line, because they
                  are the same kind of fact — small, factual, subordinate to the
                  name. Joined rather than stacked so an entry with only one of them
                  does not leave a visible gap where the other would sit. */}
              {(p.studyYear || p.org) && (
                <p className="mt-2 font-mono text-xs text-dust">
                  {[p.studyYear, p.org].filter(Boolean).join(" · ")}
                </p>
              )}

              {p.work && <p className="mt-3 text-body text-haze">{p.work}</p>}

              {/* mt-auto: the actions sit on the card's baseline, so a row of them
                  reads as one line regardless of how long each sentence runs.

                  Rendered only when there is something in it. An entry awaiting its
                  proof link has neither, and an empty flex row still contributes its
                  pt-5 — which reads as an unexplained gap under every card in the
                  cohort rather than as nothing. */}
              {(p.url || p.github) && (
                <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-5">
                  {p.url && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="tap inline-block font-label text-sm font-semibold uppercase tracking-[0.04em] text-accent hover:brightness-110"
                    >
                      See the work →
                    </a>
                  )}
                  {p.github && (
                    <a
                      href={`https://github.com/${p.github}`}
                      target="_blank"
                      rel="noreferrer"
                      className="tap inline-block font-mono text-xs text-haze hover:text-accent"
                    >
                      @{p.github}
                    </a>
                  )}
                </div>
              )}
            </article>
          </li>
          );
        })}

        {/* THE OPEN SLOT, last in the grid.
            Every other card is a record of something that already happened, which
            makes the whole grid readable as a closed set — fifteen people, done. This
            one card says the list is still being written, and it is the only card here
            that is an invitation rather than evidence.

            So it is the only one in yellow. #FFD600 is the page's primary-action
            colour — the apply button wears it, the marker badges wear it, nothing else
            does — and spending it once at the end of a wall of photographs is what
            makes the card read as a call to act rather than as a sixteenth person.

            Rendered outside the map on purpose: it is not a Selection, it has no
            programme, year, org or proof link, and threading a synthetic entry through
            `people` would mean every consumer of that array — the count above, the
            roster table, selectionStats — having to know to skip it. The count would
            have said sixteen.

            The whole card is one <a> to #apply rather than a card with a link inside
            it: there is no second thing to click here, and a 265px yellow tile that
            does nothing when pressed is worse than no tile. That is also why the
            action row below is a <span> — an <a> inside an <a> is invalid and browsers
            recover from it by splitting the outer link. */}
        <li className="flex">
          <a href="#apply" className="group flex w-full flex-col">
            {/* Same frame as a portrait — the `card` border, the `tilt` hover, the
                4/5 aspect and the panel radius — so the slot sits in the grid rhythm
                instead of beside it. Only the fill changes.

                bg-pop as a utility works here because `.card` deliberately sets no
                background (see globals.css); a `background` on that class would
                silently beat this, which is the trap the class comment names.

                The ring, not a border utility: `.card`'s `border` shorthand is emitted
                after Tailwind's utilities and would win, so the keyline that separates
                a bright yellow field from a pale page has to come from a property the
                card does not own. Same trick Portrait uses on its monogram field. */}
            <div className="card tilt relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-panel bg-pop ring-1 ring-inset ring-black/10">
              {/* The dashed inset says "empty slot" in the one visual language every
                  reader already knows, and it is what stops a plain yellow rectangle
                  reading as an image that failed to load. */}
              <span
                aria-hidden
                className="absolute inset-3 rounded-[20px] border-2 border-dashed border-black/25"
              />
              {/* A plus at the same scale as Portrait's monogram, in the same
                  container-query unit, so the glyph in this cell is the same size as
                  the initials in the cell beside it at every column width. Black at
                  full strength rather than the monogram's 45%: on #FFD600 that is the
                  14.9:1 pair the palette reserves for this fill. */}
              <span
                aria-hidden
                className="relative select-none font-display font-extrabold leading-none text-black"
                style={{ fontSize: "clamp(2.625rem, calc(26cqw + 0.125rem), 7.125rem)" }}
              >
                +
              </span>
            </div>

            {/* Occupies the credential chip's slot, in yellow rather than violet —
                the violet chips are facts about a person and this is not one. */}
            <p className="mt-5">
              <span className="chip chip-pop chip-true">Open spot</span>
            </p>

            {/* min-h-[2lh] like every other heading in this grid, so this card's
                bottom edge lines up with the rest of its row rather than sitting a
                line high because the phrase is short. */}
            <h3 className="mt-3.5 min-h-[2lh] font-display text-display-md font-bold leading-[1.3] tracking-[-0.02em] text-ink">
              Next could be you!
            </h3>

            {/* Sits in the "3rd year · org" slot the other cards use, so the column
                of small mono lines stays unbroken. Deliberately NOT "no experience
                needed" — the sticky CTA at the foot of the page already says exactly
                that, and a card repeating the bar two inches above it reads as a
                template filling itself in. */}
            <p className="mt-2 font-mono text-xs text-dust">
              applications open
            </p>

            <p className="mt-3 text-body text-haze">
              This wall is not finished. Every name on it was added after somebody
              decided to start.
            </p>

            <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-5">
              <span className="tap inline-block font-label text-sm font-semibold uppercase tracking-[0.04em] text-accent group-hover:brightness-110">
                Apply now →
              </span>
            </div>
          </a>
        </li>
      </ul>

      {/* The green wall, under the grid. Decorative texture, not a chart — see
          ContribWall for why it carries no counts, no axis and no legend. */}
      <ContribWall />
    </>
  );
}
