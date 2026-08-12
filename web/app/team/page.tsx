import type { Metadata } from "next";
import Duo from "@/components/Duo";
import Team from "@/components/Team";
import Mentors from "@/components/Mentors";
import NextAction from "@/components/NextAction";
import Note from "@/components/fx/Note";
import { JOIN_HREF } from "@/content/site";
import { TEAM_SHADOWS, publishedMentors, teamSize } from "@/content/club";

// THE TEAM PAGE. Who runs the club, and who teaches in it.
//
// A NEW ROUTE, and the one place this site's structure departs from the five-page
// version it was merged with. There, the org chart and the mentor list were folded
// into the hall of fame, on the reasoning that they are all pictures of people.
// They are answering different questions: the hall is "who did this club produce",
// which is evidence, and this is "who is behind it", which is trust. A student
// deciding whether to turn up on a Wednesday wants the second one, and burying it
// under twenty-five achievement cards makes it look like the answer is nobody.
//
// The mentor block is gated on `publishedMentors()` rather than rendering an empty
// state, and that gate is deliberately around the WHOLE section: a "Mentors"
// heading over nothing says the club has no mentors, which is worse than the
// heading not being there.

export const metadata: Metadata = {
  title: "Team",
  description:
    "The students who run the Scaler Open Source Club, the shadows training to take over, and the mentors who have been through these programmes.",
};

export default function TeamPage() {
  return (
    <main id="main">
      <header className="section page-top pb-4" data-reveal-group>
        <p className="chip">Who runs this</p>
        <Duo
          as="h1"
          className="mt-6 max-w-4xl text-display-xl"
          lead="Students, not staff."
          trail="Which is why the handover is built in."
        />
        <p className="measure mt-4 text-body-lg text-haze">
          Everyone on this page graduates. A club that depends on the people
          currently running it lasts exactly as long as they do, so every role has
          somebody shadowing it from the year below.
        </p>
      </header>

        {/* ---- The team -------------------------------------------------------
            Directly after Mentors, and that adjacency is the point: both sections
            answer "who are the humans here", so they belong in one spread rather
            than scattered either side of an argument. Mentors goes first because a
            prospective member cares more about who reviews their patch than who
            books the room.

            Deliberately NOT near the top. Eight named office-holders ahead of the
            hall would be the club introducing itself before it has shown that
            anybody outside it agreed — the same reason the hall leads the page.
            Placed here it also sets up #institutional below, which asks a faculty
            member to email organisers this section has just named.

            aria-label, despite the section having a visible eyebrow: Outline names
            a section from its aria-label first, then a `.label` eyebrow, then its
            heading — and this eyebrow is a `.chip`. Without this the outline entry
            would be the Duo headline cut at 33 characters ("8 people run this club.
            2 are sha…"). It is also the landmark's accessible name, and matches the
            nav link that points here. */}
        <section
          id="team"
          className="section relative pt-12 sm:pt-16"
          aria-label="Team"
          data-reveal-group
        >
          {/* The section's own paragraph says this page exists to answer one
              question; the note says which one, in the margin, for anybody who
              scrolled past the paragraph to look at the faces.

              THIS IS THE ORIGINAL COPY, RESTORED. It was briefly "Not the
              President. A patch review is the Repo Maintainer." — which cleared
              the bar in Note.tsx that a note must say something the section does
              not, but spent the margin explaining the org chart rather than
              pointing at the one question the chart exists to answer. The
              overlap with the standfirst below is the known cost of this
              version; keep the two in step if either is ever reworded.

              anchor 49: the headline's second clause ends at 737px, so 784 sits
              47px off it. */}
          <Note
            place="flow"
            tone="orange"
            fold
            title="Who to ask."
            body="That is the only question this section exists to answer."
            tilt={3.5}
            anchor={49}
            className="top-12"
          />
          <p className="chip">Who runs it</p>
          <Duo
            className="mt-4 max-w-4xl text-display-lg"
            lead={`${teamSize()} people run this club.`}
            trail={`${TEAM_SHADOWS.length} are shadows, training to take over.`}
          />
          <p className="measure mt-4 text-body-lg text-haze">
            This page exists to answer one
            question: <span className="mark">who to ask</span>. 
          </p>
          <Team />
        </section>

        {/* ---- Mentors ------------------------------------------------------ */}
        {/* THE WHOLE SECTION IS GATED, not just its list. Mentors.tsx used to
            carry an empty state — a dashed box reading "No mentors listed yet" —
            and with MENTORS empty that was the entire visible content of this
            section: a chip, a headline, a paragraph promising that "each entry
            says what they shipped", and then a box admitting there are no
            entries. Deleting only the box would have left the promise standing
            over nothing, which reads worse than the box did.

            So the gate lives here rather than in the component, because the copy
            it has to suppress lives here too. Add a mentor to content/club.ts and
            the section returns in full, unchanged — nothing about it was deleted.

            aria-label because this section has no nav link — "Team" took that
            slot — so the outline panel is how it gets reached. */}
        {publishedMentors().length > 0 && (
          <section
            id="mentors"
            className="section relative pt-12 sm:pt-16"
            aria-label="Mentors"
            data-reveal-group
          >
            {/* "Not professors" is the headline; this is the part of it that
                actually matters to somebody deciding whether the advice will be
                current. Void: 240px tall, 320px clear.

                anchor 59, the largest on the page, because this headline's trail
                is the longest — its ink reaches 900px from the container's left
                edge. 44px of gap, same as the rest; the number differs because
                the sentence does. */}
            <Note
              place="flow"
              tone="lime"
              fixing="pin"
              paper="ruled"
              title="Two years ahead, not twenty."
              /* SHORT because the title is long. This void is 240px and a
                 four-line title already spends 90 of it; the first draft's body
                 ran to five lines and put the note 37px through the paragraph
                 below. The band has no give — the copy has to. */
              body="All of them went through one themselves."
              tilt={-3.5}
              anchor={59}
              className="top-2"
            />
            <p className="chip">Who reads your code</p>
            <Duo
              className="mt-4 max-w-4xl text-display-lg"
              lead="Not professors."
              trail="People who did this recently, under the same constraints."
            />
            <p className="measure mt-4 text-body-lg text-haze">
              Every mentor here has been through one of these programmes
              themselves. What they offer is narrow and recent: they wrote the
              proposal, sat through the review comments and landed the patch,
              from this campus, within the last couple of years. Each entry says
              what they shipped, links the public record, and names the few
              things they are genuinely useful for.
            </p>
            <Mentors />
          </section>
        )}

      <NextAction
        eyebrow="Come and meet them"
        lead="These are the people in the room."
        trail="The room is open to anyone."
        body="No interview, no selection at the door, no prior experience. Turn up to a working session and somebody on this page will find you something to start on."
        href={JOIN_HREF}
        cta="Join the club"
      />
    </main>
  );
}
