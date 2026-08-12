// PAGE 4 — HALL OF FAME.
//
// Four sections, clearly labelled, never merged. The reasoning is in
// content/people.ts and it is an accuracy argument rather than a layout preference:
// a combined "our people" grid puts a core team member who has not been selected for
// anything next to a GSoC contributor at the same weight, which reads as though both
// were selected. Keeping the labels is what stops the page quietly inflating itself.
//
// Every person here appears with their own consent, enforced in the content module
// rather than asked for in a comment. See content/people.ts.

import type { Metadata } from "next";
import Duo from "@/components/Duo";
import Doodle from "@/components/Doodle";
import Portrait from "@/components/Portrait";
import Achievers from "@/components/Achievers";
import OrgWall from "@/components/OrgWall";
import NextAction from "@/components/NextAction";
import Team from "@/components/Team";
import { JOIN_HREF } from "@/content/site";
import {
  TEAM_SHADOWS,
  achieverStats,
  publishedAlumni,
  publishedCore,
  teamSize,
} from "@/content/people";

export const metadata: Metadata = {
  title: "Hall of Fame",
  description:
    "The club's current core team, its alumni and where they are now, members selected into international programmes, and the organisations our code has reached.",
};

export default function HallOfFame() {
  const core = publishedCore();
  const alumni = publishedAlumni();
  const stats = achieverStats();

  return (
    <main id="main">
      <header className="section page-top pb-4 pt-20 sm:pt-24">
        <p className="flex items-center gap-2">
          <span className="chip">Hall of Fame</span>
          <Doodle kind="sparkle" className="h-5 w-5 text-accent" />
        </p>
        <h1 className="mt-7 font-display text-display-xl uppercase leading-[0.9] tracking-tightest">
          The people, <span className="tone">not the logos</span>
        </h1>
        <p className="measure mt-7 text-body-lg text-haze">
          Who runs this now, who ran it before and where they went, who got selected by
          somebody outside this college, and which organisations our code actually
          reached. Four separate lists, because they are four different claims.
        </p>
      </header>

      {/* ---- 1. Current core team -------------------------------------------- */}
      <section
        id="core-team"
        className="section pt-20 sm:pt-24"
        aria-label="Current core team"
      >
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-seam pb-5">
          <div>
            <p className="label">Right now</p>
            <Duo
              className="mt-4 text-display-lg"
              lead="Current core team."
              trail="These are the people to ask."
            />
          </div>
          {/* Counts the CHART, which is directly beneath this and always renders,
              rather than `core.length`, which counts the consent-gated detail cards
              further down and would read as "0" on a section showing eight people. */}
          <p className="font-mono text-sm tabular-nums text-dust">{teamSize()}</p>
        </div>

        <p className="measure mt-7 text-body-lg text-haze">
          Students, not staff. {TEAM_SHADOWS.length} of them are shadows — understudies
          attached to one specific role, being trained to take it over at handover,
          which is the only reason a student club{" "}
          <span className="mark">survives its founders graduating</span>.
        </p>

        {/* A chart rather than a grid of faces, and the structure IS the content: a
            grid answers "who is important", and the question a reader of this section
            actually has is "who do I ask". The four leads have genuinely different
            remits — if you want your pull request reviewed you want the Repo
            Maintainer, not the President — and a flat grid destroys exactly that.

            It renders unconditionally, unlike the three lists below it. Holding an
            office is the club's own structure to state, so it needs no third party to
            confirm it and no `consented` gate; a photo is still the person's to give,
            and Portrait draws a monogram until they do. See content/people.ts. */}
        <Team />

        {/* The contactable detail — what each person owns, and how to reach them —
            which IS somebody's information to publish and therefore does wait on
            consent. No honest-empty panel under it: the chart above has already
            answered "who runs this", so a "not published yet" notice sitting beneath
            eight named people would read as a rendering fault rather than as the
            careful thing it is. */}
        {core.length > 0 && (
          <>
            <div className="mt-24 border-b border-seam pb-5">
              <p className="label">In detail</p>
              <Duo
                className="mt-4 text-display-lg"
                lead="What each of them owns."
                trail="Roles written as jobs, not as a title ladder."
              />
            </div>
            <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {core.map((m) => (
              <li
                key={m.name}
                className="flex flex-col overflow-hidden rounded-tile border border-seam bg-raise"
              >
                <div className="[container-type:inline-size]">
                  <Portrait
                    name={m.name}
                    photo={m.photo}
                    className="aspect-[4/5] w-full"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
                    {m.role}
                  </p>
                  <h3 className="mt-3 text-body-lg font-semibold leading-snug">
                    {m.name}
                  </h3>
                  <p className="mt-1 text-[13px] text-dust">{m.situation}</p>
                  <p className="mt-3 text-sm leading-relaxed text-haze">{m.owns}</p>

                  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-5">
                    {m.github && (
                      <a
                        href={`https://github.com/${m.github}`}
                        target="_blank"
                        rel="noreferrer"
                        className="tap font-mono text-xs text-haze transition-colors hover:text-accent"
                      >
                        GitHub ↗
                      </a>
                    )}
                    {m.linkedin && (
                      <a
                        href={m.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="tap font-mono text-xs text-haze transition-colors hover:text-accent"
                      >
                        LinkedIn ↗
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
            </ul>
          </>
        )}
      </section>

      {/* ---- 2. Alumni ------------------------------------------------------- */}
      <section
        id="alumni"
        className="band section pb-24 pt-24 sm:pb-32 sm:pt-32"
        aria-label="Alumni and past core members"
      >
        <div className="border-b border-seam pb-5">
          <p className="label">Before us</p>
          <Duo
            className="mt-4 max-w-3xl text-display-lg"
            lead="Alumni, and where they went."
            trail="The column that answers 'does this lead anywhere'."
          />
        </div>

        {alumni.length === 0 ? (
          <EmptyPanel
            title="Not published yet."
            body="Where somebody works is their information to share, so each row waits on that person. It is also the row most tempting to inflate, which is the other reason it waits."
          />
        ) : (
          <div className="mt-12 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <caption className="sr-only">
                Past core team members, the batch they graduated in, the role they
                held, and where they are now.
              </caption>
              <thead>
                <tr className="border-b border-seam">
                  {["Name", "Batch", "Role held", "Now at", ""].map((h, i) => (
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
                {[...alumni]
                  .sort((a, b) => b.batch.localeCompare(a.batch) || a.name.localeCompare(b.name))
                  .map((a) => (
                    <tr
                      key={`${a.name}-${a.batch}`}
                      className="border-b border-seam/60 align-top transition-colors last:border-0 hover:bg-raise/60"
                    >
                      <th scope="row" className="px-3 py-4 text-left font-medium text-ink">
                        {a.name}
                        {a.note && (
                          <span className="mt-1 block font-normal text-[13px] text-haze">
                            {a.note}
                          </span>
                        )}
                      </th>
                      <td className="px-3 py-4 font-mono text-xs tabular-nums text-haze">
                        {a.batch}
                      </td>
                      <td className="px-3 py-4 text-haze">{a.roleHeld}</td>
                      <td className="px-3 py-4 text-ink">{a.nowAt}</td>
                      <td className="px-3 py-4 text-right">
                        {a.linkedin ? (
                          <a
                            href={a.linkedin}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-xs text-accent transition hover:brightness-125"
                          >
                            LinkedIn ↗
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
        )}
      </section>

      {/* ---- 3. Achievers ---------------------------------------------------- */}
      <section
        id="achievers"
        className="section pt-24 sm:pt-32"
        aria-label="Members selected into programmes and hackathon winners"
      >
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-seam pb-5">
          <div>
            <p className="label">Selected</p>
            <Duo
              className="mt-4 text-display-lg"
              lead="Somebody else picked them."
              trail="A club cannot award this to itself."
            />
          </div>
          {stats.total > 0 && (
            <p className="font-mono text-sm tabular-nums text-dust">
              {stats.total} across {stats.orgs} org{stats.orgs === 1 ? "" : "s"}
            </p>
          )}
        </div>

        <p className="measure mt-7 text-body-lg text-haze">
          GSoC, LFX Mentorship, C4GT, Outreachy, Summer of Bitcoin — competitive
          international selection processes run by other organisations — plus hackathon
          placings, which are third-party judgements of the same kind.
        </p>

        <Achievers />
      </section>

      {/* ---- 4. Global representation ---------------------------------------- */}
      <section
        id="representation"
        className="band section pb-24 pt-24 sm:pb-32 sm:pt-32"
        aria-label="Organisations our members have reached"
      >
        <div className="border-b border-seam pb-5">
          <p className="label">Reach</p>
          <Duo
            className="mt-4 max-w-3xl text-display-lg"
            lead="Where our code ended up."
            trail="Grouped by what the claim actually is."
          />
        </div>

        <p className="measure mt-7 text-body-lg text-haze">
          Organisation names as type rather than logos — those are their trademarks and
          using them would imply an endorsement nobody granted. There is no world map
          here either, on purpose:{" "}
          <span className="mark">
            a handful of dots on a globe understates real work
          </span>
          , and scaling them until it looks impressive would be drawing data we do not
          have.
        </p>

        <OrgWall />
      </section>

      <NextAction
        eyebrow="Next"
        lead="Every name here started with one small patch."
        trail="Yours is available."
        body="Nobody on this page arrived already knowing how to do it. The first contribution sprint gives you a checklist, a club repo, and a reviewer who knows you are new."
        href={`${JOIN_HREF}?path=first-contribution`}
        cta="Start your first contribution"
      />
    </main>
  );
}

/** Shared honest-empty state. Repeated markup in three places was the alternative. */
function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-12 rounded-tile border border-dashed border-seam px-8 py-14 text-center">
      <p className="text-display-md font-semibold">{title}</p>
      <p className="measure mx-auto mt-4 text-body text-haze">{body}</p>
    </div>
  );
}
