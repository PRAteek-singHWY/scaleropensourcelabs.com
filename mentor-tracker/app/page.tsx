import Link from "next/link";
import { SiteNav, SiteFooter } from "@/components/site/SiteChrome";
import ContributionGrid from "@/components/site/ContributionGrid";
import RankBadge from "@/components/site/RankBadge";
import { loadClubGrid, loadClubTotals, loadLeaderboard } from "@/lib/leaderboard";
import { qualifiesForPublicPage } from "@/lib/public";

// Public landing page. Server-rendered from the Postgres cache — no GitHub calls,
// no client-side fetching, so it is fast and indexable.
//
// Revalidate hourly: the underlying contribution data only changes when the
// refresh job runs, so per-request rendering would buy nothing.
export const revalidate = 3600;

export default async function HomePage({
  searchParams,
}: {
  searchParams: { denied?: string };
}) {
  const [grid, totals, board] = await Promise.all([
    loadClubGrid(),
    loadClubTotals(),
    loadLeaderboard(),
  ]);

  // Needs a rank to be worth showing AND a reachable page to link to. A repo rank
  // comes from commits, which doesn't by itself imply a merged PR, so both apply.
  //
  // Ordered by RANK here, not by merged PRs like the leaderboard. The section is
  // called "Ranked contributors" and the bold left-hand number is the rank, so the
  // eye reads that column as the sort key — listing #1, #22, #5, #65 under it looks
  // like a bug even though it was correctly ordered by something else.
  const top = board
    .filter((e) => e.stats?.bestRank && qualifiesForPublicPage(e.stats))
    .sort((a, b) => {
      const ra = a.stats?.bestRank;
      const rb = b.stats?.bestRank;
      if (!ra || !rb) return 0;
      if (ra.rank !== rb.rank) return ra.rank - rb.rank;
      // Same position: the larger contributor pool is the stronger result.
      return (rb.totalContributors ?? 0) - (ra.totalContributors ?? 0);
    })
    .slice(0, 5);
  const hasData = grid.days.length > 0;

  return (
    <>
      <SiteNav />

      {/* Someone signed in without organiser access landed here from middleware. */}
      {searchParams?.denied === "admin" && (
        <div className="border-b border-site-amber/25 bg-site-amber/10 px-5 py-2.5 text-center text-sm text-site-amber">
          That area is for club organisers. Your account is signed in as a member.
        </div>
      )}

      <main className="mx-auto max-w-6xl px-5">
        {/* ---- Hero ---- */}
        <section className="pt-16 sm:pt-24">
          <p className="eyebrow">Scaler School of Technology</p>
          <h1 className="display-xl mt-4 max-w-3xl text-balance">
            Your first merged pull request is closer than you think.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-site-dim">
            We pair you with a mentor and a real project. You pick an issue, open a
            pull request, and a maintainer merges it. Everything on this page is work
            our members actually landed.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/join"
              className="rounded-lg bg-site-violet px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Join the club
            </Link>
            <Link
              href="/leaderboard"
              className="rounded-lg border border-site-line px-5 py-2.5 text-sm font-semibold text-site-ink transition hover:border-site-violet/60"
            >
              See what members shipped
            </Link>
          </div>
        </section>

        {/* ---- The grid: the club's collective year ---- */}
        <section className="mt-16 rounded-2xl border border-site-line bg-site-raise p-6 shadow-site-lift sm:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold tracking-tightest text-site-ink">
                The club&apos;s last twelve months
              </h2>
              <p className="mt-1 text-sm text-site-dim">
                {hasData
                  ? `Every contribution from ${grid.contributors} member${grid.contributors === 1 ? "" : "s"}, day by day.`
                  : "One cell per day, once members start contributing."}
              </p>
            </div>
            {hasData && (
              <div className="font-mono text-sm text-site-dim">
                <span className="font-display text-2xl font-extrabold tracking-tightest text-site-ink">
                  {grid.total.toLocaleString()}
                </span>{" "}
                contributions
              </div>
            )}
          </div>

          {hasData ? (
            <ContributionGrid days={grid.days} />
          ) : (
            <div className="rounded-xl border border-dashed border-site-line px-6 py-12 text-center">
              <p className="font-display text-base font-bold tracking-tightest text-site-ink">
                Nothing recorded yet.
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-site-dim">
                This grid fills in as members contribute. The first entry on this
                board is available.
              </p>
              <Link
                href="/join"
                className="mt-5 inline-block rounded-lg bg-site-violet px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Be the first
              </Link>
            </div>
          )}
        </section>

        {/* ---- Totals ---- */}
        {totals.members > 0 && (
          <section className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-site-line bg-site-line sm:grid-cols-4">
            {[
              { label: "Members", value: totals.members },
              { label: "Pull requests merged", value: totals.mergedPRs },
              { label: "Issues opened", value: totals.issuesOpened },
              { label: "Repos contributed to", value: totals.reposTouched },
            ].map((t) => (
              <div key={t.label} className="bg-site-raise px-5 py-6">
                <div className="font-display text-3xl font-extrabold tracking-tightest text-site-ink">
                  {t.value.toLocaleString()}
                </div>
                <div className="eyebrow mt-1.5">{t.label}</div>
              </div>
            ))}
          </section>
        )}

        {/* ---- Top ranked members. The signature element, used as proof. ---- */}
        {top.length > 0 && (
          <section className="mt-20">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="display-lg">Ranked contributors</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-site-dim">
                  Position among all contributors to a project our member does not
                  own, by commits on its default branch. GitHub&apos;s own ordering.
                </p>
              </div>
              <Link
                href="/leaderboard"
                className="font-mono text-xs text-site-dim hover:text-site-ink"
              >
                Full leaderboard →
              </Link>
            </div>

            <ul className="mt-8 divide-y divide-site-line border-y border-site-line">
              {top.map((entry, i) => {
                const best = entry.stats?.bestRank;
                if (!best) return null;
                return (
                  <li key={entry.member.id}>
                    <Link
                      href={`/members/${entry.member.github}`}
                      className="group flex flex-wrap items-center gap-x-6 gap-y-3 py-5 transition hover:bg-site-raise/60"
                    >
                      <div className="w-24 shrink-0">
                        <RankBadge
                          rank={best.rank}
                          totalContributors={best.totalContributors}
                          contributorsExact={best.contributorsExact}
                          emphasis={i === 0}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="font-display text-base font-bold tracking-tightest text-site-ink">
                          {entry.member.displayName}
                        </div>
                        <div className="mt-0.5 truncate font-mono text-xs text-site-dim">
                          {best.repo}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-6 font-mono text-xs text-site-dim">
                        <span>
                          <span className="text-site-ink">
                            {entry.stats?.totalMergedPRs ?? 0}
                          </span>{" "}
                          merged
                        </span>
                        {entry.stats?.topLanguages[0] && (
                          <span className="hidden sm:inline">
                            {entry.stats.topLanguages.slice(0, 2).join(" · ")}
                          </span>
                        )}
                        <span
                          aria-hidden
                          className="text-site-faint transition group-hover:text-site-violet"
                        >
                          →
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* ---- Programs ---- */}
        <section className="mt-24">
          <h2 className="display-lg">What you can work on</h2>
          <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-site-line bg-site-line md:grid-cols-3">
            {[
              {
                title: "Open source mentorship",
                body: "A mentor helps you find a first issue in a real project, review your patch before you send it, and keep going after it merges.",
              },
              {
                title: "AI security",
                body: "Find and responsibly report security weaknesses in open-source AI tooling — prompt injection, unsafe deserialisation, leaked credentials in model configs — then land the fix upstream.",
                href: "/security",
                cta: "Disclosure policy",
              },
              {
                title: "Club projects",
                body: "This website is one of them. It is open source, and the issue tracker is where new members usually start.",
              },
            ].map((p) => (
              <div key={p.title} className="flex flex-col bg-site-raise p-6">
                <h3 className="font-display text-base font-bold tracking-tightest text-site-ink">
                  {p.title}
                </h3>
                <p className="mt-2.5 flex-1 text-sm leading-relaxed text-site-dim">
                  {p.body}
                </p>
                {p.href && (
                  <Link
                    href={p.href}
                    className="mt-4 font-mono text-xs text-site-violet hover:brightness-125"
                  >
                    {p.cta} →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
