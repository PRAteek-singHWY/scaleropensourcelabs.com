// The club's collective contribution grid — the landing page's hero.
//
// One cell per day, columns are weeks, rows are weekdays: the calendar shape every
// developer already knows how to read, which is why it earns the hero slot instead
// of a headline number. It is real aggregated data, so it also degrades honestly:
// with no members, or members whose profiles haven't been fetched yet, the caller
// renders an empty state rather than a decorative fake.
//
// Colour: a single-hue sequential ramp (violet, light-to-dark by magnitude). Not
// categorical — the days aren't identities, they're quantities.

// Verified with the dataviz validator's sequential criterion — OKLCH lightness is
// strictly increasing (0.240 → 0.376 → 0.495 → 0.599 → 0.756, span 0.516), which
// is the correct test for a magnitude ramp. The validator's categorical checks
// (adjacent-pair ΔE ≥ 15) deliberately do not apply here: adjacent steps of a
// single-hue ramp are meant to be similar, and forcing them apart would turn a
// quantity scale into a set of identities. The two darkest steps fall under 3:1
// against the surface, so the relief the validator asks for is shipped: a legend
// below the grid and a per-cell tooltip with the exact count.
const RAMP = [
  "#1A1F2B", // zero — reads as an empty cell, not as data
  "#3A2E8C",
  "#5442D6",
  "#7C5CFF",
  "#AFA0FF",
] as const;

export type GridDay = { date: string; count: number };

/**
 * Quantile-ish bucketing against the busiest day. Fixed thresholds would make a
 * new club's grid look uniformly empty and an established one uniformly full.
 */
function level(count: number, max: number): number {
  if (count <= 0) return 0;
  if (max <= 1) return 4;
  const share = count / max;
  if (share > 0.66) return 4;
  if (share > 0.38) return 3;
  if (share > 0.15) return 2;
  return 1;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function ContributionGrid({
  days,
  className = "",
}: {
  days: GridDay[];
  className?: string;
}) {
  if (days.length === 0) return null;

  const max = Math.max(...days.map((d) => d.count), 0);

  // Pad the start so the first column begins on a Sunday and weekday rows line up.
  const first = new Date(`${days[0].date}T00:00:00Z`);
  const lead = first.getUTCDay();
  const cells: (GridDay | null)[] = [...Array(lead).fill(null), ...days];

  const weeks: (GridDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // A month label above the column where that month first appears.
  const monthLabels = weeks.map((week, i) => {
    const firstReal = week.find((d): d is GridDay => d !== null);
    if (!firstReal) return null;
    const d = new Date(`${firstReal.date}T00:00:00Z`);
    if (d.getUTCDate() > 7) return null;
    const prev = weeks[i - 1]?.find((x): x is GridDay => x !== null);
    if (prev && new Date(`${prev.date}T00:00:00Z`).getUTCMonth() === d.getUTCMonth())
      return null;
    return { index: i, label: MONTHS[d.getUTCMonth()] };
  });

  return (
    <div className={className}>
      <div className="overflow-x-auto pb-1">
        <div className="inline-block min-w-full">
          {/* Month scale */}
          <div className="mb-1.5 flex gap-[3px]">
            {weeks.map((_, i) => {
              const label = monthLabels.find((m) => m?.index === i);
              return (
                <div key={i} className="w-[11px] shrink-0">
                  {label && (
                    <span className="font-mono text-[10px] text-site-faint">
                      {label.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div
            className="flex gap-[3px]"
            role="img"
            aria-label={`Club contributions per day over the last year. ${days.reduce(
              (n, d) => n + d.count,
              0,
            )} contributions across ${days.length} days.`}
          >
            {weeks.map((week, wi) => (
              <div key={wi} className="flex w-[11px] shrink-0 flex-col gap-[3px]">
                {Array.from({ length: 7 }, (_, di) => {
                  const day = week[di];
                  if (!day) return <div key={di} className="h-[11px] w-[11px]" />;
                  const lv = level(day.count, max);
                  return (
                    <div
                      key={di}
                      className="h-[11px] w-[11px] rounded-[2px] transition-transform duration-150 hover:scale-[1.35]"
                      style={{ backgroundColor: RAMP[lv] }}
                      title={`${day.count} contribution${day.count === 1 ? "" : "s"} · ${day.date}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend. Present because the ramp encodes magnitude and nothing else says so. */}
      <div className="mt-3 flex items-center gap-2">
        <span className="font-mono text-[10px] text-site-faint">quieter</span>
        <div className="flex gap-[3px]">
          {RAMP.map((c) => (
            <div
              key={c}
              className="h-[11px] w-[11px] rounded-[2px]"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <span className="font-mono text-[10px] text-site-faint">busier</span>
      </div>
    </div>
  );
}
