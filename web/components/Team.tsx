// The team, as an actual org chart.
//
// WHY A CHART AND NOT A GRID
// A grid of faces answers "who is important". A chart answers "who do I ask",
// which is the only question a reader of this section actually has. The club's
// functional leads have genuinely different remits — if you want your PR reviewed
// you want the Repo Maintainer, not the President — and a flat grid destroys
// exactly that information. So the structure is the content here, and the lines
// are load-bearing rather than decorative.
//
// WHY THE GRID HAS NO GAP
// This is the one decision the whole component rests on, so it is worth stating
// plainly: `grid-cols-N` with NO gap, and the visual separation comes from padding
// inside each cell instead.
//
// The reason is that every connector is positioned as a percentage of the grid's
// width, and those percentages are only exact when the columns tile the container
// with nothing between them. With a gap, a column's centre is
// `c/2 + i*(c+g)` — a function of the gap, which is itself a function of the
// breakpoint — so a line at `left: 12.5%` would sit a few pixels off its card, in
// a direction and by an amount that changes as the window resizes. That is the
// classic way a hand-built org chart ends up with connectors that visibly miss.
// Zero gap makes the arithmetic exact and viewport-independent:
//
//   3 leads  ->  lead cards centred at 16.67 / 50 / 83.33 %
//                officers straddling the seams between them, at 33.33 / 66.67 %
//
// And the fact that makes the hardest connector possible: an officer's centre
// always lands on a lead-column BOUNDARY. So the dashed line from the Vice
// President down to their shadow two tiers below drops perfectly straight and
// passes BETWEEN the Repo Maintainer and Events Lead cards without touching
// either. No elbows, no routing.
//
// That invariant is why the grid is measured in units FINER than one lead column
// (see LEAD_SPAN below) rather than one-column-per-lead: an officer centred on a
// seam needs to start half a lead-column early, which is only an integer number of
// tracks if a lead column is itself several tracks wide. The old version divided
// the column count by the officer count instead, which produced `span 1.5` — and
// therefore a silently broken row — the moment the lead count stopped being even.
//
// WHY SHADOW LINES ARE DASHED
// A shadow is not a subordinate — it is an understudy for one specific role. Those
// are different relationships, so they get different strokes, and the difference
// also resolves the one place the two kinds of line must cross (the VP's shadow
// line crosses the leads' horizontal rail). A dashed line crossing a solid one
// reads as two relationship types; two solid lines crossing reads as a mistake.
//
// The relationship is never carried by the line ALONE, though — each shadow card
// names its role in text ("Shadow — Vice President"). A reader on a phone gets the
// stacked list instead of the chart, and a screen reader gets only that list, so
// the geometry has to be a redundant encoding of something already written down.
//
// WHY A DESK IS NOT A FOURTH ROW OF THE SAME KIND
// Under the leads there is one more shape: a desk — several people doing one job
// together under a lead, with no office between them. It is drawn as a band below
// the shadow tier: a drop from the lead, a label naming the desk, then a rail out
// to a circle per member. The label is the point. Four unlabelled faces hanging off
// the Repo Maintainer would read as four more shadows, and the difference between
// "training to take this role" and "does this work" is exactly the sort of thing a
// chart is supposed to make visible. The members' circles carry no designation for
// the same reason — the label above them already says it, once, for all four.
//
// Zero JavaScript: no state, no measurement, no canvas. Server component.

import Portrait from "@/components/Portrait";
import {
  TEAM_CONTENT,
  TEAM_LEADS,
  TEAM_OFFICERS,
  TEAM_SHADOWS,
  type Highlight,
  type TeamMember,
} from "@/content/club";

const LEAD_COUNT = TEAM_LEADS.length;
const OFFICER_COUNT = TEAM_OFFICERS.length;

/* Grid tracks per lead column, and the whole reason the grid is not simply one
   column per lead: an officer sits centred on a SEAM between two lead columns, so
   its cell starts half a lead column to the left of that seam. An even LEAD_SPAN
   makes that half an integer number of tracks, for any lead count. */
const LEAD_SPAN = 2;
const COLS = LEAD_COUNT * LEAD_SPAN;
const OFFICER_SPAN = LEAD_SPAN;

