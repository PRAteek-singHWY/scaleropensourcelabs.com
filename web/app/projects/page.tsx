// PAGE 2 — PROJECTS.
//
// Three clearly separated fields, never one mixed grid. The reasoning is in
// content/projects.ts: they answer three different questions, and putting them in one
// grid at one weight lets the weakest claim (a side project we assigned ourselves)
// borrow the credibility of the strongest (code a stranger merged into their own
// repository).
//
// The order is deliberate and it is not strongest-first. Build days come first
// because this page's reader is deciding whether there is anything here for them
// THIS WEEK, and the answer to that is a build day, not an upstream contribution
// from last year. The proof comes third, where it lands as evidence for a decision
// the reader has already started making.

import type { Metadata } from "next";
import Duo from "@/components/Duo";
import Doodle from "@/components/Doodle";
import Eyebrow from "@/components/Eyebrow";
import ProofPanel from "@/components/ProofPanel";
import NextAction from "@/components/NextAction";
import { JOIN_HREF } from "@/content/site";
import {
  projectTotals,
  publishedBuildDay,
  publishedClubRepos,
  publishedUpstream,
} from "@/content/projects";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "What the club is building in its build days, the repositories it maintains, and the pull requests its members have landed in projects outside the university.",
};

export default function Projects() {
  const buildDay = publishedBuildDay();
  const clubRepos = publishedClubRepos();
  const upstream = publishedUpstream();
  const t = projectTotals();

  return (
    <main id="main">
      <header className="section page-top pb-4 pt-20 sm:pt-24">
        <p className="flex items-center gap-2">
          <span className="chip">Projects</span>
          <Doodle kind="squiggle" className="h-5 w-8 text-accent" />
        </p>
        <h1 className="mt-7 font-display text-display-xl uppercase leading-[0.9] tracking-tightest">
          Three kinds of <span className="tone">work</span>
        </h1>
        <p className="measure mt-7 text-body-lg text-haze">
          Kept apart on purpose. What we run on a Saturday, what the club maintains
          all year, and what our members got merged into somebody else&apos;s
          repository are three different claims, and the last one is the only one that
          needed a stranger&apos;s agreement.
        </p>
      </header>

      {/* ---- 1. Build days -------------------------------------------------- */}
      <section
        id="build-days"
        className="section pt-20 sm:pt-24"
        aria-label="Build day projects"
      >
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-seam pb-5">
          <div>
            <p className="label">Running now</p>
            <Duo
              className="mt-4 text-display-lg"
              lead="Build day projects."
              trail="Turn up and pick one."
            />
          </div>
          {buildDay.length > 0 && (
            <p className="font-mono text-sm tabular-nums text-dust">
              {buildDay.length} project{buildDay.length === 1 ? "" : "s"}
            </p>
          )}
        </div>

        <p className="measure mt-7 text-body-lg text-haze">
          These are the projects people are actually working on in build days. Every
          card names the person to talk to and links an issue sized for somebody who
          has never done this before.
        </p>

        {buildDay.length === 0 ? (
          <div className="mt-12 rounded-tile border border-dashed border-seam px-8 py-14 text-center">
            <p className="text-display-md font-semibold">
              Nothing listed for this cycle yet.
            </p>
            <p className="measure mx-auto mt-4 text-body text-haze">
              A card only goes up once its good-first-issue link resolves to genuinely
              open, genuinely beginner-sized issues. A promise that leads to an empty
              issue list is worse than an empty section.
            </p>
          </div>
        ) : (
          <ul className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {buildDay.map((p) => (
              <li
                key={p.name}
                className="flex flex-col rounded-tile border border-seam bg-raise p-7"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-display-md uppercase leading-none tracking-[-0.005em]">
                    {p.name}
                  </h3>
                  {/* NOT shrink-0. It was, and a long value forced this flex row
                      wider than the phone viewport — measured at 318px, taking the
                      document to 486px against 390px. shrink-0 is only safe on text
                      whose length is bounded, and content from a data file never is. */}
                  {p.size && (
                    <span className="min-w-0 text-right font-mono text-[11px] uppercase tracking-[0.16em] text-dust">
                      {p.size}
                    </span>
                  )}
                </div>

                <p className="mt-4 text-body text-ink">{p.problem}</p>

                <ul className="mt-5 flex flex-wrap gap-2">
                  {p.stack.map((s) => (
                    <li
                      key={s}
                      className="rounded-md border border-seam bg-sunk px-2.5 py-1 font-mono text-[11px] text-haze"
                    >
                      {s}
                    </li>
                  ))}
                </ul>

                <dl className="mt-auto grid gap-4 border-t border-seam pt-5 sm:grid-cols-2">
                  <div>
                    <dt className="label">Maintainer</dt>
                    <dd className="mt-1.5 text-sm text-ink">
                      {p.maintainerGithub ? (
                        <a
                          href={`https://github.com/${p.maintainerGithub}`}
                          target="_blank"
                          rel="noreferrer"
                          className="tap transition-colors hover:text-accent"
                        >
                          {p.maintainer} ↗
                        </a>
                      ) : (
                        p.maintainer
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="label">Start here</dt>
                    <dd className="mt-1.5 text-sm">
                      {p.goodFirstIssue ? (
                        <a
                          href={p.goodFirstIssue}
                          target="_blank"
                          rel="noreferrer"
                          className="tap font-mono text-xs text-accent transition hover:brightness-125"
                        >
                          Good first issue ↗
                        </a>
                      ) : (
                        <span className="font-mono text-xs text-dust">
                          Ask on the day
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- 2. Club repositories ------------------------------------------- */}
      <section
        id="club-repos"
        className="band section pb-24 pt-24 sm:pb-32 sm:pt-32"
        aria-label="Club infrastructure and flagship repositories"
      >
        <div className="border-b border-seam pb-5">
          <p className="label">Ours, all year</p>
          <Duo
            className="mt-4 max-w-3xl text-display-lg"
            lead="The repositories the club owns."
            trail="Including this website."
          />
        </div>

        <p className="measure mt-7 text-body-lg text-haze">
          Longer-lived than a build-day project and maintained by the club rather than
          by one person. If you want a first merged pull request with the shortest
          possible feedback loop, start here — the maintainer reviewing it is{" "}
          <span className="mark">somebody you can find in the lab</span>.
        </p>

        <ul className="mt-12 space-y-4">
          {clubRepos.map((r) => (
            <li
              key={r.repo}
              className="rounded-panel border border-seam bg-raise p-7 sm:p-9"
            >
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-12">
                <div>
                  <Eyebrow tone="merged">Club maintained</Eyebrow>
                  <div className="mt-3">
                  <a
                    href={r.repo}
                    target="_blank"
                    rel="noreferrer"
                    className="tap group inline-flex items-baseline gap-2 font-mono text-display-md text-ink transition-colors duration-300 ease-glide hover:text-accent"
                  >
                    {r.name}
                    <span
                      aria-hidden
                      className="text-dust transition-transform duration-300 ease-glide group-hover:translate-x-1"
                    >
                      ↗
                    </span>
                  </a>
                  </div>

                  <p className="measure mt-5 text-body text-haze">{r.what}</p>

                  {r.whyStartHere && (
                    <p className="measure mt-4 flex gap-3 text-body text-ink">
                      <Doodle
                        kind="sparkle"
                        className="mt-1 h-4 w-4 shrink-0 text-accent"
                      />
                      {r.whyStartHere}
                    </p>
                  )}

                  <ul className="mt-6 flex flex-wrap gap-2">
                    {r.stack.map((s) => (
                      <li
                        key={s}
                        className="rounded-md border border-seam bg-sunk px-2.5 py-1 font-mono text-[11px] text-haze"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col gap-3 lg:border-l lg:border-seam lg:pl-10">
                  {r.goodFirstIssue && (
                    <a
                      href={r.goodFirstIssue}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary w-full"
                    >
                      Good first issues ↗
                    </a>
                  )}
                  {r.contributing && (
                    <a
                      href={r.contributing}
                      target="_blank"
                      rel="noreferrer"
                      className="tap text-center font-mono text-xs text-haze transition-colors hover:text-accent"
                    >
                      Read CONTRIBUTING.md ↗
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- 3. Upstream ---------------------------------------------------- */}
      <section
        id="in-the-wild"
        className="section pt-24 sm:pt-32"
        aria-label="Member contributions to external projects"
      >
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-seam pb-5">
          <div>
            <p className="label">In the wild</p>
            <Duo
              className="mt-4 text-display-lg"
              lead="Merged into somebody else's repo."
              trail="Which is the only claim that counts."
            />
          </div>
          {upstream.length > 0 && (
            <p className="font-mono text-sm tabular-nums text-dust">
              {t.orgs} org{t.orgs === 1 ? "" : "s"} · {t.contributors} member
              {t.contributors === 1 ? "" : "s"}
            </p>
          )}
        </div>

        <p className="measure mt-7 text-body-lg text-haze">
          Nobody here can award these to themselves. A maintainer with no reason to be
          kind to us read the diff and agreed to it. Every card links the repository —
          open it and check the commit history.
        </p>

        {upstream.length === 0 ? (
          <div className="mt-12 rounded-tile border border-dashed border-seam px-8 py-14 text-center">
            <p className="text-display-md font-semibold">Nothing published yet.</p>
            <p className="measure mx-auto mt-4 text-body text-haze">
              This fills in as members land work upstream. Each entry carries a link to
              the merged pull request and numbers read from GitHub rather than
              estimated.
            </p>
          </div>
        ) : (
          <>
            {/* The section's lead visual is the evidence itself. There is no image to
                put here, and a stock photo of somebody at a laptop on a page whose
                whole argument is "every claim links to a source" would undercut the
                argument it decorated. */}
            <ProofPanel />

            <ul className="mt-14 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {upstream.map((p) => (
                <li
                  key={p.repo}
                  className="flex flex-col rounded-tile border border-seam bg-raise p-7"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* The org, set as type in a bordered plate rather than as a
                        logo. Their trademark, and the site's CSP blocks remote
                        images anyway — see content/projects.ts. */}
                    <span className="rounded-md border border-seam bg-sunk px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-haze">
                      {p.org}
                    </span>
                    {p.tag ? (
                      <Eyebrow tone={p.tag.tone}>{p.tag.label}</Eyebrow>
                    ) : (
                      <Eyebrow>Contribution</Eyebrow>
                    )}
                  </div>

                  <div className="mt-4">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="tap group inline-flex items-baseline gap-2 font-mono text-body-lg text-ink transition-colors duration-300 ease-glide hover:text-accent"
                  >
                    {p.repo}
                    <span
                      aria-hidden
                      className="text-dust transition-transform duration-300 ease-glide group-hover:translate-x-1"
                    >
                      ↗
                    </span>
                  </a>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-haze">{p.what}</p>
                  <p className="mt-4 text-sm leading-relaxed text-ink">{p.did}</p>

                  {p.proof && (
                    <div className="mt-auto pt-8">
                      <Eyebrow>{p.proof.label}</Eyebrow>
                      <p className="mt-2 font-mono text-display-md font-medium text-accent">
                        {p.proof.value}
                      </p>
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-seam pt-4 font-mono text-xs text-dust">
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
                    {p.prUrl && (
                      <a
                        href={p.prUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="tap ml-auto text-accent transition hover:brightness-125"
                      >
                        The PR ↗
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="mt-10 font-mono text-[11px] leading-relaxed text-dust">
          Contributor counts and merge ratios were read from the GitHub API on
          2026-07-29. They move — open the repository if you want today&apos;s number.
        </p>
      </section>

      <NextAction
        eyebrow="Next"
        lead="Pick one and we'll sit with you."
        trail="Saturday works."
        body="The fastest route into any of these is a build day: you turn up with a laptop, pair with somebody who has done it, and leave with a branch. No experience assumed and nothing to install beforehand."
        href={`${JOIN_HREF}?path=build-day`}
        cta="Come to a build day"
      />
    </main>
  );
}
