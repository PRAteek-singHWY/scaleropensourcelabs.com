import Hero from "@/components/hero/Hero";
import Duo from "@/components/Duo";
import Nav from "@/components/Nav";
import Carousel from "@/components/Carousel";
import Eyebrow from "@/components/Eyebrow";
import Hall from "@/components/hall/Hall";
import { PATH, PROJECTS, TRACKS, LINKS, totals } from "@/content/club";

// Fully static. No database, no auth, no API routes — the site is HTML plus one
// lazily-loaded WebGL scene, so it renders identically anywhere and there is
// nothing to attack.
//
// Everything after the hero is deliberately quiet. The 3D moment only reads as
// premium if what follows it is disciplined; a second spectacle cancels the first.

export default function Home() {
  const t = totals();
  const projects = PROJECTS.filter((p) => p.published);

  return (
    <>
      <Nav />
      <Hero />

      <main>
        {/* ---- The hall: selections into international programmes ----------
            Placed first because it is the strongest thing the club can say. A
            named student next to "GSoC 2026" is proof somebody else ran a
            selection and picked them; everything below is elaboration. */}
        <section id="hall" aria-label="Students selected into international programmes">
          <div className="section pt-28 sm:pt-40">
            <p className="label">Selected</p>
            <Duo
              className="mt-6 max-w-4xl text-display-lg font-semibold text-balance"
              lead="Somebody else picked them."
              trail="GSoC, LFX Mentorship, C4GT, Summer of Bitcoin."
            />
            <p className="measure mt-7 text-body-lg text-haze">
              These are competitive, international selection processes run by other
              organisations. Getting in is not something a club can award itself.
            </p>
          </div>
          <Hall />
        </section>

        {/* ---- Thesis ------------------------------------------------------ */}
        <section className="section pt-28 sm:pt-40">
          <p className="label">What this is</p>
          <Duo
            className="mt-6 max-w-4xl text-display-lg font-semibold text-balance"
            lead="A club is easy to start."
            trail="Getting a stranger to merge your code is not."
          />
          <div className="measure mt-8 space-y-5 text-body-lg text-haze">
            <p>
              Most student open-source groups measure attendance. We measure pull
              requests a maintainer accepted, because that is the only number
              somebody outside the room had to agree to.
            </p>
            <p>
              Everything on this page links to the upstream repository. If a claim
              here cannot be checked in one click, it should not be here.
            </p>
          </div>
        </section>

        {/* ---- Projects ---------------------------------------------------- */}
        <section
          id="projects"
          className="section pt-28 sm:pt-40"
          aria-label="Upstream work"
        >
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="label">Upstream work</p>
              <Duo
                as="h2"
                className="mt-6 text-display-lg font-semibold"
                lead="Where our code went."
                trail="Every line links upstream."
              />
            </div>
            {t.projects > 0 && (
              <p className="font-mono text-sm tabular-nums text-dust">
                {t.projects} project{t.projects === 1 ? "" : "s"} · {t.members}{" "}
                member{t.members === 1 ? "" : "s"}
              </p>
            )}
          </div>

          {projects.length === 0 ? (
            <div className="mt-12 rounded-[18px] border border-dashed border-seam px-8 py-16 text-center">
              <p className="text-display-md font-semibold">Nothing published yet.</p>
              <p className="measure mx-auto mt-4 text-body text-haze">
                This fills in as members land work upstream. Each card carries a link
                to the merged pull request.
              </p>
            </div>
          ) : (
            <Carousel label="Upstream contributions" className="mt-14">
              {projects.map((p) => (
                <article
                  key={p.repo}
                  data-card
                  /* 18px radius, measured off Apple's cards. */
                  className="flex w-[19rem] shrink-0 snap-start flex-col rounded-[18px] border border-seam bg-hull p-7 sm:w-[23rem]"
                >
                  {p.tag ? (
                    <Eyebrow tone={p.tag.tone}>{p.tag.label}</Eyebrow>
                  ) : (
                    <Eyebrow>Contribution</Eyebrow>
                  )}

                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group mt-3 inline-flex items-baseline gap-2 font-mono text-body-lg text-rime transition-colors duration-300 ease-glide hover:text-plasma"
                  >
                    {p.repo}
                    <span
                      aria-hidden
                      className="text-dust transition-transform duration-300 ease-glide group-hover:translate-x-1"
                    >
                      ↗
                    </span>
                  </a>

                  <p className="mt-4 text-sm leading-relaxed text-haze">{p.what}</p>
                  <p className="mt-4 text-sm leading-relaxed text-rime">{p.did}</p>

                  {/* The proof, given the weight it deserves, pinned to the base
                      so cards of differing text length still align. */}
                  {p.proof && (
                    <div className="mt-auto pt-8">
                      <Eyebrow>{p.proof.label}</Eyebrow>
                      <p className="mt-2 font-mono text-display-md font-medium tabular-nums text-plasma">
                        {p.proof.value}
                      </p>
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap items-center gap-x-4 border-t border-seam pt-4 font-mono text-xs text-dust">
                    {p.memberUrl ? (
                      <a
                        href={p.memberUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-haze transition-colors hover:text-plasma"
                      >
                        {p.member}
                      </a>
                    ) : (
                      <span className="text-haze">{p.member}</span>
                    )}
                    {p.language && <span>{p.language}</span>}
                  </div>
                </article>
              ))}
            </Carousel>
          )}
        </section>

        {/* ---- Tracks ------------------------------------------------------ */}
        <section id="tracks" className="section pt-28 sm:pt-40">
          <p className="label">Three tracks</p>
          <Duo
            className="mt-6 text-display-lg font-semibold"
            lead="What you can work on."
            trail="Three tracks, three difficulties."
          />

          <div className="mt-14 space-y-px overflow-hidden rounded-2xl bg-seam">
            {TRACKS.map((track) => (
              <div key={track.name} className="bg-hull p-8 sm:p-10">
                <div className="grid gap-6 lg:grid-cols-[20rem_1fr] lg:gap-12">
                  <div>
                    <h3 className="text-display-md font-semibold">{track.name}</h3>
                    <p className="mt-3 font-mono text-xs text-plasma">
                      {track.summary}
                    </p>
                  </div>
                  <p className="text-body text-haze lg:pt-2">{track.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---- The path. Numbered because it genuinely is a sequence. ------- */}
        <section id="path" className="section pt-28 sm:pt-40">
          <p className="label">How a first contribution actually goes</p>
          <Duo
            className="mt-6 max-w-3xl text-display-lg font-semibold text-balance"
            lead="Four steps."
            trail="The third is the one people skip."
          />

          <ol className="mt-14 grid gap-x-12 gap-y-10 sm:grid-cols-2">
            {PATH.map((s, i) => (
              <li key={s.step} className="flex gap-5">
                <span
                  className="mt-1 shrink-0 font-mono text-xs tabular-nums text-plasma"
                  aria-hidden
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-body-lg font-semibold">{s.step}</h3>
                  <p className="mt-2 text-body text-haze">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ---- Join -------------------------------------------------------- */}
        <section id="join" className="section pt-28 sm:pt-40">
          <div className="seam-fade" />
          <div className="pt-20 sm:pt-28">
            <Duo
              className="max-w-3xl text-display-lg font-semibold text-balance"
              lead="Want your name in the commit log?"
              trail="Start here."
            />
            <p className="measure mt-7 text-body-lg text-haze">
              Bring a laptop and a GitHub account. You do not need to be good yet —
              a first contribution is mostly about learning how the process works.
            </p>

            <div className="mt-11 flex flex-wrap items-center gap-3">
              <a
                href={`mailto:${LINKS.email}`}
                className="rounded-full bg-rime px-6 py-3 text-sm font-semibold text-void transition duration-300 ease-glide hover:bg-plasma"
              >
                Get in touch
              </a>
              <a
                href={LINKS.github}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-seam px-6 py-3 text-sm font-semibold text-rime transition duration-300 ease-glide hover:border-plasma/60"
              >
                Our GitHub
              </a>
            </div>
          </div>
        </section>

        {/* ---- Footer ------------------------------------------------------ */}
        <footer className="section pb-16 pt-28 sm:pt-40">
          <div className="seam-fade" />
          <div className="flex flex-wrap items-start justify-between gap-8 pt-10">
            <div>
              <p className="font-semibold">Scaler Open Source Club</p>
              <p className="mt-2 max-w-sm text-sm text-haze">
                A student club at Scaler School of Technology.
              </p>
            </div>
            <p className="font-mono text-xs text-dust">scaleropensourcelabs.com</p>
          </div>
        </footer>
      </main>
    </>
  );
}