/** Centre of a cell, as a percentage of the grid width. Exact only at zero gap. */
function centre(colStart: number, span: number): number {
  return ((colStart - 1 + span / 2) / COLS) * 100;
}

const LEAD_COL = TEAM_LEADS.map((_, i) => i * LEAD_SPAN + 1);
const LEAD_X = LEAD_COL.map((col) => centre(col, LEAD_SPAN));

/* Officers are spread across the seams between lead columns — with 3 leads and 2
   officers, seams 1 and 2 of the 2 available; with 4 leads, seams 1 and 3 of 3,
   which is the 25% / 75% the previous version hard-derived. Assumes there are at
   least as many seams as officers (LEAD_COUNT > OFFICER_COUNT); below that, two
   officers would round onto the same seam and land on top of each other. */
const OFFICER_COL = TEAM_OFFICERS.map((_, i) => {
  const seam = Math.round(((i + 1) * LEAD_COUNT) / (OFFICER_COUNT + 1));
  return seam * LEAD_SPAN - LEAD_SPAN / 2 + 1;
});
const OFFICER_X = OFFICER_COL.map((col) => centre(col, OFFICER_SPAN));

/** Midpoint of the officer row — where the spine down to the leads hangs from. */
const SPINE_X = (OFFICER_X[0] + OFFICER_X[OFFICER_X.length - 1]) / 2;

/* Portrait diameters, fixed in rem rather than responsive, because the officer
   join line is drawn at `top: OFFICER_R` and inset horizontally by OFFICER_R —
   a diameter that changed per breakpoint would need those two values to change
   with it. The chart only renders at lg+, where a column is ≥240px, so one size
   holds. Size steps down per tier; that is the only hierarchy cue besides position.
   OFFICER_R MUST STAY HALF OF OFFICER_D. Nothing enforces it — it is a string —
   and getting it wrong does not error, it just slides the officers' rail off their
   circles' tangent points by the difference.

   Sized up a tier at a time from 7/6/4.5rem, because these circles now hold
   photographs rather than monograms and a 72px face is a thumbnail. The ceiling is
   the narrowest cell each tier lives in at the narrow end of lg (960px grid): a
   lead column is 320px and a desk column 240px, so even the largest of these keeps
   clear air either side of every caption. */
const OFFICER_D = "9rem";
const OFFICER_R = "4.5rem";
const LEAD_D = "8rem";
const SHADOW_D = "6.5rem";

/** How wide a card is allowed to get, cell permitting. Caption wrapping tolerates it. */
const CARD_MAX_W = "13.5rem";

type Placed = {
  member: TeamMember;
  /** Designation of the role being shadowed. Already resolved, so it exists. */
  principal: string;
  colStart: number;
  colSpan: number;
  /** Percentage across the grid where this card's connector runs. */
  x: number;
  /** True when the principal is an officer, so the line must cross the leads row. */
  crossesLeads: boolean;
};

/* `shadowOf` holds a DESIGNATION, resolved here against the tiers above. Deliberately
   not a name: roles outlast their holders, so a handover should not require
   re-pointing the shadow at whoever took the office. An unresolvable designation is
   dropped rather than guessed — a missing connector is a visible bug, whereas a
   card silently parked in column 1 would look correct and be wrong. */
const SHADOWS: Placed[] = TEAM_SHADOWS.map((m): Placed | null => {
  const officer = TEAM_OFFICERS.findIndex((o) => o.designation === m.shadowOf);
  if (officer >= 0) {
    return {
      member: m,
      principal: TEAM_OFFICERS[officer].designation,
      colStart: OFFICER_COL[officer],
      colSpan: OFFICER_SPAN,
      x: OFFICER_X[officer],
      crossesLeads: true,
    };
  }
  const lead = TEAM_LEADS.findIndex((l) => l.designation === m.shadowOf);
  if (lead >= 0) {
    return {
      member: m,
      principal: TEAM_LEADS[lead].designation,
      colStart: LEAD_COL[lead],
      colSpan: LEAD_SPAN,
      x: LEAD_X[lead],
      crossesLeads: false,
    };
  }
  return null;
}).filter((s): s is Placed => s !== null);

