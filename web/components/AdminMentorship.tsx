"use client";

// Who wants mentoring, and who they want. The half of the mentorship feature the
// organisers actually work from.
//
// TWO QUESTIONS, IN THIS ORDER. "Show me everybody who signed up" comes first because it
// is what somebody opens this page to do; the charts come second because they are what
// you look at once the list has made you curious. The membership table above follows the
// same shape for the same reason.
//
// THE STATISTICS ARE OVER EVERYBODY, ALWAYS. Filtering the list does not move the charts.
// A breakdown that changes when you type in a search box is a breakdown you cannot quote
// in a meeting, and this page's whole job is producing numbers somebody says out loud.
//
// A STUDENT CAN APPEAR IN TWO MENTORS' TOTALS, because they have two preferences. So the
// percentages on the demand charts are of STUDENTS ENROLLED, not of the bars, and they
// add up past 100. That is stated on screen rather than left for somebody to work out —
// the same treatment the membership table's programme percentages already get.
//
// MENTORS WITH NOBODY ARE NAMED, not drawn as a zero-height bar. A bar at 0% is a row
// that disappears, and "which mentors has nobody picked" is a question with an action
// attached to it.

import { useMemo, useState } from "react";
import { Bars, Counts, ctl } from "@/components/admin/ui";
import { batchBucket, batchFromEmail } from "@/lib/batch";
import { fmtDate, type Profile } from "@/lib/profile";
import { mentorLabel, mentorNames, pickCounts, type Enrollment, type Mentor } from "@/lib/mentorship";

