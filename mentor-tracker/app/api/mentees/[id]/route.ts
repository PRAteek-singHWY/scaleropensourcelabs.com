import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/mentees/:id → one mentee, plus their mentor's name for breadcrumbs.
// Ownership-scoped: a lead can only read mentees under their own mentors, so
// guessing another lead's mentee id returns 404.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const userId = await requireAdminId();
  if (!userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const mentee = await prisma.mentee.findFirst({
    where: { id: params.id, mentor: { userId } },
    select: {
      id: true,
      name: true,
      email: true,
      github: true,
      mentor: { select: { id: true, name: true } },
    },
  });
  if (!mentee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ mentee });
}

// DELETE /api/mentees/:id → delete a mentee, but only if it belongs to a mentor
// owned by this lead.
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const userId = await requireAdminId();
  if (!userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await prisma.mentee.deleteMany({
    where: { id: params.id, mentor: { userId } },
  });
  if (result.count === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
