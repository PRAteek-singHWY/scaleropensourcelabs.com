import { NextResponse } from "next/server";
import { getMenteeSnapshot, USERNAME_RE } from "@/lib/github";

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
