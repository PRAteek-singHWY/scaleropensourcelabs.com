"use client";

import { useState } from "react";
import type { DayCount } from "@/lib/github";

// Shared palette (validated for the dark surface via the dataviz validator).
// Single-hue magnitude = blue. Status = reserved trio, always shipped w/ labels.
export const C = {
  blue: "#3b82f6",
  pink: "#ec4899",
  // Reserved status trio. Validated as a set against the dark panel surface
  // (#12121f) with scripts/validate_palette.js — all six checks pass:
  // lightness band L 0.48-0.67, chroma floor, CVD separation (worst adjacent
  // pair ΔE 21.6 deutan / 17.0 tritan), normal-vision floor, contrast >= 3:1.
  // `open` is #10a37a rather than emerald-500 #10b981 because the latter sits at
  // L 0.696, just outside the dark-mode band. Always shipped with a text label.
  open: "#10a37a", // emerald — open
  merged: "#a855f7", // purple — merged
  closed: "#f43f5e", // rose — closed (unmerged)
  grid: "#242438",
  axis: "#3a3a52",
};

// ---- Hero stat tile -------------------------------------------------------

export function StatTile({
  label,
  value,
  sub,
  accent = "gradient",
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "gradient" | "blue" | "pink" | "open" | "merged" | "closed";
}) {
  const valueCls =
    accent === "gradient"
      ? "bg-pink-blue bg-clip-text text-transparent"
      : accent === "blue"
        ? "text-blue"
        : accent === "pink"
          ? "text-pink"
          : accent === "open"
            ? "text-[#10a37a]"
            : accent === "merged"
              ? "text-[#a855f7]"
              : "text-[#f43f5e]";
  return (
    <div className="rounded-xl border border-edge bg-ink/50 px-3 py-2">
      <div className={`text-xl font-extrabold leading-none ${valueCls}`}>
        {value}
      </div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted">
        {label}
      </div>
      {sub && <div className="text-[10px] text-muted/80">{sub}</div>}
    </div>
  );
}

// ---- 30-day commit bar chart (single hue, hover tooltip) ------------------

export function CommitBars({ data }: { data: DayCount[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 300;
  const H = 60;
  const n = data.length || 1;
  const gap = 2;
  const bw = (W - gap * (n - 1)) / n;
  const max = Math.max(1, ...data.map((d) => d.count));

  const rel = (iso: string) => {
    const d = new Date(iso + "T00:00:00Z");
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  };

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-16 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Commits per day for the last ${n} days`}
      >
        {/* recessive baseline */}
        <line x1={0} y1={H - 0.5} x2={W} y2={H - 0.5} stroke={C.grid} strokeWidth={1} />
        {data.map((d, i) => {
          const h = d.count === 0 ? 0 : Math.max(3, (d.count / max) * (H - 6));
          const x = i * (bw + gap);
          const active = hover === i;
          return (
            <rect
              key={d.date}
              x={x}
              y={H - h}
              width={bw}
              height={h}
              rx={Math.min(2, bw / 2)}
              fill={C.blue}
              opacity={hover === null || active ? 1 : 0.45}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </svg>
      {hover !== null && data[hover] && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-edge bg-ink px-2 py-1 text-[11px] shadow-lg"
          style={{ left: `${((hover + 0.5) / n) * 100}%` }}
        >
          <span className="font-semibold text-slate-100">
            {data[hover].count} commit{data[hover].count === 1 ? "" : "s"}
          </span>
          <span className="ml-1 text-muted">{rel(data[hover].date)}</span>
        </div>
      )}
    </div>
  );
}

// ---- Horizontal stacked "outcome" bar with legend -------------------------

type Segment = { label: string; value: number; color: string };

export function OutcomeBar({
  title,
  segments,
}: {
  title: string;
  segments: Segment[];
}) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  const shown = segments.filter((s) => s.value > 0);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {title}
        </span>
        <span className="text-[11px] text-muted">{total} total</span>
      </div>
      {total === 0 ? (
        <div className="text-sm text-muted">None yet.</div>
      ) : (
        <>
          {/* stacked bar — 2px surface gaps between fills */}
          <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full">
            {shown.map((s) => (
              <div
                key={s.label}
                title={`${s.label}: ${s.value}`}
                style={{
                  width: `${(s.value / total) * 100}%`,
                  backgroundColor: s.color,
                }}
              />
            ))}
          </div>
          {/* legend — identity via label+dot, never color alone */}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {segments.map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-1.5 text-[11px] text-muted"
              >
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
                <span className="font-semibold text-slate-200">{s.value}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---- Tech-stack bars ------------------------------------------------------
//
// The job here is magnitude comparison across labelled categories, so this is a
// single-hue bar chart with direct labels — NOT a categorical palette. Language
// identity comes from the text label next to each bar; giving each language its
// own hue would add a 9-way color problem while communicating nothing the label
// doesn't already say.

type StackRow = {
  label: string;
  kind: "code" | "support";
  files: number;
  additions: number;
  deletions: number;
  share: number;
};

function StackRowBars({ rows }: { rows: StackRow[] }) {
  // Bars are normalized within their own group, so the longest row in each group
  // fills the track. The percentage label stays share-of-everything, so the two
  // groups remain comparable to each other. Code uses the accent hue and support
  // the de-emphasis gray — emphasis, not a second categorical scale.
  const top = Math.max(...rows.map((r) => r.share), 0.0001);

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <div className="w-36 shrink-0 truncate text-right text-xs text-slate-300">
            {r.label}
          </div>
          <div
            className="relative h-4 flex-1 overflow-hidden rounded-full bg-ink/60"
            title={`${r.label}: ${r.files} file${r.files === 1 ? "" : "s"}, +${r.additions} / -${r.deletions}`}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${(r.share / top) * 100}%`,
                minWidth: r.share > 0 ? 4 : 0,
                backgroundColor: r.kind === "code" ? C.blue : C.axis,
              }}
            />
          </div>
          <div className="w-10 shrink-0 text-right text-xs font-semibold text-slate-200">
            {Math.round(r.share * 100)}%
          </div>
          <div className="w-24 shrink-0 text-right text-[11px] text-muted">
            {r.files} file{r.files === 1 ? "" : "s"} · +{r.additions}
          </div>
        </div>
      ))}
    </div>
  );
}