/* HOW WIDE A SHADOW CARD MAY GET, and why this tier needs its own answer.
   A shadow is centred on its principal's connector, not on the cell it is placed
   in, and two shadows can now be a mere half-column apart — an officer's shadow
   hangs off a seam, and a lead's shadow off the centre of the column beside it.
   Their cells therefore OVERLAP, and at 13.5rem each the captions collide at the
   narrow end of lg ("SHADOW — VICE SHADOW — EVENTS"). So the tier is capped by the
   closest pair of connectors instead: expressed against the cell rather than the
   grid, because that is what a percentage max-width resolves against. A lone
   shadow keeps the full width — with nothing to collide with, there is nothing to
   pay for. */
function shadowMaxWidth(): string {
  const xs = SHADOWS.map((s) => s.x).sort((a, b) => a - b);
  let closest = Infinity;
  for (let i = 1; i < xs.length; i++) {
    closest = Math.min(closest, xs[i] - xs[i - 1]);
  }
  if (!Number.isFinite(closest)) return CARD_MAX_W;
  const cell = (LEAD_SPAN / COLS) * 100;
  return `min(${CARD_MAX_W}, ${((closest / cell) * 100).toFixed(3)}%)`;
}

const SHADOW_MAX_W = shadowMaxWidth();

/* ---------------------------------------------------------------------------
   THE DESK TIER. A desk hangs off one lead and is drawn as a band under the
   chart: a drop from that lead's column down to the desk's label, then a rail
   from the label out to one circle per member.

   WHY THE MEMBERS GET THEIR OWN NESTED GRID instead of columns of the outer one.
   Four members do not divide COLS into integers, and every connector on this
   chart is a percentage that is only exact when a card's centre is one. Nesting
   a `repeat(n, 1fr)` grid that spans all COLS at zero gap puts a member's centre
   at `(i + 0.5)/n` of the SAME box the outer percentages resolve against — so it
   stays exact for any number of members, without forcing LEAD_SPAN up to a
   multiple of the desk size.

   The drop is SOLID, not dashed: dashed is spoken for, and the key at the foot
   of this section defines it as "shadow". A desk reports to the lead; it is not
   training to replace them.

   Resolved by designation and dropped if it does not resolve, for the same
   reason shadows are — a missing connector is a visible bug, a card parked in
   column 1 is an invisible one. */
const DESK_LEAD = TEAM_LEADS.findIndex((l) => l.designation === TEAM_CONTENT.of);
const DESK = DESK_LEAD >= 0 ? TEAM_CONTENT : null;
const DESK_X = DESK_LEAD >= 0 ? LEAD_X[DESK_LEAD] : 0;
const DESK_MEMBER_X = TEAM_CONTENT.members.map(
  (_, i) => ((i + 0.5) / TEAM_CONTENT.members.length) * 100,
);
/* Matched to SHADOW_D, not derived from it, and they are the same number for a
   reason worth keeping: a desk member and a shadow are both one tier below a lead,
   so equal circles say "same distance from the office" — which is true — while the
   solid-versus-dashed connector carries the difference between them. */
const DESK_D = "6.5rem";

/* ---------------------------------------------------------------------------
   Line primitives. Hairlines drawn as borders on absolutely positioned divs
   inside a `relative` grid item, so they inherit the seam token and follow the
   theme like every other rule on the page.
   --------------------------------------------------------------------------- */

const SOLID = "border-seam";
const DASHED = "border-dashed border-dust/50";

/* The `.label` LOOK without the `.label` CLASS, and the distinction is deliberate.
   Outline names each section after the first `.label` it finds inside it, falling
   through to aria-label only if there is none — so designation captions written as
   `.label` put this section in the page outline as "President". These are the same
   declarations that class carries (0.875rem / 0.07em / dust), just under a selector
   Outline does not treat as a section title.
   Note the size: the `label` FONT-SIZE token in tailwind.config is 0.6875rem/0.18em,
   which is a different thing from the `.label` class in globals.css. Matching the
   class means spelling both values out.
   It also removes a workaround — with no `.label` specificity to beat, the officer
   tint is a plain `text-accent` rather than an inline style. */
const CAPTION =
  "font-label text-[1rem] font-semibold uppercase leading-[1.2] tracking-[0.07em]";

