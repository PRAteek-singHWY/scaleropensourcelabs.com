import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mentors → this lead's mentors, each with their mentees.
export async function GET() {
  const userId = await requireAdminId();
  if (!userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const mentors = await prisma.mentor.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { mentees: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({ mentors });
}

// POST /api/mentors { name, github? } → create a mentor owned by this lead.
export async function POST(req: Request) {
  const userId = await requireAdminId();
  if (!userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const github =
    typeof body?.github === "string" && body.github.trim()
      ? body.github.trim()
      : null;
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const mentor = await prisma.mentor.create({
    data: { userId, name, github },
    include: { mentees: true },
  });

  return NextResponse.json({ mentor }, { status: 201 });
}
