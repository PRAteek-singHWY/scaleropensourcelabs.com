import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { SiteNav, SiteFooter } from "@/components/site/SiteChrome";
import RankBadge from "@/components/site/RankBadge";
import { loadPublicMember } from "@/lib/leaderboard";
import { USERNAME_RE } from "@/lib/github";
import Avatar from "@/components/site/Avatar";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: { github: string };
}): Promise<Metadata> {
  if (!USERNAME_RE.test(params.github)) return { title: "Member" };
  const entry = await loadPublicMember(params.github);
  if (!entry) return { title: "Member" };
  const best = entry.stats?.bestRank;
  return {
    title: entry.member.displayName,
    description: best
      ? `${entry.member.displayName} ranks #${best.rank} among contributors to ${best.repo}.`
      : `${entry.member.displayName}'s open-source contribution record.`,
  };
}

export default async function MemberPage({
  params,
}: {
  params: { github: string };
}) {
  if (!USERNAME_RE.test(params.github)) notFound();

  // Returns null unless the member is APPROVED and consented, so an unapproved or
  // withdrawn member 404s rather than being reachable by direct URL.
  const entry = await loadPublicMember(params.github);
  if (!entry) notFound();

  const { member, stats } = entry;
  const external = (stats?.repos ?? []).filter((r) => !r.isOwnRepo);

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-5xl px-5 pt-14">
        <Link
          href="/leaderboard"
          className="font-mono text-xs text-site-dim hover:text-site-ink"
        >
          ← Leaderboard
        </Link>

        {/* Header */}
        <header className="mt-6 flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-5">
            <Avatar
              github={member.github}
              name={member.displayName}
              size={72}
              rounded="2xl"
            />
            <div>
              <h1 className="display-lg">{member.displayName}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-site-dim">
                <a
                  href={`https://github.com/${member.github}`}
                  className="text-site-violet hover:brightness-125"
                  rel="noreferrer"
                  target="_blank"
                >
                  @{member.github}
                </a>
                {member.batch && <span>Batch of {member.batch}</span>}
                {member.role && <span>{member.role}</span>}
              </div>
              {member.bio && (
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-site-dim">
                  {member.bio}
                </p>
              )}
            </div>
          </div>

          {stats?.bestRank && (
            <div className="rounded-2xl border border-site-line bg-site-raise px-6 py-5">
              <div className="eyebrow mb-2">Best contributor rank</div>
              <RankBadge
                rank={stats.bestRank.rank}
                totalContributors={stats.bestRank.totalContributors}
                contributorsExact={stats.bestRank.contributorsExact}
                size="lg"
                emphasis
              />
              <a
                href={stats.bestRank.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block max-w-[220px] truncate font-mono text-xs text-site-dim hover:text-site-ink"
              >
                {stats.bestRank.repo}
              </a>
            </div>
          )}
        </header>

        {!stats ? (
          <div className="mt-12 rounded-2xl border border-dashed border-site-line px-6 py-14 text-center">
            <p className="font-display text-base font-bold tracking-tightest text-site-ink">
              Contribution data not collected yet
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-site-dim">
              This page fills in the next time the club refreshes its contribution
              data from GitHub.
            </p>
          </div>
        ) : (
          <>
            {/* Totals */}
            <section className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-site-line bg-site-line sm:grid-cols-4">
              {[
                { label: "Pull requests merged", value: stats.totalMergedPRs },
                { label: "Merge rate", value: `${Math.round(stats.mergeRate * 100)}%` },
                { label: "Issues opened", value: stats.totalIssues },
                { label: "Repos contributed to", value: stats.reposContributedTo },
              ].map((t) => (
                <div key={t.label} className="bg-site-raise px-5 py-5">
                  <div className="font-display text-2xl font-extrabold tracking-tightest text-site-ink">
                    {typeof t.value === "number" ? t.value.toLocaleString() : t.value}
                  </div>
                  <div className="eyebrow mt-1.5">{t.label}</div>
                </div>
              ))}
            </section>

            {stats.topLanguages.length > 0 && (
              <section className="mt-8">
                <div className="eyebrow mb-3">Writes mostly</div>
                <div className="flex flex-wrap gap-2">
                  {stats.topLanguages.map((l) => (
                    <span
                      key={l}
                      className="rounded-full border border-site-line bg-site-raise px-3.5 py-1.5 font-mono text-xs text-site-ink"
                    >
                      {l}
                    </span>
                  ))}
                </div>
                <p className="mt-2.5 font-mono text-[11px] text-site-faint">
                  From files changed in merged pull requests, by lines added. Config
                  and docs excluded.
                </p>
              </section>
            )}

            {/* Projects they contribute to */}
            {external.length > 0 && (
              <section className="mt-12">
                <h2 className="font-display text-lg font-bold tracking-tightest text-site-ink">
                  Projects they contribute to
                </h2>
                <ul className="mt-5 divide-y divide-site-line border-y border-site-line">
                  {external.map((r) => (
                    <li
                      key={r.nameWithOwner}
                      className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate font-mono text-sm text-site-ink hover:text-site-violet"
                        >
                          {r.nameWithOwner}
                        </a>
                        <div className="mt-0.5 font-mono text-[11px] text-site-faint">
                          {r.primaryLanguage ?? "—"} · ★ {r.stars.toLocaleString()}
                        </div>
                      </div>
                      <div className="w-20 shrink-0">
                        {r.rankStatus === "ranked" && r.rank !== null ? (
                          <RankBadge
                            rank={r.rank}
                            totalContributors={r.totalContributors}
                            contributorsExact={r.contributorsExact}
                            size="sm"
                          />
                        ) : (
                          <span className="font-mono text-[11px] text-site-faint">
                            —
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 font-mono text-xs text-site-dim">
                        <span className="text-site-ink">{r.prsMerged}</span> merged ·{" "}
                        {r.issuesOpened} issues
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Their year */}
            {stats.repos.length > 0 && (
              <section className="mt-12 rounded-2xl border border-site-line bg-site-raise p-6">
                <h2 className="font-display text-base font-bold tracking-tightest text-site-ink">
                  Member since {new Date(member.joinedAt).getFullYear()}
                </h2>
                <p className="mt-1 font-mono text-[11px] text-site-faint">
                  Contribution data last collected{" "}
                  {new Date(stats.fetchedAt).toLocaleDateString()}
                  {stats.partial ? " · partial" : ""}
                </p>
              </section>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