function VLine({
  x,
  className = "",
  style,
  dashed = false,
}: {
  x: number;
  className?: string;
  style?: React.CSSProperties;
  dashed?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`absolute border-l ${dashed ? DASHED : SOLID} ${className}`}
      style={{ left: `${x}%`, ...style }}
    />
  );
}

/** The designation-then-name caption, in that order, under every portrait.
    Designation is optional because a desk member holds no office — the desk's
    own label, one row up, is the title for all four of them, and repeating
    "CONTENT" over every face would state it four more times than it is true. */
function Caption({
  designation,
  name,
  tone = "quiet",
}: {
  designation?: string;
  name: string;
  tone?: "loud" | "quiet";
}) {
  return (
    <>
      {designation && (
        <p
          className={`${CAPTION} mt-4 ${tone === "loud" ? "text-accent" : "text-dust"}`}
        >
          {designation}
        </p>
      )}
      <p
        className={`${designation ? "mt-1.5" : "mt-4"} text-body font-semibold leading-snug text-ink`}
      >
        {name}
      </p>
    </>
  );
}

/* A person's own record, as a list.
   Used twice — inside the hover card and inside the stacked list — with the LOOK
   coming from whichever ancestor it lands in rather than from a prop. That is what
   `.person-tip-list` and `.person-list` are for: the markup either way is a list
   whose bullets are the emoji the content already carries, and nothing about the
   structure changes between a card floating over a dark fill and a block of page
   copy. One renderer means Arnav cannot end up with six highlights on the chart and
   four on a phone.

   `<b>` and `<span>` rather than classed elements, because the two ancestors style
   them differently and there is nothing else inside this list to confuse them with.
   The emphasis appears only when there is a `detail` — see the CSS for why a card of
   uniformly bold sentences was the alternative. */
function Highlights({
  items,
  className = "person-tip-list",
}: {
  items?: Highlight[];
  className?: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <ul className={className}>
      {items.map((h) => (
        <li key={h.headline}>
          {h.detail ? (
            <>
              <b>{h.headline}</b> <span>— {h.detail}</span>
            </>
          ) : (
            h.headline
          )}
        </li>
      ))}
    </ul>
  );
}

/* WHICH EDGE A HOVER CARD OPENS FROM, derived from the position the chart has
   already computed for that node's connector rather than from its column index —
   the desk members are in a nested grid and have no index into the outer one, so
   the percentage is the only thing every tier has in common.
   The thresholds are the card's own half-width expressed as a share of the grid:
   at 24rem a half is comfortably under a sixth of the chart, so a node inside the
   middle third can always be centred, and only the outer thirds need anchoring.
   Anchoring is to the NEAR edge — a node on the left opens rightwards — which is
   what keeps the card on the page. See .person-tip in globals.css. */
function align(x: number): "start" | "center" | "end" {
  if (x < 100 / 3) return "start";
  if (x > 200 / 3) return "end";
  return "center";
}

