// The club in numbers.
//
// Every figure is DERIVED from the content arrays rather than typed here, so the
// strip cannot drift from the evidence on the other pages. There is no second place
// to edit and therefore nothing to forget to update — which is the only reason a
// summary band like this is safe on a site that promises its claims are checkable.
//
// AND IT HIDES ITS OWN ZEROES. A four-tile strip reading "1 project · 0 selections ·
// 0 members" is a worse first impression than no strip at all, and worse than the
// truth: it reads as a dead club rather than a new one. So a metric with nothing
// behind it does not render, and if fewer than two survive, the whole band is
// replaced by a panel that says plainly what will appear here and why it is empty.
//
// That honest-empty state is not a placeholder to be removed later. It is what the
// band does whenever the data thins out — if half the club graduates and the numbers
// drop, this degrades gracefully instead of shipping a lie.

import { projectTotals, publishedUpstream } from "@/content/projects";
import { achieverStats, memberCount } from "@/content/people";

/** Keyed by how many metrics survive the filter. See the note at the grid below. */
const COLS: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-2 lg:grid-cols-5",
  6: "sm:grid-cols-2 lg:grid-cols-3",
};

export default function NumbersStrip() {
  const p = projectTotals();
  const a = achieverStats();
  // Deduplicated across core team, alumni, achievers and upstream contributors: one
  // person who appears in all four is one member. See memberCount() for why counting
  // the lists separately is the easiest way to inflate a figure by accident.
  const members = memberCount(publishedUpstream().map((u) => u.member));

  // The four the brief names — members, PRs merged, GSoC selections, active projects —
  // in that order, followed by two more the data already supports honestly.
  const metrics = [
    { value: members, label: "members we can name", note: "Deduplicated across every list on this site" },
    { value: p.merged, label: "pull requests merged", note: "Counted from the public repos" },
    { value: a.gsoc, label: "Google Summer of Code", note: "Across all years" },
    { value: p.activeProjects, label: "active projects", note: "Club repos plus build days" },
    { value: a.total, label: "selected into programmes", note: "By somebody outside this college" },
    { value: p.orgs, label: "organisations reached", note: "Where our code actually landed" },
  ].filter((m) => m.value > 0);

  if (metrics.length < 2) {
    return (
      <div className="mt-12 rounded-panel border border-dashed border-seam px-8 py-14">
        <p className="text-display-md font-semibold">
          We are not going to invent numbers here.
        </p>
        <p className="measure mt-4 text-body text-haze">
          This strip fills in from the other four pages as members land work and get
          selected — members, merged pull requests, selections, active projects. It is
          empty because the club is new, not because the page is unfinished, and we
          would rather you read that than a rounded-up figure.
        </p>
      </div>
    );
  }

  return (
    // The column count MATCHES the number of surviving metrics, and that is not
    // cosmetic. The seam between tiles is drawn by `gap-px` over the container's
    // bg-seam — so an unfilled grid cell is not empty space, it is a solid grey
    // rectangle. With three metrics in a four-column grid, production rendered a
    // grey block next to "organisations reached" that looked exactly like a failed
    // image load. Since this component's whole job is to hide metrics with nothing
    // behind them, a fixed column count was always going to leave holes.
    //
    // Static class strings rather than an interpolated `lg:grid-cols-${n}`, because
    // Tailwind scans source text and would never emit a class it cannot see.
    <dl
      className={`mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-panel bg-seam ${
        COLS[metrics.length] ?? COLS[4]
      }`}
    >
      {metrics.map((m) => (
        <div key={m.label} className="bg-raise p-7">
          {/* tabular-nums deliberately NOT used. These figures do not align in a
              column — they sit in separate tiles — and equal-width digits at display
              size make a number look loose. The roster table uses them because that
              is where digits genuinely stack. */}
          <dd className="text-[clamp(2.25rem,4.5vw,3.25rem)] font-semibold leading-none tracking-tightest text-accent">
            {m.value}
          </dd>
          <dt className="mt-4 text-body font-medium text-ink">{m.label}</dt>
          <p className="mt-1.5 text-[13px] leading-relaxed text-dust">{m.note}</p>
        </div>
      ))}
    </dl>
  );
}
