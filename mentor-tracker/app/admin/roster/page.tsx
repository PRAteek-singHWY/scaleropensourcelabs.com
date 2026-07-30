import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { loadDangerZone } from "@/lib/danger-zone";
import { loadLeaderboard, PUBLIC_LEADERBOARD_LIMIT } from "@/lib/leaderboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Roster" };

// The organisers' view of the whole club: the full ranked table (the public site
// stops at ten) plus the danger zone.
//
// requireAdmin() here as well as in middleware. The full ranking and the quiet list
// are exactly the data the public cutoff exists to withhold, so this page must not
// rely on the matcher being correct.
export default async function RosterPage() {
  const admin = await requireAdmin();
  if (!admin) notFound();

  const [board, danger] = await Promise.all([
    loadLeaderboard(),
    // Addresses aren't needed to render this page, so they aren't fetched.
    loadDangerZone({ includeEmail: false }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center gap-2 text-xs text-muted">
        <Link href="/admin" className="transition hover:text-pink">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-slate-300">Roster</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Club roster</h1>
          {/* One denominator per sentence. `clubTotal` counts every approved
              member; `board.length` counts only those who consented to a public
              listing, so 5 active + 1 quiet out of "5 members" would not add up. */}
          <p className="mt-1 text-sm text-muted">
            {danger.clubTotal} in the club · {danger.activeCount} active ·{" "}
            {danger.quiet.length} quiet · {danger.awaitingData.length} awaiting data
          </p>
          <p className="mt-0.5 text-xs text-muted/80">
            {board.length} of them consented to appear publicly.
          </p>
        </div>
        <Link
          href="/admin/members"
          className="rounded-lg border border-edge bg-panel/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-pink/50 hover:text-pink"
        >
          Manage memberships →
        </Link>
      </div>

      {/* ---- Danger zone ---- */}
      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-100">
            Danger zone · no public activity in {danger.thresholdDays}+ days
          </h2>
          <span className="text-[11px] text-muted">organisers only</span>
        </div>

        <div className="mt-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-sm leading-relaxed text-amber-200/90">
          This measures <strong className="font-semibold">public</strong> GitHub
          activity only. A member working in a private repo, on college submissions,
          or on an unmerged branch shows up here too. Treat it as a prompt to check
          in, not as evidence someone has stopped working.
        </div>

        {danger.quiet.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-edge bg-panel/40 px-4 py-8 text-center text-sm text-muted">
            Nobody is past {danger.thresholdDays} days. Either the club is on a roll
            or the refresh job hasn&apos;t run yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-edge bg-panel/40">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="border-b border-edge">
                <tr>
                  {["Member", "Last public activity", "Quiet for", "Nudge"].map(
                    (h, i) => (
                      <th
                        key={h}
                        scope="col"
                        className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted ${
                          i === 0 ? "text-left" : "text-left"
                        }`}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {danger.quiet.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-edge/50 transition last:border-0 hover:bg-ink/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://github.com/${m.github}.png`}
                          alt=""
                          width={28}
                          height={28}
                          className="h-7 w-7 rounded-full ring-1 ring-edge"
                        />
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-100">
                            {m.displayName}
                          </div>
                          <div className="truncate text-[11px] text-muted">
                            @{m.github}
                            {m.batch ? ` · ${m.batch}` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {m.neverActive ? (
                        <span className="text-muted">
                          none in the tracked year
                        </span>
                      ) : (
                        new Date(m.lastContributionAt as string).toLocaleDateString()
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2 py-px text-[11px] font-semibold ${
                          m.neverActive || (m.daysSinceActivity ?? 0) >= 30
                            ? "border-red-500/30 bg-red-500/10 text-red-300"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                        }`}
                      >
                        {m.neverActive ? "—" : `${m.daysSinceActivity}d`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted">
                      {!m.notifyInactive ? (
                        <span title="This member opted out of nudge emails.">
                          opted out
                        </span>
                      ) : !m.hasEmail ? (
                        <span title="No email address on file, so the nudge cannot be sent.">
                          no address
                        </span>
                      ) : m.lastNudgedAt ? (
                        `last sent ${new Date(m.lastNudgedAt).toLocaleDateString()}`
                      ) : (
                        "not sent yet"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---- Awaiting data ---- */}
      {danger.awaitingData.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-slate-100">
            Awaiting first data collection
          </h2>
          <p className="mt-1 text-sm text-muted">
            Joined but never fetched, so we genuinely don&apos;t know how active they
            are. They are not in the danger zone. The refresh job picks these up
            first.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {danger.awaitingData.map((m) => (
              <span
                key={m.id}
                className="rounded-full border border-edge bg-ink/60 px-3 py-1 text-xs text-slate-300"
              >
                {m.displayName}{" "}
                <span className="text-muted">@{m.github}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ---- Full ranking ---- */}
      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-100">
            Full ranking · all {board.length}
          </h2>
          <span className="text-[11px] text-muted">
            public site shows the top {PUBLIC_LEADERBOARD_LIMIT} only
          </span>
        </div>

        {board.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-edge bg-panel/40 px-4 py-8 text-center text-sm text-muted">
            Nobody has joined and consented to a listing yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-edge bg-panel/40">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead className="border-b border-edge">
                <tr>
                  {["#", "Member", "Merged", "Opened", "Issues", "Repos", "Best rank"].map(
                    (h) => (
                      <th
                        key={h}
                        scope="col"
                        className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {board.map((entry, i) => {
                  const s = entry.stats;
                  const onPublic = i < PUBLIC_LEADERBOARD_LIMIT;
                  return (
                    <tr
                      key={entry.member.id}
                      className={`border-b border-edge/50 transition last:border-0 hover:bg-ink/40 ${
                        onPublic ? "" : "opacity-80"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-100">{i + 1}</span>
                        {onPublic && (
                          <span
                            className="ml-1.5 text-[10px] text-[#c9a5f9]"
                            title="Visible on the public leaderboard"
                          >
                            public
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="truncate font-medium text-slate-100">
                          {entry.member.displayName}
                        </div>
                        <div className="truncate text-[11px] text-muted">
                          @{entry.member.github}
                        </div>
                      </td>
                      {s ? (
                        <>
                          <td className="px-4 py-3 font-semibold text-slate-100">
                            {s.totalMergedPRs}
                          </td>
                          <td className="px-4 py-3 text-slate-300">{s.totalPRs}</td>
                          <td className="px-4 py-3 text-slate-300">
                            {s.totalIssues}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {s.reposContributedTo}
                          </td>
                          <td className="px-4 py-3 text-[11px] text-muted">
                            {s.bestRank
                              ? `#${s.bestRank.rank} · ${s.bestRank.repo}`
                              : "—"}
                          </td>
                        </>
                      ) : (
                        <td colSpan={5} className="px-4 py-3 text-[11px] text-muted">
                          no data collected yet
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
