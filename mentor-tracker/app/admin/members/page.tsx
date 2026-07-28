import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import MemberReviewList from "@/components/MemberReviewList";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Members" };

// Organiser review queue. requireAdmin() here as well as in middleware — the page
// must not depend on the matcher being right.
export default async function AdminMembersPage() {
  const admin = await requireAdmin();
  if (!admin) notFound();

  const members = await prisma.member.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      github: true,
      displayName: true,
      batch: true,
      bio: true,
      status: true,
      publicConsent: true,
      consentedAt: true,
      approvedBy: true,
      createdAt: true,
    },
  });

  const pending = members.filter((m) => m.status === "PENDING").length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center gap-2 text-xs text-muted">
        <Link href="/admin" className="transition hover:text-pink">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-slate-300">Members</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Club members</h1>
          <p className="mt-1 text-sm text-muted">
            {members.length} total · {pending} awaiting review
          </p>
        </div>
        <Link
          href="/leaderboard"
          className="rounded-lg border border-edge bg-panel/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-pink/50 hover:text-pink"
        >
          View public leaderboard →
        </Link>
      </div>

      <div className="mt-4 rounded-xl border border-blue/25 bg-blue/5 px-4 py-3 text-sm leading-relaxed text-slate-300">
        Approving a member does not publish them on its own. They also have to have
        ticked the public-listing box themselves, which only they can do. A member
        showing <strong className="font-semibold">no consent</strong> below stays
        private however you set their status.
      </div>

      <div className="mt-6">
        <MemberReviewList
          members={members.map((m) => ({
            ...m,
            consentedAt: m.consentedAt ? m.consentedAt.toISOString() : null,
            createdAt: m.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
