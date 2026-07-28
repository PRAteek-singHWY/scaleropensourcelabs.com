"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { CachedDeepProfile } from "@/lib/deep-cache";
import { StatTile, StackBars } from "@/components/charts";
import RepoContribTable from "@/components/RepoContribTable";

type MenteeInfo = {
  id: string;
  name: string;
  email: string;
  github: string;
  mentor: { id: string; name: string };
};

function rel(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function MenteeProfile({ mentee }: { mentee: MenteeInfo }) {
  const [data, setData] = useState<CachedDeepProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingToken, setMissingToken] = useState(false);

  const load = useCallback(
    async (refresh: boolean) => {
      setLoading(true);
      setError(null);
      setMissingToken(false);
      try {
        const res = await fetch(
          `/api/mentee/${encodeURIComponent(mentee.github)}/deep${refresh ? "?refresh=1" : ""}`,
          { cache: "no-store" },
        );
        const body = (await res.json().catch(() => null)) as
          | (CachedDeepProfile & { error?: string; code?: string })
          | null;
        if (!res.ok) {
          if (body?.code === "MISSING_TOKEN") setMissingToken(true);
          throw new Error(body?.error ?? `Request failed (${res.status})`);
        }
        setData(body as CachedDeepProfile);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    },
    [mentee.github],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const p = data?.profile;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-xs text-muted">
        <Link href="/admin" className="transition hover:text-pink">
          Dashboard
        </Link>
        <span>/</span>
        <span>{mentee.mentor.name}</span>
        <span>/</span>
        <span className="text-slate-300">{mentee.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p?.avatarUrl ?? `https://github.com/${mentee.github}.png`}
            alt={mentee.github}
            className="h-16 w-16 rounded-2xl ring-2 ring-edge"
          />
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              {p?.displayName || mentee.name}
            </h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <a
                href={p?.profileUrl ?? `https://github.com/${mentee.github}`}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-pink hover:text-sky"
              >
                @{mentee.github}
              </a>
              <a
                href={`mailto:${mentee.email}`}
                className="text-muted hover:text-sky"
              >
                {mentee.email}
              </a>
              {p && (
                <span className="text-muted">
                  {p.followers} followers · {p.publicRepos} public repos
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {data && (
            <div className="text-right text-[11px] leading-tight text-muted">
              <div>
                {data.cached ? "Cached" : "Fresh"} · {rel(data.profile.fetchedAt)}
              </div>
              <div>refreshes every {data.ttlHours}h</div>
            </div>
          )}
          <button
            onClick={() => void load(true)}
            disabled={loading}
            className="rounded-lg border border-edge bg-panel/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-pink/50 hover:text-pink disabled:opacity-50"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Missing token — this feature cannot work without one, so say exactly that */}
      {missingToken && (
        <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-200">
          <div className="font-semibold">A GitHub token is required here.</div>
          <p className="mt-2 leading-relaxed text-amber-200/80">
            The contribution drill-down uses GitHub&apos;s GraphQL API to find
            which repos this mentee contributes to, and GraphQL rejects
            unauthenticated requests entirely. Add a classic personal access token
            with <strong>no scopes</strong> (public data is all it reads) as{" "}
            <code className="rounded bg-ink/60 px-1 py-0.5 text-[11px]">
              GITHUB_TOKEN
            </code>{" "}
            and reload.
          </p>
        </div>
      )}

      {error && !missingToken && (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Stale-fallback and partial-data notices */}
      {data?.staleReason && (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Showing the last cached copy from {rel(data.profile.fetchedAt)} — the
          refresh failed: {data.staleReason}
        </div>
      )}
      {p?.partial && p.note && (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90">
          <strong className="font-semibold">Partial data.</strong> {p.note}
        </div>
      )}

      {loading && !p && (
        <div className="mt-8 animate-pulse space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-edge/60" />
            ))}
          </div>
          <div className="h-40 rounded-2xl bg-edge/60" />
          <div className="h-72 rounded-2xl bg-edge/60" />
        </div>
      )}

      {p && (
        <>
          {/* KPI row */}
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile
              label="Repos contributed to"
              value={p.reposContributedTo}
              accent="gradient"
            />
            <StatTile
              label={`Commits · ${Math.round(p.windowDays / 30)}mo`}
              value={p.commitsInWindow}
              accent="blue"
            />
            <StatTile label="PRs merged" value={p.totalMergedPRs} accent="merged" />
            <StatTile label="PRs opened" value={p.totalPRs} accent="open" />
            <StatTile label="Issues opened" value={p.totalIssues} accent="pink" />
            <StatTile
              label="Merge rate"
              value={
                p.totalPRs > 0
                  ? `${Math.round((p.totalMergedPRs / p.totalPRs) * 100)}%`
                  : "—"
              }
              accent="gradient"
            />
          </div>
          <p className="mt-2 text-[11px] text-muted">
            PR and issue totals are all-time. Commits and reviews cover the last{" "}
            {p.windowDays} days — GitHub&apos;s contribution API only reports a
            one-year window per query.
          </p>

          {/* Tech stack */}
          <section className="mt-8">
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-100">
                Tech stack they actually write
              </h2>
              {p.stack && (
                <span className="text-[11px] text-muted">
                  from {p.stack.prsScanned} merged PR
                  {p.stack.prsScanned === 1 ? "" : "s"} ·{" "}
                  {p.stack.filesSeen} files changed
                  {p.stack.truncated ? " · scan stopped early" : ""}
                </span>
              )}
            </div>
            <p className="mb-3 text-[11px] leading-relaxed text-muted">
              Measured from the files changed in their merged pull requests, sized
              by lines added — not from the host repo&apos;s language stats. Lock
              files, build output, vendored code and binary assets are excluded.
            </p>
            <div className="rounded-2xl border border-edge bg-panel/40 p-5">
              {p.stack ? (
                <StackBars entries={p.stack.entries} />
              ) : (
                <div className="text-sm text-muted">
                  Stack scan unavailable — try Refresh once the GitHub rate limit
                  resets.
                </div>
              )}
            </div>
          </section>

          {/* Repo table */}
          <section className="mt-8">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-100">
                Per-repo contribution &amp; rank
              </h2>
              <span className="text-[11px] text-muted">
                showing {p.repos.length} of {p.reposContributedTo} repos · click a
                column to sort
              </span>
            </div>
            <p className="mb-3 text-[11px] leading-relaxed text-muted">
              Rank is their position among the repo&apos;s contributors by commits
              on the default branch — GitHub&apos;s own ordering. Contributor
              totals marked <span className="text-slate-300">+</span> are a lower
              bound.
            </p>
            <RepoContribTable repos={p.repos} />
          </section>
        </>
      )}
    </div>
  );
}
