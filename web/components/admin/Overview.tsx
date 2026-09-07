"use client";

// The organisers' overview: the numbers, and the way into everything else.
//
// /admin was six panels on one route — membership, notices, sessions, forms, the roster
// and the whole mentorship system, about 3,800 lines of component. An organiser opening it
// to answer "how many joined this week" scrolled past a form builder to find out.
//
// EVERY FIGURE HERE IS AN AGGREGATE QUERY, so this page costs about thirteen reads however
// big the club gets. Nothing on it reads a member document. The sections that genuinely
// need documents — the roster, the interest list — are their own routes now and pay for
// themselves when opened. See lib/profile.ts for why aggregates are billed on the size of
// the answer rather than the scan.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminGate from "@/components/admin/Gate";
import SectionHead from "@/components/dashboard/SectionHead";
import { Counts } from "@/components/admin/ui";
import {
  countProfiles,
  countProfilesBetween,
  countProfilesWithGithub,
} from "@/lib/profile";
import { countEnrollments, readMentors } from "@/lib/mentorship";

/** Monday of the week a date falls in, so the buckets line up. */
function weekStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

/** Where to go, with what is behind it stated. A grid of names would make an organiser
 *  click each one to find out which holds the thing they came for. */
const SECTIONS: { href: string; title: string; blurb: string }[] = [
  { href: "/admin/members", title: "Members", blurb: "The roster, the breakdowns by batch and hostel, and the export." },
  { href: "/admin/mentorship", title: "Mentorship", blurb: "Publish mentors, and see who has asked for whom." },
  { href: "/admin/notices", title: "Notices", blurb: "The board every member reads on their dashboard." },
  { href: "/admin/sessions", title: "Sessions", blurb: "When the club meets, and what is on." },
  { href: "/admin/forms", title: "Forms", blurb: "Ask the club something, and read the answers." },
  { href: "/admin/team", title: "Team", blurb: "Who is an organiser, and what the site says about them." },
];

function Body() {
  const [counts, setCounts] = useState<{
    total: number;
    thisWeek: number;
    withGithub: number;
    enrolled: number;
    mentors: number;
    weeks: [string, number][];
  } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const now = weekStart(new Date());
      const windows = Array.from({ length: 8 }, (_, i) => {
        const start = new Date(now);
        start.setDate(start.getDate() - (7 - i) * 7);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        return { start, end };
      });
      const [total, withGithub, weekCounts, enrolled, mentors] = await Promise.all([
        countProfiles(),
        countProfilesWithGithub(),
        Promise.all(windows.map((w) => countProfilesBetween(w.start, w.end))),
        countEnrollments(),
        readMentors(),
      ]);
      setCounts({
        total,
        withGithub,
        enrolled,
        mentors: mentors.length,
        // The last bucket IS this week; counting it twice would be a read for an answer
        // already on screen.
        thisWeek: weekCounts[weekCounts.length - 1] ?? 0,
        weeks: windows.map((w, i) => [
          w.start.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
          weekCounts[i],
        ]),
      });
    } catch (e) {
      console.error("[osc] could not load the overview", e);
      setError(
        "Firestore refused the query. Either your address is not in the admins collection, or the rules are not deployed.",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const weeks = counts?.weeks ?? [];
  const peak = Math.max(1, ...weeks.map(([, n]) => n));

  return (
    <>
      <SectionHead eyebrow="Organisers" title="The club, at a glance.">
        Every figure here is counted in the database rather than by reading the membership,
        so this page costs the same whether the club is thirty people or three thousand.
      </SectionHead>

      {error && (
        <p className="card rounded-panel bg-raise p-6 text-sm leading-relaxed text-ember" role="alert">
          {error}
        </p>
      )}

      <Counts
        loading={counts === null}
        rows={[
          ["Registered members", counts?.total ?? 0],
          ["Joined this week", counts?.thisWeek ?? 0],
          ["Enrolled in mentorship", counts?.enrolled ?? 0],
          ["Mentors published", counts?.mentors ?? 0],
        ]}
      />

      <div className="mt-8 card rounded-panel bg-raise p-6 lg:mt-10">
        <h2 className="label">Sign-ups, last eight weeks</h2>
        {/* items-stretch and h-full on each column is load-bearing: with items-end the
            columns collapse to their content, so a percentage height resolves against an
            indefinite parent and every bar renders as a hairline. The numbers were right
            and the chart was empty, which is the worst version of wrong. */}
        <div className="mt-5 flex items-stretch gap-2" style={{ height: "6.5rem" }}>
          {weeks.map(([wk, n]) => (
            <div key={wk} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className="font-mono text-xs tabular-nums text-haze">{n || ""}</span>
              {/* A minimum height on a zero week, so the axis reads as a row of weeks
                  rather than stopping wherever the data stopped. */}
              <div
                className={`w-full rounded-t ${n ? "bg-accent" : "bg-sunk"}`}
                style={{ height: n ? `${Math.max(6, (n / peak) * 100)}%` : "3px" }}
                title={`${n} in the week of ${wk}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          {weeks.map(([wk], i) => (
            <span key={wk} className="flex-1 text-center font-mono text-xs text-dust">
              {/* Every other label only — eight dates collide below about 700px and there
                  is no room to rotate them in a 6rem block. */}
              {i % 2 === 0 ? wk : ""}
            </span>
          ))}
        </div>
      </div>

      <h2 className="label mt-10 lg:mt-14">Everything else</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="card group rounded-panel bg-raise p-6 transition hover:border-accent/50"
          >
            <p className="text-body-lg font-semibold text-ink transition-colors group-hover:text-accent">
              {s.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-haze">{s.blurb}</p>
          </Link>
        ))}
      </div>
    </>
  );
}

export default function AdminOverview() {
  return (
    <AdminGate>
      <Body />
    </AdminGate>
  );
}
