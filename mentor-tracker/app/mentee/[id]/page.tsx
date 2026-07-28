import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/session";
import MenteeProfile from "@/components/MenteeProfile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Mentee profile · Mentor Tracker" };

// The drill-down page. The mentee record is resolved server-side and scoped to
// the signed-in lead, so a lead who guesses another lead's mentee id gets a 404
// rather than a name and an email address. The expensive GitHub data is then
// fetched client-side from /api/mentee/:username/deep, which re-checks ownership.
export default async function MenteePage({
  params,
}: {
  params: { id: string };
}) {
  const userId = await currentUserId();
  if (!userId) notFound();

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
  if (!mentee) notFound();

  return <MenteeProfile mentee={mentee} />;
}
