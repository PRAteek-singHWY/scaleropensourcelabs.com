"use client";

// The pieces the three organiser panels share.
//
// They were inline in AdminDashboard.tsx when there was one panel. There are now three —
// membership, mentors, mentorship — and a bar chart copied into each is three bar charts
// that drift a padding value at a time. Moving them here also breaks the import cycle
// that would otherwise exist: AdminDashboard renders the other two, so they cannot import
// from it.

import type { ReactNode } from "react";

/** One string for every filter control across the panels, so a dozen selects and inputs
 *  cannot drift apart a class at a time. */
export const ctl =
  "rounded-md border border-seam bg-sunk px-3.5 py-2.5 text-sm text-ink placeholder:text-dust outline-none transition focus:border-accent";

/** Same, for the fields in the mentor editor. Matches the `field` const in
 *  ProfileForm.tsx — the focus halo is the 3px accent ring at 18% that `.card` wears on
 *  hover, so a focused field anywhere on the site is the same object. */
export const field =
  "w-full rounded-md border border-seam bg-sunk px-3.5 py-2.5 text-sm text-ink placeholder:text-dust outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_rgb(var(--sky)/0.18)]";

/** Code -> label against one of the content arrays, falling back to the raw code so a
 *  value that drifted out of the list is visible rather than blank. */
export const labelOf = (list: readonly { value: string; label: string }[], v?: string) =>
  (v && list.find((x) => x.value === v)?.label) || v || "—";

/** Count occurrences, returned largest-first. */
export function tally(values: (string | undefined)[]): [string, number][] {
  const m = new Map<string, number>();
  for (const v of values) {
    const k = v ?? "—";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m].sort((a, b) => b[1] - a[1]);
}

/** A labelled bar chart.
 *
 *  A bar rather than a chart library: one dimension, ten rows, and the token colours
 *  already carry the meaning.
 *
 *  `total` is passed in rather than summed from `rows` because the percentages have to be
 *  of the membership, not of the rows shown — a breakdown where a member can appear twice
 *  (mentor preferences do) would otherwise report percentages of itself and quietly mean
 *  something different from every other chart on the page. */
export function Bars({
  title,
  rows,
  total,
  empty = "No data yet.",
  footnote,
}: {
  title: string;
  rows: [string, number][];
  total: number;
  empty?: string;
  footnote?: ReactNode;
}) {
  return (
    <div className="card rounded-panel bg-raise p-6">
      <h3 className="label">{title}</h3>
      <ul className="mt-4 space-y-3">
        {rows.length === 0 && <li className="text-sm text-dust">{empty}</li>}
        {rows.map(([k, n]) => (
          <li key={k}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-ink">{k}</span>
              <span className="font-mono text-sm text-haze">
                {n}
                <span className="text-dust">
                  {" "}
                  · {total > 0 ? Math.round((n / total) * 100) : 0}%
                </span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-sunk">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${total > 0 ? (n / total) * 100 : 0}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {footnote && <p className="mt-4 text-[0.8125rem] leading-relaxed text-dust">{footnote}</p>}
    </div>
  );
}

/** The headline counts strip. Three or four cards, one number each.
 *
 *  `tabular-nums` so the cards stay aligned as counts grow and the number does not jitter
 *  between renders. NOT `.num` — that class is the small blue step badge used in numbered
 *  lists, and applying it here renders each headline count as a chip-sized pill, which is
 *  the opposite of a headline. Caught by looking at the page rather than at the test. */
export function Counts({
  rows,
  loading,
}: {
  /** A string value renders as-is — used for "—", the honest answer for a figure that
   *  needs a full collection scan nobody has asked for yet. */
  rows: [string, number | string][];
  loading?: boolean;
}) {
  // LITERAL CLASS NAMES, not `sm:grid-cols-${n}`. Tailwind scans source text for whole
  // class names, so an interpolated one is never generated and the grid silently falls
  // back to one column — a layout bug with no error anywhere to explain it.
  const cols =
    rows.length >= 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : rows.length === 3
        ? "sm:grid-cols-3"
        : "sm:grid-cols-2";

  return (
    <div className={`grid gap-4 ${cols}`}>
      {rows.map(([k, v]) => (
        <div key={k} className="card rounded-panel bg-raise p-6">
          <p className="label">{k}</p>
          <p className="mt-2 font-display text-display-lg font-bold tabular-nums tracking-tight">
            {loading ? "…" : v}
          </p>
        </div>
      ))}
    </div>
  );
}
