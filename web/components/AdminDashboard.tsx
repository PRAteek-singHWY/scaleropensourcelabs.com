"use client";

// The organisers' view of the membership.
//
// WHAT THIS IS FOR, in the club's words: "these are the number of core members, from
// this hostel and from this hostel, from this batch". So it is a counting tool first and
// a list second — the breakdowns are the point, and the table underneath is where you go
// when a count makes you want to see who.
//
// IT IS NOT A PRIVILEGE GATE. The link to this page is hidden from non-admins as a
// convenience, and this component refuses to render data without an admin flag — but
// neither is what protects anything. The `list` rule on users/{uid} is admin-only, so a
// non-admin who navigates straight here gets an empty list from Firestore no matter what
// the client does. If you ever move the membership check out of the rules and into this
// file, you have removed the security.
//
// ONE READ PER MEMBER PER LOAD, unpaginated. At a few hundred members that is a few
// hundred of a 50,000-a-day free quota, and pagination would be machinery with no user.
// The header states the count so that if the club ever reaches a scale where this
// matters, it is visible rather than quietly slow.
//
// YEAR AND BRANCH ARE FREE TEXT, which the batch breakdown has to be honest about. It is
// one field a member types ("1st year, CSE"), so grouping it means pattern-matching, and
// anything that does not match lands in an explicit "unparsed" bucket rather than being
// forced into the nearest guess. A stat that quietly mis-buckets is worse than one that
// admits what it could not read.

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { readAllProfiles, type Profile } from "@/lib/profile";
import { HOSTELS, INTERESTS, LEVELS, PATHS, PROGRAMS } from "@/content/join";

const label = (list: readonly { value: string; label: string }[], v?: string) =>
  (v && list.find((x) => x.value === v)?.label) || v || "—";

/** Count occurrences, returned largest-first. */
function tally(values: (string | undefined)[]): [string, number][] {
  const m = new Map<string, number>();
  for (const v of values) {
    const k = v ?? "—";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m].sort((a, b) => b[1] - a[1]);
}

/** Pull a year out of free text. Deliberately conservative: it matches the shapes people
 *  actually type and gives up otherwise, so the caller can show an honest "unparsed"
 *  count instead of a wrong one. */
function yearOf(yearBranch?: string): string {
  if (!yearBranch) return "Unparsed";
  const s = yearBranch.toLowerCase();
  const m = s.match(/\b([1-5])\s*(?:st|nd|rd|th)?\b/) ?? s.match(/\b(first|second|third|fourth|fifth)\b/);
  if (!m) return "Unparsed";
  const words: Record<string, string> = { first: "1", second: "2", third: "3", fourth: "4", fifth: "5" };
  const n = words[m[1]] ?? m[1];
  return `Year ${n}`;
}

/** Branch is whatever follows a comma or dash, uppercased. Same conservatism. */
function branchOf(yearBranch?: string): string {
  if (!yearBranch) return "Unparsed";
  const parts = yearBranch.split(/[,\-–|]/).map((s) => s.trim()).filter(Boolean);
  const tail = parts.length > 1 ? parts[parts.length - 1] : "";
  if (!tail || /year/i.test(tail)) return "Unparsed";
  return tail.toUpperCase();
}

