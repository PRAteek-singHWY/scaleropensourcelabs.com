// The hero, as a thesis rather than a spectacle.
//
// It was a scroll-scrubbed WebGL rocket on a launchpad across 220vh, with a
// CSS fallback, capability detection and a stage machine. That is gone at the
// client's instruction, and what replaces it is the register both reference sites
// actually use: apple.com and Scaler's School of Business are type-led, with the
// claim doing the work and hard numbers immediately under it.
//
// Reading the SSB page closely, the pattern is consistent — a positioning
// sentence, two calls to action, and no imagery to speak of. So this states the
// claim and then gets out of the way: the selection count that used to sit under
// the buttons is now made once, at the head of the hall, where the names that
// back it are on the same screen. Saying it twice on one scroll made the reader
// re-read rather than recognise it.
//
// This is a server component: no canvas, no capability detection, no scroll
// listener, no state. The previous hero needed all four and could only be checked
// by rendering it. This one cannot fail in a way HTML cannot express.
//
// One height rule: it deliberately does NOT force h-screen. A viewport-locked hero
// pushes the section under it off the fold on a laptop, which is exactly where the
// argument continues.

import Link from "next/link";
import { PROJECTS, selectionStats } from "@/content/club";
import Terminal from "@/components/hero/Terminal";
import Icon from "@/components/Icon";
import Term from "@/components/fx/Term";
import CelebrateLink from "@/components/fx/CelebrateLink";
import Glow from "@/components/fx/Glow";

/* The floating chips anchored to the terminal's corners.
 *
 * Positions and colours are the brief's exactly: purple top-right, mint
 * bottom-left, each led by its coloured circle emoji.
 *
 * The FIGURES are not. The brief asks for "🟣 140+ PRs Merged" and
 * "🟢 $12,000+ Earned"; the repo's verified merge count is 46, and there is no
 * earnings figure anywhere in the content — not in PROJECTS, not in SELECTIONS,
 * not in the copy. Inventing one on a recruitment page aimed at sixteen-year-olds
 * is the single most consequential number that could be wrong here, because
 * "students earn money doing this" is the claim most likely to change what
 * somebody does next.
 *
 * So the chips carry what the club can actually show: the API-verified merge
 * count, and the size of the published cohort. Both grow on their own as entries
 * are added. A chip with nothing true to say does not render, which is why each
 * is guarded separately rather than the pair being one block.
 *
 * lg only. They are absolutely positioned over a column that does not exist below
 * lg, and a decorative element that can push a phone into a horizontal scroll is
 * a defect rather than a flourish.
 */
function FloatingBadges() {
  const merged = PROJECTS.find((p) => p.published && p.tag)?.tag;
  const total = selectionStats().total;

  return (
    <>
      {/* Both badges STRADDLE AN EDGE of the terminal rather than sitting over
          its face, and the offsets are picked so they do: a chip is about 25px
          tall, so -20px puts roughly 5px of it inside the card and the rest
          outside. That is what reads as a sticker stuck to the corner.

          The first attempt put this second badge at `top-24 -left-10`, which
          floated it across the middle of the card — directly over the
          contributor rank and the merged count. A decorative badge covering the
          real evidence is the worst possible arrangement of these two elements,
          and it is only obvious once rendered.

          Diagonally opposed rather than side by side on the top edge: two chips
          on one line read as a toolbar. */}
      {/* WRAPPER CARRIES POSITION AND VISIBILITY; the chip inside carries only
          its appearance. That split is not tidiness — putting `hidden
          lg:inline-block` on the chip itself DID NOT WORK, and failed silently.

          `.chip` declares `display: inline-block`, and globals.css is emitted
          after Tailwind's utilities layer, so at equal specificity the class
          beats `hidden`. Both badges therefore rendered at every width,
          absolutely positioned against a column that only exists at lg — on a
          390px phone the violet one sat at negative x, half off the left edge of
          the screen.

          Nothing reported it. `body` sets `overflow-x: hidden`, so the escaping
          element was clipped rather than made scrollable, and the QA sweep's
          overflow check looks for a document wider than the viewport — which it
          never was. It took looking at a phone screenshot. The wrapper is a
          plain span with no competing display rule, so `hidden` applies. */}
      {merged && (
        <span
          aria-hidden
          className="absolute -top-5 right-4 z-10 hidden animate-float lg:block"
        >
          <span className="chip chip-violet chip-true shadow-[0_8px_20px_rgba(0,0,0,0.12)]">
            🟣 {merged.label}
          </span>
        </span>
      )}
      {total > 0 && (
        <span
          aria-hidden
          // 1.5s of delay on a 3s cycle puts this chip exactly out of phase with
          // the one above. In phase they rise and fall together and read as one
          // rigid sheet sliding about; opposed, each looks independently buoyant.
          className="absolute -bottom-5 left-6 z-10 hidden animate-float lg:block"
          style={{ animationDelay: "1.5s" }}
        >
          {/* A status pill rather than a chip, so it wears the same black keyline
              and hard shadow as the buttons.

              The brief's example label is "⚡ Project Deployed!". This says what
              the club can actually show instead — the count comes from
              selectionStats(), so it cannot drift from the list below it, and
              "deployed" would be claiming a thing no entry in the content file
              records. Same shape, same lightning bolt, true. */}
          <span className="status-pill">⚡ {total} selected</span>
        </span>
      )}
    </>
  );
}

