// Mentors.
//
// A student mentor is not a professor, and a page implying otherwise is detectable
// in one line. The programmes that handle peer mentorship credibly — Outreachy,
// GSoC, Recurse Center — all redefine authority away from rank: Outreachy states
// mentor eligibility purely as hours committed, GSoC defines a mentor by duty
// rather than qualification, and Recurse establishes seniority by naming an
// artifact, attaching a number, and stopping.
//
// So an entry here is: a named artifact, a public link proving it, an explicit
// boundary on what they are useful for, and a bounded availability. No adjectives
// describing the person. Count the adjectives applied to a human on Recurse's
// residents page and you get zero — every one is attached to a thing.
//
// The word "lifelong" never appears, despite being the brief. Asserting duration
// spends it and proves nothing; Techstars writes "more than a program — it's a
// lifelong network" and an engineer discounts the page on sight. Instead each entry
// records who mentored THEM. After two or three cohorts that renders as a visible
// lineage — the same name appearing as mentee in one row and mentor in another —
// which demonstrates durability and cannot be faked.

import {
  PROGRAMME_COLOUR,
  PROGRAMME_SHORT,
  publishedMentors,
} from "@/content/club";

export default function Mentors() {
  const mentors = publishedMentors();

  if (mentors.length === 0) {
    return (
      <div className="mt-14 rounded-[10px] border border-dashed border-seam px-8 py-16">
        <p className="text-display-md font-semibold">No mentors listed yet.</p>
        <p className="measure mt-4 text-body text-haze">
          Each entry needs that person&apos;s own permission, and a public link to
          the programme they came through. Nothing appears here on the strength of
          a description alone.
        </p>
      </div>
    );
  }

  const graduated = mentors.filter((m) =>
    /graduat/i.test(m.situation),
  ).length;

  return (
    <>
      {/* The durability claim, as a count rather than an adjective. If the number
          is small, the small number is still more persuasive than "lifelong". */}
      {graduated > 0 && (
        <p className="measure mt-7 text-body text-haze">
          {graduated} of the {mentors.length} mentors below have already graduated
          and still take office hours.
        </p>
      )}

      <div className="mt-14 space-y-px overflow-hidden rounded-[10px] bg-seam">
        {mentors.map((m) => (
          <article key={m.name} className="bg-raise p-8 sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[18rem_1fr] lg:gap-14">
              <div>
                <h3 className="text-body-lg font-semibold">{m.name}</h3>
                <p className="mt-1 text-sm text-haze">{m.situation}</p>

                {/* The credential. The link IS the authority — a programme named
                    without a public record behind it is just a claim. */}
                <p className="mt-5">
                  <span
                    className="font-mono text-sm font-medium"
                    style={{ color: PROGRAMME_COLOUR[m.credential.programme] }}
                  >
                    {PROGRAMME_SHORT[m.credential.programme]} {m.credential.year}
                  </span>
                  <span className="ml-2 font-mono text-sm text-dust">
                    {m.credential.org}
                  </span>
                </p>
                {m.credential.url && (
                  <a
                    href={m.credential.url}
                    target="_blank"
                    rel="noreferrer"
                    className="tap mt-2 inline-block font-mono text-xs text-accent hover:brightness-125"
                  >
                    Official record ↗
                  </a>
                )}
              </div>

              <div>
                <p className="measure text-body text-ink">
                  {m.shipped}{" "}
                  {m.shippedUrl && (
                    <a
                      href={m.shippedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="whitespace-nowrap font-mono text-xs text-accent hover:brightness-125"
                    >
                      the work ↗
                    </a>
                  )}
                </p>

                {/* The highest-value field, and the one almost nobody ships.
                    Naming the boundary of someone's authority is what makes the
                    claim inside it believable — and it is the only thing that
                    makes this section usable rather than decorative. */}
                <div className="mt-6">
                  <p className="label">Ask them about</p>
                  <ul className="mt-2.5 flex flex-wrap gap-x-2 gap-y-2">
                    {m.askAbout.map((a) => (
                      <li
                        key={a}
                        className="rounded-md border border-seam px-2.5 py-1 font-mono text-xs text-haze"
                      >
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-seam pt-5">
                  {/* A stated commitment, not a claimed disposition. Following
                      Outreachy, which lists mentor eligibility purely as hours. */}
                  <p className="text-sm text-haze">
                    <span className="label mr-2">Around</span>
                    {m.around}
                  </p>
                  {m.github && (
                    <a
                      href={`https://github.com/${m.github}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-haze hover:text-accent"
                    >
                      @{m.github}
                    </a>
                  )}
                </div>

                {m.mentoredBy && (
                  <p className="mt-4 font-mono text-xs text-dust">
                    Mentored by {m.mentoredBy}.
                  </p>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
