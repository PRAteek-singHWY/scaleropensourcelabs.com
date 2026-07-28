import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { USERNAME_RE } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/mentees { mentorId, name, email, github } → create a mentee under a
// mentor this lead owns.
export async function POST(req: Request) {
  const userId = await requireAdminId();
  if (!userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const mentorId = typeof body?.mentorId === "string" ? body.mentorId : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const github = typeof body?.github === "string" ? body.github.trim() : "";

  if (!mentorId || !name || !email || !github)
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  if (!USERNAME_RE.test(github))
    return NextResponse.json({ error: "Invalid GitHub username" }, { status: 400 });

  // Verify the mentor belongs to this lead before attaching a mentee.
  const mentor = await prisma.mentor.findFirst({
    where: { id: mentorId, userId },
    select: { id: true },
  });
  if (!mentor)
    return NextResponse.json({ error: "Mentor not found" }, { status: 404 });

  const mentee = await prisma.mentee.create({
    data: { mentorId, name, email, github },
  });

  return NextResponse.json({ mentee }, { status: 201 });
}
