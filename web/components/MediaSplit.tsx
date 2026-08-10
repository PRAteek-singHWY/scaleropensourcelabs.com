// The media split: a large framed visual beside a 2x2 of what the club actually
// runs.
//
// THE LEFT FRAME, AND THE ONE HONEST PROBLEM IN THIS SECTION.
//
// The brief asks for "a photo of students collaborating at laptops". This repo
// contains no images at all — `public/` holds a single README explaining how to
// add them, and not one entry in content/club.ts has a `photo` set. So there are
// three ways to fill this frame and only one of them is defensible:
//
//   * A stock photograph of unrelated people, captioned as this club. That is a
//     misrepresentation on a page whose entire argument is that its claims are
//     checkable, and it is the version most sites ship.
//   * An empty grey box with "image goes here". Honest and unshippable.
//   * What this does: render the real photograph THE MOMENT one exists at the
//     path below, and until then compose the frame out of the club's real member
//     tiles — the same pastel monogram treatment the hall already uses for
//     everyone who has not supplied a picture.
//
// The fallback is a designed state, not an error state: four member tiles, the
// contribution wall's colour language, and a caption that says what it is. It
// does not pretend to be a photograph, so nothing here can be read as one.
//
// To ship the real thing: drop the image at public/people/ per the README there
// and set PHOTO below. Nothing else changes.

import Doodle from "@/components/Doodle";
import Duo from "@/components/Duo";
import Note from "@/components/fx/Note";
import Portrait from "@/components/Portrait";
import { publishedSelections } from "@/content/club";

/** Set to a path under /public once a real photograph exists. Empty = fallback. */
const PHOTO = "";

/* The four things the club actually runs, which is why these are hardcoded here
   rather than pulled from content: they describe the club's format, not its
   record, so there is no figure in them that could go stale or be wrong. Anything
   with a number in it belongs in content/club.ts instead. */
const FEATURES: {
  title: string;
  body: string;
  glyph: string;
  fill: string;
  ink: string;
  /* An optional qualifier, set in red under the body. Only ONE card carries one,
     and that is the point: the standfirst directly above this grid says every one
     of these is "open to anyone … no selection at the door", so a card that is in
     fact rationed has to say so where the claim is made rather than leave the
     correction to the FAQ. A second red line would turn a correction into a
     texture and this one would stop being read. */
  caveat?: string;
}[] = [
  {
    title: "Regular commit sessions",
    body: "Open laptops, one issue each, somebody senior in the room.",
    glyph: "< />",
    fill: "#FEF9C3",
    ink: "#713F12", // 8.0:1 on the pastel yellow
  },
  {
    title: "Hackathons & bounties",
    body: "Short cycles where the output is a merged patch, not a slide deck.",
    glyph: "⚡",
    fill: "#EDE9FE",
    ink: "#4C1D95",
  },
  {
    title: "Student networking",
    body: "The people who got in last cycle are the people reviewing you now.",
    glyph: "◎",
    fill: "#DBEAFE",
    ink: "#1E3A8A",
  },
  {
    title: "1-on-1 mentorship",
    body: "A mentor who has landed work upstream reads your patch first.",
    glyph: "★",
    fill: "#D1FAE5",
    ink: "#065F46",
    caveat: "*accessible to serious students only",
  },
];

