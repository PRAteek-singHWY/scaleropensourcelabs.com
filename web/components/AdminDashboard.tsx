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

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { readAllProfiles, type Profile } from "@/lib/profile";
import { HOSTELS, LEVELS, PATHS, PROGRAMS } from "@/content/join";

const label = (list: readonly { value: string; label: string }[], v?: string) =>
  (v && list.find((x) => x.value === v)?.label) || v || "—";

/** Firestore hands timestamps back as its own Timestamp object, a Date, or an ISO
 *  string depending on how the document was written — the emulator's REST seeding and the
 *  SDK do not agree. All three are coerced here so nothing downstream has to care, and an
 *  unreadable value becomes null rather than an Invalid Date that formats as "NaN". */
function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(+v) ? null : v;
  if (typeof v === "object" && typeof (v as { toDate?: unknown }).toDate === "function") {
    const d = (v as { toDate: () => Date }).toDate();
    return isNaN(+d) ? null : d;
  }
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    return isNaN(+d) ? null : d;
  }
  return null;
}

const fmtDate = (v: unknown) => {
  const d = toDate(v);
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) : "—";
};

/** Monday of the week a date falls in, so weekly buckets line up. */
function weekStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

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

/** One string for every filter control in the row below, so five selects and an input
 *  cannot drift apart a class at a time. */
