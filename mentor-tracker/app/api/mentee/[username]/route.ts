import { NextResponse } from "next/server";
import { getMenteeSnapshot, USERNAME_RE } from "@/lib/github";
import { isDemoMode } from "@/lib/demo";
import { demoSnapshot } from "@/lib/demo-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { username: string } },
) {
  const username = params.username;

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "Invalid GitHub username" },
      { status: 400 },
    );
  }

  // In demo mode the seeded usernames are fictional, so calling the real GitHub
  // API both fails and burns the anonymous 60/hr limit — the dashboard filled with
  // 403 rate-limit errors. Serve the deterministic fixture instead.
  if (isDemoMode()) {
    return NextResponse.json(demoSnapshot(username), {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }

  // Upstream errors are captured into snap.error and still return 200 so that
  // one bad mentee never breaks the rest of the grid.
  const snap = await getMenteeSnapshot(username);

  return NextResponse.json(snap, {
    status: 200,
    headers: {
      "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
    },
  });
}
