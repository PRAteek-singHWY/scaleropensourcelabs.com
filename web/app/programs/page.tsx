// PAGE 3 — PROGRAMS.
//
// A dedicated field per programme, split into two tiers, and the split is the most
// useful thing on the page. `paid` programmes run a selection and pay a stipend;
// `open` ones you simply join. A first-year reading a flat list of seven concludes
// that all of it is years away, when in fact two of them are open to them this month
// — and those two are how you get ready for the other five.
//
// Colour carries the tier and nothing else. Programme identity is the programme's own
// name set as type, which is both what we are entitled to use for somebody else's
// trademark and what survives a colourblind reader. The per-programme palette that
// used to do this job was retired after measurement; content/programs.ts carries the
// numbers.

import type { Metadata } from "next";
import Duo from "@/components/Duo";
import Doodle from "@/components/Doodle";
import NextAction from "@/components/NextAction";
import { JOIN_HREF } from "@/content/site";
import { achieversFor } from "@/content/people";
import {
  CALENDAR,
  HACKTOBERFEST_CAVEAT,
  OPEN_ENTRY,
  PAID,
  PROGRAMME_NAME,
  PROGRAMME_SHORT,
  type ProgrammeInfo,
} from "@/content/programs";

export const metadata: Metadata = {
  title: "Programs",
  description:
    "GSoC, LFX Mentorship, Outreachy, C4GT, Summer of Bitcoin, GSSoC and Hacktoberfest — what each one is, when it runs, what it pays, and how to start preparing.",
};

