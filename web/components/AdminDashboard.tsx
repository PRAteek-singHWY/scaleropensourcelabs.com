"use client";

// The MEMBERSHIP section of the organisers' area.
//
// It was the whole of /admin — membership, mentors, the interest list, and below them the
// notice composer, the session editor, the form builder and the roster, about 3,800 lines
// on one route. An organiser opening it to answer "how many joined this week" scrolled
// past a form builder to find out. Each concern is a route now; this one is the roster and
// the numbers about it.
//
// WHAT THIS IS FOR, in the club's words: "these are the number of core members, from
// this hostel and from this hostel, from this batch". So it is a counting tool first and
// a list second — the breakdowns are the point, and the table underneath is where you go
// when a count makes you want to see who.
//
// IT IS NOT A PRIVILEGE GATE. The link to this page is hidden from non-admins as a
// convenience, and this component refuses to render data without an admin flag — but
// neither is what protects anything. The `list` rules on users/ and enrollments/ are
// admin-only, so a non-admin who navigates straight here gets empty lists from Firestore
// no matter what the client does. If you ever move the membership check out of the rules
// and into this file, you have removed the security.
//
// WHAT OPENING THIS PAGE COSTS, because it used to cost the whole club.
//
// It read every profile, every mentor and every enrollment on load AND on every Refresh.
// At 1,000 members that was ~1,500 reads a press, and roughly 33 presses would exhaust the
// 50,000-a-day free quota — for EVERYONE, including members trying to read their own
// profile. Three organisers planning a cohort could get there in an afternoon. Measured
// against the emulator, an open now costs 23 aggregate queries and about 32 documents, and
// that figure is IDENTICAL at 300 members and at 1,000.
//
// The split that makes it work:
//
//   counts and the 8-week trend   aggregate queries. Billed on the size of the ANSWER,
//                                 not the scan, so one read each at any club size.
//   demand per mentor             two aggregates per mentor. Also what the delete guard
//                                 needs — "has anybody picked them" is a count, not a list.
//   the members table             one page of 25, with Load more.
//   the breakdowns, the exports,  a full scan, behind a button that says what it costs.
//   the interest list             They need every document by definition; see below.
//
// WHY THE BREAKDOWNS CANNOT BE AGGREGATED. Batch, branch and year are derived from the
// address rather than stored — which is what makes them unforgeable, and also what makes
// them unqueryable. `where('batch','==',...)` has nothing to match. That trade is written
// up in FIREBASE.md; this page is where the bill arrives.
//
// BATCH, BRANCH AND YEAR ARE NOT FIELDS. They used to be one free-text box a member typed
// ("1st year, CSE"), which meant this file carried two regexes, a word-number map and an
// "Unparsed" bucket for everything they could not read. All of it is gone: the address is
// `abhinav.23bcs10045@sst.scaler.com` and lib/batch.ts reads it. What is left of that
// honesty is the "Unknown" bucket, which now means "this address does not follow the
// pattern" — a much smaller and much more actionable claim than "we could not parse what
// somebody typed".
//
// EACH ROUTE OWNS ITS OWN READS. When this was one page, one component issued every query
// so two panels could not disagree about the data a moment after a write. With a route per
// concern that argument inverts: opening the membership table should not pay for the
// mentor list. A Refresh here discards any full scan on screen, because a snapshot of a
// moment that has passed would show breakdowns disagreeing with the counts beside them.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bars, Counts, ctl, labelOf, tally } from "@/components/admin/ui";
import { useAuth } from "@/lib/auth";
import { batchBucket, branchBucket, yearBucket } from "@/lib/batch";
import {
  countProfiles,
  countProfilesBetween,
  countProfilesWithGithub,
  fmtDate,
  isClubMember,
  readAllProfiles,
  readProfilePage,
  setMembership,
  toDate,
  type Cursor,
  type Profile,
} from "@/lib/profile";
import { readAllEnrollments, type Enrollment } from "@/lib/mentorship";
import { HOSTELS, PATHS } from "@/content/join";

/** Rows per page. 25 is about a screenful on a laptop, and small enough that opening the
 *  dashboard to look somebody up costs twenty-five reads rather than the whole club. */
const PAGE = 25;

