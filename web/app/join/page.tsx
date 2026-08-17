import type { Metadata } from "next";
import Link from "next/link";
import JoinGate from "@/components/JoinGate";
import Duo from "@/components/Duo";
import Note from "@/components/fx/Note";
import Sticker from "@/components/fx/Sticker";

// THE APPLICATION FORM. One route, one job.
//
// It carries no NextAction, and it is the only route that does not: the form IS
// the next action, and a closing "here is what to do next" band underneath a
// half-filled form is an invitation to abandon it.
//
// It is also absent from PAGES, so it appears in neither the nav strip nor beside
// the other routes in the footer. The nav carries it as a filled button at the
// other end of the bar — putting the same word in the strip as well would be the
// site's one action said twice in one component.
//
// The form used to sit immediately below the hero on a single-page site, because
// with one page that was the only way to keep it within one scroll of the top.
// With its own route it is one click from every screen instead, which is strictly
// better, and the section around it can be about the form rather than being a
// compromise between the form and the hero above it.

export const metadata: Metadata = {
  title: "Join",
  description:
    "Apply to the Scaler Open Source Club. No fee, no interview, no prior experience — a laptop and a GitHub account.",
};

export default function Join() {
  return (
    <main id="main">
        {/* ---- Apply, immediately below the hero ----------------------------
            The form cannot live INSIDE the hero: that hero is sticky and
            scroll-scrubbed, and animating a background under someone who is
            filling in fields is hostile. Scaler's hero carries its form because
            their hero is static. So the form gets the very next band instead —
            one scroll, still the second thing you meet, and it keeps both
            mechanics intact. */}
        {/* `relative` so the sticker below anchors to this section rather than to
            the page. Each sticker is positioned against the section it belongs to,
            so none of them can drift when a section above changes height. */}
        <section id="apply" className="section page-top relative pb-8">
          {/* THE THREE STICKERS, and the rule they all now follow.
              A negative inset only means "hang into the margin" when a margin
              exists. `.section` caps at 88rem, so below ~1600px viewport there is
              no gutter at all and a negative offset hangs off the SCREEN instead:
              the bottom-right sticker was pushing the document 16-40px wider than
              the viewport across the entire 1024-1360px band, which covers most
              laptops.
              It went unseen because `body { overflow-x: hidden }` clips the strip
              rather than producing a scrollbar, and because the QA sweep tests
              390, 834 and 1440 — the band sits exactly between the last two.
              So: flush insets by default, negative ones only past 1600px.

              AND A FLUSH INSET IS INSIDE THE TEXT COLUMN, which is the half of
              that rule the vertical position has to answer for. `left-0` on a
              container whose gutter has not appeared yet does not mean "in the
              margin" — it means "on top of the first thing in the left column",
              and the only reason it ever looked otherwise was that `top-14`
              landed inside this section's 96px of top padding. A later spacing
              pass cut that padding to 48/64px and the sticker came to rest
              exactly on the "Applications open" eyebrow, at EVERY width from
              1024 up.
              So a flush sticker needs a band that is empty in both axes, not
              just a corner. */}
          {/* Sticker 1 of 3. Bottom of the left column, where that column runs
              out of copy and the form beside it keeps going — 350-450px of dead
              space at every width this sticker is visible at, which is the only
              part of this section wide enough and empty enough to hold it. */}
          <Sticker
            text="Works on my machine 💻"
            rotate={-3}
            effect="wobble"
            className="left-0 bottom-24 min-[1600px]:-left-8"
          />
          {/* Opposite gutter, level with the form itself — it answers the first
              thing anybody wonders while looking at a sign-up form.

              THE POINT IS THE ABSENT SECOND TIER, not the price. "Free" alone is
              a word every programme on the internet uses about its entry level,
              and a reader who has met a few of those hears it as "free until the
              part that matters". What is actually unusual here is that there is
              no part that matters more — nobody is kept out of a room because of
              where they sit in the club — so the note says that instead, and the
              price follows from it. The "Free" tile a few inches away already
              carries the fee.

              IT IS SPECIFICALLY *SESSIONS* THAT ARE UNDIVIDED, AND SPECIFICALLY
              REPOS THAT ARE NOT. An earlier draft read "same mentors, same
              repos, everyone", which is not true and is not even the thing being
              claimed: #tracks below sorts the work into three named difficulties
              on purpose, because handing a first-timer an advanced codebase
              helps nobody. That division is a match to what you can currently
              read, and it moves as you do. The division this note rules out is
              the other kind — a rank inside the club that decides which room you
              are allowed into. Keep those two apart in any rewrite; collapsing
              them either makes the club sound undifferentiated or makes the
              tracks sound like tiers. */}
          <Note
            place="gutter"
            tone="mint"
            paper="grid"
            fold
            title="No premium tier."
            body="Every session is open to everyone. Repos differ by level, not by rank."
            tilt={4}
            className="-right-40 top-24"
          />
          {/* An even 1fr/1fr split, up from 1fr/26rem. The form was a fixed
              416px column against a fluid one, so every pixel the container
              gained went to the prose and none to the fields — at 88rem the
              argument ran to 780px while the inputs stayed at 416px and the two
              org fields underneath were squeezed into 172px each.

              Even halves put roughly 600px on each side at the cap, which is
              what lets those paired fields breathe and stops the form reading
              as a sidebar bolted to an essay. */}
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-8">
            {/* The one section whose stagger group is NOT the <section>. Its
                header lives a level down inside this two-column grid, so the
                group goes here and the section keeps its ordinary settle. */}
            <div data-reveal-group>
              <p className="label">Applications open</p>
              {/* h1, not the default h2 — same reason as on /hall-of-fame. This was
                  a mid-page band and is now the whole route. */}
              <Duo
                as="h1"
                className="mt-4 max-w-2xl text-display-lg"
                lead="You do not need to be good yet."
                trail="You need a laptop and a GitHub account."
              />
              {/* "every name further down this page" was true when the hall of fame
                  was 6,000px below this form. It is a route away now, so the sentence
                  pointed at nothing — the kind of line that survives a restructure
                  because it still reads fine and is simply no longer about anything.
                  Named and linked instead. */}
              <p className="measure mt-4 text-body-lg text-haze">
                Most people arrive having never opened a pull request. That is the
                normal starting point, not a disqualification — every name in the{" "}
                <Link href="/hall-of-fame" className="link-u text-accent">
                  hall of fame
                </Link>{" "}
                began there.
              </p>

              {/* The two questions every prospective member asks first, answered
                  before they have to ask. Straight from the reference, where they
                  sit under the hero as tiles. */}
              <div className="mt-6 grid max-w-lg grid-cols-2 gap-3">
                <div className="card rounded-tile bg-raise px-5 py-4">
                  <p className="text-body-lg font-semibold text-accent">Free</p>
                  <p className="mt-1 text-sm text-haze">No fee, ever</p>
                </div>
                <div className="card rounded-tile bg-raise px-5 py-4">
                  <p className="text-body-lg font-semibold text-accent">All years</p>
                  <p className="mt-1 text-sm text-haze">No prior experience</p>
                </div>
              </div>
            </div>

            {/* WAS <ApplyForm />, THE ANONYMOUS ONE-SHOT FORM. It is now sign-in
                first: register with a college Google account, then fill a profile
                once that you can come back and edit. The column this sits in, the
                copy beside it and the two tiles above are unchanged — the flow
                changed, not the page.

                Everything about the gate is client-side, because the site is a
                static export. Route-gating is therefore cosmetic and the data is
                protected by firestore.rules instead. See the note at the top of
                lib/auth.tsx before assuming a hidden page is a safe one. */}
            <JoinGate />
          </div>
        </section>
    </main>
  );
}