function fold(entries: StackRow[], max: number): StackRow[] {
  if (entries.length <= max) return entries;
  const head = entries.slice(0, max);
  const tail = entries.slice(max);
  return [
    ...head,
    {
      label: `Other (${tail.length} more)`,
      kind: head[0]?.kind ?? "code",
      files: tail.reduce((n, e) => n + e.files, 0),
      additions: tail.reduce((n, e) => n + e.additions, 0),
      deletions: tail.reduce((n, e) => n + e.deletions, 0),
      share: tail.reduce((n, e) => n + e.share, 0),
    },
  ];
}

export function StackBars({
  entries,
  max = 8,
}: {
  entries: StackRow[];
  max?: number;
}) {
  if (entries.length === 0) {
    return <div className="text-sm text-muted">No classifiable files yet.</div>;
  }

  const code = fold(
    entries.filter((e) => e.kind === "code"),
    max,
  );
  const support = fold(
    entries.filter((e) => e.kind === "support"),
    4,
  );

  return (
    <div className="space-y-5">
      {code.length > 0 ? (
        <StackRowBars rows={code} />
      ) : (
        <div className="text-sm text-muted">
          No code files in the scanned PRs — only config and docs.
        </div>
      )}

      {support.length > 0 && (
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
            Config &amp; docs
          </div>
          <StackRowBars rows={support} />
        </div>
      )}
    </div>
  );
}

// ---- Compact PR outcome bar for a table row -------------------------------
// Status colors, always beside their counts. One shared legend lives above the
// table, so identity is never carried by color alone.

export function MiniOutcome({
  merged,
  open,
  closed,
}: {
  merged: number;
  open: number;
  closed: number;
}) {
  const total = merged + open + closed;
  if (total === 0) return <span className="text-xs text-muted">—</span>;
  const segs = [
    { v: merged, c: C.merged, label: "merged" },
    { v: open, c: C.open, label: "open" },
    { v: closed, c: C.closed, label: "closed" },
  ].filter((s) => s.v > 0);

  return (
    <div
      className="flex h-2 w-full min-w-[52px] gap-[2px] overflow-hidden rounded-full"
      title={`${merged} merged · ${open} open · ${closed} closed`}
    >
      {segs.map((s) => (
        <div
          key={s.label}
          style={{ width: `${(s.v / total) * 100}%`, backgroundColor: s.c }}
        />
      ))}
    </div>
  );
}

// ---- Horizontal leaderboard bars (single hue, direct labels) --------------

export function LeaderboardBars({
  items,
}: {
  items: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-3">
          <div className="w-28 shrink-0 truncate text-right text-xs text-slate-300">
            {it.label}
          </div>
          <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-ink/60">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-pink-blue"
              style={{ width: `${(it.value / max) * 100}%`, minWidth: it.value > 0 ? 6 : 0 }}
            />
          </div>
          <div className="w-8 shrink-0 text-xs font-semibold text-slate-200">
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}