export default function MediaSplit() {
  const people = publishedSelections().slice(0, 4);

  return (
    <section
      id="what-we-run"
      /* `relative` for the note below and nothing else. A flow note is absolutely
         positioned, so without a positioned ancestor here it would hang off
         whichever section happens to be positioned further up the page. */
      className="section relative pt-12 sm:pt-16"
      aria-label="What the club runs"
      /* Staggers its own children — the chip, the headline, its drawn rule, the
         standfirst carrying the marker fill, then the split. See Reveal.tsx. */
      data-reveal-group
    >
      {/* THE TITLE BLOCK. Every other section on the page opens with a chip and a
          Duo; this one used to open with the frame itself, so the 2x2 arrived with
          nothing telling a reader what it was a list OF.

          Same three parts as the reference site's: a label, a two-clause headline
          split across a colour change, and one line of subtitle with a single
          phrase lifted out of it. The parts are this site's own — `.chip`, Duo's
          ink/blue split, `.mark` — rather than a copy of theirs, which is what
          keeps this section looking like the eleven above it.

          LEFT-ALIGNED, and that is the one deliberate departure from the
          screenshot. The reference centres its heading over a centred grid; every
          section here hangs off the left margin, and Duo's hand-drawn underline is
          fixed-width from that margin — centring this one block would have left it
          the only heading on the page that does not line up with the rest.

          Sentence case, per the rule in Duo's header: caps are for labels, and a
          two-clause sentence in the display face at this size is a wall. The chip
          above it is a label, so the chip is the part that shouts. */}
      {/* Moved here from #culture, where it annotated a headline about arguing
          over code from a section that never said what a session IS. This is the
          section that does — "Regular commit sessions: open laptops, one issue
          each" is the first card in the 2x2 below — so the note now reads as a
          remark about the thing beside it rather than as a second way of saying
          the headline.

          It is also the only note between #culture and #tracks, so nothing here
          shares a horizontal level with it; the two decorations either side are
          hundreds of pixels clear. See the vertical spacing note in Note.tsx.

          anchor 51, measured rather than guessed, per Note.tsx —
          scripts/tmp-measure.mjs prints exactly this. The furthest-right ink in
          the note's y band is the Duo's trail at 737px from the container's left
          edge (1440 and 1800; 709 at 1280, 658 at 1180, 578 at 1024), so 816
          leaves 79px of air at the widest wrap and more at every narrower one.
          The clamp in `.note-flow` takes over below ~1180.

          THE VERTICAL IS THE TIGHT ONE HERE, not the horizontal. The band runs
          from the top of the section to the `.measure` standfirst, which is
          full-width and would sit straight under the note: 242px at 1024, where
          the note is at its TALLEST because w-40 wraps the body to five lines.
          That leaves 25px, and it is why the body lost "Sessions are" — at six
          lines the foot came within 5px of the paragraph. From xl the note is
          160px and there are 110+. A longer body has to lose a line rather than
          move down. */}
      <Note
        place="flow"
        tone="lilac"
        fold
        title="Laptop open."
        body="People arguing about a codebase, not sitting through slides."
        tilt={-3.5}
        anchor={51}
        className="top-1"
      />
      <p className="flex items-center gap-2">
        <span className="chip">Why students join</span>
        <Doodle kind="squiggle" className="h-5 w-8 text-accent" />
      </p>
      <Duo
        className="mt-4 max-w-4xl text-display-lg"
        lead="College gives you a syllabus."
        trail="This gives you a review thread."
      />
      <p className="measure mt-4 text-body-lg text-haze">
        Four things that actually run every week, and every one of them is{" "}
        <span className="mark">open to anyone</span> — there is no selection at the
        door.
      </p>

      <div className="mt-8 grid gap-5 lg:grid-cols-2 lg:gap-6">
        {/* ---- Left: the frame ------------------------------------------- */}
        <div className="overflow-hidden rounded-[24px] border-2 border-black bg-raise shadow-[4px_4px_0_0_#000]">
          {PHOTO ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={PHOTO}
              alt="Club members working together at a session"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full flex-col">
              {/* Four member tiles at 2x2. Real people, real fallback treatment
                  — this is exactly what their cards look like in the hall, so the
                  frame is consistent with the rest of the page rather than being
                  a bespoke placeholder nobody maintains. */}
              <div className="grid flex-1 grid-cols-2 gap-px bg-black/10">
                {people.map((p) => (
                  <Portrait
                    key={`${p.name}-${p.programme}-${p.year}`}
                    name={p.name}
                    photo={p.photo}
                    className="aspect-[4/3] w-full"
                  />
                ))}
              </div>
              <p className="border-t-2 border-black px-4 py-3 font-mono text-[13px] text-dust">
                Members of the current cohort · photographs to follow
              </p>
            </div>
          )}
        </div>

        {/* ---- Right: the 2x2 -------------------------------------------- */}
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-[20px] border border-[#F1F5F9] bg-raise p-5 transition-shadow duration-200 ease-in-out hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
            >
              {/* The pastel icon badge. Fixed fill and fixed foreground — a
                  self-contained pair, so it needs no dark-theme variant and its
                  contrast is one number rather than two. */}
              <span
                aria-hidden
                className="flex h-10 w-10 items-center justify-center rounded-xl font-mono text-sm font-bold"
                style={{ background: f.fill, color: f.ink }}
              >
                {f.glyph}
              </span>
              <h3 className="mt-4 font-display text-body-lg font-bold leading-snug">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-haze">{f.body}</p>
              {/* 12px against the body's 14px, and --flag rather than --ember —
                  see the token's note in globals.css. The asterisk is authored
                  into the string rather than added here so the copy reads the
                  same in the source as it does on the page. */}
              {f.caveat ? (
                <p className="mt-2 text-xs leading-relaxed text-flag">
                  {f.caveat}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
