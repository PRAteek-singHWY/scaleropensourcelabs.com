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
    <div className="section pb-28 pt-20 sm:pb-40">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h3 className="text-display-md font-semibold">Every selection</h3>
        <p className="font-mono text-xs text-dust">
          {people.length} total · newest first
        </p>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[42rem] border-collapse text-sm">
          <caption className="sr-only">
            Students selected into open-source mentorship programmes, with the year
            and the organisation that selected them.
          </caption>
          <thead>
            <tr className="border-b border-seam">
              {["Programme", "Year", "Student", "Organisation", ""].map((h, i) => (
                <th
                  key={h || i}
                  scope="col"
                  className="px-3 py-3 text-left font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-dust"
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
                className="border-b border-seam/60 transition-colors last:border-0 hover:bg-raise/60"
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
                <td className="px-3 py-3.5 text-ink">{s.name}</td>
                <td className="px-3 py-3.5 text-haze">{s.org}</td>
                <td className="px-3 py-3.5 text-right">
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-accent hover:brightness-125"
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

      <p className="mt-6 font-mono text-[11px] leading-relaxed text-dust">
        Programme names are trademarks of their respective organisations. Listing a
        selection is a statement of fact about our members, not an endorsement by{" "}
        {Object.values(PROGRAMME_NAME).slice(0, 3).join(", ")} or any other
        programme.
      </p>
    </div>
  );
}
