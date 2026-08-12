// The scannable roster that sits under the solar system.
//
// The system is a good hook and a bad index. Somebody evaluating this club — a
// maintainer, a sponsor, a student comparing options — will not scroll through
// fourteen viewport-height stations to find out how many people got into GSoC and
// with which organisations. They want the list, sorted, in one screen.
//
// So the metaphor is demoted to what it is good at (making you stop) and the facts
// live here in a table you can read in five seconds, copy out of, and link to. That
// split is the point: spectacle above, evidence below.
//
// This also carries the whole section for anyone the WebGL never reaches — reduced
// motion, no GPU, a locked-down browser, or a search crawler.

import {
  PROGRAMME_COLOUR,
  PROGRAMME_NAME,
  PROGRAMME_SHORT,
  publishedSelections,
  type Programme,
} from "@/content/club";

export default function Roster() {
  const people = publishedSelections();
  if (people.length === 0) return null;

  // Newest first, then grouped by programme, so the list reads as a record rather
  // than an arbitrary order.
  const sorted = [...people].sort(
    (a, b) =>
      b.year.localeCompare(a.year) ||
      a.programme.localeCompare(b.programme) ||
      a.name.localeCompare(b.name),
  );

  return (
    <div className="section pb-28 pt-10 sm:pb-40">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h3 className="text-display-md font-semibold">Every selection</h3>
        <p className="font-mono text-xs text-dust">
          {people.length} total · newest first
        </p>
      </div>

      {/* The table now sits in its own tile rather than floating on the page.
          Two nested elements and each does one job: the outer card owns the
          border, the radius and the shadow with `overflow-hidden` so the corners
          actually clip the header row, and the inner div owns the horizontal
          scroll. Merging them would put `overflow-x: auto` on the rounded box,
          and a scroll container cannot clip its own rounded corners — the
          left-hand cells would square off the moment the table was wider than
          the card, which is the only state that matters on a phone.

          card-still, not card: a shadow that lifts under the pointer is an
          affordance, and this tile is not clickable. The rows have their own
          hover.

          The `min-w-[42rem]` on the table is what forces that scroll on narrow
          screens; five columns of names and organisations do not compress. */}
      <div className="card card-still mt-5 overflow-hidden rounded-tile bg-raise shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="scroll-strip overflow-x-auto">
          {/* `table-fixed` plus explicit column widths, which became necessary
              the moment the container went to 88rem and this table went into a
              full-width card. Auto layout sizes columns to their content and
              then shares out the slack evenly, so at 1280px "GSoC", "2026" and a
              name each sat in the middle of its own gulf with the em dashes
              marooned at the right — a table twice as wide as its content and
              half as readable. The whole point of this pass is density.

              The percentages are weighted to what actually varies: names and
              organisations are long and unpredictable, programme codes and years
              are four characters and fixed. */}
          <table className="w-full min-w-[42rem] table-fixed border-collapse text-sm">
          <caption className="sr-only">
            Students selected into open-source mentorship programmes, with the year
            and the organisation that selected them.
          </caption>
          {/* The edge cells get 1.25rem instead of 0.75rem, so the first and last
              columns are not flush against the card's own border. Done as an
              arbitrary variant on the row rather than by hand-tagging two cells
              in two places, which would drift the moment a column is added.

              The header row also takes --sunk, which turns it into a proper
              table head inside the tile instead of a line of grey caps floating
              above the first entry. */}
          <thead>
            <tr className="border-b border-seam bg-sunk [&>*:first-child]:pl-5 [&>*:last-child]:pr-5">
              {[
                ["Programme", "w-[16%]"],
                ["Year", "w-[9%]"],
                ["Student", "w-[33%]"],
                ["Organisation", "w-[31%]"],
                ["", "w-[11%]"],
              ].map(([h, w], i) => (
                <th
                  key={h || i}
                  scope="col"
                  className={`${w} px-3 py-3 text-left font-mono text-[13px] font-medium uppercase tracking-[0.14em] text-dust`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr
                key={`${s.name}-${s.programme}-${s.year}`}
                // hover:bg-sunk, not the bg-raise/60 this used to carry. The row
                // sits on a --raise card now, so a --raise hover was a no-op —
                // the highlight was invisible from the moment the table went
                // into a tile.
                className="border-b border-seam/60 transition-colors last:border-0 hover:bg-sunk [&>*:first-child]:pl-5 [&>*:last-child]:pr-5"
              >
                <td className="px-3 py-3.5">
                  <span className="inline-flex items-center gap-2.5">
                    {/* The dot repeats the planet's colour, tying the table to the
                        scene above. Never the only carrier of meaning — the
                        programme name is right beside it. */}
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: PROGRAMME_COLOUR[s.programme as Programme] }}
                    />
                    <span className="font-medium text-ink">
                      {PROGRAMME_SHORT[s.programme]}
                    </span>
                  </span>
                </td>
                <td className="px-3 py-3.5 font-mono text-xs tabular-nums text-haze">
                  {s.year}
                </td>
                <td className="px-3 py-3.5 text-ink">
                  {s.name}
                  {/* Year of study rides in the Student cell rather than claiming a
                      column of its own. It qualifies the person, not the selection,
                      and a fifth column of two-character values would widen the
                      table's min-width for very little. */}
                  {s.studyYear && (
                    <span className="ml-2 font-mono text-[13px] text-dust">
                      {s.studyYear}
                    </span>
                  )}
                </td>
                {/* An em dash, not an empty cell: blank reads as a rendering fault,
                    whereas the dash says the organisation is genuinely not recorded
                    yet — the same thing the Proof column already does. */}
                <td className="px-3 py-3.5 text-haze">
                  {s.org ?? <span className="font-mono text-xs text-dust">—</span>}
                </td>
                <td className="px-3 py-3.5 text-right">
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-accent link-u hover:brightness-125"
                    >
                      Proof ↗
                    </a>
                  ) : (
                    <span className="font-mono text-xs text-dust">—</span>
                  )}
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 font-mono text-[13px] leading-relaxed text-dust">
        Programme names are trademarks of their respective organisations. Listing a
        selection is a statement of fact about our members, not an endorsement by{" "}
        {Object.values(PROGRAMME_NAME).slice(0, 3).join(", ")} or any other
        programme.
      </p>
    </div>
  );
}
