"use client";

import { useState } from "react";

export type ReviewMember = {
  id: string;
  github: string;
  displayName: string;
  batch: string | null;
  bio: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  publicConsent: boolean;
  consentedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
};

const STATUS_STYLE: Record<ReviewMember["status"], string> = {
  PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  APPROVED: "border-[#a855f7]/30 bg-[#a855f7]/10 text-[#c9a5f9]",
  REJECTED: "border-red-500/30 bg-red-500/10 text-red-300",
};

export default function MemberReviewList({
  members: initial,
}: {
  members: ReviewMember[];
}) {
  const [members, setMembers] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, action: "approve" | "reject" | "unpublish") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json().catch(() => null)) as
        | { member?: ReviewMember; error?: string }
        | null;
      if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status})`);
      if (data?.member) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === id
              ? { ...m, status: data.member!.status, approvedBy: data.member!.approvedBy }
              : m,
          ),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  if (members.length === 0) {
    return (
      <p className="rounded-2xl border border-edge bg-panel/40 px-4 py-10 text-center text-sm text-muted">
        Nobody has joined yet. Share the join page with the club.
      </p>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </div>
      )}
      <ul className="space-y-2">
        {members.map((m) => {
          const live = m.status === "APPROVED" && m.publicConsent;
          return (
            <li
              key={m.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-edge bg-panel/60 p-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://github.com/${m.github}.png`}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 rounded-full ring-1 ring-edge"
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-slate-100">
                    {m.displayName}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-px text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLE[m.status]}`}
                  >
                    {m.status.toLowerCase()}
                  </span>
                  {live && (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-px text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                      live
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-xs text-muted">
                  @{m.github}
                  {m.batch ? ` · ${m.batch}` : ""}
                  {m.approvedBy ? ` · approved by ${m.approvedBy}` : ""}
                </div>
                {m.bio && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted/90">{m.bio}</p>
                )}
              </div>

              {/* Consent is the member's, not ours — shown read-only. */}
              <div className="shrink-0 text-right text-[11px] leading-tight">
                {m.publicConsent ? (
                  <>
                    <div className="text-emerald-300">consented</div>
                    <div className="text-muted">
                      {m.consentedAt
                        ? new Date(m.consentedAt).toLocaleDateString()
                        : ""}
                    </div>
                  </>
                ) : (
                  <div
                    className="text-amber-300"
                    title="This member has not agreed to a public listing. They stay private no matter what status you set."
                  >
                    no consent
                  </div>
                )}
              </div>

              <div className="flex shrink-0 gap-2">
                {m.status !== "APPROVED" && (
                  <button
                    onClick={() => void act(m.id, "approve")}
                    disabled={busyId === m.id}
                    className="rounded-lg border border-edge bg-ink/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-[#a855f7]/60 hover:text-[#c9a5f9] disabled:opacity-50"
                  >
                    Approve
                  </button>
                )}
                {m.status === "APPROVED" && (
                  <button
                    onClick={() => void act(m.id, "unpublish")}
                    disabled={busyId === m.id}
                    className="rounded-lg border border-edge bg-ink/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-amber-500/60 hover:text-amber-300 disabled:opacity-50"
                    title="Remove from the public site without deleting the record"
                  >
                    Unpublish
                  </button>
                )}
                {m.status !== "REJECTED" && (
                  <button
                    onClick={() => void act(m.id, "reject")}
                    disabled={busyId === m.id}
                    className="rounded-lg border border-edge bg-ink/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-red-500/60 hover:text-red-300 disabled:opacity-50"
                  >
                    Reject
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
