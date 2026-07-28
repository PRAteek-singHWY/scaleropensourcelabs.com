"use client";

import { useMemo, useState } from "react";
import type { RepoContribution } from "@/lib/github-deep";
import { C, MiniOutcome } from "@/components/charts";
import { RANK_WINDOW } from "@/lib/github-deep";

// Nine measures per repo is past the point where a chart helps (the form guide
// puts >7 meaningful classes in a table), so this is a table — sortable, with
// the one genuinely graphical column being the PR outcome bar.

type SortKey =
  | "repo"
  | "rank"
  | "commits"
  | "issuesOpened"
  | "prsOpened"
  | "prsMerged"
  | "mergeRate";

const mergeRate = (r: RepoContribution): number =>
  r.prsOpened > 0 ? r.prsMerged / r.prsOpened : -1;

/**
 * Sort key for the rank column. Ranked repos sort by position ascending (#1
 * first); everything unranked sorts after them, because "unknown" is not a good
 * rank and must never appear to beat one.
 */
const rankSortValue = (r: RepoContribution): number =>
  r.rankStatus === "ranked" && r.rank !== null ? r.rank : Number.MAX_SAFE_INTEGER;

function RankCell({ r }: { r: RepoContribution }) {
  if (r.rankStatus === "ranked" && r.rank !== null) {
    const total = r.totalContributors;
    // A percentile is meaningless when they're the only contributor — "#1 of 1 ·
    // top 100%" reads as an achievement on a solo repo. Needs a real cohort.
    const pct =
      total && total > 1 ? Math.max(1, Math.round((r.rank / total) * 100)) : null;
    // Top 3 of a real cohort is worth surfacing; being sole author isn't a rank.
    const strong = r.rank <= 3 && (total ?? 0) > 1;
    return (
      <div className="leading-tight">
        <span
          className={`text-sm font-bold ${strong ? "text-pink" : "text-slate-100"}`}
        >
          #{r.rank}
        </span>
        {total !== null && (
          <span className="ml-1 text-[11px] text-muted">
            of {total}
            {r.contributorsExact ? "" : "+"}
          </span>
        )}
        {pct !== null ? (
          <div className="text-[10px] text-muted">
            top {pct}%{r.contributorsExact ? "" : " (approx)"}
          </div>
        ) : (
          total === 1 && (
            <div className="text-[10px] text-muted">sole contributor</div>
          )
        )}
      </div>
    );
  }

  if (r.rankStatus === "outside-window") {
    return (
      <span
        className="text-xs text-muted"
        title={`They have commits here, but sit outside the top ${RANK_WINDOW} contributors that GitHub's contributor list exposes.`}
      >
        &gt;{RANK_WINDOW}
      </span>
    );
  }

  if (r.rankStatus === "unranked") {
    return (
      <span
        className="text-xs text-muted"
        title="No commits on this repo's default branch — their contribution here is issues, reviews, or PRs that landed on another branch. Commits authored under an email not linked to their GitHub account also won't appear."
      >
        no commits
      </span>
    );
  }

  return (
    <span
      className="text-xs text-amber-300/80"
      title="Rank could not be verified — GitHub's contributor list was unavailable or the API budget ran out. This is NOT the same as zero commits."
    >
      unknown
    </span>
  );
}

