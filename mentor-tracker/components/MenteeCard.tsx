"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MenteeSnapshot } from "@/lib/github";
import type { Mentee } from "@/lib/storage";
import { StatTile, CommitBars, OutcomeBar, C } from "@/components/charts";

// "Ns/Nm/Nh/Nd/Nmo ago"
function rel(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function stateDot(state: string): string {
  return state === "open" ? "bg-[#10a37a]" : "bg-[#a855f7]";
}

export default function MenteeCard({
  mentee,
  onRemove,
  onData,
}: {
  mentee: Mentee;
  onRemove: () => void;
  onData?: (menteeId: string, snap: MenteeSnapshot) => void;
}) {
  const [snap, setSnap] = useState<MenteeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(null);
    fetch(`/api/mentee/${encodeURIComponent(mentee.github)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as MenteeSnapshot;
      })
      .then((data) => {
        if (!alive) return;
        setSnap(data);
        if (!data.error) onData?.(mentee.id, data);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setFailed(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // onData intentionally omitted — parent passes a stable callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentee.github, mentee.id]);

  const s = snap?.stats;

  return (
    <div className="group relative flex flex-col rounded-2xl border border-edge bg-panel/80 p-5 backdrop-blur transition hover:border-pink/40 hover:shadow-glow">
      <div className="absolute inset-x-5 top-0 h-px bg-pink-blue opacity-60" />

      {/* Header */}
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://github.com/${encodeURIComponent(mentee.github)}.png`}
          alt={mentee.github}
          className="h-11 w-11 shrink-0 rounded-full ring-2 ring-edge"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-slate-100">
            {snap?.name || mentee.name}
          </div>
          <a
            href={`mailto:${mentee.email}`}
            className="block truncate text-xs text-muted hover:text-sky"
          >
            {mentee.email}
          </a>
          <div className="flex items-center gap-2 text-xs">
            <a
              href={snap?.profileUrl || `https://github.com/${mentee.github}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-pink hover:text-sky"
            >
              @{mentee.github}
            </a>
            {snap && !snap.error && (
              <span className="text-muted">
                · {snap.followers} followers · ★ {snap.totalStars}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onRemove}
          aria-label="Remove mentee"
          className="rounded-md px-1.5 py-0.5 text-sm text-muted opacity-0 transition hover:bg-edge hover:text-pink group-hover:opacity-100"
        >
          ×
        </button>
      </div>

      {loading && (
        <div className="mt-5 animate-pulse space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-edge/60" />
            ))}
          </div>
          <div className="h-16 rounded-xl bg-edge/60" />
        </div>
      )}

      {!loading && (snap?.error || failed) && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          Couldn&apos;t load activity: {snap?.error ?? failed}
        </div>
      )}

      {!loading && snap && !snap.error && s && (
        <div className="mt-5 flex flex-1 flex-col gap-4">
          {/* Metric tiles */}
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Commits 30d" value={snap.commits30d} accent="blue" />
            <StatTile label="Day streak" value={`${snap.streakDays}🔥`} accent="pink" />
            <StatTile label="Merged PRs" value={s.mergedPRs} accent="merged" />
            <StatTile label="Open PRs" value={s.openPRs} accent="open" />
            <StatTile label="Open issues" value={s.openIssues} accent="open" />
            <StatTile label="Comments" value={s.commentedThreads} accent="gradient" />
          </div>

          {/* Commit activity */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Commits · last 30 days
              </span>
              <span className="text-[11px] text-muted">
                merge rate {Math.round(s.mergeRate * 100)}%
              </span>
            </div>
            <CommitBars data={snap.commitsByDay} />
          </div>

          {/* PR + issue outcomes */}
          <OutcomeBar
            title="Pull requests"
            segments={[
              { label: "Merged", value: s.mergedPRs, color: C.merged },
              { label: "Open", value: s.openPRs, color: C.open },
              { label: "Closed", value: s.closedPRs, color: C.closed },
            ]}
          />
          <OutcomeBar
            title="Issues"
            segments={[
              { label: "Open", value: s.openIssues, color: C.open },
              { label: "Closed", value: s.closedIssues, color: C.merged },
            ]}
          />

          {!s.available && (
            <div className="text-[11px] text-amber-300/80">
              All-time counts are partial (GitHub search rate limit) — set a
              GITHUB_TOKEN for full numbers.
            </div>
          )}

          {/* Recent PRs */}
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Recent PRs
            </div>
            {snap.recentPRs.length ? (
              <ul className="space-y-2">
                {snap.recentPRs.slice(0, 3).map((pr) => (
                  <li key={pr.html_url} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${stateDot(pr.state)}`} />
                      <a
                        href={pr.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-slate-200 hover:text-sky"
                        title={pr.title}
                      >
                        {pr.title}
                      </a>
                    </div>
                    <div className="ml-4 truncate text-xs text-muted">
                      {pr.repoName} · {rel(pr.created_at)}
                      {pr.linkedIssueUrl && (
                        <>
                          {" · closes "}
                          <a
                            href={pr.linkedIssueUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky hover:underline"
                            title={pr.linkedIssueTitle ?? undefined}
                          >
                            {pr.linkedIssueTitle || "linked issue"}
                          </a>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-muted">No pull requests yet.</div>
            )}
          </div>

          {/* Own repos. These are the repos the mentee OWNS — the full set of
              repos they contribute to, including other people's, lives on the
              drill-down page below. */}
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Own repos
            </div>
            {snap.activeRepos.length ? (
              <div className="flex flex-wrap gap-1.5">
                {snap.activeRepos.map((r) => (
                  <a
                    key={r.url}
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    title={`${r.language ?? "repo"} · ★ ${r.stars} · pushed ${rel(r.lastPushed)}`}
                    className="rounded-full border border-edge bg-ink/60 px-2.5 py-1 text-xs text-slate-300 transition hover:border-blue/50 hover:text-sky"
                  >
                    {r.name}
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted">No public repos.</div>
            )}
          </div>

          <Link
            href={`/admin/mentee/${mentee.id}`}
            className="mt-auto flex items-center justify-center gap-1.5 rounded-lg border border-edge bg-ink/50 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-pink/50 hover:text-pink"
          >
            Contribution breakdown &amp; rank
            <span aria-hidden>→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