export default function Hero() {
  return (
    <header
      // THE TOP PAD HAS TO CLEAR THE FLOATING NAV, and pt-14 did not. The plate's
      // bottom edge sits at 4.25rem (0.75rem inset + 3.5rem plate), 4.5rem at sm+;
      // pt-14 is 3.5rem, so the eyebrow badge rendered UNDERNEATH the glass. It stayed
      // legible through the blur, which is exactly why it survived review for so long.
      // pt-24 is 6rem — the same figure `.page-top` gives every other route, so the
      // home page now starts where the rest of the site does.
      //
      // Deliberately the utility rather than `.page-top` itself: that class is declared
      // after @tailwind utilities, so it would beat `lg:pt-40` at equal specificity and
      // silently flatten the large-screen air. See the note over .page-top.
      className="section relative pb-10 pt-24 sm:pb-14 sm:pt-28 lg:pb-32 lg:pt-40"
      aria-label="Scaler Open Source Club"
    >
      {/* The ambient lighting. Two orbs rather than one, placed off the diagonal
          of the split below: a large one at the top-left behind the headline, a
          smaller one low on the right behind the terminal. One centred orb reads
          as a vignette; two off-axis read as light falling across the section.

          THE INSETS FOLLOW THE SAME RULE AS THE STICKERS — see the note over
          Sticker 1 in app/page.tsx. A negative inset only means "hang into the
          margin" where a margin exists, and `.section` caps at 88rem, so below
          about 1600px there is no gutter and a negative offset hangs off the
          screen instead. On the RIGHT that widens the document, which is exactly
          the defect that pass fixed; `body { overflow-x: hidden }` clips the
          strip so it never shows up as a scrollbar and nothing reports it.

          Only the right-hand orb needs gating on the INSET. In LTR the scrollable
          overflow region does not extend leftwards — content at negative x is
          clipped and unreachable, never scrolled to — so `-left-32` costs
          nothing at any width and the headline keeps its off-page light source
          everywhere.

          Losing the right-hand bleed below 1600px costs almost nothing anyway: a
          radial gradient that is fully transparent by 70% of its radius has no
          boundary to hide, so flush against the container it still pools inward
          as light rather than reading as a shape.

          THE SIZES ARE RESPONSIVE, and that is a bug fix rather than a
          refinement. A negative LEFT inset is safe, but the orb's own WIDTH is
          not: at 34rem the box is 544px, so pulled 128px left it still reached
          x=416 on a 390px viewport and dragged the document to 417. The QA sweep
          caught it as one page overflow plus four elements, and the nav was among
          them — a `position: fixed` header sizes to the layout viewport, which on
          mobile widens to the overflow, so an invisible decoration in the hero was
          stretching the plate at the top of the screen. Nothing visible would
          have shown it; `body { overflow-x: hidden }` clips the strip.

          Smaller on a phone is the better design anyway. A 544px blur on a 390px
          screen is not lighting, it is a flat tint over the whole section.

          These sit behind the header's own content at z-index -1 and cannot be
          hit — see `.glow-orb`. */}
      <Glow className="-left-32 -top-16 h-[20rem] w-[20rem] sm:h-[34rem] sm:w-[34rem]" />
      {/* 1664px, up from 1600px, for the same reason as the gutter gate in Note.tsx:
          `.section` went from 80rem to 88rem, so the gutter is now (viewport - 1408)/2
          and a 96px `-right-24` needs 1408 + 2*104 = 1616 before it fits. The
          left-hand Glow above needs no gate at any width — negative LEFT offsets are
          clipped without extending scrollWidth, so only the right edge can widen the
          document. */}
      <Glow className="right-0 top-64 h-[16rem] w-[16rem] sm:h-[26rem] sm:w-[26rem] min-[1664px]:-right-24" />

      {/* THE SPLIT. 3fr/2fr is the brief's 60/40, and it only exists at lg —
          below that the terminal stacks under the argument, which is the right
          order on a phone: the claim first, the evidence under it.

          `items-center` rather than `items-start`: the left column is taller
          than the terminal at every width where both are side by side, and
          top-aligning them left the terminal hanging off the top with a well of
          empty space beneath it — the exact fault this pass is fixing, moved
          from the right margin into the right column. */}
      <div className="grid items-center gap-14 lg:grid-cols-[3fr_2fr] lg:gap-8">
        <div>
          {/* Just the eyebrow. A crown doodle used to sit over it — one of several
              small decorations stacked through this hero, which is the crowding the
              club's own members reported next to /join. The terminal and the commit-log
              mark stay, because those two carry the argument; the trinkets around them
              did not. */}
          <span className="chip">Scaler School of Technology</span>

          {/* Two tones mid-headline is what stops display type at this size
              reading as a wall of letters.

              The vw coefficient dropped from 8.5 to 6.5 and the ceiling from
              6.5rem to 5.5rem, because the headline no longer has the full
              measure to fill — it has 60% of it. At the old numbers OPEN SOURCE
              set at 104px in a 720px column and wrapped to two lines with
              SOURCE alone on the second, which reads as a break the designer
              did not choose. It now holds one line from about 1150px up. */}
          {/* 1.02 rather than the 0.95 this carried. Sub-1.0 leading is affordable
              only where the type never wraps — and this wraps to two lines below
              about 1150px, which is most phones. At 0.95 "OPEN" and "SOURCE" stacked
              with the O's very nearly touching. */}
          <h1 className="mt-4 font-display text-[clamp(2.875rem,calc(6.5vw_+_0.125rem),5.625rem)] font-bold uppercase leading-[1.02] tracking-[-0.03em] text-ink">
            Open <span className="text-accent">Source</span>
          </h1>

          {/* Kept a shade tighter than Duo's 1.22: this paragraph carries a lozenge,
              and `.lozenge` pins its own line-height at 1.15 precisely so a padded
              pill does not prise one line of a paragraph open wider than its
              neighbours. Too much leading here and the pill stops looking set into
              the sentence. */}
          <p className="mt-4 text-display-lg font-bold leading-[1.18] tracking-tight text-ink text-balance">
            We put student names in the{" "}
            {/* A tinted pill rather than the yellow marker stroke. The phrase is
                the claim, so it gets lifted out of the sentence entirely — and
                unlike a gradient highlighter, a flat fill is a contrast pair
                anything can measure. See .lozenge in globals.css. */}
            {/* The flex row, the gap and the nowrap all live in `.lozenge` — see
                the note there for why they cannot be utilities here. */}
            <span className="lozenge lozenge-warm">
              <Icon name="git-merge" size="0.8em" strokeWidth={2.5} />
              commit log
            </span>
            .
          </p>

          {/* No `.measure` here any more. Inside a 60% column the paragraph is
              already held to a readable line by the grid itself, and stacking a
              44em cap on top of that would have re-created the narrow column
              this pass exists to remove. */}
          {/* ONE LOZENGE, NOT TWO. "commit log" above keeps its pill because it is the
              claim the club is making. A second pill on "get paid" turned a mark into a
              pattern, and two filled highlights three lines apart fight each other for
              the eye — which is most of why this hero read as busy.

              The `<Term>` tooltips on Google and Linux are gone too. A dotted underline
              invites a hover that answers "Yes, that Google" — a joke that costs the
              reader a decision and tells them nothing they did not already know. */}
          <p className="mt-4 text-body-lg text-haze">
            Members contribute to the projects the world already runs on, and get paid by
            Google, the Linux Foundation and others to do it. Every claim on this page is
            a link you can open.
          </p>

          {/* gap-3 on a phone, gap-4 above it: at 390px these two wrap to one
              line each, and a 16px gutter between stacked buttons is a gap
              rather than a pair. */}
          <div className="relative mt-5 flex flex-wrap items-center gap-3 sm:mt-10 sm:gap-4">
            {/* The drawn arrow replaces the "→" character this carried. Same
                shape, three differences that matter: it takes the button's
                weight instead of the font's, it cannot fall back to a missing
                glyph, and it can move on hover independently of the label —
                which is what `group-hover:translate-x-1` below is doing. */}
            <Link href="/hall-of-fame" className="btn btn-pop group gap-2">
              See who got in
              <Icon
                name="arrow-right"
                size="1.05em"
                strokeWidth={2.75}
                className="transition-transform duration-200 ease-in-out group-hover:translate-x-1"
              />
            </Link>
            <CelebrateLink href="/join" className="btn btn-secondary">
              Join the club
            </CelebrateLink>

          </div>
        </div>

        {/* The right 40%. `relative` so the floating badges anchor to this
            column rather than to the whole hero — anchored to the header they
            would drift as the left column's height changed. */}
        <div className="relative">
          <FloatingBadges />
          <Terminal />
        </div>
      </div>
    </header>
  );
}
