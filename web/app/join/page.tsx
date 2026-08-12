// THE JOIN FORM PAGE — the destination of every Join button on the site.
//
// One route, reached from the nav on every page and from each page's closing action.
// The previous design put the form inline on the single page and kept a sticky bar
// pointing at it; with five pages that becomes five copies of a form or five
// scroll-jumps to one, and neither is as good as an address.
//
// The page around the form is deliberately thin. Somebody who has arrived here has
// already decided — the job now is to not lose them, which means no new arguments, no
// second call to action, and nothing below the form that invites them to go and read
// something else. The three reassurances beside it are the objections that actually
// stop people at the last moment, answered in a line each.
//
// It carries no NextAction, and it is the only page that does not: the form IS the
// action. A "next step" below a form is a distraction from the form.

import type { Metadata } from "next";
import JoinForm from "@/components/JoinForm";
import Duo from "@/components/Duo";
import Doodle from "@/components/Doodle";
import { LINKS } from "@/content/site";
import { PATHS } from "@/content/join";

export const metadata: Metadata = {
  title: "Join the Club",
  description:
    "Apply to the Scaler Open Source Club. Open to all years, no experience needed, and no fee.",
  // Not a page anybody should reach from a search engine ahead of the pages that
  // explain what they are joining.
  robots: { index: false, follow: true },
};

export default function Join() {
  return (
    <main id="main" className="section page-top pb-24 pt-20 sm:pb-32 sm:pt-24">
      <div className="grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1fr)_30rem] lg:gap-20">
        <div>
          <p className="flex items-center gap-2">
            <span className="chip">Join the club</span>
            <Doodle kind="squiggle" className="h-5 w-8 text-accent" />
          </p>

          <h1 className="mt-7 font-display text-display-xl uppercase leading-[0.9] tracking-tightest">
            You do not need <span className="tone">to be good yet</span>
          </h1>

          <p className="measure mt-7 text-body-lg text-haze">
            Most people arrive having never opened a pull request. That is the normal
            starting point, not a disqualification — every name anywhere on this site
            began there.
          </p>

          {/* The three objections that stop people with the form already on screen. */}
          <div className="mt-12 grid max-w-xl gap-3 sm:grid-cols-3">
            {[
              ["Free", "No fee, ever"],
              ["All years", "First years welcome"],
              ["No test", "It's an application, not an exam"],
            ].map(([title, note]) => (
              <div
                key={title}
                className="rounded-tile border border-seam bg-raise px-5 py-4"
              >
                <p className="text-body-lg font-semibold text-accent">{title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-haze">{note}</p>
              </div>
            ))}
          </div>

          {/* The four paths restated compactly, because the select in the form gives
              only their names and somebody who navigated straight here from the nav
              has never read them. One line each — the full version is a page away and
              deliberately not linked from here. */}
          <div className="mt-14">
            <p className="label">The four paths, in one line each</p>
            <dl className="mt-6 max-w-xl space-y-px overflow-hidden rounded-tile bg-seam">
              {PATHS.map((p) => (
                <div key={p.id} className="bg-raise px-5 py-4">
                  <dt className="text-sm font-semibold text-ink">{p.name}</dt>
                  <dd className="mt-1 text-[13px] leading-relaxed text-haze">
                    {p.tagline}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <p className="mt-12 max-w-xl border-t border-seam pt-7 text-body text-haze">
            Would rather just talk to somebody? Email{" "}
            <a
              href={`mailto:${LINKS.email}`}
              className="text-accent underline decoration-accent/30 underline-offset-4 transition hover:brightness-125"
            >
              {LINKS.email}
            </a>{" "}
            and a person will reply. There is no form you have to use.
          </p>
        </div>

        {/* Sticky on wide viewports so the form stays in view while the left column
            scrolls past it. Only at lg+, where there is a second column at all. */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <JoinForm />
        </div>
      </div>

      {/* A quiet closing note rather than a call to action, for the reason in the
          header comment: nothing here should invite somebody to leave. */}
      <p className="mt-16 max-w-2xl text-[13px] leading-relaxed text-dust">
        We read every application and reply to all of them, including the ones that say
        &quot;I do not know what I am doing yet&quot;. Nothing you put in this form is
        published anywhere — the names on this site are only there because those people
        were asked and said yes.
      </p>

      <Duo
        as="h2"
        className="mt-20 max-w-2xl text-display-md"
        lead="See you Saturday."
      />
    </main>
  );
}
