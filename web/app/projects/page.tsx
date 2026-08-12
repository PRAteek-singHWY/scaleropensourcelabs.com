import type { Metadata } from "next";
import Doodle from "@/components/Doodle";
import Duo from "@/components/Duo";
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

// THE PROJECTS PAGE. Where the club's code actually went.
//
// This is the page a maintainer or a sceptical student lands on, and it is the one
// with the least room for adjectives: every card here terminates in a link to a
// merged pull request or a public repository. `published` gates each entry, so an
// unverifiable claim cannot reach the grid even by accident — see the note at the
// head of club.ts.

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Merged pull requests, club repositories, and the upstream projects our members contribute to.",
};

export default function Projects() {
  // ONE SET OF TOTALS, from content/projects.ts — the wider inventory: build-day
  // projects, club repositories, and every upstream contribution including the
  // ones with no verified rank attached.
  //
  // There used to be two. club.ts's curated PROJECTS carried their own totals()
  // and fed a second upstream section at the foot of this page, so `t` and `pt`
  // sat in one scope counting genuinely different sets — precisely how a headline
  // ends up quoting the wrong figure. That section is gone and so is the hazard;
  // club.ts still backs the hero and the hall, which is where its curation earns
  // its keep.
  const pt = projectTotals();
  const buildDay = publishedBuildDay();
  const clubRepos = publishedClubRepos();
  const upstream = publishedUpstream();

  return (
    <main id="main">
      {/* Every route opens with a title block, which the single-page site did not
          need — there, the hero was the title and everything under it was one
          continuous argument. A route has to say where you are within a screen of
          arriving, and `.page-top` is what clears the floating nav. Do not add a
          pt-* utility beside it; see the note over `.page-top` in globals.css. */}
      <header className="section page-top pb-4" data-reveal-group>
        <p className="chip">Upstream work</p>
        <Duo
          as="h1"
          className="mt-6 max-w-4xl text-display-xl"
          lead="Where our code went."
          trail="Every line links upstream."
        />
        <p className="measure mt-4 text-body-lg text-haze">
          Not a portfolio of things we built for ourselves. These are contributions
          into projects other people maintain, which is the only kind that has to
          survive somebody else&apos;s review.
        </p>
      </header>


      {/* ---- 1. Build days -------------------------------------------------- */}
      <section
        id="build-days"
        className="section pt-20 sm:pt-24"
        aria-label="Build day projects"
        data-reveal-group
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
          <ul className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-2" data-reveal-group>
            {buildDay.map((p) => (
              <li
                key={p.name}
                className="lift flex flex-col rounded-tile border border-seam bg-raise p-7"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-display-md font-bold leading-[1.3] tracking-[-0.02em]">
                    {p.name}
                  </h3>
                  {/* NOT shrink-0. It was, and a long value forced this flex row
                      wider than the phone viewport — measured at 318px, taking the
                      document to 486px against 390px. shrink-0 is only safe on text
                      whose length is bounded, and content from a data file never is. */}
                  {p.size && (
                    <span className="min-w-0 text-right font-mono text-[13px] uppercase tracking-[0.16em] text-dust">
                      {p.size}
                    </span>
                  )}
                </div>

                {p.problem && (
                  <p className="mt-4 text-body text-ink">{p.problem}</p>
                )}

                {/* Each optional row is gated on its own data. A holding card with
                    no maintainer and no stack should be a title and nothing else —
                    an empty label under a rule reads as a rendering bug. */}
                {p.stack.length > 0 && (
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {p.stack.map((s) => (
                      <li
                        key={s}
                        className="rounded-md border border-seam bg-sunk px-2.5 py-1 font-mono text-[13px] text-haze"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                )}

                {p.maintainer && (
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
                )}
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
        data-reveal-group
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

        <ul className="mt-12 space-y-4" data-reveal-group>
          {clubRepos.map((r) => (
            <li
              key={r.repo}
              className="lift rounded-panel border border-seam bg-raise p-7 sm:p-9"
            >
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-12">
                <div>
                  <Eyebrow tone="merged">Club maintained</Eyebrow>
                  <div className="mt-3">
                  {/* `inline-flex` BECAME `flex` AND THE NAME CAN NOW BREAK, because
                      this link overflowed the viewport at 390px once it was rendered
                      in this design's type scale rather than the one it was written
                      for. `text-display-md` clamps to 1.9375rem here against 1.625rem
                      there — about 5px larger at the top of the ramp — and a repo name
                      like "scaleropensourcelabs.com" is one unbreakable token, so it
                      measured 375px inside a 390px viewport with padding either side
                      and took the document to 420px.

                      It was invisible in every obvious way: `body { overflow-x: hidden }`
                      clips the strip rather than showing a scrollbar, and the smoke
                      test's overflow check runs at desktop width. The QA sweep at 390px
                      is what caught it.

                      `break-all` rather than `break-words`, and that is the part that
                      matters — `break-words` only breaks BETWEEN words, and there is no
                      space in a domain name to break at. `min-w-0` lets the flex item
                      shrink below its content width, which it will not do by default. */}
                  <a
                    href={r.repo}
                    target="_blank"
                    rel="noreferrer"
                    className="tap group flex min-w-0 items-baseline gap-2 break-all font-mono text-display-md font-medium text-ink transition-colors duration-300 ease-glide hover:text-accent"
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
                        className="rounded-md border border-seam bg-sunk px-2.5 py-1 font-mono text-[13px] text-haze"
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
        data-reveal-group
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
              {pt.orgs} org{pt.orgs === 1 ? "" : "s"} · {pt.contributors} member
              {pt.contributors === 1 ? "" : "s"}
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

            <ul className="mt-14 grid grid-cols-1 gap-4 lg:grid-cols-2" data-reveal-group>
              {upstream.map((p) => (
                <li
                  key={p.repo}
                  className="lift flex flex-col rounded-tile border border-seam bg-raise p-7"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* The org, set as type in a bordered plate rather than as a
                        logo. Their trademark, and the site's CSP blocks remote
                        images anyway — see content/projects.ts. */}
                    <span className="rounded-md border border-seam bg-sunk px-2.5 py-1 font-mono text-[13px] uppercase tracking-[0.14em] text-haze">
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

        <p className="mt-10 font-mono text-[13px] leading-relaxed text-dust">
          Contributor counts and merge ratios were read from the GitHub API on
          2026-07-29. They move — open the repository if you want today&apos;s number.
        </p>
      </section>

      {/* There was a second upstream section here — "Upstream work / Where our
          code went" — carrying its own ProofPanel and a carousel of the curated
          club.ts entries. It said the same thing as "In the wild" directly above,
          with the same panel and the same repository in it, so a reader scrolling
          past hit the OWASP/OpenCRE numbers twice in one screen and had to work
          out whether the second pass was new evidence. It was not. One upstream
          section, and the curated club.ts list feeds the hero and the hall. */}

      <NextAction
        eyebrow="Your turn"
        lead="Want your name in this list?"
        trail="It starts with one small pull request."
        body="Bring a laptop and a GitHub account. You do not need to be good yet — a first contribution is mostly about learning how the process works."
        href={JOIN_HREF}
        cta="Join the club"
      />
    </main>
  );
}
