import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE /api/mentors/:id → delete a mentor (and cascade its mentees).
// Ownership is enforced: the delete only matches rows owned by this lead, so
// guessing another lead's mentor id deletes nothing.
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const userId = await requireAdminId();
  if (!userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await prisma.mentor.deleteMany({
    where: { id: params.id, userId },
  });
  if (result.count === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
