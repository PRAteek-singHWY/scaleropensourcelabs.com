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
import Icon from "@/components/Icon";
import CelebrateLink from "@/components/fx/CelebrateLink";
import Glow from "@/components/fx/Glow";


export default function Hero() {
  return (
    <header
      // THE TOP PAD HAS TO CLEAR THE FLOATING NAV, and pt-14 did not. The plate's
      // bottom edge is at 4.25rem (0.75rem inset + 3.5rem plate), 4.5rem at sm+;
      // pt-14 is 3.5rem, so the eyebrow badge rendered UNDERNEATH the glass. It was
      // legible enough through the blur to survive review, which is exactly why it
      // lasted. pt-24 is 6rem — the same number `.page-top` uses on every other
      // route, so the home page now starts where the rest of the site does.
      //
      // Deliberately the utility and not `.page-top` itself: that class is declared
      // after @tailwind utilities, so it would beat `lg:pt-40` at equal specificity
      // and silently flatten the large-screen air. See the note over .page-top.
      //
      // THE BOTTOM PAD CAME DOWN FROM lg:pb-32 TO lg:pb-16 for a reason that only
      // appeared once the terminal left: 8rem of hero padding plus the next section's
      // own 8rem top pad left a 270px void under the buttons. That was invisible while
      // a 500px-tall terminal held the right-hand column open, and it is the same
      // "well of empty space" the note on the old grid warned about — moved from
      // beside the copy to underneath it.
      className="section relative pb-10 pt-24 sm:pb-12 sm:pt-28 lg:pb-16 lg:pt-40"
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
      {/* ONE COLUMN, NOT TWO. The 3fr/2fr split existed to hold the terminal in the
          right-hand 40%; with that gone a grid would just reserve an empty column.
          `.measure` holds the copy to a readable line instead of letting it run the
          full 88rem — which is what /join does, and /join is the density this page is
          being brought back towards. */}
      <div className="measure">
        <div>
          {/* Just the eyebrow. A crown doodle used to sit over it — one of eleven
              decorative devices this hero carried, which is the crowding the club's own
              members reported. */}
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

          {/* PLAIN TYPE, NOT PILLS. "commit log" sat in a warm lozenge with a
              git-merge icon and "get paid" in a mint one with a dollar sign — two
              filled pills, two icons and two extra colours inside three lines of
              copy. The claim is carried by the words; the packaging was carrying
              nothing except attention away from them. The key phrases keep the
              accent so the sentence still has emphasis. */}
          <p className="mt-6 text-display-lg font-bold leading-[1.18] tracking-tight text-ink text-balance">
            We put student names in the{" "}
            <span className="text-accent">commit log</span>.
          </p>

          {/* The `<Term>` tooltips on Google and Linux are gone too. A dotted
              underline invites a hover that says "Yes, that Google" — a joke that
              costs the reader a decision and tells them nothing they did not
              already know. */}
          <p className="mt-5 text-body-lg text-haze">
            Members contribute to the projects the world already runs on, and get paid
            by Google, the Linux Foundation and others to do it. Every claim on this
            page is a link you can open.
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

        {/* THE TERMINAL IS GONE FROM THE HERO, with its two floating chips. A bash
            window running `git log` is the single most technical thing this site could
            open with, and the club's own members read the home page as too techy and
            too crowded next to /join.
            Nothing was lost by removing it: the terminal narrative already lives on
            /how-to-join, in a different component (components/Terminal.tsx), where
            somebody who wants to know what the work actually looks like will go. This
            hero's job is to say what the club does and offer two ways in.
*/}
      </div>
    </header>
  );
}
