import Link from "next/link";
import { SiteNav, SiteFooter } from "@/components/site/SiteChrome";
import RankBadge from "@/components/site/RankBadge";
import MyStanding from "@/components/site/MyStanding";
import {
  loadPublicLeaderboard,
  PUBLIC_LEADERBOARD_LIMIT,
} from "@/lib/leaderboard";

export const revalidate = 3600;
export const metadata = {
  title: "Leaderboard",
  description:
    "Every Scaler Open Source Club member's contribution record, ordered by pull requests a maintainer merged.",
};

export default async function LeaderboardPage() {
  // Only the public top N. Positions below the cutoff are never sent to the
  // browser at all, so they cannot leak through the page source either.
  const { top: board, totalMembers } = await loadPublicLeaderboard();

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-5 pt-14">
        <p className="eyebrow">Ordered by merged pull requests</p>
        <h1 className="display-lg mt-3">Leaderboard</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-site-dim">
          Merged pull requests lead the ordering because they are the one number
          somebody else has to agree to. Commits and opened PRs are counted too, but
          they measure effort rather than accepted work.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-site-dim">
          This board shows the top {PUBLIC_LEADERBOARD_LIMIT} of{" "}
          {totalMembers || "our"} member{totalMembers === 1 ? "" : "s"}. Positions
          below that are deliberately not published — members can see their own
          standing when signed in.
        </p>

        <div className="mt-8">
          <MyStanding />
        </div>

        {board.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-site-line px-6 py-16 text-center">
            <p className="font-display text-lg font-bold tracking-tightest text-site-ink">
              No members on the board yet.
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-site-dim">
              Members appear here after they join and agree to be listed publicly.
            </p>
            <Link
              href="/join"
              className="mt-6 inline-block rounded-lg bg-site-violet px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Join the club
            </Link>
          </div>
        ) : (
          <div className="mt-10 overflow-x-auto rounded-2xl border border-site-line">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <caption className="sr-only">
                Club members with their best contributor rank and contribution
                totals.
              </caption>
              <thead>
                <tr className="border-b border-site-line bg-site-raise">
                  {[
                    "Member",
                    "Best rank",
                    "Merged",
                    "Opened",
                    "Issues",
                    "Repos",
                    "Writes",
                  ].map((h, i) => (
                    <th
                      key={h}
                      scope="col"
                      className={`px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-site-faint ${
                        i === 0 ? "text-left" : i >= 2 && i <= 5 ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {board.map((entry, i) => {
                  const s = entry.stats;
                  const best = s?.bestRank;
                  return (
                    <tr
                      key={entry.member.id}
                      className="border-b border-site-line/60 transition last:border-0 hover:bg-site-raise/60"
                    >
                      <td className="px-4 py-4">
                        <Link
                          href={`/members/${entry.member.github}`}
                          className="group flex items-center gap-3"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://github.com/${entry.member.github}.png`}
                            alt=""
                            width={32}
                            height={32}
                            loading="lazy"
                            className="h-8 w-8 rounded-full ring-1 ring-site-line"
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-site-ink group-hover:text-site-violet">
                              {entry.member.displayName}
                            </span>
                            <span className="block truncate font-mono text-[11px] text-site-faint">
                              @{entry.member.github}
                              {entry.member.batch ? ` · ${entry.member.batch}` : ""}
                            </span>
                          </span>
                        </Link>
                      </td>

                      <td className="px-4 py-4">
                        {best ? (
                          <div>
                            <RankBadge
                              rank={best.rank}
                              totalContributors={best.totalContributors}
                              contributorsExact={best.contributorsExact}
                              size="sm"
                              emphasis={i === 0}
                            />
                            <div className="mt-0.5 max-w-[190px] truncate font-mono text-[11px] text-site-faint">
                              {best.repo}
                            </div>
                          </div>
                        ) : (
                          <span
                            className="font-mono text-[11px] text-site-faint"
                            title="No ranked position on a repo they don't own yet."
                          >
                            —
                          </span>
                        )}
                      </td>

                      {s ? (
                        <>
                          <td className="px-4 py-4 text-right font-mono">
                            <span className="font-semibold text-site-ink">
                              {s.totalMergedPRs}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right font-mono text-site-dim">
                            {s.totalPRs}
                          </td>
                          <td className="px-4 py-4 text-right font-mono text-site-dim">
                            {s.totalIssues}
                          </td>
                          <td className="px-4 py-4 text-right font-mono text-site-dim">
                            {s.reposContributedTo}
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-mono text-[11px] text-site-dim">
                              {s.topLanguages.length > 0
                                ? s.topLanguages.slice(0, 2).join(" · ")
                                : "—"}
                            </span>
                          </td>
                        </>
                      ) : (
                        <td
                          colSpan={5}
                          className="px-4 py-4 font-mono text-[11px] text-site-faint"
                        >
                          Contribution data not collected yet
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-6 font-mono text-[11px] leading-relaxed text-site-faint">
          Rank counts commits on a repository&apos;s default branch, so members whose
          contribution was issues, reviews, or work merged to another branch show no
          rank. A pool size ending in + is a lower bound.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
