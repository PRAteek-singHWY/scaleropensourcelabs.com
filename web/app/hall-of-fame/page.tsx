import type { Metadata } from "next";
import Doodle from "@/components/Doodle";
import Duo from "@/components/Duo";
import Hall from "@/components/hall/Hall";
import Ticker from "@/components/Ticker";
import NextAction from "@/components/NextAction";
import Glow from "@/components/fx/Glow";
import Sticker from "@/components/fx/Sticker";
import OrgWall from "@/components/OrgWall";
import Note from "@/components/fx/Note";
import { CALENDAR } from "@/content/club";
import { publishedAlumni } from "@/content/people";

/** Shared honest-empty state. Repeated markup in three places was the alternative. */
function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-12 rounded-tile border border-dashed border-seam px-8 py-14 text-center">
      <p className="text-display-md font-semibold">{title}</p>
      <p className="measure mx-auto mt-4 text-body text-haze">{body}</p>
    </div>
  );
}

// THE HALL OF FAME. Students selected into international programmes.
//
// This is the strongest thing the club can say and it is the least of the club's
// doing, which is exactly why it works: a named student next to "GSoC 2026" is
// proof that somebody else ran a selection and picked them. Every other page on
// this site is the club talking about itself.
//
// It gets its own route rather than a band on the home page for a reason the
// single-page version could not act on: this is the page that gets linked TO. A
// student sends it to their parents, a maintainer sends it to a colleague, and on
// one long scroll that link landed 12,000px down a page about something else.
//
// `consented` gates every card. A real person's name and photograph do not render
// without it, and the gate is in the data rather than in a reviewer's memory —
// see the note at the head of club.ts.

export const metadata: Metadata = {
  title: "Hall of Fame",
  description:
    "Students from Scaler School of Technology selected into GSoC, LFX Mentorship, C4GT and Summer of Bitcoin.",
};

