// The floating community call to action.
//
// Three zones on one line at lg — claim, action, faces — collapsing to a stack
// below that. The pale cobalt wash (#F0F6FF) is the one panel on the page that is
// neither white nor a band, which is what makes it read as floating on the
// section rather than being part of it.
//
// TWO THINGS THE BRIEF ASKED FOR THAT THIS DOES DIFFERENTLY, both for the same
// reason — the numbers and the faces have to be real:
//
//   1. "Join 300+ Contributors". There is no 300 anywhere in this repo, and no
//      field that could become one: the club records its published
//      selections (SELECTIONS in club.ts, and the count moves as names come in —
//      which is why it is not written out here), eight people running it, and
//      one project with an API-verified
//      merge count. A recruitment page for sixteen-year-olds that inflates its
//      community by twentyfold is the kind of claim that costs the club its
//      credibility the first time somebody counts. The label reads from
//      selectionStats() instead, so it grows on its own and cannot drift from the
//      hall below it.
//
//   2. The avatar stack is REAL PEOPLE — the first few published selections,
//      rendered through the same Portrait component the hall uses. A row of
//      generic stock headshots implying a membership that has not been counted is
//      the same fabrication as the number, just harder to notice.
//
// Nothing here renders if there is nobody to show. An empty avatar stack beside
// "join the club" is worse than no banner.

import Portrait from "@/components/Portrait";
import Doodle from "@/components/Doodle";
import CelebrateLink from "@/components/fx/CelebrateLink";
import { publishedSelections, selectionStats } from "@/content/club";

/** How many faces before the stack stops reading as a group and starts as a list. */
const FACES = 5;

export default function CommunityBanner() {
  const people = publishedSelections();
  const stats = selectionStats();
  if (people.length === 0) return null;

  const faces = people.slice(0, FACES);

  return (
    <div className="section pt-12 sm:pt-16">
      <div
        className="rounded-[20px] border-2 border-black px-6 py-6 shadow-[4px_4px_0_0_#000] sm:px-8"
        // #F0F6FF ON BOTH THEMES, and every foreground inside it is fixed to
        // match. This is a self-contained object like the hero terminal — the
        // terminal stays dark on a light page, this stays pale on a dark one —
        // and the payoff is the same: one contrast pair to prove instead of two,
        // and no chance of a token drifting underneath it.
        //
        // It also means the inline style is safe. An inline background cannot be
        // overridden by a theme rule, so this would be a bug if the panel were
        // ever meant to invert; stating that it is not is what makes it correct.
        style={{ background: "#F0F6FF" }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          {/* Left: the claim. Pitch black regardless of theme, because this panel
              keeps its pale ground on both — 18.4:1 on #F0F6FF. */}
          <p
            className="font-display text-display-md font-bold uppercase leading-[1.15] tracking-[-0.01em]"
            style={{ color: "#0A0A0A" }}
          >
            The students winning are{" "}
            <span className="relative inline-block whitespace-nowrap">
              building open source.
              {/* The squiggle sits under the phrase rather than the whole
                  sentence — it is emphasis, and a rule under three lines of text
                  is a border. Absolute so it cannot add to the line box and open
                  up the leading. */}
              <Doodle
                kind="underline"
                className="absolute -bottom-1.5 left-0 h-2 w-full"
                style={{ color: "#0038FF" }}
              />
            </span>
          </p>

          {/* Centre: the action. Same CelebrateLink as the hero's, so this fires
              the confetti too — it is the same button, in a second place. */}
          <CelebrateLink href="/join" className="btn btn-pop shrink-0">
            Join the club →
          </CelebrateLink>

          {/* Right: the faces. */}
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex -space-x-2">
              {faces.map((p, i) => (
                <span
                  key={`${p.name}-${p.programme}-${p.year}`}
                  // Each avatar carries a ring in the panel's own colour, which
                  // is what separates overlapping circles into distinct faces
                  // rather than one smeared row.
                  className="relative inline-block h-9 w-9 overflow-hidden rounded-full ring-2"
                  style={{ zIndex: FACES - i, ["--tw-ring-color" as string]: "#F0F6FF" }}
                >
                  <Portrait name={p.name} photo={p.photo} className="h-full w-full" />
                </span>
              ))}
            </div>
            <p
              className="font-label text-sm font-bold leading-tight"
              style={{ color: "#0A0A0A" }}
            >
              {stats.total} selected
              <span className="block text-[13px] font-medium" style={{ color: "#3F4A5A" }}>
                this cohort
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