export default function AdminMentorship({
  profiles,
  mentors,
  enrollments,
}: {
  profiles: Profile[] | null;
  mentors: Mentor[] | null;
  enrollments: Enrollment[] | null;
}) {
  const [q, setQ] = useState("");
  const [mentor, setMentor] = useState("");
  const [firstOnly, setFirstOnly] = useState(false);

  const names = useMemo(() => mentorNames(mentors ?? []), [mentors]);
  const counts = useMemo(() => pickCounts(enrollments ?? []), [enrollments]);

  /** One row per enrollment, joined to the profile the parent already loaded.
   *
   *  A member could in principle have an enrollment and no profile — the rules do not
   *  couple them — so the profile is optional here and the row degrades to the address
   *  rather than vanishing. An enrollment that does not appear in this list because its
   *  member is missing is the worst outcome: somebody signed up and nobody can see it. */
  const rows = useMemo(() => {
    const byUid = new Map((profiles ?? []).map((p) => [p.uid, p]));
    return (enrollments ?? []).map((e) => {
      const p = byUid.get(e.uid);
      return {
        enrollment: e,
        profile: p,
        name: p?.name ?? "(no profile)",
        email: e.email,
        batch: batchFromEmail(e.email),
      };
    });
  }, [profiles, enrollments]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (firstOnly && !r.enrollment.first_only) return false;
      // A mentor filter matches EITHER position. "Show me everybody who wants Priya"
      // means everybody, not everybody who put her first — the second-preference people
      // are exactly who an organiser reassigns when the first list is too long.
      if (
        mentor &&
        r.enrollment.mentor_1 !== mentor &&
        r.enrollment.mentor_2 !== mentor
      ) {
        return false;
      }
      if (!needle) return true;
      return [r.name, r.email, r.profile?.github, r.batch?.label, r.batch?.branch]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [rows, q, mentor, firstOnly]);

  const activeFilters = [q, mentor, firstOnly ? "1" : ""].filter(Boolean).length;

  const stats = useMemo(() => {
    const all = enrollments ?? [];
    const ms = mentors ?? [];
    const named = (id: string) => mentorLabel(names, id);
    return {
      total: all.length,
      mentors: ms.length,
      firstOnly: all.filter((e) => e.first_only).length,
      // Largest first, and only mentors somebody picked — the ones nobody picked are
      // listed by name below instead, where a zero is legible.
      demand: ms
        .map((m) => [named(m.id), counts.get(m.id)?.first ?? 0] as [string, number])
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1]),
      totalDemand: ms
        .map((m) => [named(m.id), counts.get(m.id)?.total ?? 0] as [string, number])
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1]),
      unpicked: ms.filter((m) => (counts.get(m.id)?.total ?? 0) === 0),
      batches: (() => {
        const m = new Map<string, number>();
        for (const e of all) {
          const k = batchBucket(e.email);
          m.set(k, (m.get(k) ?? 0) + 1);
        }
        return [...m].sort((a, b) => a[0].localeCompare(b[0]));
      })(),
    };
  }, [enrollments, mentors, counts, names]);

  /** Every address in the current filter, for pasting into a mail client — the action an
   *  organiser wants after narrowing to "everybody who picked Priya". Same clipboard
   *  fallback as the membership table: the point is the addresses, not the API. */
  const [copied, setCopied] = useState("");
  const [emailList, setEmailList] = useState("");
  async function copyEmails() {
    const list = filtered.map((r) => r.email).filter(Boolean).join(", ");
    try {
      await navigator.clipboard.writeText(list);
      setCopied(`${filtered.length} address${filtered.length === 1 ? "" : "es"} copied`);
      setTimeout(() => setCopied(""), 3000);
      setEmailList("");
    } catch {
      setEmailList(list);
      setCopied("Clipboard is blocked here — select the list below instead");
      setTimeout(() => setCopied(""), 5000);
    }
  }

  function exportCsv() {
    const cols = [
      "name", "email", "batch", "branch", "year", "hostel", "github",
      "programme", "first_preference", "second_preference", "enrolled",
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      cols.join(","),
      ...filtered.map((r) =>
        [
          r.name,
          r.email,
          r.batch?.label ?? "",
          r.batch?.branch ?? "",
          r.batch?.yearLabel ?? "",
          r.profile?.hostel ?? "",
          r.profile?.github ?? "",
          r.enrollment.programme,
          mentorLabel(names, r.enrollment.mentor_1),
          r.enrollment.first_only
            ? "first preference only"
            : mentorLabel(names, r.enrollment.mentor_2),
          fmtDate(r.enrollment.created_at),
        ]
          .map(esc)
          .join(","),
      ),
    ].join("\n");

    // A BOM, so Excel opens UTF-8 names correctly instead of mangling them.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `osc-mentorship-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const loading = enrollments === null || mentors === null;

  return (
    <div className="space-y-8">
      <Counts
        loading={loading}
        rows={[
          ["Students enrolled", stats.total],
          ["Mentors published", stats.mentors],
          ["No second preference", stats.firstOnly],
        ]}
      />

      {/* ------------------------------------------------------- the interest list */}
      <div className="card rounded-panel bg-raise p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="label">Who has enrolled</h3>
            <p className="mt-1 text-sm text-haze">
              {filtered.length} of {stats.total} shown
              {activeFilters > 0 && (
                <span className="text-dust">
                  {" "}
                  · {activeFilters} filter{activeFilters === 1 ? "" : "s"} on
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, batch, GitHub"
              className={ctl + " w-60"}
              aria-label="Search enrolled students"
            />
            <select
              value={mentor}
              onChange={(e) => setMentor(e.target.value)}
              className={ctl}
              aria-label="Filter by mentor"
            >
              <option value="">All mentors</option>
              {(mentors ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-haze">
              <input
                type="checkbox"
                checked={firstOnly}
                onChange={(e) => setFirstOnly(e.target.checked)}
                className="h-4 w-4 shrink-0 accent-[rgb(var(--accent))]"
              />
              First preference only
            </label>
            {activeFilters > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setMentor("");
                  setFirstOnly(false);
                }}
                className="tap font-mono text-label uppercase text-haze underline transition-colors hover:text-ink"
              >
                Clear {activeFilters}
              </button>
            )}
            <button
              type="button"
              onClick={() => void copyEmails()}
              className="btn btn-secondary btn-compact"
            >
              Copy emails
            </button>
            <button type="button" onClick={exportCsv} className="btn btn-secondary btn-compact">
              Export CSV
            </button>
          </div>
        </div>

        {copied && (
          <p className="mt-3 font-mono text-label uppercase text-accent" role="status">
            {copied}
          </p>
        )}
        {emailList && (
          <div className="mt-3">
            <textarea
              readOnly
              aria-label="Enrolled student email addresses"
              value={emailList}
              onFocus={(e) => e.currentTarget.select()}
              rows={3}
              className="w-full resize-y rounded-md border border-seam bg-sunk p-3 font-mono text-[13px] text-haze"
            />
            <button
              type="button"
              onClick={() => setEmailList("")}
              className="tap mt-1 font-mono text-label uppercase text-dust transition-colors hover:text-ink"
            >
              Hide the list
            </button>
          </div>
        )}

        {/* Scrolls inside its own box so a wide table never makes the page scroll
            sideways — the QA sweep asserts no horizontal overflow on every route. */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[56rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-seam">
                {[
                  "Name",
                  "College email",
                  "Batch",
                  "GitHub",
                  "1st preference",
                  "2nd preference",
                  "Enrolled",
                ].map((h) => (
                  <th key={h} className="label whitespace-nowrap py-2 pr-4 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.enrollment.uid} className="border-b border-seam/60 align-top">
                  <td className="py-3 pr-4 text-sm text-ink">{r.name}</td>
                  <td className="py-3 pr-4 font-mono text-[13px] text-haze">{r.email}</td>
                  <td className="whitespace-nowrap py-3 pr-4 text-sm text-haze">
                    {r.batch ? `${r.batch.label} · ${r.batch.branch}` : "—"}
                    {r.batch && (
                      <span className="block text-[13px] text-dust">{r.batch.yearLabel}</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 font-mono text-[13px] text-haze">
                    {r.profile?.github ? (
                      <a
                        href={`https://github.com/${r.profile.github}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline transition-colors hover:text-accent"
                      >
                        {r.profile.github}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 pr-4 text-sm text-ink">
                    {mentorLabel(names, r.enrollment.mentor_1)}
                  </td>
                  <td className="py-3 pr-4 text-sm text-haze">
                    {r.enrollment.first_only ? (
                      <span className="text-dust">first preference only</span>
                    ) : (
                      mentorLabel(names, r.enrollment.mentor_2)
                    )}
                  </td>
                  <td className="whitespace-nowrap py-3 pr-4 font-mono text-[13px] text-haze">
                    {fmtDate(r.enrollment.created_at)}
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-sm text-dust">
                    {stats.total === 0
                      ? "Nobody has enrolled yet."
                      : "No student matches that filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- statistics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Bars
          title="First preferences"
          rows={stats.demand}
          total={stats.total}
          empty="Nobody has picked a mentor yet."
          footnote="Who students most want to work with. One student, one first preference."
        />
        <Bars
          title="Total demand (1st + 2nd)"
          rows={stats.totalDemand}
          total={stats.total}
          empty="Nobody has picked a mentor yet."
          footnote="A mentor who is nobody's first choice and everybody's second is doing more work than the chart beside this one suggests."
        />
        <Bars
          title="Enrolled, by batch"
          rows={stats.batches}
          total={stats.total}
          empty="Nobody has enrolled yet."
          footnote="Read from each student's college address. 'Unknown' is an address that does not follow the usual pattern."
        />
        <div className="card rounded-panel bg-raise p-6">
          <h3 className="label">Mentors nobody has picked</h3>
          {stats.unpicked.length === 0 ? (
            <p className="mt-4 text-sm text-dust">
              {stats.mentors === 0
                ? "No mentors published yet."
                : "Every mentor has at least one student."}
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {stats.unpicked.map((m) => (
                <li key={m.id} className="text-sm text-ink">
                  {m.name}
                  {!m.active && (
                    <span className="ml-2 font-mono text-[13px] text-dust">hidden</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[13px] leading-relaxed text-dust">
            Named rather than drawn as an empty bar, because a bar at zero is a row that
            disappears. A hidden mentor with nobody is expected; a visible one is worth a
            look at their description.
          </p>
        </div>
      </div>

      <p className="text-[15px] leading-relaxed text-dust">
        Percentages are of students enrolled, and a student holds two preferences — so the
        two demand charts add up past 100%. Nothing on this page is an allocation:
        preferences are what students asked for, and pairing them is still a decision
        somebody makes.
      </p>
    </div>
  );
}
