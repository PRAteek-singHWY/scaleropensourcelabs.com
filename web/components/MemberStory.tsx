"use client";

// Member stories, as a rail of full-screen blue testimonial slides.
//
// This section used to render exactly one story, and the argument for that is
// still worth knowing: a row of quotes reads as marketing and gets discounted as
// a set, where one long account from a named person reads as somebody talking.
// Slides that each fill the viewport get most of that back — you are only ever
// looking at one person at a time. What keeps it honest is unchanged: a name, the
// situation at the time, a link to the thing being described where there is one,
// and the member's own words with nothing tidied into the site's voice.
//
// THERE IS NO PORTRAIT. It was a monogram disc for everybody, since none of these
// members has a photo on file, and a slide built around an empty frame advertises
// the missing photograph rather than the words next to it. The quote is the slide.
//
// ONE SLIDE IS EXACTLY ONE RAIL WIDTH, which is why the slides are `w-full` and
// not `w-screen`: a flex item's percentage width resolves against the flex
// container, so this tracks the scroller's own box. 100vw includes the vertical
// scrollbar gutter and would leave every slide a sliver wide of the viewport.
//
// IT ADVANCES A WHOLE SLIDE AT A TIME, and does not creep. The first version of
// this drifted continuously — a slow constant scroll — and that is the wrong
// motion for the content: a testimonial is one person's account, so it is either
// on screen or it is not, and text that never stops moving cannot be read at all.
// So the rail sits still for DWELL_MS, moves one slide, and sits still again.
// `scroll-snap-type` in globals.css holds a human drag to the same rule.
//
// THE LOOP IS TWO COPIES OF THE LIST, the same mechanic as `.ticker`. Advancing
// off the end of copy one lands on the identical slide in copy two, and the
// position is folded back by one turn once the animation settles — an instant
// jump between two pixel-identical states, so there is no seam to see. The wrap
// distance is measured off the DOM (the clone's first slide minus the real first
// slide) rather than computed from widths, so it stays exact at any viewport.
//
// STOPPING IT. Hover parks it, which is what was asked for. Focus parks it too,
// so a keyboard reaching the arrows or a link inside a slide is not reading a
// moving target, and a drag parks it until the finger is up. Leaving restarts the
// clock from a full dwell rather than resuming a part-spent one — being dropped
// onto the next person half a second after you look away is worse than waiting.
// There is no pause button by request; worth knowing that WCAG 2.2.2 asks for an
// explicit control over motion that runs for more than five seconds, so hover
// plus focus is the mitigation here rather than the answer. Under
// prefers-reduced-motion nothing advances on its own and the arrows jump instead
// of gliding, which leaves an ordinary snapping scroller.

import { useCallback, useEffect, useRef, useState } from "react";

import { publishedStories, type Story } from "@/content/essence";

/**
 * How long a testimonial holds still before the rail moves to the next one.
 *
 * It is a hold, not a speed: the slide is stationary for all of it, and the move
 * itself is the browser's own smooth scroll on top. Three seconds is shorter than
 * it takes to read two paragraphs, so the rail is a trailer for the section
 * rather than a way through it — the arrows are how somebody actually reads one.
 */
const DWELL_MS = 3000;

/**
 * Which way the rail advances on its own. 1 moves forward through the stories, so
 * slides leave to the left and the next arrives from the right — the direction
 * the right-hand arrow goes, and the direction the words are read in. Flip to -1
 * to walk it backwards.
 */
const DIRECTION = 1;

/**
 * Below this many stories there is nothing to loop: two copies of a two-slide
 * list would put a visible duplicate on screen beside the original. The rail is
 * then a plain scroller with no clones, no drift and no arrows.
 */
const MIN_TO_LOOP = 3;