const ctl =
  "rounded-md border border-seam bg-sunk px-3.5 py-2.5 text-sm text-ink placeholder:text-dust outline-none transition focus:border-accent";

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
  const [year, setYear] = useState("");
  const [programme, setProgramme] = useState("");
  const [level, setLevel] = useState("");
  // Newest first by default, because the question an organiser opens this page with is
  // usually "who is new".
  const [sort, setSort] = useState<{ key: "joined" | "name" | "year" | "hostel"; dir: 1 | -1 }>(
    { key: "joined", dir: -1 },
  );
  const [reloading, setReloading] = useState(false);
  const [copied, setCopied] = useState("");
  /** Populated only when the clipboard refused, so the addresses are still gettable. */
  const [emailList, setEmailList] = useState("");

  const load = useCallback(async () => {
    setError("");
    setReloading(true);
    try {
      setRows(await readAllProfiles());
    } catch (e) {
      console.error("[osc] could not list members", e);
      setError(
        "Firestore refused the query. Either your address is not in the admins collection, or the rules are not deployed.",
      );
    } finally {
      setReloading(false);
    }
  }, []);

  // Loaded once on mount, and again only when an organiser asks. A dashboard that
  // re-queries on an interval spends reads to tell somebody nothing changed.
  useEffect(() => {
    if (!user || isAdmin !== true) return;
    void load();
  }, [user, isAdmin, load]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (hostel && r.hostel !== hostel) return false;
      if (level && r.level !== level) return false;
      if (programme && !(r.programs ?? []).includes(programme)) return false;
      if (year && yearOf(r.year_branch) !== year) return false;
      if (!needle) return true;
      return [r.name, r.email, r.year_branch, r.github]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
    const key = sort.key;
    return out.sort((a, b) => {
      let d = 0;
      if (key === "joined") d = (+(toDate(a.created_at) ?? 0)) - (+(toDate(b.created_at) ?? 0));
      else if (key === "name") d = (a.name ?? "").localeCompare(b.name ?? "");
      else if (key === "year") d = yearOf(a.year_branch).localeCompare(yearOf(b.year_branch));
      else d = (a.hostel ?? "").localeCompare(b.hostel ?? "");
      return d * sort.dir;
    });
  }, [rows, q, hostel, level, programme, year, sort]);

  const activeFilters = [q, hostel, level, programme, year].filter(Boolean).length;

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
      withGithub: all.filter((r) => r.github?.trim()).length,
      // "How many joined recently" is the other question this page gets asked, and it
      // could not be answered at all before: created_at was stored on every profile and
      // shown nowhere.
      thisWeek: all.filter((r) => {
        const d = toDate(r.created_at);
        return d ? d >= weekStart(new Date()) : false;
      }).length,
      // Eight weeks of sign-ups, oldest first. Weeks with nobody are KEPT rather than
      // skipped — a gap is the interesting part of a growth chart, and dropping empty
      // buckets turns a quiet fortnight into a straight line.
      weeks: (() => {
        const now = weekStart(new Date());
        const buckets: [string, number][] = [];
        for (let i = 7; i >= 0; i--) {
          const start = new Date(now);
          start.setDate(start.getDate() - i * 7);
          const end = new Date(start);
          end.setDate(end.getDate() + 7);
          const n = all.filter((r) => {
            const d = toDate(r.created_at);
            return d ? d >= start && d < end : false;
          }).length;
          buckets.push([
            start.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
            n,
          ]);
        }
        return buckets;
      })(),
    };
  }, [rows]);

  /** Every address in the current filter, for pasting into a mail client. The action an
   *  organiser actually wants after narrowing the list, and the one thing they were
   *  previously exporting a whole CSV to get. */
  async function copyEmails() {
    const list = filtered.map((r) => r.email).filter(Boolean).join(", ");
    try {
      // Requires a secure context AND permission. Both can be missing — over plain
      // http, or in a browser where the reader has denied clipboard access — so the
      // failure below is a normal path, not an exotic one.
      await navigator.clipboard.writeText(list);
      setCopied(`${filtered.length} address${filtered.length === 1 ? "" : "es"} copied`);
      setTimeout(() => setCopied(""), 3000);
      setEmailList("");
    } catch {
      // THE POINT IS THE ADDRESSES, NOT THE CLIPBOARD. An earlier version just said
      // "your browser refused clipboard access", which is true and useless: the
      // organiser still has to get the list out somehow, and the only route left was
      // exporting a CSV and opening it. Showing the list in a selectable box means
      // Cmd-A, Cmd-C, done — the same two seconds, without the API.
      setEmailList(list);
      setCopied("Clipboard is blocked here — select the list below instead");
      setTimeout(() => setCopied(""), 5000);
    }
  }

  function exportCsv() {
    const cols = [
      "name", "email", "year_branch", "hostel", "level", "path",
      "programs", "programs_other", "github",
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
          ["Joined this week", stats.thisWeek],
          ["With a GitHub account", stats.withGithub],
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

      {/* SIGN-UPS OVER TIME. The page could count the membership but not say whether it
          was growing — created_at was stored on every profile and rendered nowhere. Eight
          weeks is enough to see a build day in the data without becoming a chart nobody
          reads. */}
      <div className="card rounded-panel bg-raise p-6">
        <h3 className="label">Sign-ups, last eight weeks</h3>
        {/* items-stretch, and h-full on each column, is load-bearing. With items-end the
            columns collapsed to the height of their own content, so each bar's percentage
            height resolved against an indefinite parent — CSS treats that as auto — and
            every bar rendered as a hairline. The numbers were correct and the chart was
            empty, which is the worst version of wrong. */}
        <div className="mt-5 flex items-stretch gap-2" style={{ height: "6.5rem" }}>
          {stats.weeks.map(([wk, n]) => {
            const peak = Math.max(1, ...stats.weeks.map(([, x]) => x));
            return (
              <div key={wk} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="font-mono text-[13px] tabular-nums text-haze">{n || ""}</span>
                {/* A minimum height on a zero week, so the axis reads as a row of weeks
                    rather than stopping wherever the data stopped. */}
                <div
                  className={`w-full rounded-t ${n ? "bg-accent" : "bg-sunk"}`}
                  style={{ height: n ? `${Math.max(6, (n / peak) * 100)}%` : "3px" }}
                  title={`${n} in the week of ${wk}`}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex gap-2">
          {stats.weeks.map(([wk], i) => (
            <span
              key={wk}
              className="flex-1 text-center font-mono text-[11px] text-dust"
            >
              {/* Every other label only — eight dates side by side collide below about
                  700px and there is no room for rotation in a 6rem block. */}
              {i % 2 === 0 ? wk : ""}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Bars title="By hostel" rows={stats.hostel} total={stats.total} />
        <Bars title="By year" rows={stats.year} total={stats.total} />
        <Bars title="By branch" rows={stats.branch} total={stats.total} />
        <Bars title="By experience" rows={stats.level} total={stats.total} />
        <Bars title="By route in" rows={stats.path} total={stats.total} />
        <Bars title="Programmes of interest" rows={stats.programs} total={stats.total} />
      </div>

      <p className="text-[15px] leading-relaxed text-dust">
        Programme percentages are of members, and members pick more than one — so those
        add up past 100%. Year and branch are parsed from the single free-text field a
        member types, so anything unrecognised is counted as{" "}
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
              placeholder="Search name, email, branch, GitHub"
              className={ctl + " w-60"}
              aria-label="Search members"
            />
            <select
              value={hostel}
              onChange={(e) => setHostel(e.target.value)}
              className={ctl}
              aria-label="Filter by hostel"
            >
              <option value="">All hostels</option>
              {HOSTELS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
            {/* Built from the data rather than a fixed list: year is parsed out of a free
                text field, so the only honest set of options is the one that actually
                appears — including "Unparsed", which an organiser needs to be able to
                isolate and go fix. */}
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={ctl}
              aria-label="Filter by year"
            >
              <option value="">All years</option>
              {stats.year.map(([y]) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              value={programme}
              onChange={(e) => setProgramme(e.target.value)}
              className={ctl}
              aria-label="Filter by programme"
            >
              <option value="">All programmes</option>
              {PROGRAMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className={ctl}
              aria-label="Filter by experience"
            >
              <option value="">Any experience</option>
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            {activeFilters > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setHostel("");
                  setYear("");
                  setProgramme("");
                  setLevel("");
                }}
                className="tap font-mono text-label uppercase text-haze underline transition-colors hover:text-ink"
              >
                Clear {activeFilters}
              </button>
            )}
            <button type="button" onClick={() => void copyEmails()} className="btn btn-secondary btn-compact">
              Copy emails
            </button>
            <button type="button" onClick={exportCsv} className="btn btn-secondary btn-compact">
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => void load()}
              disabled={reloading}
              className="btn btn-secondary btn-compact disabled:opacity-60"
            >
              {reloading ? "Refreshing…" : "Refresh"}
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
              aria-label="Member email addresses"
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
                {([
                  ["Name", "name"],
                  ["College email", null],
                  ["Year and branch", "year"],
                  ["Hostel", "hostel"],
                  ["Experience", null],
                  ["Programmes", null],
                  ["GitHub", null],
                  ["Joined", "joined"],
                ] as [string, "name" | "year" | "hostel" | "joined" | null][]).map(([h, key]) => (
                  <th key={h} className="label whitespace-nowrap py-2 pr-4 font-normal">
                    {/* Only the four columns that sort meaningfully are buttons. Making
                        every header clickable and having half of them do nothing is worse
                        than four that visibly do. */}
                    {key ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSort((cur) =>
                            cur.key === key
                              ? { key, dir: cur.dir === 1 ? -1 : 1 }
                              : { key, dir: key === "joined" ? -1 : 1 },
                          )
                        }
                        className="tap inline-flex items-center gap-1 uppercase transition-colors hover:text-ink"
                      >
                        {h}
                        <span aria-hidden className={sort.key === key ? "text-accent" : "text-dust/40"}>
                          {sort.key === key ? (sort.dir === 1 ? "\u2191" : "\u2193") : "\u2195"}
                        </span>
                      </button>
                    ) : (
                      h
                    )}
                  </th>
                ))}
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
                    {/* The free text behind "Other". It was collected, validated and
                        exported to CSV but never shown on screen, so the one programme a
                        member had to type was the one an organiser could not see. */}
                    {r.programs_other && (
                      <span className="block text-[13px] text-dust">
                        Other: {r.programs_other}
                      </span>
                    )}
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
                  <td className="whitespace-nowrap py-3 pr-4 font-mono text-[13px] text-haze">
                    {fmtDate(r.created_at)}
                  </td>
                </tr>
              ))}
              {rows !== null && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-sm text-dust">
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
