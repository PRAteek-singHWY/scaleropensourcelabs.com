// The achievers grid: everyone selected by somebody outside this college.
//
// This replaced a WebGL solar system in which each selection orbited as a planet and
// a rocket flew past on scroll. The honest accounting of that version: about a
// thousand lines, a 15,000px section, a three.js dependency and a scroll mechanic
// that could only be verified by rendering it — to say one thing, which is that these
// people got in.
//
// It then went through a one-person-per-row feature layout, which is also recorded
// here because it was a worse mistake than the 3D: at 440px a portrait plus its text
// filled the viewport, so seeing fourteen people meant scrolling fourteen screens,
// which buries the very argument the count is making. A grid says "these are all of
// them" at a glance. That is the whole job.
//
// ZERO JavaScript. No state, no scroll listener, no canvas — a server component, so
// the entire section is HTML and CSS and cannot fail in a way HTML cannot express.
//
// There are deliberately NO 01/02/03 markers and no sorting by prestige. Order
// carries no meaning in a list of people, and numbering them would imply a ranking
// that does not exist.
//
// Programme names are set as type and never as logos — those marks belong to Google,
// the Linux Foundation and others, and using them implies an endorsement nobody
// granted. Since the per-programme colour palette was retired (see the note in
// content/programs.ts for the measurements that retired it), the programme name IS
// the identifier, which is both what we are entitled to use and what a colourblind
// reader was relying on anyway.

import Portrait from "@/components/Portrait";
import Eyebrow from "@/components/Eyebrow";
import { PROGRAMME_NAME, PROGRAMME_SHORT } from "@/content/programs";
import { publishedAchievers, type Achiever } from "@/content/people";

/** The short identifier and the full name, for either kind of achievement. */
function names(a: Achiever): { short: string; full: string } {
  if (a.achievement.kind === "programme") {
    return {
      short: PROGRAMME_SHORT[a.achievement.programme],
      full: PROGRAMME_NAME[a.achievement.programme],
    };
  }
  return { short: a.achievement.event, full: a.achievement.event };
}

export default function Achievers() {
  const people = publishedAchievers();

  if (people.length === 0) {
    return (
      <div className="mt-12 rounded-tile border border-dashed border-seam px-8 py-16 text-center">
        <p className="text-display-md font-semibold">Nothing published here yet.</p>
        <p className="measure mx-auto mt-4 text-body text-haze">
          This section fills in as members are selected. Every entry needs the
          member&apos;s own consent and a link to the public record — which is why it
          is empty rather than optimistic.
        </p>
      </div>
    );
  }

  return (
    <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {people.map((a) => {
        const n = names(a);
        return (
          <li
            key={`${a.name}-${n.short}-${a.year}`}
            className="flex flex-col overflow-hidden rounded-tile border border-seam bg-raise"
          >
            {/* A container query unit is used for the monogram fallback's type size,
                so `container-type` has to be established on the element that sizes
                it. Without this the fallback initials compute against the viewport
                and render enormous on a phone. */}
            <div className="[container-type:inline-size]">
              <Portrait
                name={a.name}
                photo={a.photo}
                className="aspect-[4/5] w-full"
              />
            </div>

            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-baseline justify-between gap-3">
                <Eyebrow tone={a.achievement.kind === "programme" ? "merged" : "neutral"}>
                  {n.short}
                </Eyebrow>
                <span className="font-mono text-xs tabular-nums text-dust">
                  {a.year}
                </span>
              </div>

              <h3 className="mt-3 text-body-lg font-semibold leading-snug">
                {a.name}
              </h3>
              <p className="mt-1 text-[13px] text-haze">{a.org}</p>
              <p className="mt-3 text-sm leading-relaxed text-haze">{a.work}</p>

              <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-5">
                {a.url && (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="tap font-mono text-xs text-accent transition hover:brightness-125"
                  >
                    Proof ↗
                  </a>
                )}
                {a.github && (
                  <a
                    href={`https://github.com/${a.github}`}
                    target="_blank"
                    rel="noreferrer"
                    className="tap font-mono text-xs text-haze transition-colors hover:text-accent"
                  >
                    GitHub ↗
                  </a>
                )}
                {/* The full programme name, for a reader who does not recognise the
                    acronym. Every acronym on this site resolves somewhere visible. */}
                {n.full !== n.short && (
                  <span className="ml-auto text-[11px] text-dust">{n.full}</span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