function reduced(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * One testimonial, filling the screen.
 *
 * ALL THE TYPE IS WHITE, and the hierarchy is carried by size and weight rather
 * than by fading the secondary lines. On this blue, white is 6.98:1 and white at
 * 75% is about 4.4 — under the floor for the situation line, which is the
 * smallest text here. Type does the job the tint was doing, for free.
 *
 * The clone copy is `aria-hidden` and its links leave the tab order: it exists to
 * make the wrap seamless, and a screen reader or a Tab key finding six people
 * twice would be reporting the trick rather than the content.
 */
function Slide({
  story,
  clone = false,
  innerRef,
}: {
  story: Story;
  clone?: boolean;
  innerRef?: React.Ref<HTMLLIElement>;
}) {
  return (
    <li
      ref={innerRef}
      aria-hidden={clone || undefined}
      // A FLOOR, NOT A FIXED HEIGHT. It was `h-` while the portrait was sized as
      // a percentage of it — a percentage needs something definite to be a
      // percentage OF — and the cost was that a quote taller than the box was
      // cut off by it, which on a 700px-tall window took the first line and the
      // batch off the longer stories. With the portrait gone nothing needs the
      // exact number, so the clamp becomes the shortest a slide may be. The rail
      // stretches every slide to the tallest of them (align-items: stretch), so
      // the panel is still one height and still does not jump between people.
      //
      // The clamp is 60% of the band this section first shipped with
      // (32/76vh/42rem): the panel was taller than the words needed, so the
      // extra was empty blue above and below a centred stack.
      className="stories-slide w-full shrink-0 lg:min-h-[clamp(19.2rem,45.6vh,25.2rem)]"
    >
      {/* `justify-center` centres the words vertically in the slide; the figure's
          own mx-auto centres them across it. Nothing is pinned to the left edge
          any more, which is also what keeps the words off the arrows: a centred
          56rem measure leaves ~190px of blue either side at lg, and the arrows'
          targets end 72px in. */}
      {/* pb-28 below lg is not decoration: it is the landing strip the arrows sit
          in once they drop to the bottom corner. */}
      <div className="section flex h-full flex-col justify-center pb-28 pt-16 lg:py-0">
        {/* Wider than the 46rem it ran at beside a portrait: with the column gone
            the quote has the slide to itself, and 56rem keeps a paragraph to
            about eleven words a line — long enough not to waste the panel, short
            enough to still be a readable measure. */}
        <figure className="mx-auto min-w-0 text-center lg:max-w-[56rem]">
          {/* THE QUOTATION MARKS ARE THE WHOLE DEVICE. The hairline rule that used
              to run down the left went with the left alignment — a rule down one
              side of centred text is a margin the text no longer has. No giant
              decorative quote glyph either: a student describing a confusing month
              does not want to be typeset as an inspirational poster. The marks
              open on the first paragraph and close on the last, which is the
              convention for a quote that runs over several.

              SET IN THE DISPLAY FACE, and font-medium is not optional with it —
              Space Grotesk is loaded at 500 and 700 only (see layout.tsx), so an
              unstated 400 renders as a synthetic light of the 500 master. */}
          <blockquote className="space-y-5 font-display font-medium">
            {story.quote.map((para, i) => (
              <p key={i} className="text-body-lg text-white">
                {i === 0 ? "“" : ""}
                {para}
                {i === story.quote.length - 1 ? "”" : ""}
              </p>
            ))}
          </blockquote>

          <figcaption className="mt-9">
            <p className="text-body-lg font-display font-bold text-white">
              {story.name}
            </p>
            <p className="mt-1.5 font-mono text-xs uppercase tracking-[0.16em] text-white">
              {story.situation}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
              {story.github && (
                <a
                  href={`https://github.com/${story.github}`}
                  target="_blank"
                  rel="noreferrer"
                  tabIndex={clone ? -1 : undefined}
                  className="tap font-mono text-xs text-white underline decoration-white/50 underline-offset-4 transition hover:decoration-white"
                >
                  GitHub ↗
                </a>
              )}
              {story.proof && (
                <a
                  href={story.proof.url}
                  target="_blank"
                  rel="noreferrer"
                  tabIndex={clone ? -1 : undefined}
                  className="tap font-mono text-xs text-white underline decoration-white/50 underline-offset-4 transition hover:decoration-white"
                >
                  {story.proof.label} ↗
                </a>
              )}
            </div>
          </figcaption>
        </figure>
      </div>
    </li>
  );
}

/**
 * An arrow, over the slide rather than over the page.
 *
 * 48px of disc inside a 56px target: this sits on top of a slide that moves under
 * it, so it has to be big enough to read as a control at a glance, and the target
 * still clears the 44px WCAG 2.5.5 floor with room. The glyphs are aria-hidden — the button
 * takes its whole accessible name from the label.
 *
 * EDGES AT lg, A PAIR IN THE BOTTOM CORNER BELOW IT. Pinned left and right at the
 * vertical centre, the two of them land squarely on the paragraph on a 390px
 * phone: unreadable text under a control, and a control that is hard to hit
 * without selecting the text behind it. There is no width to inset the words out
 * of the way at that size, so the arrows move instead — down into the padding the
 * slide already reserves below the attribution.
 */
function Arrow({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`group absolute z-10 flex h-14 w-14 items-center justify-center lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 ${
        side === "left"
          ? "bottom-5 left-3 lg:left-4"
          : "bottom-5 left-[4.75rem] lg:left-auto lg:right-4"
      }`}
    >
      <span
        aria-hidden
        className="stories-arrow flex h-12 w-12 items-center justify-center rounded-full text-lg leading-none"
      >
        {side === "left" ? "←" : "→"}
      </span>
    </button>
  );
}