function Bars({ title, rows, total }: { title: string; rows: [string, number][]; total: number }) {
  return (
    <div className="card rounded-panel bg-raise p-6">
      <h3 className="label">{title}</h3>
      <ul className="mt-4 space-y-3">
        {rows.length === 0 && <li className="text-sm text-dust">No data yet.</li>}
        {rows.map(([k, n]) => (
          <li key={k}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-ink">{k}</span>
              <span className="font-mono text-sm text-haze">
                {n}
                <span className="text-dust">
                  {" "}
                  · {total > 0 ? Math.round((n / total) * 100) : 0}%
                </span>
              </span>
            </div>
            {/* A bar rather than a chart library: one dimension, ten rows, and the
                token colours already carry the meaning. */}
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-sunk">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${total > 0 ? (n / total) * 100 : 0}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const [rows, setRows] = useState<Profile[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [hostel, setHostel] = useState("");

  useEffect(() => {
    if (!user || isAdmin !== true) return;
    let alive = true;
    (async () => {
      try {
        const all = await readAllProfiles();
        if (alive) setRows(all);
      } catch (e) {
        console.error("[osc] could not list members", e);
        if (alive)
          setError(
            "Firestore refused the query. Either your address is not in the admins collection, or the rules are not deployed.",
          );
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, isAdmin]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (hostel && r.hostel !== hostel) return false;
      if (!needle) return true;
      return [r.name, r.email, r.year_branch, r.github]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [rows, q, hostel]);

  // Stats are computed over EVERYTHING, not the filtered view. A breakdown that moves
  // when you type in a search box is a breakdown you cannot quote in a meeting.
  const stats = useMemo(() => {
    const all = rows ?? [];
    return {
      total: all.length,
      hostel: tally(all.map((r) => label(HOSTELS, r.hostel))),
      year: tally(all.map((r) => yearOf(r.year_branch))),
      branch: tally(all.map((r) => branchOf(r.year_branch))),
      level: tally(all.map((r) => label(LEVELS, r.level))),
      path: tally(all.map((r) => PATHS.find((p) => p.id === r.path)?.name ?? r.path)),
      // One member can pick several programmes, so this counts INTERESTS not members —
      // the percentages therefore sum past 100, which is correct and stated on screen.
      programs: tally(all.flatMap((r) => (r.programs ?? []).map((v) => label(PROGRAMS, v)))),
      interests: tally(all.flatMap((r) => (r.interests ?? []).map((v) => label(INTERESTS, v)))),
      withGithub: all.filter((r) => r.github?.trim()).length,
      wantUpdates: all.filter((r) => r.updates === true).length,
    };
  }, [rows]);

  function exportCsv() {
    const cols = [
      "name", "email", "year_branch", "hostel", "level", "path",
      "programs", "programs_other", "interests", "github", "heard_from", "updates",
    ] as const;
    const esc = (v: unknown) => {
      const s = Array.isArray(v) ? v.join("; ") : v === undefined ? "" : String(v);
      // Quote always, and double any inner quote. Names contain commas more often than
      // people expect, and one unquoted comma shifts every later column by one.
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = [
      cols.join(","),
      ...filtered.map((r) => cols.map((c) => esc((r as Record<string, unknown>)[c])).join(",")),
    ].join("\n");

    // A BOM, so Excel opens UTF-8 names correctly instead of mangling them.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `osc-members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isAdmin === undefined && user) {
    return (
      <div className="card rounded-panel bg-raise p-8" aria-busy="true">
        <p className="label">One moment</p>
        <p className="mt-3 text-body text-haze">Checking your access…</p>
      </div>
    );
  }

  if (!user || isAdmin !== true) {
    return (
      <div className="card rounded-panel bg-raise p-8 sm:p-10">
        <p className="chip">Organisers only</p>
        <h2 className="mt-4 font-display text-display-md font-bold tracking-tight">
          This page is not for you — yet.
        </h2>
        <p className="measure mt-4 text-body text-haze">
          {user
            ? "You are signed in, but your address is not on the organisers list. If it should be, ask somebody who already has access to add you."
            : "Sign in with your college account first. If you are an organiser, this page will fill in."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <p className="card rounded-panel bg-raise p-6 text-[15px] leading-relaxed text-ember" role="alert">
          {error}
        </p>
      )}

      {/* The headline count, and the two facts most often asked for beside it. */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Registered members", stats.total],
          ["With a GitHub account", stats.withGithub],
          ["Want session updates", stats.wantUpdates],
        ].map(([k, v]) => (
          <div key={String(k)} className="card rounded-panel bg-raise p-6">
            <p className="label">{k}</p>
            {/* NOT `.num`. That class is the small blue step badge used in numbered
                lists — applying it here rendered each headline count as a pill the size
                of a chip, which is the opposite of a headline. Caught by looking at the
                page rather than at the passing test.

                `tabular-nums` so the three cards stay aligned as counts grow, and the
                number does not jitter between renders. */}
            <p className="mt-2 font-display text-display-lg font-bold tabular-nums tracking-tight">
              {rows === null ? "…" : (v as number)}
            </p>
          </div>
        ))}
      </div>

      {rows === null && !error && (
        <p className="text-body text-haze" aria-busy="true">
          Loading the membership…
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Bars title="By hostel" rows={stats.hostel} total={stats.total} />
        <Bars title="By year" rows={stats.year} total={stats.total} />
        <Bars title="By branch" rows={stats.branch} total={stats.total} />
        <Bars title="By experience" rows={stats.level} total={stats.total} />
        <Bars title="By route in" rows={stats.path} total={stats.total} />
        <Bars title="Programmes of interest" rows={stats.programs} total={stats.total} />
      </div>

      <p className="text-[15px] leading-relaxed text-dust">
        Programme and interest percentages are of members, and members pick more than one
        — so those add up past 100%. Year and branch are parsed from the single free-text
        field a member types, so anything unrecognised is counted as{" "}
        <strong className="text-haze">Unparsed</strong> rather than guessed at.
      </p>

      {/* The list. Filtering is local — the whole membership is already in memory, so a
          server query per keystroke would spend reads to be slower. */}
      <div className="card rounded-panel bg-raise p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="label">Members</h3>
            <p className="mt-1 text-sm text-haze">
              {filtered.length} of {stats.total} shown
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, branch, GitHub"
              className="w-64 rounded-md border border-seam bg-sunk px-3.5 py-2.5 text-sm text-ink placeholder:text-dust outline-none transition focus:border-accent"
              aria-label="Search members"
            />
            <select
              value={hostel}
              onChange={(e) => setHostel(e.target.value)}
              className="rounded-md border border-seam bg-sunk px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-accent"
              aria-label="Filter by hostel"
            >
              <option value="">All hostels</option>
              {HOSTELS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
            <button type="button" onClick={exportCsv} className="btn btn-secondary btn-compact">
              Export CSV
            </button>
          </div>
        </div>

        {/* Scrolls inside its own box so a wide table never makes the page scroll
            sideways — the QA sweep asserts no horizontal overflow on every route. */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[56rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-seam">
                {["Name", "College email", "Year and branch", "Hostel", "Experience", "Programmes", "GitHub"].map(
                  (h) => (
                    <th key={h} className="label whitespace-nowrap py-2 pr-4 font-normal">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.uid} className="border-b border-seam/60 align-top">
                  <td className="py-3 pr-4 text-sm text-ink">{r.name}</td>
                  <td className="py-3 pr-4 font-mono text-[13px] text-haze">{r.email}</td>
                  <td className="py-3 pr-4 text-sm text-haze">{r.year_branch}</td>
                  <td className="py-3 pr-4 text-sm text-haze">{label(HOSTELS, r.hostel)}</td>
                  <td className="py-3 pr-4 text-sm text-haze">{label(LEVELS, r.level)}</td>
                  <td className="py-3 pr-4 text-sm text-haze">
                    {(r.programs ?? []).map((v) => label(PROGRAMS, v)).join(", ") || "—"}
                  </td>
                  <td className="py-3 pr-4 font-mono text-[13px] text-haze">
                    {r.github ? (
                      <a
                        href={`https://github.com/${r.github}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline transition-colors hover:text-accent"
                      >
                        {r.github}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {rows !== null && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-sm text-dust">
                    {stats.total === 0
                      ? "Nobody has registered yet."
                      : "No member matches that filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[15px] leading-relaxed text-dust">
        This is every member&apos;s own words about themselves, including their college
        address. Treat the export the way you would a class list: it does not go in a
        group chat, and it is not published on the site.
      </p>
    </div>
  );
}
