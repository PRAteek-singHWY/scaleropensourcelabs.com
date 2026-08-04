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
      <div className="mt-14 rounded-tile border border-dashed border-seam px-8 py-16">
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
          <span className="font-display text-display-lg leading-none">
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
              <span className="ml-1.5 text-dust">×{count}</span>
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
          cubic-bezier(0, 0, 0.5, 1) — and only at the pointer, never on touch. */}
      <ul className="mt-14 grid gap-x-7 gap-y-12 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3">
        {people.map((p, i) => (
          <li key={`${p.name}-${p.programme}-${p.year}`}>
            <article className="group">
              <div className="[container-type:inline-size] overflow-hidden rounded-panel">
                <Portrait
                  name={p.name}
                  photo={p.photo}
                  priority={i < 3}
                  className="aspect-[4/5] w-full transition-transform duration-300 ease-apple motion-safe:group-hover:scale-[1.03]"
                />
              </div>

              {/* Programme and year as a chip: it is the credential, so it should
                  read as a badge rather than a caption. Ink on the programme colour
                  would need four more contrast pairs validated, so the chip carries
                  the brand yellow and the programme name is the text. */}
              <p className="mt-5">
                <span className="chip">
                  {PROGRAMME_SHORT[p.programme]} {p.year}
                </span>
              </p>

              <h3 className="mt-3.5 font-display text-display-md uppercase leading-[0.95] tracking-[-0.005em]">
                {p.name}
              </h3>

              <p className="mt-2 font-mono text-xs text-dust">{p.org}</p>

              <p className="mt-3 text-body text-haze">{p.work}</p>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                {p.url && (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="tap inline-block font-label text-sm uppercase tracking-[0.04em] text-accent hover:brightness-110"
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
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