/** A node on the chart. Circular frame; Portrait draws a monogram when photo is absent. */
function Node({
  member,
  diameter,
  designation,
  remit,
  tone = "quiet",
  priority = false,
  maxWidth = CARD_MAX_W,
  tip = "above",
  tipAlign = "center",
}: {
  /* Widened past TeamMember so a desk member — a name, and nothing the club has
     to assert about them — can be drawn by the same function. */
  member: {
    name: string;
    photo?: string;
    github?: string;
    remit?: string;
    batch?: string;
    highlights?: Highlight[];
  };
  diameter: string;
  designation?: string;
  /** Overrides member.remit. A desk's remit belongs to the desk, not the person. */
  remit?: string;
  tone?: "loud" | "quiet";
  priority?: boolean;
  maxWidth?: string;
  /** Which side of the portrait the hover card opens on. See .person-tip. */
  tip?: "above" | "below";
  /** Which edge it is anchored to, so a card near the chart's edge stays on the page. */
  tipAlign?: "start" | "center" | "end";
}) {
  return (
    <div
      className="mx-auto flex flex-col items-center px-3 text-center"
      style={{ maxWidth }}
    >
      {/* THE HOVER TARGET, and the reason the portrait is now two nested divs
          rather than one. The frame below has `overflow-hidden` to clip the photo
          to a circle, which would clip the remit bubble to that same circle — so
          the bubble has to hang off an unclipped wrapper sized to exactly the
          portrait. Sized to the portrait rather than the card on purpose: the
          pointer gets an answer about the face it is on, and the GitHub link and
          caption below stay hoverable without a bubble covering them.
          `relative` anchors .person-tip; `.person` is what its hover selector
          hooks, and it is a plain class rather than Tailwind's `group` because
          this component nests no other groups and the CSS lives in globals.css
          beside the two tooltips it is modelled on. */}
      <div
        className="person relative shrink-0"
        style={{ width: diameter, height: diameter }}
      >
        {/* container-type is required, not stylistic: Portrait's monogram fallback
            sizes its initials in cqw, and without a container it resolves against
            the viewport and renders the letters at hero scale inside a 112px circle. */}
        {/* `person-frame` is the hover-brighten target. It is on this element and
            not the <img> inside it so a monogram lifts too — see globals.css. */}
        <div className="person-frame [container-type:inline-size] h-full w-full overflow-hidden rounded-full ring-1 ring-seam">
          <Portrait
            name={member.name}
            photo={member.photo}
            priority={priority}
            className="h-full w-full"
          />
        </div>
        {/* aria-hidden, and not a loss: the chart above is a single `role="img"`,
            so nothing inside it reaches the accessibility tree anyway. All of this
            is read out from the stacked list below, where it is plain text rather
            than a hover state — which is also what a touch device gets, since the
            chart only renders at lg+ and hover does not exist on a phone. */}
        <div
          aria-hidden
          className="person-tip"
          data-tip={tip}
          data-align={tipAlign}
        >
          {member.batch && (
            <p className="person-tip-batch">Batch {member.batch}</p>
          )}
          <p className="person-tip-remit">{remit ?? member.remit}</p>
          <Highlights items={member.highlights} />
        </div>
      </div>
      <Caption designation={designation} name={member.name} tone={tone} />
      {member.github && (
        // mt-2 on the wrapper — same `.tap` source-order trap as in Mentors.tsx, and
        // latent for the same reason: no TEAM_* entry carries a github handle yet.
        <div className="mt-2">
          <a
            href={`https://github.com/${member.github}`}
            target="_blank"
            rel="noreferrer"
            className="tap inline-block font-mono text-xs text-haze hover:text-accent"
          >
            @{member.github}
          </a>
        </div>
      )}
    </div>
  );
}

/** How a shadow's role is written out, so the line is never the only statement of it. */
function shadowLabel(s: Placed): string {
  return `${s.member.designation} — ${s.principal}`;
}

