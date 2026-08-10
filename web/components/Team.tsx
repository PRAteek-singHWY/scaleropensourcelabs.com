// The team, as an actual org chart.
//
// WHY A CHART AND NOT A GRID
// A grid of faces answers "who is important". A chart answers "who do I ask",
// which is the only question a reader of this section actually has. The club has
// four functional leads with genuinely different remits — if you want your PR
// reviewed you want the Repo Maintainer, not the President — and a flat grid
// destroys exactly that information. So the structure is the content here, and the
// lines are load-bearing rather than decorative.
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
//   COLS = 4  ->  column centres at 12.5 / 37.5 / 62.5 / 87.5 %
//                 officer cards (span 2) centred at 25 / 75 %
//
// And the fact that makes the hardest connector possible: an officer's centre
// always lands on a column BOUNDARY (25% is the col1|col2 seam, 75% is the
// col3|col4 seam). So the dashed line from the Vice President down to their shadow
// two tiers below drops perfectly straight and passes BETWEEN the Repo Maintainer
// and Events Lead cards without touching either. No elbows, no routing.
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
// Zero JavaScript: no state, no measurement, no canvas. Server component.

import Portrait from "@/components/Portrait";
import {
  TEAM_LEADS,
  TEAM_OFFICERS,
  TEAM_SHADOWS,
  type TeamMember,
} from "@/content/club";

// One column per lead. The officers split the same width evenly above them, which
// is what puts their centres on column boundaries — see the header note. This
// assumes COLS divides evenly by the officer count; with 4 leads and 2 officers it
// does. If a fifth lead is ever added, the officers will need their own explicit
// spans rather than this derivation.
const COLS = TEAM_LEADS.length;
const OFFICER_SPAN = COLS / TEAM_OFFICERS.length;

/** Centre of a cell, as a percentage of the grid width. Exact only at zero gap. */
function centre(colStart: number, span: number): number {
  return ((colStart - 1 + span / 2) / COLS) * 100;
}

const OFFICER_X = TEAM_OFFICERS.map((_, i) =>
  centre(i * OFFICER_SPAN + 1, OFFICER_SPAN),
);
const LEAD_X = TEAM_LEADS.map((_, i) => centre(i + 1, 1));

/** Midpoint of the officer row — where the spine down to the leads hangs from. */
const SPINE_X = (OFFICER_X[0] + OFFICER_X[OFFICER_X.length - 1]) / 2;

/* Portrait diameters, fixed in rem rather than responsive, because the officer
   join line is drawn at `top: OFFICER_R` and inset horizontally by OFFICER_R —
   a diameter that changed per breakpoint would need those two values to change
   with it. The chart only renders at lg+, where a column is ≥240px, so one size
   holds. Size steps down per tier; that is the only hierarchy cue besides position. */
const OFFICER_D = "7rem";
const OFFICER_R = "3.5rem";
const LEAD_D = "6rem";
const SHADOW_D = "4.5rem";

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
    const colStart = officer * OFFICER_SPAN + 1;
    return {
      member: m,
      principal: TEAM_OFFICERS[officer].designation,
      colStart,
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
      colStart: lead + 1,
      colSpan: 1,
      x: LEAD_X[lead],
      crossesLeads: false,
    };
  }
  return null;
}).filter((s): s is Placed => s !== null);

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

/** The designation-then-name caption, in that order, under every portrait. */
function Caption({
  designation,
  name,
  tone = "quiet",
}: {
  designation: string;
  name: string;
  tone?: "loud" | "quiet";
}) {
  return (
    <>
      <p
        className={`${CAPTION} mt-4 ${tone === "loud" ? "text-accent" : "text-dust"}`}
      >
        {designation}
      </p>
      <p className="mt-1.5 text-body font-semibold leading-snug text-ink">
        {name}
      </p>
    </>
  );
}

/** A node on the chart. Circular frame; Portrait draws a monogram when photo is absent. */
function Node({
  member,
  diameter,
  designation,
  tone = "quiet",
  priority = false,
}: {
  member: TeamMember;
  diameter: string;
  designation: string;
  tone?: "loud" | "quiet";
  priority?: boolean;
}) {
  return (
    <div className="mx-auto flex max-w-[13.5rem] flex-col items-center px-3 text-center">
      {/* container-type is required, not stylistic: Portrait's monogram fallback
          sizes its initials in cqw, and without a container it resolves against
          the viewport and renders the letters at hero scale inside a 112px circle. */}
      <div
        className="[container-type:inline-size] shrink-0 overflow-hidden rounded-full ring-1 ring-seam"
        style={{ width: diameter, height: diameter }}
      >
        <Portrait
          name={member.name}
          photo={member.photo}
          priority={priority}
          className="h-full w-full"
        />
      </div>
      <Caption designation={designation} name={member.name} tone={tone} />
      {member.github && (
        <a
          href={`https://github.com/${member.github}`}
          target="_blank"
          rel="noreferrer"
          className="tap mt-2 inline-block font-mono text-xs text-haze hover:text-accent"
        >
          @{member.github}
        </a>
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
      <div
        className="mt-8 hidden lg:grid"
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
              gridColumn: `${i * OFFICER_SPAN + 1} / span ${OFFICER_SPAN}`,
            }}
          >
            <Node
              member={m}
              diameter={OFFICER_D}
              designation={m.designation}
              tone="loud"
              priority
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
          <div key={m.designation} style={{ gridRow: 3, gridColumn: i + 1 }}>
            <Node member={m} diameter={LEAD_D} designation={m.designation} />
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
            />
          </div>
        ))}
      </div>

      {/* ---- The same structure, stacked. Below lg only --------------------- */}
      <ul className="mt-7 space-y-6 lg:hidden">
        {[...TEAM_OFFICERS, ...TEAM_LEADS].map((m) => {
          const shadow = SHADOWS.find((s) => s.principal === m.designation);
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
                  </p>
                </div>
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
                      </p>
                    </div>
                  </div>
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
