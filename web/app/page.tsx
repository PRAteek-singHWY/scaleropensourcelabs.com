import Hero from "@/components/hero/Hero";
import Reveal from "@/components/Reveal";
import Duo from "@/components/Duo";
import Nav from "@/components/Nav";
import Carousel from "@/components/Carousel";
import Eyebrow from "@/components/Eyebrow";
import Hall from "@/components/hall/Hall";
import ApplyForm from "@/components/ApplyForm";
import Mentors from "@/components/Mentors";
import Roster from "@/components/hall/Roster";
import {
  CULTURE,
  LINKS,
  OUTCOMES,
  PATH,
  PROGRAMMES,
  PROGRAMME_COLOUR,
  PROGRAMME_NAME,
  PROGRAMME_SHORT,
  PROJECTS,
  CALENDAR,
  FAQ,
  INSTITUTIONAL,
  NOT_FOR,
  POSITIONING,
  TRACKS,
  TRADE_OFFS,
  totals,
} from "@/content/club";

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
      {/* Renders nothing; opts the document in to the scroll reveals. */}
      <Reveal />
      <Hero />

      <main>
        {/* ---- Apply, immediately below the hero ----------------------------
            The form cannot live INSIDE the hero: that hero is sticky and
            scroll-scrubbed, and animating a background under someone who is
            filling in fields is hostile. Scaler's hero carries its form because
            their hero is static. So the form gets the very next band instead —
            one scroll, still the second thing you meet, and it keeps both
            mechanics intact. */}
        <section id="apply" className="section pt-24 sm:pt-32">
          <div className="grid gap-12 lg:grid-cols-[1fr_26rem] lg:gap-20">
            <div>
              <p className="label">Applications open</p>
              <Duo
                className="mt-6 max-w-2xl text-display-lg font-semibold text-balance"
                lead="You do not need to be good yet."
                trail="You need a laptop and a GitHub account."
              />
              <p className="measure mt-7 text-body-lg text-haze">
                Most people arrive having never opened a pull request. That is the
                normal starting point, not a disqualification — every name further
                down this page began there.
              </p>

              {/* The two questions every prospective member asks first, answered
                  before they have to ask. Straight from the reference, where they
                  sit under the hero as tiles. */}
              <div className="mt-10 grid max-w-lg grid-cols-2 gap-3">
                <div className="rounded-tile border border-seam bg-raise px-5 py-4">
                  <p className="text-body-lg font-semibold text-accent">Free</p>
                  <p className="mt-1 text-sm text-haze">No fee, ever</p>
                </div>
                <div className="rounded-tile border border-seam bg-raise px-5 py-4">
                  <p className="text-body-lg font-semibold text-accent">All years</p>
                  <p className="mt-1 text-sm text-haze">No prior experience</p>
                </div>
              </div>
            </div>

            <ApplyForm />
          </div>
        </section>

        {/* ---- The hall: selections into international programmes ----------
            Placed first because it is the strongest thing the club can say. A
            named student next to "GSoC 2026" is proof somebody else ran a
            selection and picked them; everything below is elaboration. */}
        <section id="hall" aria-label="Students selected into international programmes">
          <div className="section pt-24 sm:pt-36">
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
          {/* Hall used to sit outside the container because the WebGL stage was
              full-bleed. It is a normal grid now, so it belongs inside the same
              measure as every other section. */}
          <div className="section">
            <Hall />
          </div>
          <Roster />
        </section>

        {/* ---- Thesis ------------------------------------------------------ */}
        <section className="section pt-24 sm:pt-36">
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

          {/* Outcomes merged in here rather than living as its own section. Two
              philosophy blocks separated by Programmes broke the momentum twice,
              and this argument is the evidence for the claim above — it belongs
              in the same breath as it. */}
          <p className="label mt-20">Beyond the stipend</p>
          <Duo
            className="mt-6 max-w-4xl text-display-md font-semibold text-balance"
            lead="The money is the smallest part."
            trail="What lasts is who ends up knowing your work."
          />
          <div className="mt-14 grid gap-x-14 gap-y-10 sm:grid-cols-2">
            {OUTCOMES.map((o) => (
              <div key={o.title} className="border-t border-seam pt-6">
                <h3 className="text-body-lg font-semibold">{o.title}</h3>
                <p className="mt-3 text-body text-haze">{o.body}</p>
              </div>
            ))}
          </div>

        </section>

        {/* ---- Projects ---------------------------------------------------- */}
        <section
          id="projects"
          className="band section pt-24 pb-24 sm:pt-36 sm:pb-36"
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
            <div className="mt-12 rounded-tile border border-dashed border-seam px-8 py-16 text-center">
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
                  className="flex w-[19rem] shrink-0 snap-start flex-col rounded-tile border border-seam bg-raise p-7 sm:w-[23rem]"
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
                    className="tap group mt-3 inline-flex items-baseline gap-2 font-mono text-body-lg text-ink transition-colors duration-300 ease-glide hover:text-accent"
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
                  <p className="mt-4 text-sm leading-relaxed text-ink">{p.did}</p>

                  {/* The proof, given the weight it deserves, pinned to the base
                      so cards of differing text length still align. */}
                  {p.proof && (
                    <div className="mt-auto pt-8">
                      <Eyebrow>{p.proof.label}</Eyebrow>
                      <p className="mt-2 font-mono text-display-md font-medium tabular-nums text-accent">
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
                        className="tap inline-block text-haze transition-colors hover:text-accent"
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

        {/* ---- The programmes: what they are, and what we do about it ------ */}
        <section id="programmes" className="section pt-24 sm:pt-36">
          <p className="label">The programmes</p>
          <Duo
            className="mt-6 max-w-4xl text-display-lg font-semibold text-balance"
            lead="Paid, competitive, and open to beginners."
            trail="Most students never apply because nobody told them these exist."
          />

          <div className="mt-14 space-y-px overflow-hidden rounded-tile bg-seam">
            {PROGRAMMES.map((pg) => (
              <div key={pg.key} className="bg-raise p-8 sm:p-10">
                <div className="grid gap-8 lg:grid-cols-[16rem_1fr] lg:gap-14">
                  <div>
                    {/* Programme name as type, tinted to match its planet in the
                        system above — never the official logo. Those marks belong
                        to Google, the Linux Foundation and others, and using them
                        implies an endorsement nobody granted. */}
                    <p
                      className="text-display-md font-semibold leading-none"
                      style={{ color: PROGRAMME_COLOUR[pg.key] }}
                    >
                      {PROGRAMME_SHORT[pg.key]}
                    </p>
                    <p className="mt-2 font-mono text-xs text-dust">
                      {PROGRAMME_NAME[pg.key]}
                    </p>
                    <a
                      href={pg.url}
                      target="_blank"
                      rel="noreferrer"
                      className="tap mt-4 inline-block font-mono text-xs text-accent hover:brightness-125"
                    >
                      Official site ↗
                    </a>
                  </div>

                  <dl className="grid gap-6 sm:grid-cols-2">
                    {[
                      ["What it is", pg.what],
                      ["Who gets in", pg.who],
                      ["When it runs", pg.when],
                      ["What it pays", pg.pays],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt className="label">{k}</dt>
                        <dd className="mt-2 text-sm leading-relaxed text-haze">{v}</dd>
                      </div>
                    ))}
                    <div className="sm:col-span-2 border-t border-seam pt-5">
                      <dt className="label" style={{ color: PROGRAMME_COLOUR[pg.key] }}>
                        What the club does
                      </dt>
                      <dd className="mt-2 text-sm leading-relaxed text-ink">{pg.weDo}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Calendar -----------------------------------------------------
            The only honest urgency device the club owns. The argument is
            arithmetic, not a countdown: organisations select contributors who
            already have months of commits in their repo, so "next year" is a
            skipped cycle rather than a delay. No exact dates — they move annually
            and a stale date costs more than it buys on a page claiming accuracy. */}
        <section id="calendar" className="band section pt-24 pb-24 sm:pt-36 sm:pb-36">
          <p className="label">The reverse clock</p>
          <Duo
            className="mt-6 max-w-4xl text-display-lg font-semibold text-balance"
            lead="Applications are decided months before they open."
            trail="Which is why starting now is the whole trick."
          />
          <p className="measure mt-7 text-body-lg text-haze">
            Organisations pick contributors they already recognise. By the time a
            proposal window opens, the people who get in have been committing to
            that repository since autumn. Waiting a year does not delay you by a
            year — it costs you the cycle.
          </p>

          <div className="mt-14 overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-seam">
                  {["Window", "Programme", "Opens", "Start prepping", "What you do first"].map((h) => (
                    <th key={h} scope="col" className="px-3 py-3 text-left font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-dust">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CALENDAR.map((r) => (
                  <tr key={r.programme} className="border-b border-seam/60 align-top last:border-0">
                    <td className="px-3 py-5 font-mono text-xs text-accent">{r.window}</td>
                    <td className="px-3 py-5 font-medium text-ink">{r.programme}</td>
                    <td className="px-3 py-5 text-haze">{r.opens}</td>
                    <td className="px-3 py-5 font-mono text-xs text-ember">{r.prepFrom}</td>
                    <td className="max-w-sm px-3 py-5 text-haze">{r.doingNow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---- Why this and not the CP club --------------------------------- */}
        <section id="why-us" className="section pt-24 sm:pt-36">
          <p className="label">Choosing a club</p>
          <Duo
            className="mt-6 max-w-4xl text-display-lg font-semibold text-balance"
            lead="Competitive programming has a fixed number of winners."
            trail="Open source does not."
          />

          {/* Two kinds of row live here, and the first layout treated them as one:
              claims that cite a figure, and the reasoning that connects them. Rows
              without a `stat` were rendered into the same stat column as an empty
              cell, so a reader scanning the numbers hit blank space where a figure
              should be and read it as missing data.

              Now a single hairline runs the height of the section and the figures
              are pinned along it, right-aligned against it. A row with no figure
              does not break the line — it continues it, which is what "this is the
              argument between two pieces of evidence" should look like. Cited rows
              carry full-strength ink; the connective rows step down one level to
              haze, so the hierarchy says which sentences have a source behind
              them. The structure now encodes the distinction instead of losing it. */}
          <div className="mt-14 border-t border-seam pt-10">
            {POSITIONING.map((c, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[7rem_1fr] sm:gap-0">
                <div className="sm:pr-8 sm:text-right">
                  {c.stat && (
                    <p className="font-display text-display-md font-semibold tabular-nums text-accent">
                      {c.stat}
                    </p>
                  )}
                </div>
                <div
                  className={`sm:border-l sm:border-seam sm:pl-8 ${
                    i === POSITIONING.length - 1 ? "pb-0" : "pb-10"
                  }`}
                >
                  <p
                    className={`measure text-body-lg ${
                      c.stat ? "text-ink" : "text-haze"
                    }`}
                  >
                    {c.line}
                  </p>
                  {/* Every claim terminates in a third-party link. With no
                      testimonials and no placement data, external verifiability is
                      the substitute for social proof — and it is the only thing
                      that makes an attack on a rival activity fair. */}
                  {c.source && (
                    <a
                      href={c.source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="tap mt-3 inline-block font-mono text-xs text-accent hover:brightness-125"
                    >
                      {c.source.label} ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* The honest cost. A comparison listing only our advantages gets
              discounted wholesale; naming what we are worse at is what makes the
              rest of the section believable. */}
          <div className="mt-16 rounded-tile border border-seam bg-raise p-8 sm:p-10">
            <h3 className="text-display-md font-semibold">What we are worse at</h3>
            <p className="measure mt-3 text-body text-haze">
              Every one of these is a real reason to join the competitive
              programming club instead.
            </p>
            <ul className="mt-8 space-y-5">
              {TRADE_OFFS.map((t) => (
                <li key={t} className="flex gap-4">
                  <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-ember" />
                  <span className="text-body text-haze">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---- How the club actually runs ----------------------------------- */}
        <section id="culture" className="band section pt-24 pb-24 sm:pt-36 sm:pb-36">
          <p className="label">What it&apos;s like</p>
          <Duo
            className="mt-6 max-w-4xl text-display-lg font-semibold text-balance"
            lead="It is mostly people arguing about code with Maggi."
            trail="Which is the point."
          />

          <div className="mt-14 grid gap-4 sm:grid-cols-2">
            {CULTURE.map((c) => (
              <div
                key={c.title}
                className="rounded-tile border border-seam bg-raise p-7"
              >
                <h3 className="text-body-lg font-semibold">{c.title}</h3>
                <p className="mt-3 text-body text-haze">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Tracks ------------------------------------------------------ */}
        <section id="tracks" className="section pt-24 sm:pt-36">
          <p className="label">Three tracks</p>
          <Duo
            className="mt-6 text-display-lg font-semibold"
            lead="What you can work on."
            trail="Three tracks, three difficulties."
          />

          <div className="mt-14 space-y-px overflow-hidden rounded-2xl bg-seam">
            {TRACKS.map((track) => (
              <div key={track.name} className="bg-raise p-8 sm:p-10">
                <div className="grid gap-6 lg:grid-cols-[20rem_1fr] lg:gap-12">
                  <div>
                    <h3 className="text-display-md font-semibold">{track.name}</h3>
                    <p className="mt-3 font-mono text-xs text-accent">
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
        <section id="path" className="band section pt-24 pb-24 sm:pt-36 sm:pb-36">
          <p className="label">How a first contribution actually goes</p>
          <Duo
            className="mt-6 max-w-3xl text-display-lg font-semibold text-balance"
            lead="Four steps."
            trail="The third is the one people skip."
          />

          {/* Numbered markers are usually decoration, and were nearly cut for that
              reason. They stay because here the order is the content: the headline
              points at "the third", so a reader has to be able to find which step
              that is.

              Which is exactly what the previous 2x2 grid prevented. Four numbered
              items in two columns can be read across (01, 02 / 03, 04) or down
              (01, 03 / 02, 04), and nothing on screen said which — so the one
              sentence above it that depends on position was unresolvable. A single
              column has one reading order. It also costs nothing: these are four
              short steps, not a dense grid needing the horizontal room. */}
          <ol className="mt-14 max-w-3xl">
            {PATH.map((s, i) => (
              <li
                key={s.step}
                className="grid gap-x-8 gap-y-2 sm:grid-cols-[3rem_1fr]"
              >
                <span
                  className="font-mono text-xs tabular-nums text-accent sm:pt-1 sm:text-right"
                  aria-hidden
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {/* The gap has to live INSIDE the bordered element. With the padding
                    on the <li> the rule only spanned each text block and broke in
                    every gap between steps — four detached ticks instead of one
                    line through the sequence. */}
                <div
                  className={`sm:border-l sm:border-seam sm:pl-8 ${
                    i === PATH.length - 1 ? "pb-0" : "pb-9"
                  }`}
                >
                  <h3 className="text-body-lg font-semibold">{s.step}</h3>
                  <p className="mt-2 text-body text-haze">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ---- Mentors ------------------------------------------------------ */}
        <section id="mentors" className="section pt-24 sm:pt-36">
          <p className="label">Who reads your code</p>
          <Duo
            className="mt-6 max-w-4xl text-display-lg font-semibold text-balance"
            lead="Not professors."
            trail="People who did this recently, under the same constraints."
          />
          <p className="measure mt-7 text-body-lg text-haze">
            Every mentor here has been through one of these programmes themselves.
            What they offer is narrow and recent: they wrote the proposal, sat
            through the review comments and landed the patch, from this campus,
            within the last couple of years. Each entry says what they shipped,
            links the public record, and names the few things they are genuinely
            useful for.
          </p>
          <Mentors />
        </section>

        {/* ---- Who this is not for ------------------------------------------
            An explicit filter immediately before the ask. Stating who should not
            join makes the invitation read as selective rather than desperate. */}
        <section id="who-not-for" className="band section pt-24 pb-24 sm:pt-36 sm:pb-36">
          <p className="label">Be honest with yourself</p>
          <Duo
            className="mt-6 max-w-4xl text-display-lg font-semibold text-balance"
            lead="This is not for everyone."
            trail="Four reasons to walk away now."
          />
          <ul className="mt-12 max-w-3xl space-y-6">
            {NOT_FOR.map((n) => (
              <li key={n} className="flex gap-4 border-t border-seam pt-6">
                <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-ember" />
                <span className="text-body text-haze">{n}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ---- FAQ ---------------------------------------------------------- */}
        <section id="faq" className="section pt-24 sm:pt-36">
          <p className="label">Questions</p>
          <Duo
            className="mt-6 max-w-4xl text-display-lg font-semibold text-balance"
            lead="The seven things people actually ask."
          />
          <dl className="mt-12 max-w-3xl">
            {FAQ.map((f) => (
              <div key={f.q} className="border-t border-seam py-7">
                <dt className="text-body-lg font-semibold">{f.q}</dt>
                <dd className="measure mt-3 text-body text-haze">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ---- Join -------------------------------------------------------- */}
        <section id="join" className="band section pt-24 pb-24 sm:pt-36 sm:pb-36">
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
                className="btn btn-primary"
              >
                Get in touch
              </a>
              <a
                href={LINKS.github}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
              >
                Our GitHub
              </a>
            </div>
          </div>
        </section>

        {/* ---- For faculty, sponsors and maintainers -------------------------
            Two of this site's three audiences previously had nowhere to land. An
            anonymous club reads as vaporware to a faculty member and a maintainer
            at the same time, so this band is concrete, contactable, and makes
            exactly one small specific ask. */}
        <section id="institutional" className="section pt-24 sm:pt-36">
          <div className="rounded-tile border border-seam bg-raise p-8 sm:p-12">
            <p className="label">For faculty, sponsors and maintainers</p>
            <Duo
              className="mt-6 max-w-3xl text-display-md font-semibold text-balance"
              lead="What this club is, in plain terms."
            />
            <div className="mt-10 grid gap-x-14 gap-y-8 sm:grid-cols-3">
              {INSTITUTIONAL.map((i) => (
                <div key={i.title}>
                  <h3 className="text-body-lg font-semibold">{i.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-haze">{i.body}</p>
                </div>
              ))}
            </div>
            <a
              href={`mailto:${LINKS.email}`}
              className="mt-10 inline-block rounded-md border border-seam px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-accent/60"
            >
              Email the organisers
            </a>
          </div>
        </section>

        {/* ---- Footer ------------------------------------------------------ */}
        <footer className="section pb-16 pt-24 sm:pt-36">
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
