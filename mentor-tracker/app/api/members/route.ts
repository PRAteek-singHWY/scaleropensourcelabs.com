import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { USERNAME_RE } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/members — join the club.
//
// The single most important line in this file is the one that decides which GitHub
// username the record gets: it comes from the SESSION, never from the request body.
//
// If the client could name the username, anyone could publish anyone — submit
// "torvalds", get their contribution stats onto our leaderboard under a name we
// chose, with a consent flag we ticked on their behalf. Taking it from the OAuth
// session means the person consenting has proved to GitHub that they control the
// account being published.
//
// The body therefore carries only self-describing fields (display name, batch,
// bio) plus the consent checkbox.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json(
      { error: "Sign in with GitHub to join" },
      { status: 401 },
    );
  if (!user.login)
    return NextResponse.json(
      { error: "Your session has no GitHub username attached. Sign out and back in." },
      { status: 400 },
    );

  // Authoritative identity. Not read from the body.
  const github = user.login.toLowerCase();
  if (!USERNAME_RE.test(github))
    return NextResponse.json({ error: "Invalid GitHub username" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const displayName =
    typeof body?.displayName === "string" ? body.displayName.trim().slice(0, 80) : "";
  const batch =
    typeof body?.batch === "string" && body.batch.trim()
      ? body.batch.trim().slice(0, 16)
      : null;
  const bio =
    typeof body?.bio === "string" && body.bio.trim()
      ? body.bio.trim().slice(0, 280)
      : null;
  const publicConsent = body?.publicConsent === true;

  if (!displayName)
    return NextResponse.json({ error: "Add the name you want shown" }, { status: 400 });

  // Consent is explicit and recorded with a timestamp. Without it the row still
  // exists (they joined) but never renders publicly — see PUBLIC_MEMBER_WHERE.
  const member = await prisma.member.upsert({
    where: { github },
    create: {
      github,
      displayName,
      batch,
      bio,
      publicConsent,
      consentedAt: publicConsent ? new Date() : null,
      status: "PENDING",
    },
    update: {
      displayName,
      batch,
      bio,
      publicConsent,
      // Re-consenting refreshes the timestamp; withdrawing clears it, so the record
      // reflects when permission was actually granted.
      consentedAt: publicConsent ? new Date() : null,
    },
    select: { id: true, github: true, status: true, publicConsent: true },
  });

  return NextResponse.json({ member }, { status: 201 });
}

// GET /api/members/me — the caller's own membership record, if any.
// Scoped to the session's GitHub login, so it can only ever return your own row.
export async function GET() {
  const user = await currentUser();
  if (!user?.login) return NextResponse.json({ member: null });

  const member = await prisma.member.findUnique({
    where: { github: user.login.toLowerCase() },
    select: {
      id: true,
      github: true,
      displayName: true,
      batch: true,
      bio: true,
      publicConsent: true,
      status: true,
    },
  });
  return NextResponse.json({ member });
}