export default function HallOfFame() {
  const alumni = publishedAlumni();

  return (
    <main id="main">
      {/* No separate title block on this route. The section below already opens
          with the eyebrow, the Duo and the standfirst that a page header would
          otherwise repeat verbatim two inches further up — so it carries
          `.page-top` itself and is the header. The 25-card grid is the content and
          it should start as high as the nav allows. */}
        {/* ---- The hall: selections into international programmes ----------
            Placed first because it is the strongest thing the club can say. A
            named student next to "GSoC 2026" is proof somebody else ran a
            selection and picked them; everything below is elaboration. */}
        <section
          id="hall"
          className="relative"
          aria-label="Students selected into international programmes"
        >
          {/* The section's ambient lighting, matching the hero's. Placed high and
              right, so it sits behind the heading and the top of the card grid
              rather than washing the whole thing — the glow is there to lift the
              moment the reader arrives at the strongest claim on the page, and a
              wash spread evenly down 25 cards would just be a tinted background.

              This section is already `relative`, which is what the orb positions
              against. It is NOT a `.band`, so there is no band pseudo-element at
              the same z-index to paint over it.

              Flush right until 1600px, for the same reason the sticker above it
              is — see the note over Sticker 1. A right-hand negative inset with
              no gutter to hang into widens the document instead.

              Sized down on a phone, matching the hero's pair — see the note
              there for why an orb wider than the viewport is a real overflow
              defect and not just a heavy-handed wash. */}
          <Glow className="right-0 top-16 h-[20rem] w-[20rem] sm:h-[38rem] sm:w-[38rem]" />

          {/* #hall's header sits in its own container so the Hall grid below can
              break out of it, so the group goes here rather than on the section —
              which keeps its ordinary settle.

              IT IS ALSO WHAT THE TWO DECORATIONS BELOW ARE POSITIONED AGAINST,
              and that is not tidiness. This section is NOT a `.section` — the
              container is this inner div — so the section box is the full
              viewport, and a margin inset measured against it is measured
              against the wrong edge: `-left-36` put the note at x = -144, i.e.
              entirely off the left of the screen, and the sticker's
              `min-[1600px]:-right-4` ran 17px past the right.

              Neither showed up anywhere. `body { overflow-x: hidden }` clips an
              escaped element instead of producing a scrollbar, so an element
              parked outside the viewport is simply invisible — the note looked
              like a note that had failed to render.

              `relative` here, decorations inside, and both insets now mean what
              they mean in every other section on the page. */}
          {/* `.page-top` rather than `pt-12 sm:pt-16`: on the single-page site this
              header had a hero and an application form above it, and here it is the
              first thing under the nav. See the note over `.page-top` in globals.css
              for why the two cannot both be present. */}
          <div className="section page-top relative" data-reveal-group>
            {/* Sticker 2 of 3. Right, level with the "Selected" eyebrow.
                `top-28` put it across the headline from 1024 to about 1140: the
                Duo below is capped at max-w-4xl, so its right edge is pinned at
                920px whatever the window does, and a 182px sticker flush right
                needs the window past ~1140 before the two stop meeting. Nothing
                catches that — it is not overflow, and the QA sweep samples 1440,
                which is clear.

                The eyebrow's row is the right band to use and the padding strip
                above it is not, which is worth writing down because the padding
                looks like the safer choice: it is empty at every width, whereas
                this row is only empty to the RIGHT of a 130px chip. But a
                section's top padding is shared space — it reads as the gap after
                the section above, and parked there this sticker sat against the
                bottom corner of the apply form and looked like a comment on
                somebody's half-filled sign-up form.
                Level with the eyebrow it is unambiguously part of the hall, and
                the chip beside it is short at every width there is. */}
            <Sticker
              text="git push --force 🚀"
              rotate={4}
              tone="violet"
              effect="bounce"
              className="right-0 top-14 min-[1600px]:-right-4"
            />
            {/* Left gutter — the right one is already carrying the sticker and
                the glow. Pinned rather than taped, so the two decorations either
                side of this heading are not one object mirrored.

                Deliberately NOT a figure. Note has no slot for a source link, so
                a number parked in one is a claim the reader cannot follow up from
                where it sits, and this is the worst section on the page for that:
                the hall below is a wall of other people's decisions, so anything
                numeric in the margin has to be taken on trust exactly where a
                sceptical reader is least willing to.

                What it says instead is the CALENDAR's argument, moved to the
                moment a reader is most likely to accept it. That argument —
                selection goes to people whose commits the maintainers already
                recognise, so a proposal written the week it opens is already
                behind — is the club's central claim, and it reads as excuse-making
                in the abstract. Beside a wall of people it actually worked for, it
                reads as instruction. The prep windows underneath it are the real
                ones from CALENDAR (Sep–Dec against a late-Mar GSoC deadline), so
                "months before" is that data and not a figure of speech.

                It also clears the bar for a note rather than a sticker (see
                Note.tsx): the paragraph below says the club cannot award these
                selections, which is about who decides. This says when the work
                that earns them happens, which the section never mentions.

                It deliberately does NOT send the reader to the calendar. A margin
                remark that ends in an instruction to go and read another section
                is doing the job of a link, and this component has no link — so the
                sentence has to land on its own or not be here. Copy stays short
                anyway, because a gutter note is w-40. */}
            <Note
              place="gutter"
              tone="sky"
              fixing="pin"
              paper="ruled"
              title="Start early"
              body="These names were contributing months before they applied."
              tilt={-4}
              className="-left-40 top-44"
            />
            <p className="flex items-center gap-2">
              <span className="chip">Selected</span>
              <Doodle kind="sparkle" className="h-5 w-5 text-accent" />
            </p>
            {/* h1, not the default h2. On the single-page site this was one section
                heading among fourteen under a hero that owned the h1; here it is the
                route's title, and a page whose only headings start at h2 gives a
                screen-reader user no top of the outline to land on. */}
            <Duo
              as="h1"
              className="mt-4 max-w-4xl text-display-lg"
              lead="Somebody else picked them."
              trail="GSoC, LFX Mentorship, C4GT, Summer of Bitcoin."
            />
            <p className="measure mt-4 text-body-lg text-haze">
              These are competitive, international selection processes run by other
              organisations. Getting in is not something a club can award itself.
            </p>
          </div>
          {/* Hall used to sit outside the container because the WebGL stage was
              full-bleed. It is a normal grid now, so it belongs inside the same
              measure as every other section.

              The `pb` is inherited work, not decoration. A "Every selection"
              table used to close this section and carried `pb-28 sm:pb-40` as
              the hall's bottom breathing room; removing the table took that with
              it and left 25 cards ending flush, with only the ticker's own
              `pt-12` under them. Kept here at the same values so the boundary
              below the densest block on the page still reads as a boundary.
              Roster.tsx is unmounted, not deleted — it has uncommitted changes
              in it. */}
          <div className="section pb-28 sm:pb-40">
            <Hall />
          </div>
        </section>

        {/* ---- The ticker ---------------------------------------------------
            Between the hall and the section that answers it, and that position is
            the reason it earns a place rather than being movement for its own
            sake: the reader has just met a grid of names next to programme
            credentials, and the strip names the ecosystems those credentials
            belong to before "we are not checking whether you can already code"
            takes the pressure back off.

            It is also the only continuously moving element on the page. One is a
            pulse; two would be a fairground, which is the same argument the hero
            comment makes about a second spectacle cancelling the first. */}
        <Ticker />


      {/* ---- 2. Alumni ------------------------------------------------------- */}
      <section
        id="alumni"
        className="band section pb-24 pt-24 sm:pb-32 sm:pt-32"
        aria-label="Alumni and past core members"
        data-reveal-group
      >
        <div className="border-b border-seam pb-5">
          <p className="label">Before us</p>
          <Duo
            className="mt-4 max-w-3xl text-display-lg"
            lead="Alumni, and where they went."
            trail="The column that answers 'does this lead anywhere'."
          />
        </div>

        {alumni.length === 0 ? (
          <EmptyPanel
            title="Not published yet."
            body="Where somebody works is their information to share, so each row waits on that person. It is also the row most tempting to inflate, which is the other reason it waits."
          />
        ) : (
          <div className="mt-12 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <caption className="sr-only">
                Past core team members, the batch they graduated in, the role they
                held, and where they are now.
              </caption>
              <thead>
                <tr className="border-b border-seam">
                  {["Name", "Batch", "Role held", "Now at", ""].map((h, i) => (
                    <th
                      key={h || i}
                      scope="col"
                      className="px-3 py-3 text-left font-mono text-[13px] font-medium uppercase tracking-[0.14em] text-dust"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...alumni]
                  .sort((a, b) => b.batch.localeCompare(a.batch) || a.name.localeCompare(b.name))
                  .map((a) => (
                    <tr
                      key={`${a.name}-${a.batch}`}
                      className="border-b border-seam/60 align-top transition-colors last:border-0 hover:bg-raise/60"
                    >
                      <th scope="row" className="px-3 py-4 text-left font-medium text-ink">
                        {a.name}
                        {a.note && (
                          <span className="mt-1 block font-normal text-[13px] text-haze">
                            {a.note}
                          </span>
                        )}
                      </th>
                      <td className="px-3 py-4 font-mono text-xs tabular-nums text-haze">
                        {a.batch}
                      </td>
                      <td className="px-3 py-4 text-haze">{a.roleHeld}</td>
                      <td className="px-3 py-4 text-ink">{a.nowAt}</td>
                      <td className="px-3 py-4 text-right">
                        {a.linkedin ? (
                          <a
                            href={a.linkedin}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-xs text-accent transition hover:brightness-125"
                          >
                            LinkedIn ↗
                          </a>
                        ) : (
                          <span className="font-mono text-xs text-dust">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>


      {/* ---- 4. Global representation ---------------------------------------- */}
      <section
        id="representation"
        className="band section pb-24 pt-24 sm:pb-32 sm:pt-32"
        aria-label="Organisations our members have reached"
        data-reveal-group
      >
        <div className="border-b border-seam pb-5">
          <p className="label">Reach</p>
          <Duo
            className="mt-4 max-w-3xl text-display-lg"
            lead="Where our code ended up."
            trail="Grouped by what the claim actually is."
          />
        </div>

        <p className="measure mt-7 text-body-lg text-haze">
          Organisation names as type rather than logos — those are their trademarks and
          using them would imply an endorsement nobody granted. There is no world map
          here either, on purpose:{" "}
          <span className="mark">
            a handful of dots on a globe understates real work
          </span>
          , and scaling them until it looks impressive would be drawing data we do not
          have.
        </p>

        <OrgWall />
      </section>

      <NextAction
        eyebrow="How they got there"
        lead="None of them were picked for a proposal."
        trail="They were picked for a commit history."
        body="Every name above started with a first pull request into a project they had never touched. The route in is the same one it always was, and it is four steps long."
        href="/how-to-join"
        cta="See how to join"
      />
    </main>
  );
}
