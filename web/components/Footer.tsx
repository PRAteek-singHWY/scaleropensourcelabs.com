// The footer, on every page.
//
// It carries the two audiences that have no page of their own — faculty and
// sponsors, and maintainers — for the reason given over INSTITUTIONAL in club.ts:
// every route is addressed to a student deciding whether to join, and a
// "for sponsors" band inserted into one of them would compete with that page's
// single next action. Chrome is the right place for an audience that is not the
// page's audience.
//
// It deliberately does NOT repeat the Join button. The nav carries that action at
// every scroll position on every route, so a copy down here would be the third
// thing on screen saying the same word — and the one a reader has already learned
// to skip. Each page's own closing action sits above this.
//
// The page list is derived from PAGES, so a route cannot appear in the nav and be
// missing here.
//
// IT IS AN INVERTED SURFACE — dark on a light page, light on a dark one. Done by
// dropping `.inverse` on the element, which redefines the tokens for the subtree
// rather than setting colours on the children, so everything inside flips
// including the accent and the Console below inherits the flip for free. See the
// block in globals.css for why the accent has to flip too.
//
// THE SECTION THAT USED TO BE #institutional IS NOW THIS. On the single-page site
// the three institutional statements were a card two thirds of the way down, and
// the footer beneath it was a wordmark and a URL. Folding one into the other is
// what the multi-page structure asks for: the statements have to reach a reader
// who lands on /projects from a maintainer's link and never sees the home page,
// and chrome is the only thing that reaches everyone. No content was dropped in
// the merge — the three statements, the email CTA, the page list and the
// trademark note are all still here, laid out as four columns instead of a card.

import Link from "next/link";
import Console from "@/components/fx/Console";
import { INSTITUTIONAL, LINKS, PAGES } from "@/content/site";

export default function Footer() {
  return (
    <footer className="inverse mt-24 sm:mt-32">
      <div className="section pb-16 pt-20">
        {/* THE FOOTER ANIMATES TOO, and until this it was the only large surface on
            the site that did not. That was not a decision — Reveal.tsx observes
            `main > section, header.section` plus anything carrying
            data-reveal-group, and a footer is none of those, so four columns and
            eight links simply appeared. The stagger groups here are the whole fix:
            they are read from the document rather than from main, so marking the
            containers is all it takes. The columns come up in reading order, then
            the route list under them. */}
        <div
          className="grid gap-x-10 gap-y-12 md:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr]"
          data-reveal-group
        >
          {/* The identity column. `font-display` has to state its own weight —
              Space Grotesk defaults to 400 where the poster face it replaced shipped
              one heavy cut, so a bare `font-display` looks like body copy at
              headline size. See the type note at the head of globals.css. */}
          <div>
            <p className="font-display text-display-md font-bold leading-none tracking-tight">
              OSC
            </p>
            <p className="mt-6 max-w-[22rem] text-body text-ink/85">
              A student-run open source club at Scaler School of Technology.
            </p>

            <ul className="mt-7 space-y-1">
              <li>
                <a
                  href={LINKS.repo}
                  target="_blank"
                  rel="noreferrer"
                  className="tap link-u inline-block font-mono text-label uppercase transition-colors hover:text-accent"
                >
                  This site&apos;s source ↗
                </a>
              </li>
              <li>
                <a
                  href={LINKS.github}
                  target="_blank"
                  rel="noreferrer"
                  className="tap link-u inline-block font-mono text-label uppercase transition-colors hover:text-accent"
                >
                  GitHub ↗
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${LINKS.email}`}
                  className="tap link-u inline-block font-mono text-label uppercase transition-colors hover:text-accent"
                >
                  Email the organisers
                </a>
              </li>
              <li>
                <a
                  href={LINKS.issues}
                  target="_blank"
                  rel="noreferrer"
                  className="tap link-u inline-block font-mono text-label uppercase transition-colors hover:text-accent"
                >
                  Good first issues ↗
                </a>
              </li>
            </ul>
          </div>

          {/* The three institutional statements, each under a hairline and a mono
              label. */}
          {INSTITUTIONAL.map((i) => (
            <div key={i.title}>
              <div className="h-px w-full bg-seam" />
              <h2 className="label mt-3">{i.title}</h2>
              <p className="mt-3 text-body text-ink/85">{i.body}</p>
            </div>
          ))}
        </div>

        {/* Every route, as one mono row, so it reads as wayfinding rather than as a
            fifth content column. /join is here where it is absent from the nav — the
            nav has its button, and this list is the one place that should be able to
            reach the whole site. */}
        <nav aria-label="All pages" className="mt-16 border-t border-seam pt-7">
          <ul className="flex flex-wrap gap-x-7 gap-y-1" data-reveal-group>
            {PAGES.map((p) => (
              <li key={p.href}>
                <Link
                  href={p.href}
                  className="tap link-u inline-block font-mono text-label uppercase text-haze transition-colors hover:text-ink"
                >
                  {p.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/join"
                className="tap inline-block font-mono text-label uppercase text-haze transition-colors hover:text-ink"
              >
                Join
              </Link>
            </li>
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
        <p className="mt-8 max-w-[60rem] font-mono text-[13px] leading-relaxed text-dust">
          Programme and organisation names are trademarks of their respective owners.
          Listing a selection or a contribution is a statement of fact about our
          members, not an endorsement by any programme or company.
        </p>

        {/* The easter egg, at the very bottom, as a reward for getting there. */}
        <Console />
      </div>
    </footer>
  );
}