/** Monday of the week a date falls in, so weekly buckets line up. */
function weekStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  /** The uid whose membership is being written, so one row can show it is busy without
   *  freezing the table. Null when nothing is in flight. */
  const [saving, setSaving] = useState<string | null>(null);
  const [memberError, setMemberError] = useState("");
  /** The page of members currently on screen. NOT the whole club — see `everyone`. */
  const [rows, setRows] = useState<Profile[] | null>(null);
  const [cursor, setCursor] = useState<Cursor | null>(null);
  const [more, setMore] = useState(false);
  const [paging, setPaging] = useState(false);

  /** Counts, from aggregate queries. One read each, whatever the club's size. */
  const [counts, setCounts] = useState<{
    total: number;
    withGithub: number;
    weeks: [string, number][];
  } | null>(null);


  /** THE FULL SCAN, and it is null until somebody asks for it.
   *
   *  The breakdowns, the CSV export, "copy emails" and searching past the loaded page all
   *  need every document by definition — batch and branch are derived from the address
   *  rather than stored, so there is no query that can group by them. Once it is here the
   *  table, the search and the sort all switch to it, because at that point the reads are
   *  already spent and paging through memory would be worse for no saving. */
  const [everyone, setEveryone] = useState<Profile[] | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [scanning, setScanning] = useState(false);

  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [hostel, setHostel] = useState("");
  const [batch, setBatch] = useState("");
  const [year, setYear] = useState("");
  // Newest first by default, because the question an organiser opens this page with is
  // usually "who is new".
  const [sort, setSort] = useState<{ key: "joined" | "name" | "batch" | "hostel"; dir: 1 | -1 }>(
    { key: "joined", dir: -1 },
  );
  const [reloading, setReloading] = useState(false);
  const [copied, setCopied] = useState("");
  /** Populated only when the clipboard refused, so the addresses are still gettable. */
  const [emailList, setEmailList] = useState("");

  /** Admit somebody to the club, or take them back out.
   *
   *  THE TABLE IS UPDATED FROM THE WRITE, NOT RE-READ. A full reload of every profile to
   *  reflect one changed field would cost a read per member and visibly redraw the
   *  table under the organiser's cursor — and the one thing that changed is the one
   *  thing this function already knows. A failed write puts the row back and says so,
   *  rather than leaving the screen claiming something the database refused.
   *
   *  `membership_at` IS SET TO null RATHER THAN A LOCAL Date. The server stamps the real
   *  value and this row is not re-read; writing `new Date()` here would put a
   *  client clock into the table where every other timestamp came from the server, and
   *  it would be wrong by however far the two disagree. Nothing on this screen renders
   *  it, so null is the honest placeholder until the next full load.
   */
  const toggleMembership = useCallback(
    async (r: Profile) => {
      if (!user?.email) return;
      const next = !isClubMember(r);
      setMemberError("");
      setSaving(r.uid);
      try {
        await setMembership(r.uid, next, user.email);
        // BOTH ROW SETS, because the table renders `everyone` once a full scan has
        // happened and `rows` otherwise. Patching only one leaves the toggle looking
        // like it did nothing on whichever view is live.
        const patch = (prev: Profile[] | null): Profile[] | null =>
          prev
            ? prev.map((x) =>
                x.uid === r.uid
                  ? {
                      ...x,
                      membership: next ? "member" : "student",
                      membership_by: user.email ?? undefined,
                      membership_at: null,
                    }
                  : x,
              )
            : prev;
        setRows(patch);
        setEveryone(patch);
      } catch (e) {
        console.error("[osc] could not change membership", e);
        setMemberError(
          `Could not change membership for ${r.name || r.email}. The rules refused it, or the connection dropped.`,
        );
      } finally {
        setSaving(null);
      }
    },
    [user?.email],
  );

  /** THE CHEAP LOAD. What a dashboard costs to open.
   *
   *  Aggregates for every number on screen, the mentor list, demand counted on the
   *  server, and one page of rows. With ten mentors that is about sixty reads and it does
   *  not grow with the membership — the same page at ten thousand members costs the same.
   *  It used to be one read per member, per load, per Refresh.
   *
   *  Everything is issued at once. The eight weekly buckets are eight queries and there is
   *  no reason for them to wait on each other. */
  const load = useCallback(async () => {
    setError("");
    setReloading(true);
    try {
      const now = weekStart(new Date());
      const windows = Array.from({ length: 8 }, (_, i) => {
        const start = new Date(now);
        start.setDate(start.getDate() - (7 - i) * 7);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        return { start, end };
      });

      const [total, withGithub, weekCounts, page] = await Promise.all([
        countProfiles(),
        countProfilesWithGithub(),
        Promise.all(windows.map((w) => countProfilesBetween(w.start, w.end))),
        readProfilePage(PAGE, null),
      ]);

      setCounts({
        total,
        withGithub,
        weeks: windows.map((w, i) => [
          w.start.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
          weekCounts[i],
        ]),
      });
      setRows(page.rows);
      setCursor(page.cursor);
      setMore(page.more);

      // A refresh invalidates any full scan that was on screen: it was a snapshot of a
      // moment that has passed, and silently keeping it would show breakdowns that
      // disagree with the counts beside them.
      setEveryone(null);
      setEnrollments(null);
    } catch (e) {
      console.error("[osc] could not load the dashboard", e);
      setError(
        "Firestore refused the query. Either your address is not in the admins collection, or the rules are not deployed.",
      );
    } finally {
      setReloading(false);
    }
  }, []);

  /** The next page of rows. One page of reads, nothing else re-fetched. */
  const loadMore = useCallback(async () => {
    if (!cursor || paging) return;
    setPaging(true);
    try {
      const page = await readProfilePage(PAGE, cursor);
      setRows((cur) => [...(cur ?? []), ...page.rows]);
      setCursor(page.cursor);
      setMore(page.more);
    } catch (e) {
      console.error("[osc] could not load more members", e);
      setError("That page did not load. Try again.");
    } finally {
      setPaging(false);
    }
  }, [cursor, paging]);

  /** THE EXPENSIVE ONE, behind an explicit press. One read per member and per
   *  enrollment. Everything that needs it says so before spending it. */
  const scanEveryone = useCallback(async () => {
    if (everyone || scanning) return everyone;
    setScanning(true);
    try {
      const [ps, es] = await Promise.all([readAllProfiles(), readAllEnrollments()]);
      setEveryone(ps);
      setEnrollments(es);
      return ps;
    } catch (e) {
      console.error("[osc] full scan failed", e);
      setError("Loading the whole membership failed. Try again.");
      return null;
    } finally {
      setScanning(false);
    }
  }, [everyone, scanning]);

  // Loaded once on mount, and again only when an organiser asks. A dashboard that
  // re-queries on an interval spends reads to tell somebody nothing changed.
  useEffect(() => {
    if (!user || isAdmin !== true) return;
    void load();
  }, [user, isAdmin, load]);

  /** What the table is showing: the whole club once somebody has paid for it, otherwise
   *  the pages loaded so far. Everything downstream reads this and does not care which. */
  const visible = everyone ?? rows;

  /** What the two dropdowns offer.
   *
   *  Derived from the rows actually loaded rather than from a tally of the whole club,
   *  because the whole club is not in memory until somebody asks for it — and a filter
   *  cannot offer a value it would then find nothing for. After a full scan this covers
   *  every batch in the club; before one it covers the pages on screen, which is exactly
   *  the set the filter can act on. */
  const filterOptions = useMemo(() => {
    const uniq = (xs: string[]) => [...new Set(xs)].sort();
    return {
      batch: uniq((visible ?? []).map((r) => batchBucket(r.email))),
      year: uniq((visible ?? []).map((r) => yearBucket(r.email))),
    };
  }, [visible]);

  const filtered = useMemo(() => {
    if (!visible) return [];
    const needle = q.trim().toLowerCase();
    const out = visible.filter((r) => {
      if (hostel && r.hostel !== hostel) return false;
      if (batch && batchBucket(r.email) !== batch) return false;
      if (year && yearBucket(r.email) !== year) return false;
      if (!needle) return true;
      return [r.name, r.email, r.github, batchBucket(r.email), branchBucket(r.email)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
    const key = sort.key;
    return out.sort((a, b) => {
      let d = 0;
      if (key === "joined") d = (+(toDate(a.created_at) ?? 0)) - (+(toDate(b.created_at) ?? 0));
      else if (key === "name") d = (a.name ?? "").localeCompare(b.name ?? "");
      else if (key === "batch") d = batchBucket(a.email).localeCompare(batchBucket(b.email));
      else d = (a.hostel ?? "").localeCompare(b.hostel ?? "");
      return d * sort.dir;
    });
  }, [visible, q, hostel, batch, year, sort]);

  const activeFilters = [q, hostel, batch, year].filter(Boolean).length;

  // THE NUMBERS COME FROM TWO PLACES NOW, and the split is the whole point.
  //
  // The counts and the trend are aggregate queries — one read each, regardless of how big
  // the club gets. The BREAKDOWNS are not, and cannot be: batch, branch and year are
  // derived from the address by lib/batch.ts rather than stored, so there is no
  // `where('batch','==',...)` to count with. Grouping by them means reading every
  // document, so they wait behind an explicit press and say what it will cost.
  //
  // Both are still computed over EVERYTHING rather than the filtered view. A breakdown
  // that moves when you type in a search box is a breakdown you cannot quote in a meeting.
  const stats = useMemo(() => {
    const total = counts?.total ?? 0;
    const weeks = counts?.weeks ?? [];
    return {
      total,
      withGithub: counts?.withGithub ?? 0,
      // The last bucket IS this week — no need to count it twice.
      thisWeek: weeks.length ? weeks[weeks.length - 1][1] : 0,
      weeks,
    };
  }, [counts]);

  /** The breakdowns. Null until somebody has paid for the full scan. */
  const breakdowns = useMemo(() => {
    if (!everyone) return null;
    const all = everyone;
    return {
      hostel: tally(all.map((r) => labelOf(HOSTELS, r.hostel))),
      // Sorted by batch rather than by size: a year breakdown is a sequence, and putting
      // the biggest cohort first hides whether the club is getting younger.
      batch: tally(all.map((r) => batchBucket(r.email))).sort((a, b) => a[0].localeCompare(b[0])),
      year: tally(all.map((r) => yearBucket(r.email))).sort((a, b) => a[0].localeCompare(b[0])),
      branch: tally(all.map((r) => branchBucket(r.email))),
      // `path` is optional and most members arrive without one, so the members who have
      // none are dropped rather than counted as a bucket — "not recorded" as the biggest
      // slice of a chart tells nobody anything.
      path: tally(
        all
          .filter((r) => r.path)
          .map((r) => PATHS.find((p) => p.id === r.path)?.name ?? r.path),
      ),
      withPath: all.filter((r) => r.path).length,
    };
  }, [everyone]);

  /** Every address in the current filter, for pasting into a mail client. The action an
   *  organiser actually wants after narrowing the list, and the one thing they were
   *  previously exporting a whole CSV to get. */
  /** SCANS FIRST, AND THAT IS A CORRECTNESS FIX RATHER THAN A COURTESY. Both of these
   *  act on `filtered`, which before a full scan is only the pages loaded so far — so
   *  pressing Export on a club of 1,000 would have quietly written a CSV of 25 and looked
   *  entirely successful. Anything that claims to hand over "the list" loads the list. */
  async function copyEmails() {
    if (!everyone && !(await scanEveryone())) return;
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

  async function exportCsv() {
    if (!everyone && !(await scanEveryone())) return;
    const cols = ["name", "email", "batch", "branch", "year", "hostel", "path", "github"];
    const esc = (v: unknown) => {
      const s = v === undefined ? "" : String(v);
      // Quote always, and double any inner quote. Names contain commas more often than
      // people expect, and one unquoted comma shifts every later column by one.
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = [
      cols.join(","),
      ...filtered.map((r) =>
        [
          r.name,
          r.email,
          batchBucket(r.email),
          branchBucket(r.email),
          yearBucket(r.email),
          r.hostel,
          r.path ?? "",
          r.github ?? "",
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
        <p className="card rounded-panel bg-raise p-6 text-sm leading-relaxed text-ember" role="alert">
          {error}
        </p>
      )}

      {/* The headline count, and the two facts most often asked for beside it. */}
      <Counts
        loading={rows === null}
        rows={[
          ["Registered members", stats.total],
          ["Joined this week", stats.thisWeek],
          ["With a GitHub account", stats.withGithub],
        ]}
      />

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
                <span className="font-mono text-sm tabular-nums text-haze">{n || ""}</span>
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
              className="flex-1 text-center font-mono text-xs text-dust"
            >
              {/* Every other label only — eight dates side by side collide below about
                  700px and there is no room for rotation in a 6rem block. */}
              {i % 2 === 0 ? wk : ""}
            </span>
          ))}
        </div>
      </div>

      {/* THE BREAKDOWNS, BEHIND A PRESS. Every other number on this page is an aggregate
          query costing one read; these are not, because batch, branch and year are read
          out of the address rather than stored and there is nothing to group by in the
          database. Computing them means reading every member, so the page says what that
          costs and lets an organiser decide, rather than spending it on every load and
          every Refresh — which is what used to exhaust the daily quota for everybody,
          members included. */}
      {breakdowns ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Bars title="By batch" rows={breakdowns.batch} total={stats.total} />
            <Bars title="By year" rows={breakdowns.year} total={stats.total} />
            <Bars title="By branch" rows={breakdowns.branch} total={stats.total} />
            <Bars title="By hostel" rows={breakdowns.hostel} total={stats.total} />
            <Bars
              title="By route in"
              rows={breakdowns.path}
              total={breakdowns.withPath}
              empty="Nobody arrived through a path link yet."
              footnote={`Of the ${breakdowns.withPath} member${breakdowns.withPath === 1 ? "" : "s"} who arrived through a link that named a path. It is not asked for, so most members have none.`}
            />
          </div>
          <p className="text-sm leading-relaxed text-dust">
            Computed over all {stats.total} members, not the filtered list below.
          </p>
        </>
      ) : (
        <div className="card rounded-panel bg-raise p-6">
          <h3 className="label">Breakdowns</h3>
          <p className="measure mt-3 text-sm leading-relaxed text-haze">
            By batch, year, branch, hostel and route in. These are the only figures on this
            page that cannot be counted in the database — batch and branch are read out of
            each member&apos;s address rather than stored, so grouping by them means
            loading every member.
          </p>
          <button
            type="button"
            onClick={() => void scanEveryone()}
            disabled={scanning || stats.total === 0}
            className="btn btn-secondary mt-5 disabled:opacity-60"
          >
            {scanning ? "Loading everyone…" : `Load all ${stats.total} members`}
          </button>
          <p className="mt-3 text-xs text-dust">
            Also switches the table below to the whole club, so search, sort and export
            cover everybody rather than the rows loaded so far.
          </p>
        </div>
      )}

      <p className="text-sm leading-relaxed text-dust">
        Batch, branch and year are read from each member&apos;s college address rather than
        asked for — <span className="font-mono text-haze">23bcs10045</span> is the 2023–27
        batch, branch BCS. An address that does not follow that pattern is counted as{" "}
        <strong className="text-haze">Unknown</strong> rather than guessed at.
      </p>

      {/* The list. Filtering is local — the whole membership is already in memory, so a
          server query per keystroke would spend reads to be slower. */}
      <div className="card rounded-panel bg-raise p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="label">Members</h3>
            {/* SAYS WHAT IS ACTUALLY IN MEMORY. "12 of 1000 shown" while only 25 rows
                had been fetched was the old line, and it read as a filter having hidden
                the other 988 rather than as most of the club never having been loaded.
                Search and sort act on what is here; the line has to admit what that is. */}
            <p className="mt-1 text-sm text-haze">
              {filtered.length} of {everyone ? stats.total : (visible?.length ?? 0)} shown
              {activeFilters > 0 && (
                <span className="text-dust">
                  {" "}
                  · {activeFilters} filter{activeFilters === 1 ? "" : "s"} on
                </span>
              )}
              {!everyone && stats.total > (visible?.length ?? 0) && (
                <span className="text-dust">
                  {" "}
                  · {stats.total} members in total, {visible?.length ?? 0} loaded
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
            {/* Built from the data rather than a fixed list: the club gains a batch every
                year, and a hardcoded set would silently stop offering the newest one. */}
            <select
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              className={ctl}
              aria-label="Filter by batch"
            >
              <option value="">All batches</option>
              {filterOptions.batch.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={ctl}
              aria-label="Filter by year"
            >
              <option value="">All years</option>
              {filterOptions.year.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            {activeFilters > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setHostel("");
                  setBatch("");
                  setYear("");
                }}
                className="tap font-mono text-label uppercase text-haze underline transition-colors hover:text-ink"
              >
                Clear {activeFilters}
              </button>
            )}
            <button type="button" onClick={() => void copyEmails()} className="btn btn-secondary btn-compact">
              Copy emails
            </button>
            <button
              type="button"
              onClick={() => void exportCsv()}
              disabled={scanning}
              className="btn btn-secondary btn-compact disabled:opacity-60"
            >
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
              className="w-full resize-y rounded-inline border border-seam bg-sunk p-3 font-mono text-sm text-haze"
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
        {/* A refused membership write, said once above the table rather than inside the
            row that failed — the row has already been put back, so an error attached to
            it would point at a control that now reads correctly. */}
        {memberError && (
          <p className="mt-4 text-sm leading-relaxed text-ember" role="alert">
            {memberError}
          </p>
        )}

        <div className="table-scroll mt-5">
          <table className="w-full min-w-[56rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-seam">
                {([
                  ["Name", "name"],
                  ["In the club", null],
                  ["College email", null],
                  ["Batch and branch", "batch"],
                  ["Year", null],
                  ["Hostel", "hostel"],
                  ["Route in", null],
                  ["GitHub", null],
                  ["Joined", "joined"],
                ] as [string, "name" | "batch" | "hostel" | "joined" | null][]).map(([h, key]) => (
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
                          {sort.key === key ? (sort.dir === 1 ? "↑" : "↓") : "↕"}
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
                  {/* MEMBERSHIP, AS A BUTTON RATHER THAN A CHECKBOX. It is an action
                      somebody takes about another person, not a preference — and a
                      checkbox in a table of twenty rows is the control most easily
                      clicked by accident on the way to somewhere else. The label states
                      the CURRENT state and the title says what pressing it does, which
                      is the same split the theme toggle uses. */}
                  <td className="whitespace-nowrap py-3 pr-4">
                    <button
                      type="button"
                      onClick={() => void toggleMembership(r)}
                      disabled={saving === r.uid}
                      title={
                        isClubMember(r)
                          ? `Remove ${r.name || r.email} from the club`
                          : `Admit ${r.name || r.email} to the club`
                      }
                      className={`tap rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-50 ${
                        isClubMember(r)
                          ? "border-accent/60 text-accent hover:border-accent"
                          : "border-seam text-dust hover:border-accent/60 hover:text-accent"
                      }`}
                    >
                      {saving === r.uid ? "Saving…" : isClubMember(r) ? "Member" : "Student"}
                    </button>
                  </td>
                  <td className="py-3 pr-4 font-mono text-sm text-haze">{r.email}</td>
                  <td className="whitespace-nowrap py-3 pr-4 text-sm text-haze">
                    {batchBucket(r.email)}
                    <span className="block text-sm text-dust">{branchBucket(r.email)}</span>
                  </td>
                  <td className="whitespace-nowrap py-3 pr-4 text-sm text-haze">
                    {yearBucket(r.email)}
                  </td>
                  <td className="py-3 pr-4 text-sm text-haze">{labelOf(HOSTELS, r.hostel)}</td>
                  <td className="py-3 pr-4 text-sm text-haze">
                    {r.path ? PATHS.find((p) => p.id === r.path)?.name ?? r.path : "—"}
                  </td>
                  <td className="py-3 pr-4 font-mono text-sm text-haze">
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
                  <td className="whitespace-nowrap py-3 pr-4 font-mono text-sm text-haze">
                    {fmtDate(r.created_at)}
                  </td>
                </tr>
              ))}
              {rows !== null && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-6 text-sm text-dust">
                    {stats.total === 0
                      ? "Nobody has registered yet."
                      : everyone
                        ? "No member matches that filter."
                        : "No loaded member matches that filter — load the rest to search everybody."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* TWO WAYS ON, and they cost different amounts. A page is 25 reads; the whole
            club is one per member. Both are stated so the choice is informed rather than
            a button somebody presses to find out. */}
        {!everyone && (more || stats.total > (visible?.length ?? 0)) && (
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-seam pt-5">
            {more && (
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={paging}
                className="btn btn-secondary btn-compact disabled:opacity-60"
              >
                {paging ? "Loading…" : `Load ${PAGE} more`}
              </button>
            )}
            <button
              type="button"
              onClick={() => void scanEveryone()}
              disabled={scanning}
              className="tap font-mono text-label uppercase tracking-wider text-haze underline decoration-seam underline-offset-4 transition-colors hover:text-ink disabled:opacity-60"
            >
              {scanning ? "Loading everyone…" : `Load all ${stats.total}`}
            </button>
            <p className="text-xs text-dust">
              Search and sort cover the {visible?.length ?? 0} rows loaded so far.
            </p>
          </div>
        )}
      </div>

      <p className="text-sm leading-relaxed text-dust">
        This is every member&apos;s own words about themselves, including their college
        address. Treat the export the way you would a class list: it does not go in a
        group chat, and it is not published on the site.
      </p>

    </div>
  );
}