export default function Team() {
  return (
    <>
      {/* ---- The chart. lg+ only ---------------------------------------------
          Four columns of people do not fit on a phone at any type size that stays
          legible, and a horizontally scrolling org chart is worse than no chart.
          Below lg the stacked list takes over. Both are `display:none` at the other
          breakpoint, which also keeps the accessibility tree to exactly one copy. */}
      {/* THE HINT, and why it is a sibling of the chart rather than page copy in
          team/page.tsx. It is only true at lg+ — below that there is no hover and
          no chart, and the remits are written out as plain text in the stacked
          list — so it has to disappear on exactly the breakpoint the chart does,
          which is a fact about this component and not about the page.
          Set like the shadow key at the foot of the section, deliberately: the two
          are the same kind of line (how to read the thing above or below it), so
          they get the same voice. Not `.label` — see the CAPTION note above for
          why that class would rename this section in the page outline.
          The swatch is the ring from .person shrunk to 10px — same 1.5px dotted
          accent/60 — so the sentence points at a mark already on the chart rather
          than describing one in words. */}
      <p className="mt-8 hidden items-center gap-3 font-mono text-xs text-dust lg:flex">
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full border-[1.5px] border-dotted border-accent/60"
        />
        Hover any face for what they own, and what they&rsquo;ve shipped.
      </p>

      <div
        className="mt-4 hidden lg:grid"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        role="img"
        aria-label="Organisation chart of the club team. The same structure is listed below."
      >
        {/* ---- Row 1: officers ---- */}
        {TEAM_OFFICERS.map((m, i) => (
          <div
            key={m.designation}
            style={{
              gridRow: 1,
              gridColumn: `${OFFICER_COL[i]} / span ${OFFICER_SPAN}`,
            }}
          >
            {/* The one tier whose bubble opens DOWNWARDS. Nothing sits above this
                row except the section's headline, and a bubble there covers the
                sentence that introduces the chart. Opening down costs this tier's
                own caption for as long as the pointer is on the face — an
                acceptable trade, since the reader is looking at the person whose
                name is being covered. */}
            <Node
              member={m}
              diameter={OFFICER_D}
              designation={m.designation}
              tone="loud"
              priority
              tip="below"
              tipAlign={align(OFFICER_X[i])}
            />
          </div>
        ))}

        {/* Row 1 lines: the officers joined to each other at portrait-centre
            height, and the spine starting its descent from that join. The join is
            inset by one portrait radius at each end so it meets the circles'
            edges instead of running through them. */}
        <div
          aria-hidden
          className="pointer-events-none relative"
          style={{ gridRow: 1, gridColumn: `1 / span ${COLS}` }}
        >
          <span
            className={`absolute border-t ${SOLID}`}
            style={{
              top: OFFICER_R,
              left: `calc(${OFFICER_X[0]}% + ${OFFICER_R})`,
              width: `calc(${OFFICER_X[OFFICER_X.length - 1] - OFFICER_X[0]}% - ${OFFICER_R} * 2)`,
            }}
          />
          <VLine x={SPINE_X} className="bottom-0" style={{ top: OFFICER_R }} />
        </div>

        {/* ---- Row 2: officers -> leads ----
            This row has no cards, so its own height is what sets the vertical
            breathing room between the two tiers. */}
        <div
          aria-hidden
          className="pointer-events-none relative h-20"
          style={{ gridRow: 2, gridColumn: `1 / span ${COLS}` }}
        >
          {/* Spine continues to the rail, which sits at half this row's height. */}
          <VLine x={SPINE_X} className="top-0 h-1/2" />
          <span
            className={`absolute top-1/2 border-t ${SOLID}`}
            style={{
              left: `${LEAD_X[0]}%`,
              width: `${LEAD_X[LEAD_X.length - 1] - LEAD_X[0]}%`,
            }}
          />
          {/* Rail down into each lead. */}
          {LEAD_X.map((x) => (
            <VLine key={x} x={x} className="top-1/2 bottom-0" />
          ))}
          {/* Any shadow of an OFFICER starts its descent here and keeps going for
              two more rows. Dashed, and offset onto a column boundary, so where it
              crosses the rail above it reads as a different kind of relationship
              rather than a wiring error. */}
          {SHADOWS.filter((s) => s.crossesLeads).map((s) => (
            <VLine key={s.member.name} x={s.x} className="inset-y-0" dashed />
          ))}
        </div>

        {/* ---- Row 3: leads ---- */}
        {TEAM_LEADS.map((m, i) => (
          <div
            key={m.designation}
            style={{
              gridRow: 3,
              gridColumn: `${LEAD_COL[i]} / span ${LEAD_SPAN}`,
            }}
          >
            <Node
              member={m}
              diameter={LEAD_D}
              designation={m.designation}
              tipAlign={align(LEAD_X[i])}
            />
          </div>
        ))}

        {/* An officer's shadow line traverses the leads row. It runs along a column
            boundary, which every card clears by its own px-3, so it passes between
            two cards and touches neither. pointer-events-none keeps it from
            swallowing clicks on the GitHub links either side. */}
        {SHADOWS.some((s) => s.crossesLeads) && (
          <div
            aria-hidden
            className="pointer-events-none relative"
            style={{ gridRow: 3, gridColumn: `1 / span ${COLS}` }}
          >
            {SHADOWS.filter((s) => s.crossesLeads).map((s) => (
              <VLine key={s.member.name} x={s.x} className="inset-y-0" dashed />
            ))}
          </div>
        )}

        {/* ---- Row 4: -> shadows ---- */}
        <div
          aria-hidden
          className="pointer-events-none relative h-16"
          style={{ gridRow: 4, gridColumn: `1 / span ${COLS}` }}
        >
          {SHADOWS.map((s) => (
            <VLine key={s.member.name} x={s.x} className="inset-y-0" dashed />
          ))}
          {/* The desk's drop leaves its lead here, directly beneath the card, and
              keeps going past the shadow row to the band below. */}
          {DESK && <VLine x={DESK_X} className="inset-y-0" />}
        </div>

        {/* ---- Row 5: shadows, each in its principal's column ---- */}
        {SHADOWS.map((s) => (
          <div
            key={s.member.name}
            style={{
              gridRow: 5,
              gridColumn: `${s.colStart} / span ${s.colSpan}`,
            }}
          >
            <Node
              member={s.member}
              diameter={SHADOW_D}
              designation={shadowLabel(s)}
              maxWidth={SHADOW_MAX_W}
              tipAlign={align(s.x)}
            />
          </div>
        ))}

        {DESK && (
          <>
            {/* The drop crosses the shadow row on a lead-column BOUNDARY — the
                same invariant row 3 relies on — so it threads between the shadow
                cards rather than through one. When there are no shadows this row
                has no height and the line is simply zero tall. */}
            <div
              aria-hidden
              className="pointer-events-none relative"
              style={{ gridRow: 5, gridColumn: `1 / span ${COLS}` }}
            >
              <VLine x={DESK_X} className="inset-y-0" />
            </div>

            {/* ---- Row 6: -> the desk's label ---- */}
            <div
              aria-hidden
              className="pointer-events-none relative h-16"
              style={{ gridRow: 6, gridColumn: `1 / span ${COLS}` }}
            >
              <VLine x={DESK_X} className="inset-y-0" />
            </div>

            {/* ---- Row 7: the label the drop reaches ----
                Placed in the lead's own columns rather than positioned by
                percentage, which centres it on DESK_X by construction: the same
                arithmetic that puts the lead card there puts this under it. */}
            <div
              style={{
                gridRow: 7,
                gridColumn: `${LEAD_COL[DESK_LEAD]} / span ${LEAD_SPAN}`,
              }}
            >
              <p
                className={`${CAPTION} mx-auto max-w-full px-3 text-center text-dust`}
              >
                {DESK.label}
              </p>
            </div>

            {/* ---- Row 8: label -> members ----
                Same shape as the officers-to-leads rail in row 2: down to
                mid-row, across the span of the members, and down into each. */}
            <div
              aria-hidden
              className="pointer-events-none relative h-16"
              style={{ gridRow: 8, gridColumn: `1 / span ${COLS}` }}
            >
              <VLine x={DESK_X} className="top-0 h-1/2" />
              <span
                className={`absolute top-1/2 border-t ${SOLID}`}
                style={{
                  left: `${DESK_MEMBER_X[0]}%`,
                  width: `${DESK_MEMBER_X[DESK_MEMBER_X.length - 1] - DESK_MEMBER_X[0]}%`,
                }}
              />
              {DESK_MEMBER_X.map((x) => (
                <VLine key={x} x={x} className="top-1/2 bottom-0" />
              ))}
            </div>

            {/* ---- Row 9: the desk, in its own equal-width grid ---- */}
            <div
              className="grid"
              style={{
                gridRow: 9,
                gridColumn: `1 / span ${COLS}`,
                gridTemplateColumns: `repeat(${DESK.members.length}, minmax(0, 1fr))`,
              }}
            >
              {DESK.members.map((m, i) => (
                <Node
                  key={m.name}
                  member={m}
                  diameter={DESK_D}
                  remit={DESK.remit}
                  tipAlign={align(DESK_MEMBER_X[i])}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ---- The same structure, stacked. Below lg only --------------------- */}
      <ul className="mt-7 space-y-6 lg:hidden" data-reveal-group>
        {[...TEAM_OFFICERS, ...TEAM_LEADS].map((m) => {
          const shadow = SHADOWS.find((s) => s.principal === m.designation);
          const desk = DESK && DESK.of === m.designation ? DESK : null;
          const officer = TEAM_OFFICERS.includes(m);
          return (
            <li key={m.designation}>
              <div className="flex items-center gap-5">
                <div
                  className="[container-type:inline-size] h-16 w-16 shrink-0 overflow-hidden rounded-full ring-1 ring-seam"
                  aria-hidden={false}
                >
                  <Portrait
                    name={m.name}
                    photo={m.photo}
                    className="h-full w-full"
                  />
                </div>
                <div className="min-w-0">
                  <p
                    className={`${CAPTION} ${officer ? "text-accent" : "text-dust"}`}
                  >
                    {m.designation}
                  </p>
                  <p className="mt-1.5 text-body font-semibold text-ink">
                    {m.name}
                    {m.batch && (
                      // Inline after the name rather than on its own line: on a
                      // phone this list is already five rows of stacked labels, and
                      // a batch is four characters. It reads as part of the name.
                      <span className="ml-2 font-mono text-xs font-normal text-dust">
                        Batch {m.batch}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {/* The remit and the highlights, as text rather than a hover state.
                  This list IS the small-screen rendering and the accessible copy,
                  and a hover card is neither reachable by touch nor announced from
                  inside the chart's role="img" — so below lg it stops being a
                  reveal and is simply written down. Indented to the portrait's
                  right edge so it reads as belonging to the name above it rather
                  than to the row below. */}
              <div className="ml-[5.25rem] mt-2">
                <p className="text-sm leading-relaxed text-haze">{m.remit}</p>
                <Highlights items={m.highlights} className="person-list" />
              </div>

              {/* The dashed left border is the stacked equivalent of the chart's
                  dashed connector — same meaning, same stroke, one dimension. */}
              {shadow && (
                <div className="ml-8 mt-5 border-l border-dashed border-dust/50 pl-8">
                  <div className="flex items-center gap-4">
                    <div className="[container-type:inline-size] h-12 w-12 shrink-0 overflow-hidden rounded-full ring-1 ring-seam">
                      <Portrait
                        name={shadow.member.name}
                        photo={shadow.member.photo}
                        className="h-full w-full"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className={`${CAPTION} text-dust`}>
                        {shadowLabel(shadow)}
                      </p>
                      <p className="mt-1.5 text-body font-semibold text-ink">
                        {shadow.member.name}
                        {shadow.member.batch && (
                          <span className="ml-2 font-mono text-xs font-normal text-dust">
                            Batch {shadow.member.batch}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {/* Indented to this tier's own portrait edge — 3rem of circle
                      plus the 1rem gap — not the tier above's. */}
                  <div className="ml-16 mt-2">
                    <p className="text-sm leading-relaxed text-haze">
                      {shadow.member.remit}
                    </p>
                    <Highlights
                      items={shadow.member.highlights}
                      className="person-list"
                    />
                  </div>
                </div>
              )}

              {/* The desk, stacked. Solid left border rather than dashed — same
                  distinction the chart draws, one dimension. The remit is written
                  once, above the names, because that is where it is true: these
                  four share one job rather than holding four offices. */}
              {desk && (
                <div className="ml-8 mt-5 border-l border-seam pl-8">
                  <p className={`${CAPTION} text-dust`}>{desk.label}</p>
                  <p className="mt-2 text-sm leading-relaxed text-haze">
                    {desk.remit}
                  </p>
                  <ul className="mt-4 space-y-3">
                    {desk.members.map((dm) => (
                      <li key={dm.name}>
                        <div className="flex items-center gap-4">
                          <div className="[container-type:inline-size] h-11 w-11 shrink-0 overflow-hidden rounded-full ring-1 ring-seam">
                            <Portrait
                              name={dm.name}
                              photo={dm.photo}
                              className="h-full w-full"
                            />
                          </div>
                          <p className="min-w-0 text-body font-semibold text-ink">
                            {dm.name}
                            {dm.batch && (
                              <span className="ml-2 font-mono text-xs font-normal text-dust">
                                Batch {dm.batch}
                              </span>
                            )}
                          </p>
                        </div>
                        {/* Only the members who have one get anything here — the
                            desk's remit is written once above, so a member with no
                            highlights renders as a name and nothing is missing. */}
                        {/* 2.75rem of portrait plus the 1rem gap, so it lines up
                            under the name rather than under the face. */}
                        <Highlights
                          items={dm.highlights}
                          className="person-list ml-[3.75rem]"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* The key. A dashed line means nothing on its own, and a reader should not
          have to infer it from the two cards it happens to connect. */}
      {SHADOWS.length > 0 && (
        <p className="mt-8 flex items-center gap-3 border-t border-seam pt-6 font-mono text-xs text-dust">
          <span
            aria-hidden
            className="h-0 w-8 shrink-0 border-t border-dashed border-dust/50"
          />
          Shadow — being trained to take that role over at handover.
        </p>
      )}
    </>
  );
}
