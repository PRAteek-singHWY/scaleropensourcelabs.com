"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// A member's own position, visible only to them.
//
// The public board stops at ten, so without this a member has no idea whether they
// are eleventh or sixtieth — and a leaderboard you cannot find yourself on does not
// motivate anybody. Showing the gap to the cutoff turns the ranking into a target
// instead of a verdict.

type Standing = {
  rank: number;
  totalMembers: number;
  isPublic: boolean;
  mergedPRsToPublic: number | null;
  mergedPRs: number;
  hasData: boolean;
};

export default function MyStanding() {
  const [standing, setStanding] = useState<Standing | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/members/standing", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { standing: Standing | null }) => setStanding(d.standing))
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  // Signed out, or not a member — render nothing rather than an empty box.
  if (!loaded || !standing) return null;

  return (
    <aside className="rounded-2xl border border-site-violet/35 bg-site-violet/[0.07] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Your position · only you see this</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold tracking-tightest text-site-ink">
              #{standing.rank}
            </span>
            <span className="font-mono text-xs text-site-dim">
              of {standing.totalMembers} member
              {standing.totalMembers === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="max-w-xs text-sm leading-relaxed text-site-dim">
          {!standing.hasData ? (
            <>
              Your contribution data hasn&apos;t been collected yet. It arrives on the
              next refresh — nothing for you to do.
            </>
          ) : standing.isPublic ? (
            <>
              You&apos;re on the public board. {standing.mergedPRs} merged pull
              request{standing.mergedPRs === 1 ? "" : "s"} counted.
            </>
          ) : (
            <>
              The public board shows the top 10.{" "}
              <strong className="font-semibold text-site-ink">
                {standing.mergedPRsToPublic} more merged pull request
                {standing.mergedPRsToPublic === 1 ? "" : "s"}
              </strong>{" "}
              would put you on it.
            </>
          )}
        </div>
      </div>

      {!standing.isPublic && standing.hasData && (
        <p className="mt-4 border-t border-site-violet/20 pt-3.5 text-[13px] leading-relaxed text-site-faint">
          Positions below the top 10 are never published. Only you and the club
          organisers can see this.{" "}
          <Link href="/programs" className="text-site-violet hover:brightness-125">
            Find something to work on
          </Link>
          .
        </p>
      )}
    </aside>
  );
}