/** One programme's field. Shared by both tiers so they cannot drift apart. */
function ProgrammeField({ p }: { p: ProgrammeInfo }) {
  const paid = p.tier === "paid";
  const ours = achieversFor(p.key);
  return (
    <li className="bg-raise p-8 sm:p-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
        <div>
          {/* The name as type, never the official mark. */}
          <h3
            className={`font-display text-display-md uppercase leading-none tracking-[-0.005em] ${
              paid ? "text-accent" : "text-ink"
            }`}
          >
            {PROGRAMME_SHORT[p.key]}
          </h3>
          {/* Suppressed when it would only repeat the headline — Hacktoberfest's
              short and full names are the same string. */}
          {PROGRAMME_NAME[p.key] !== PROGRAMME_SHORT[p.key] && (
            <p className="mt-2.5 font-mono text-xs leading-relaxed text-dust">
              {PROGRAMME_NAME[p.key]}
            </p>
          )}

          {/* The tier, stated in words as well as carried by the colour. The
              colour is never the only signal. */}
          <p
            className={`mt-4 inline-block rounded-md border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] ${
              paid
                ? "border-accent/40 text-accent"
                : "border-seam text-haze"
            }`}
          >
            {paid ? "Paid · selective" : "Open entry"}
          </p>

          <div className="mt-5">
            <a
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="tap block font-mono text-xs text-accent transition hover:brightness-125"
            >
              Official site ↗
            </a>
          </div>
        </div>

        <dl className="grid gap-6 sm:grid-cols-2">
          {(
            [
              ["What it is", p.what],
              ["Who gets in", p.who],
              ["Timeline", p.timeline],
              [paid ? "What it pays" : "What you get", p.pays],
            ] as const
          ).map(([k, v]) => (
            <div key={k}>
              <dt className="label">{k}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-haze">{v}</dd>
            </div>
          ))}

          {/* Who from the club has actually done this.
              DERIVED from the Hall of Fame's achievers rather than written here, so the
              two pages cannot disagree — see achieversFor() in content/people.ts. When
              nobody has, it says so plainly instead of going quiet: an empty field on
              GSoC reads as an oversight, whereas "nobody yet, and that is the opening"
              is both true and a better argument for applying. */}
          <div className="border-t border-seam pt-5 sm:col-span-2">
            <dt className="label">Who from the club has done it</dt>
            <dd className="mt-2 text-sm leading-relaxed">
              {ours.length > 0 ? (
                <ul className="flex flex-wrap gap-x-5 gap-y-2">
                  {ours.map((a) => (
                    <li key={`${a.name}-${a.year}`} className="text-ink">
                      {a.url ? (
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline decoration-seam underline-offset-4 transition-colors hover:text-accent"
                        >
                          {a.name}
                        </a>
                      ) : (
                        a.name
                      )}
                      {/* A literal space, not just the margin. `ml-2` separates them
                          visually but leaves no whitespace in the text, so the
                          accessible name and anything copied out of the page read
                          "Placeholder EightExample Foundation". */}{" "}
                      <span className="font-mono text-xs text-dust">
                        {a.org} · {a.year}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                // TIER-AWARE, because one sentence cannot serve both. The first
                // version said "the first person from this college to get in has not
                // been picked" for every programme — which is meaningless for
                // Hacktoberfest, whose own row two lines above says "no selection, no
                // application". Nobody picks you; you turn up. Copy that contradicts
                // the field beside it is worse than no copy.
                <span className="text-haze">
                  {paid
                    ? "Nobody yet. Which means the first person from this college to get in has not been picked — and there is no queue."
                    : "Nobody has logged one yet. Nothing is stopping you: there is no selection here, so it comes down to turning up when it opens."}
                </span>
              )}
            </dd>
          </div>

          {/* The actionable one, given its own full-width row because it is the only
              field on this page that tells the reader to do something. */}
          <div className="border-t border-seam pt-5 sm:col-span-2">
            <dt className="label flex items-center gap-2 text-accent">
              Start preparing
              <Doodle kind="arrow" className="h-3.5 w-6" />
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-ink">
              {p.startPreparing}
            </dd>
          </div>
        </dl>
      </div>
    </li>
  );
}

export default function Programs() {
  return (
    <main id="main">
      <header className="section page-top pb-4 pt-20 sm:pt-24">
        <p className="flex items-center gap-2">
          <span className="chip">Programs</span>
          <Doodle kind="sparkle" className="h-5 w-5 text-accent" />
        </p>
        <h1 className="mt-7 font-display text-display-xl uppercase leading-[0.9] tracking-tightest">
          People pay you <span className="tone">to learn this</span>
        </h1>
        <p className="measure mt-7 text-body-lg text-haze">
          Seven programmes our members target. Five run a selection and pay a stipend;
          two you can simply join, and those two are how most people get ready for the
          other five. Almost nobody applies to any of them, and the usual reason is
          that nobody told them these existed.
        </p>
      </header>

      {/* ---- Open entry first ------------------------------------------------
          Deliberately ahead of the paid tier, which is the opposite of
          strongest-first. GSoC is the impressive one and it is also eight months of
          preparation away; a first-year who reads it first concludes the page is not
          for them and stops. The two things they can do this month go at the top. */}
      <section
        id="open-entry"
        className="section pt-20 sm:pt-24"
        aria-label="Open-entry programmes"
      >
        <div className="border-b border-seam pb-5">
          <p className="label">Start here</p>
          <Duo
            className="mt-4 max-w-3xl text-display-lg"
            lead="No selection, no application."
            trail="You can do these now."
          />
        </div>
        <p className="measure mt-7 text-body-lg text-haze">
          Neither of these pays and neither carries much weight on a resume. They are
          still where almost everyone should start, because they teach the mechanics —
          fork, branch, review, merge — somewhere the stakes are zero.
        </p>

        <ul className="mt-12 space-y-px overflow-hidden rounded-panel bg-seam">
          {OPEN_ENTRY.map((p) => (
            <ProgrammeField key={p.key} p={p} />
          ))}
        </ul>

        {/* The honest caveat, next to the thing it is about rather than in a footnote
            nobody reaches. */}
        <p className="mt-8 flex gap-4 rounded-tile border border-seam bg-sunk p-6 text-body text-haze">
          <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />
          {HACKTOBERFEST_CAVEAT}
        </p>
      </section>

      {/* ---- Paid tier ------------------------------------------------------- */}
      <section
        id="paid"
        className="band section pb-24 pt-24 sm:pb-32 sm:pt-32"
        aria-label="Paid, selective programmes"
      >
        <div className="border-b border-seam pb-5">
          <p className="label">Paid and competitive</p>
          <Duo
            className="mt-4 max-w-3xl text-display-lg"
            lead="Somebody else runs the selection."
            trail="Which is exactly why it counts."
          />
        </div>
        <p className="measure mt-7 text-body-lg text-haze">
          Five programmes that pay a stipend to people with no professional experience.
          You do not need a degree, a CGPA or a referral for any of them — you need a
          few months of visible contribution before the window opens.
        </p>

        <ul className="mt-12 space-y-px overflow-hidden rounded-panel bg-seam">
          {PAID.map((p) => (
            <ProgrammeField key={p.key} p={p} />
          ))}
        </ul>
      </section>

      {/* ---- The reverse clock ---------------------------------------------- */}
      <section
        id="timeline"
        className="section pt-24 sm:pt-32"
        aria-label="When to start preparing"
      >
        <p className="chip">The reverse clock</p>
        <Duo
          className="mt-6 max-w-4xl text-display-lg"
          lead="These are decided months before they open."
          trail="Which is the whole trick."
        />
        <p className="measure mt-7 text-body-lg text-haze">
          Organisations pick contributors they already recognise. By the time a
          proposal window opens, the people who get in have been committing to that
          repository since autumn. Waiting a year does not delay you by a year — it
          costs you the cycle. No exact dates below, because they move every year and a
          stale date on this site would cost more than it buys.
        </p>

        <div className="mt-12 overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <caption className="sr-only">
              Each programme&apos;s application window, when to start preparing, and
              what to do first.
            </caption>
            <thead>
              <tr className="border-b border-seam">
                {["Programme", "Window", "Opens", "Start prepping", "What you do first"].map(
                  (h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-3 py-3 text-left font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-dust"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {CALENDAR.map((r) => (
                <tr
                  key={r.programme}
                  className="border-b border-seam/60 align-top last:border-0"
                >
                  <th scope="row" className="px-3 py-5 text-left font-medium text-ink">
                    {PROGRAMME_SHORT[r.programme]}
                  </th>
                  <td className="px-3 py-5 font-mono text-xs text-accent">
                    {r.window}
                  </td>
                  <td className="px-3 py-5 text-haze">{r.opens}</td>
                  <td className="px-3 py-5 font-mono text-xs text-ember">
                    {r.prepFrom}
                  </td>
                  <td className="max-w-sm px-3 py-5 text-haze">{r.doingNow}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <NextAction
        eyebrow="Next"
        lead="Six months of commits beats a good proposal."
        trail="Start the six months."
        body="The prep cohort meets weekly: you pick two target organisations, get a patch merged in each before applications open, and have your proposal torn apart by people who wrote a successful one recently."
        href={`${JOIN_HREF}?path=program-track`}
        cta="Join the prep cohort"
      />
    </main>
  );
}
