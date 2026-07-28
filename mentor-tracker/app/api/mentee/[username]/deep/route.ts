import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { USERNAME_RE } from "@/lib/github";
import { MissingTokenError } from "@/lib/github-deep";
import { loadDeepProfile } from "@/lib/deep-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mentee/:username/deep[?refresh=1]
//
// The full contribution drill-down: every public repo the user contributes to,
// with their rank, issue/PR breakdown, and real tech stack.
//
// Unlike /api/mentee/:username (which is a cheap public-profile snapshot), this
// costs ~50-70 GitHub API calls on a cache miss. Two consequences:
//
//   1. It is authorization-gated on top of the session check. A lead may only
//      look up a username that is one of THEIR mentees — otherwise the route
//      would be an open, expensive GitHub-scraping proxy for anyone with a login.
//   2. Results are cached in Postgres on a TTL. ?refresh=1 forces a refetch.
export async function GET(
  req: Request,
  { params }: { params: { username: string } },
) {
  const userId = await requireAdminId();
  if (!userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const username = params.username;
  if (!USERNAME_RE.test(username))
    return NextResponse.json({ error: "Invalid GitHub username" }, { status: 400 });

  // Authorization: this username must belong to a mentee under one of this
  // lead's mentors. Case-insensitive, because GitHub logins are.
  const owned = await prisma.mentee.findFirst({
    where: {
      github: { equals: username, mode: "insensitive" },
      mentor: { userId },
    },
    select: { id: true },
  });
  if (!owned)
    return NextResponse.json(
      { error: "No mentee with that GitHub username in your program" },
      { status: 404 },
    );

  const forceRefresh =
    new URL(req.url).searchParams.get("refresh") === "1";

  try {
    const result = await loadDeepProfile(username, { forceRefresh });
    return NextResponse.json(result, {
      status: 200,
      // Always revalidate: the Postgres TTL is the cache, not the CDN. A shared
      // edge cache here would also serve one lead's request to another.
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    if (err instanceof MissingTokenError)
      return NextResponse.json(
        { error: err.message, code: "MISSING_TOKEN" },
        { status: 503 },
      );

    const message =
      err instanceof Error ? err.message : "Failed to build contribution profile";
    // 502: we're reporting an upstream GitHub failure, not our own.
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
