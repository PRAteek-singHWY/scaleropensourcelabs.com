// The hall: every student who was selected, one at a time, at full size.
//
// This replaced a WebGL solar system in which each selection was an orbiting
// planet and a rocket flew past them on scroll. The 3D is gone at the client's
// instruction, and the honest accounting is that it cost about a thousand lines,
// a 15,000px section, a three.js dependency, and a scroll mechanic that could
// only ever be verified by rendering it — to say one thing: these people got in.
//
// A large portrait with what that person shipped beside it says the same thing in
// the oldest layout in print, and says it faster. It also ships ZERO JavaScript:
// there is no state, no scroll listener and no canvas here, so this is a server
// component and the entire section is HTML and CSS.
//
// Sides alternate. Fourteen entries down one side becomes a column of identical
// rows that the eye stops reading around the fourth; alternating gives each person
// their own arrival, and costs nothing but an `order` class.
//
// There are deliberately no 01/02/03 markers. Order carries no meaning in a list
// of people — numbering them would imply a ranking that does not exist, which is
// the exact thing the client removed the leaderboard to avoid.

import Portrait from "@/components/Portrait";
import {
  PROGRAMME_COLOUR,
  PROGRAMME_NAME,
  PROGRAMME_SHORT,
  publishedSelections,
  selectionStats,
} from "@/content/club";

export default function Hall() {
  const people = publishedSelections();
  const stats = selectionStats();

  if (people.length === 0) {
    return (
      <div className="mt-14 rounded-[10px] border border-dashed border-seam px-8 py-16">
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
      <div className="mt-12 flex flex-wrap items-baseline gap-x-8 gap-y-4 border-t border-seam pt-10">
        <p>
          <span className="text-display-lg font-semibold tracking-tightest tabular-nums">
            {stats.total}
          </span>
          <span className="ml-3 text-body-lg text-haze">
            selected into international programmes
          </span>
        </p>
        <ul className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          {stats.programmes.map(({ programme, count }) => (
            <li key={programme} className="font-mono text-xs">
              <span style={{ color: PROGRAMME_COLOUR[programme] }}>
                {PROGRAMME_SHORT[programme]}
              </span>
              <span className="ml-1.5 text-dust tabular-nums">×{count}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-20 space-y-20 sm:mt-24 sm:space-y-24">
        {people.map((p, i) => (
          <article
            key={`${p.name}-${p.programme}-${p.year}`}
            className="grid items-center gap-8 sm:gap-12 lg:grid-cols-[26rem_minmax(0,1fr)] lg:gap-16"
          >
            {/* container-type is required, not decorative: Portrait sizes its
                monogram in cqw so the initials scale with the frame rather than
                the viewport. Without it the fallback renders at a fixed size and
                looks broken at exactly the widths where it matters. */}
            <div
              className={`[container-type:inline-size] ${
                i % 2 === 1 ? "lg:order-2" : ""
              }`}
            >
              <Portrait
                name={p.name}
                photo={p.photo}
                priority={i < 2}
                className="aspect-[4/5] w-full max-w-[26rem] rounded-[14px]"
              />
            </div>

            <div className={i % 2 === 1 ? "lg:order-1" : ""}>
              <p className="flex flex-wrap items-baseline gap-x-3 font-mono text-xs">
                <span
                  className="font-medium"
                  style={{ color: PROGRAMME_COLOUR[p.programme] }}
                >
                  {PROGRAMME_SHORT[p.programme]} {p.year}
                </span>
                <span className="text-dust">{p.org}</span>
              </p>

              <h3 className="mt-4 text-display-md font-semibold tracking-tightest text-balance">
                {p.name}
              </h3>

              {/* What they built, not an adjective about them. A specific sentence
                  is the only part of an entry a reader cannot get from the badge. */}
              <p className="measure mt-5 text-body-lg text-haze">{p.work}</p>

              <p className="mt-6 font-mono text-xs text-dust">
                {PROGRAMME_NAME[p.programme]}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                {p.url && (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="tap inline-block font-mono text-xs text-accent hover:brightness-125"
                  >
                    See the work ↗
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
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
