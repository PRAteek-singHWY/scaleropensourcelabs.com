import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE /api/mentees/:id → delete a mentee, but only if it belongs to a mentor
// owned by this lead.
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await prisma.mentee.deleteMany({
    where: { id: params.id, mentor: { userId } },
  });
  if (result.count === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