function rel(iso: string | null): string {
  if (!iso) return "—";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d <= 0) return "today";
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export default function RepoContribTable({
  repos,
}: {
  repos: RepoContribution[];
}) {
  const [sort, setSort] = useState<SortKey>("commits");
  const [asc, setAsc] = useState(false);

  const sorted = useMemo(() => {
    const dir = asc ? 1 : -1;
    const get = (r: RepoContribution): number | string => {
      switch (sort) {
        case "repo":
          return r.nameWithOwner.toLowerCase();
        case "rank":
          return rankSortValue(r);
        case "mergeRate":
          return mergeRate(r);
        default:
          return r[sort];
      }
    };
    return [...repos].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (typeof va === "string" || typeof vb === "string") {
        return String(va).localeCompare(String(vb)) * dir;
      }
      // Rank ascends by default (#1 is best); the numeric columns descend.
      if (sort === "rank") return (va - vb) * (asc ? -1 : 1);
      return (va - vb) * dir;
    });
  }, [repos, sort, asc]);

  function header(key: SortKey, label: string, align: "left" | "right" = "right") {
    const active = sort === key;
    return (
      <th
        scope="col"
        className={`whitespace-nowrap px-2 py-2 text-[10px] font-semibold uppercase tracking-wider ${
          align === "left" ? "text-left" : "text-right"
        } ${active ? "text-slate-200" : "text-muted"}`}
      >
        <button
          onClick={() => {
            if (active) setAsc(!asc);
            else {
              setSort(key);
              setAsc(false);
            }
          }}
          className="inline-flex items-center gap-1 transition hover:text-pink"
        >
          {label}
          <span className={active ? "opacity-100" : "opacity-0"}>
            {asc ? "▲" : "▼"}
          </span>
        </button>
      </th>
    );
  }

  if (repos.length === 0) {
    return (
      <p className="rounded-xl border border-edge bg-panel/40 px-4 py-6 text-center text-sm text-muted">
        No public repo contributions found.
      </p>
    );
  }

  return (
    <div>
      {/* One shared legend for every MiniOutcome bar below — status is never
          communicated by color alone. */}
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {[
          { label: "Merged", color: C.merged },
          { label: "Open", color: C.open },
          { label: "Closed unmerged", color: C.closed },
        ].map((s) => (
          <span
            key={s.label}
            className="inline-flex items-center gap-1.5 text-[11px] text-muted"
          >
            <span
              className="h-2 w-2 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-edge bg-panel/40">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <caption className="sr-only">
            Public repositories this mentee contributes to, with their contributor
            rank, commits, issues and pull request outcomes in each.
          </caption>
          <thead className="border-b border-edge">
            <tr>
              {header("repo", "Repository", "left")}
              {header("rank", "Rank", "left")}
              {header("commits", "Commits")}
              {header("issuesOpened", "Issues")}
              {header("prsOpened", "PRs")}
              {header("prsMerged", "Merged")}
              <th
                scope="col"
                className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted"
              >
                Outcome
              </th>
              {header("mergeRate", "Merge rate")}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const rate = mergeRate(r);
              return (
                <tr
                  key={r.nameWithOwner}
                  className="border-b border-edge/50 transition last:border-0 hover:bg-ink/40"
                >
                  <td className="max-w-[260px] px-2 py-2.5">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate font-medium text-slate-100 hover:text-sky"
                      title={r.description ?? r.nameWithOwner}
                    >
                      {r.nameWithOwner}
                    </a>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted">
                      {r.isOwnRepo && (
                        <span className="rounded bg-edge px-1 py-px">own</span>
                      )}
                      {r.isFork && (
                        <span className="rounded bg-edge px-1 py-px">fork</span>
                      )}
                      {r.primaryLanguage && <span>{r.primaryLanguage}</span>}
                      <span>★ {r.stars}</span>
                      <span>· {rel(r.lastActivityAt)}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5">
                    <RankCell r={r} />
                  </td>
                  <td className="px-2 py-2.5 text-right font-semibold text-slate-100">
                    {r.commits}
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <span className="text-slate-200">{r.issuesOpened}</span>
                    {r.issuesOpened > 0 && (
                      <div className="text-[10px] text-muted">
                        {r.issuesClosed} closed
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <span className="text-slate-200">{r.prsOpened}</span>
                    {r.reviews > 0 && (
                      <div
                        className="text-[10px] text-muted"
                        title={`Reviewed ${r.reviews} PR${r.reviews === 1 ? "" : "s"} by others`}
                      >
                        {r.reviews} rev
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-right font-semibold text-slate-100">
                    {r.prsMerged}
                  </td>
                  <td className="w-[110px] px-2 py-2.5">
                    <MiniOutcome
                      merged={r.prsMerged}
                      open={r.prsOpen}
                      closed={r.prsClosed}
                    />
                    <div className="mt-1 text-[10px] text-muted">
                      {r.prsMerged}m · {r.prsOpen}o · {r.prsClosed}c
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    {rate < 0 ? (
                      <span className="text-xs text-muted">—</span>
                    ) : (
                      <span className="font-semibold text-slate-100">
                        {Math.round(rate * 100)}%
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
