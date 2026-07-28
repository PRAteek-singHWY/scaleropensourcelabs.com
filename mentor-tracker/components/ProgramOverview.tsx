"use client";

import type { MenteeSnapshot } from "@/lib/github";
import { StatTile, LeaderboardBars } from "@/components/charts";

export default function ProgramOverview({
  data,
  totalMentees,
}: {
  data: { name: string; snap: MenteeSnapshot }[];
  totalMentees: number;
}) {
  if (data.length === 0) return null;

  const sum = (f: (s: MenteeSnapshot) => number) =>
    data.reduce((n, d) => n + f(d.snap), 0);

  const commits30d = sum((s) => s.commits30d);
  const mergedPRs = sum((s) => s.stats.mergedPRs);
  const openPRs = sum((s) => s.stats.openPRs);
  const openIssues = sum((s) => s.stats.openIssues);
  const comments = sum((s) => s.stats.commentedThreads);
  const activeStreaks = data.filter((d) => d.snap.streakDays > 0).length;

  const leaderboard = [...data]
    .sort((a, b) => b.snap.commits30d - a.snap.commits30d)
    .slice(0, 8)
    .map((d) => ({ label: d.name, value: d.snap.commits30d }));

  return (
    <div className="mb-6 rounded-2xl border border-edge bg-panel/40 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">Program overview</h3>
        <span className="text-[11px] text-muted">
          {data.length}/{totalMentees} mentees loaded
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Commits 30d" value={commits30d} accent="blue" />
        <StatTile label="Merged PRs" value={mergedPRs} accent="merged" />
        <StatTile label="Open PRs" value={openPRs} accent="open" />
        <StatTile label="Open issues" value={openIssues} accent="open" />
        <StatTile label="Comments" value={comments} accent="gradient" />
        <StatTile
          label="Active streaks"
          value={`${activeStreaks}/${data.length}`}
          accent="pink"
        />
      </div>

      {leaderboard.some((l) => l.value > 0) && (
        <div className="mt-5">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
            Commits · last 30 days · by mentee
          </div>
          <LeaderboardBars items={leaderboard} />
        </div>
      )}
    </div>
  );
}
