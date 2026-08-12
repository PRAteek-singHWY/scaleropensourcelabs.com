// The one closing action a page is allowed.
//
// The brief is "every page ends with one clear next action, not three", and the
// reason to build that as a component rather than trust six pages to behave is that
// the failure mode is invisible per page: each individual page looks fine with a
// second "or read more about X" link, and the site as a whole becomes a maze. Here
// there is one slot for a link, and adding a second means changing this file, which
// is a decision somebody has to make on purpose.
//
// THERE IS NO SECOND LINK, and there was one for an hour. The first version of this
// component took an optional `secondary` — an underlined text link under the button,
// for "or see the four ways in first" — on the reasoning that a subordinate
// alternative is not really a competing action. That is how a page ends up with
// three: each addition is individually defensible and the reader still has a
// decision to make instead of a thing to do. Where a page genuinely needs to serve
// two intentions, the difference belongs in WHICH path the button preselects, not in
// a second control. So the signature has one href, and adding another means editing
// this file on purpose.
//
// The hand-drawn arrow points AT the action. It is the one place a doodle earns its
// place structurally rather than decoratively: on a page of straight rules, a wobbly
// line drawn toward the button is the thing that makes a reader look there.

import Link from "next/link";
import Doodle from "@/components/Doodle";

export default function NextAction({
  eyebrow,
  lead,
  trail,
  body,
  href,
  cta,
}: {
  eyebrow: string;
  /** The claim. Set in the display face, caps. */
  lead: string;
  /** The second clause, in the accent. Optional. */
  trail?: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <section
      aria-label="What to do next"
      className="band section pb-24 pt-24 sm:pb-32 sm:pt-32"
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className="chip">{eyebrow}</p>

        <h2 className="mt-7 font-display text-display-lg uppercase leading-[0.94] tracking-[-0.005em] text-balance">
          <span className="text-ink">{lead}</span>
          {trail ? <span className="tone"> {trail}</span> : null}
        </h2>

        <p className="measure mx-auto mt-6 text-body-lg text-haze">{body}</p>

        <div className="mt-10 flex items-center justify-center gap-3">
          {/* Points rightward into the button, and hidden on narrow viewports where
              it would crowd the control instead of leading the eye to it. */}
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
