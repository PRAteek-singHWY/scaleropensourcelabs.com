// The one closing action a route is allowed.
//
// THIS IS THE #join BAND FROM THE SINGLE-PAGE SITE, turned into a component. When
// the whole site was one scroll, a closing "Want your name in the commit log?"
// appeared exactly once, at the bottom, and that was the correct number. Split
// across seven routes the same band has to appear seven times, and the moment a
// thing repeats it needs a rule — otherwise each page grows its own closer, each
// closer grows a second "or read more about X" link, and the site becomes a maze
// one individually-defensible link at a time.
//
// So the shape is fixed here and the pages only supply words. There is ONE href.
// Where a page genuinely serves two intentions, the difference belongs in which
// destination the button preselects, not in a second control beside it.
//
// The styling is unchanged from the band it came from, and so is the argument for
// each part of it:
//
//   * CENTRED, unlike every other section on the site, because this one is
//     structurally a tile rather than an argument: short headline, one supporting
//     line, one action. The content sections stay left-aligned deliberately —
//     their headlines are two-clause arguments over three lines, and centred
//     ragged text at that length is measurably harder to read.
//
//   * The `.seam-fade` hairline above it. It is what makes the band read as the
//     end of the page rather than as one more section, which matters more now
//     than it did: on a single page the footer was visibly next, and on a route
//     the reader has to be told the argument has finished.
//
//   * The group is the inner block, NOT the section. The section's other child is
//     that 1px rule, and a hairline sliding 20px up on reveal is the one thing
//     here that would read as a rendering fault rather than as motion.

import Link from "next/link";
import Doodle from "@/components/Doodle";
import Duo from "@/components/Duo";

export default function NextAction({
  eyebrow,
  lead,
  trail,
  body,
  href,
  cta,
  children,
}: {
  eyebrow?: string;
  /** The claim. Set in the display face. */
  lead: string;
  /** The second clause, in the accent. Optional. */
  trail?: string;
  body: string;
  href: string;
  cta: string;
  /** Slot for a margin note, so a page can keep its own gutter remark here. */
  children?: React.ReactNode;
}) {
  return (
    <section
      aria-label="What to do next"
      className="band section relative pt-12 pb-12 sm:pt-16 sm:pb-16"
    >
      <div className="seam-fade" />
      {children}
      <div className="pt-10 text-center sm:pt-14" data-reveal-group>
        {eyebrow ? <p className="chip">{eyebrow}</p> : null}
        <Duo
          className={`mx-auto max-w-3xl text-display-lg ${eyebrow ? "mt-6" : ""}`}
          lead={lead}
          trail={trail}
        />
        <p className="measure mx-auto mt-4 text-body-lg text-haze">{body}</p>

        <div className="mt-11 flex flex-wrap items-center justify-center gap-3">
          {/* Points rightward into the button, and hidden on narrow viewports where
              it would crowd the control instead of leading the eye to it. On a page
              of straight rules a wobbly line drawn at the action is the thing that
              makes a reader look there — the one place a doodle earns its keep
              structurally rather than decoratively. */}
          <Doodle
            kind="arrow"
            className="hidden h-6 w-10 shrink-0 text-accent sm:block"
          />
          <Link href={href} className="btn btn-pop">
            {cta} →
          </Link>
        </div>
      </div>
    </section>
  );
}