export default function MemberStory() {
  const stories = publishedStories();
  const loop = stories.length >= MIN_TO_LOOP;

  const rail = useRef<HTMLUListElement>(null);
  const first = useRef<HTMLLIElement>(null);
  const cloned = useRef<HTMLLIElement>(null);

  /** Distance from a slide to its own clone: one full turn of the rail. */
  const period = useRef(0);
  /** True while our own smooth scroll is in flight, so nothing else touches it. */
  const moving = useRef(false);
  const settle = useRef<number | undefined>(undefined);
  const tidy = useRef<number | undefined>(undefined);

  /** Hover or focus. */
  const [held, setHeld] = useState(false);
  /** A finger or a pointer is on the rail. */
  const [dragging, setDragging] = useState(false);

  // The wrap distance, measured rather than derived — a slide is a viewport wide,
  // so this changes on every resize and on every phone rotation.
  useEffect(() => {
    if (!loop) return;
    const measure = () => {
      const a = first.current;
      const b = cloned.current;
      period.current = a && b ? b.offsetLeft - a.offsetLeft : 0;
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (rail.current) ro.observe(rail.current);
    return () => ro.disconnect();
  }, [loop]);

  useEffect(
    () => () => {
      window.clearTimeout(settle.current);
      window.clearTimeout(tidy.current);
    },
    [],
  );

  /**
   * Fold the position back into the first copy of the list.
   *
   * The two copies are pixel-identical, so subtracting one turn is invisible —
   * and it is what stops the rail walking off the end of the clones after six
   * advances. Never call it while a smooth scroll is running: assigning
   * scrollLeft mid-animation cancels the animation.
   */
  const rewind = useCallback(() => {
    const el = rail.current;
    const turn = period.current;
    if (!el || !turn) return;
    if (el.scrollLeft >= turn) el.scrollLeft -= turn;
    else if (el.scrollLeft < 0) el.scrollLeft += turn;
  }, []);

  const advance = useCallback(
    (dir: 1 | -1) => {
      const el = rail.current;
      if (!el) return;

      const turn = period.current;
      // Every slide is the same width, so one turn over the story count is
      // exactly one slide.
      const step = turn ? turn / stories.length : el.clientWidth;
      const instant = reduced();

      // Going back from the very start would hit the left edge and stop. Jump a
      // whole turn forward first — identical content, so nothing visibly moves —
      // and there is a copy behind us to scroll into.
      if (turn && dir < 0 && el.scrollLeft < step / 2) el.scrollLeft += turn;

      moving.current = true;
      el.scrollBy({ left: dir * step, behavior: instant ? "auto" : "smooth" });

      window.clearTimeout(settle.current);
      settle.current = window.setTimeout(
        () => {
          // Land on the boundary exactly. Snap normally does this, and rounding
          // here is the belt: without it a half-pixel of error per advance
          // accumulates until slides sit visibly off the edge.
          if (step) el.scrollLeft = Math.round(el.scrollLeft / step) * step;
          rewind();
          moving.current = false;
        },
        instant ? 0 : 700,
      );
    },
    [rewind, stories.length],
  );

  // THE CLOCK. One timer, cleared and rebuilt whenever the rail is parked, so
  // leaving a hover starts a fresh dwell rather than firing the remainder of an
  // old one. prefers-reduced-motion is read here rather than at mount, so the
  // preference takes effect without a reload.
  useEffect(() => {
    if (!loop || held || dragging) return;
    if (typeof window !== "undefined" && reduced()) return;
    const id = window.setInterval(() => advance(DIRECTION), DWELL_MS);
    return () => window.clearInterval(id);
  }, [loop, held, dragging, advance]);

  // A drag or a trackpad flick can leave the rail parked inside the clone copy.
  // Snap lands it on a slide; this puts that slide back in the first copy once
  // the scrolling has stopped, and stays out of the way while we are the ones
  // scrolling.
  useEffect(() => {
    const el = rail.current;
    if (!el || !loop) return;
    const onScroll = () => {
      if (moving.current) return;
      window.clearTimeout(tidy.current);
      tidy.current = window.setTimeout(rewind, 220);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [loop, rewind]);

  // A pointer released anywhere ends the drag, not just one released on the rail.
  // The delay lets touch momentum and the snap that follows it finish before the
  // clock starts again.
  useEffect(() => {
    if (!dragging) return;
    const release = () => window.setTimeout(() => setDragging(false), 600);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [dragging]);

  if (stories.length === 0) return null;

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label="What members said, in their own words"
      className="stories mt-12"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      // Focus and blur bubble in React, so this covers a Tab landing on any link
      // inside a slide as well as on the arrows.
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      onPointerDown={() => setDragging(true)}
    >
      <ul ref={rail} className="stories-rail">
        {stories.map((story, i) => (
          <Slide
            key={story.name}
            story={story}
            innerRef={i === 0 ? first : undefined}
          />
        ))}
        {loop &&
          stories.map((story, i) => (
            <Slide
              key={`clone-${story.name}`}
              story={story}
              clone
              innerRef={i === 0 ? cloned : undefined}
            />
          ))}
      </ul>

      {loop && (
        <>
          <Arrow side="left" label="Previous story" onClick={() => advance(-1)} />
          <Arrow side="right" label="Next story" onClick={() => advance(1)} />
        </>
      )}
    </div>
  );
}
