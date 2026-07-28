import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS = ["approve", "reject", "unpublish"] as const;
type Action = (typeof ACTIONS)[number];

// PATCH /api/admin/members/:id { action }
//
// Organiser review of a membership. Note what an admin CANNOT do here: grant
// consent. `publicConsent` is only ever written by the member themselves through
// /api/members, so approving somebody who never ticked the box publishes nothing.
// Approval and consent are two independent gates and both must be satisfied — see
// PUBLIC_MEMBER_WHERE in lib/public.ts.
//
// "unpublish" is the fast lever for a takedown request: it flips status away from
// APPROVED without destroying the record or touching the member's own consent.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const action = body?.action as Action | undefined;
  if (!action || !ACTIONS.includes(action))
    return NextResponse.json(
      { error: `action must be one of: ${ACTIONS.join(", ")}` },
      { status: 400 },
    );

  const existing = await prisma.member.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data =
    action === "approve"
      ? {
          status: "APPROVED" as const,
          approvedAt: new Date(),
          // Audit trail: which organiser published this person.
          approvedBy: admin.login ?? admin.id,
        }
      : action === "reject"
        ? { status: "REJECTED" as const, approvedAt: null, approvedBy: null }
        : { status: "PENDING" as const, approvedAt: null, approvedBy: null };

  const member = await prisma.member.update({
    where: { id: params.id },
    data,
    select: {
      id: true,
      github: true,
      displayName: true,
      status: true,
      publicConsent: true,
      approvedBy: true,
    },
  });

  return NextResponse.json({ member });
}
