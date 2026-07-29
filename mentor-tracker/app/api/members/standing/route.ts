import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { loadMemberStanding } from "@/lib/leaderboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/members/standing — the caller's own position on the leaderboard.
//
// Split out from the leaderboard page on purpose. The public top-10 table is
// statically rendered and cached, which is what makes it fast and indexable;
// reading the session inside that page would opt the whole thing out of static
// rendering for the sake of one personalised card. So the card fetches itself.
//
// Scoped to the session's GitHub login, so it can only ever report your own rank.
// There is no parameter to pass someone else's username.
export async function GET() {
  const user = await currentUser();
  if (!user?.login) return NextResponse.json({ standing: null });

  const standing = await loadMemberStanding(user.login);
  if (!standing) return NextResponse.json({ standing: null });

  // Only the caller's own numbers leave here — never the rest of the board, which
  // is organiser-only.
  return NextResponse.json(
    {
      standing: {
        rank: standing.rank,
        totalMembers: standing.totalMembers,
        isPublic: standing.isPublic,
        mergedPRsToPublic: standing.mergedPRsToPublic,
        mergedPRs: standing.entry.stats?.totalMergedPRs ?? 0,
        hasData: standing.entry.stats !== null,
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
