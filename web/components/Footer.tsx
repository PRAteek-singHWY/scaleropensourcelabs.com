// The footer, on every page.
//
// It carries the two audiences that have no page of their own — faculty and
// sponsors, and maintainers — for the reason given in content/site.ts: all five
// pages address a student deciding whether to join, and a "for sponsors" band
// inside one of them would compete with that page's single next action.
//
// It deliberately does NOT repeat the Join button. The nav carries that action on
// every screen at every scroll position, so a third copy at the bottom of the page
// would be the fourth thing on screen saying the same word, and the one the reader
// has already learned to ignore. The page's own closing action sits above this.
//
// The page list is derived from PAGES, so a route can never appear in the nav and
// be missing here.
//
// RESTRUCTURED TO THE OSC FIGMA. Two things changed and both are the design's:
//
// 1. It is an INVERTED surface — dark on a light page, light on a dark one. Done by
//    dropping `.inverse` on the section, which redefines the tokens for the subtree
//    rather than setting colours on elements, so everything inside flips including
//    the accent. See the block in globals.css for why the accent has to flip too.
//
// 2. The grid is the frames' four columns: the wordmark and the club's own links on
//    the left, then the three institutional statements. The old layout was a 2-up
//    with institutional-over-pages on the left and a narrow right rail.
//
// All of the CONTENT is unchanged — same three institutional statements, same page
// list, same source links, same trademark note. The frames omit the page list and the
// trademark line, but those are content rather than decoration, so they stay and are
// laid out in the design's idiom instead of being dropped.
import Link from "next/link";
import { INSTITUTIONAL, LINKS, PAGES } from "@/content/site";

export default function Footer() {
  return (
    <footer className="inverse">
      <div className="section pb-16 pt-20">
        <div className="grid gap-x-10 gap-y-12 md:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr]">
          {/* The identity column. The wordmark is 32px Archivo Bold in the frames —
              the one place the display face appears below headline size. */}
          <div>
            <p className="font-display text-[2rem] leading-none tracking-tight">OSC</p>
            <p className="mt-6 max-w-[22rem] text-body text-ink/85">
              A student run open source club at Scaler School of Technology.
            </p>

            <ul className="mt-7 space-y-1">
              <li>
                <a
                  href={LINKS.repo}
                  target="_blank"
                  rel="noreferrer"
                  className="tap inline-block font-mono text-label uppercase transition-colors hover:text-accent"
                >
                  scaleropensourcelabs.com
                </a>
              </li>
              <li>
                <a
                  href={LINKS.repo}
                  target="_blank"
                  rel="noreferrer"
                  className="tap inline-block font-mono text-label uppercase transition-colors hover:text-accent"
                >
                  GitHub ↗
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${LINKS.email}`}
                  className="tap inline-block font-mono text-label uppercase transition-colors hover:text-accent"
                >
                  Email the organisers
                </a>
              </li>
              <li>
                <a
                  href={LINKS.issues}
                  target="_blank"
                  rel="noreferrer"
                  className="tap inline-block font-mono text-label uppercase transition-colors hover:text-accent"
                >
                  Good first issues ↗
                </a>
              </li>
            </ul>
          </div>

          {/* The three institutional statements, each under a hairline and a mono
              label — the frames' exact treatment for these columns. */}
          {INSTITUTIONAL.map((i) => (
            <div key={i.title}>
              <div className="h-px w-full bg-seam" />
              <h2 className="label mt-3">{i.title}</h2>
              <p className="mt-3 text-body text-ink/85">{i.body}</p>
            </div>
          ))}
        </div>

        {/* The page list. Not in the frames, kept because a footer that cannot reach
            every route is a worse footer; set as a single mono row so it reads as
            wayfinding rather than as a fifth content column. */}
        <nav aria-label="All pages" className="mt-16 border-t border-seam pt-7">
          <ul className="flex flex-wrap gap-x-7 gap-y-1">
            {PAGES.map((p) => (
              <li key={p.href}>
                <Link
                  href={p.href}
                  className="tap inline-block font-mono text-label uppercase text-haze transition-colors hover:text-ink"
                >
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-10 flex flex-wrap items-baseline justify-between gap-4">
          <p className="max-w-[34rem] text-[13px] leading-relaxed text-haze">
            A student club at Scaler School of Technology. This website is one of the
            club&apos;s own open-source projects — if you spot something wrong with
            it, the fix is a pull request away.
          </p>
          <p className="font-mono text-label uppercase text-haze">
            scaleropensourcelabs.com
          </p>
        </div>

        {/* Programme and organisation names appear throughout as plain type, never as
            logos. Stated once, site-wide, rather than repeated per section. */}
        <p className="mt-8 max-w-[60rem] font-mono text-[11px] leading-relaxed text-dust">
          Programme and organisation names are trademarks of their respective owners.
          Listing a selection or a contribution is a statement of fact about our
          members, not an endorsement by any programme or company.
        </p>
      </div>
    </footer>
  );
}
