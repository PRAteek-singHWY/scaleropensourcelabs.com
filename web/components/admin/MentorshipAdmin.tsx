"use client";

// The organisers' mentorship section, on its own route.
//
// IT WAS THE TAIL OF /admin, under the membership table, the breakdowns and the export —
// and before that it was a panel on the member dashboard. The club's headline activity has
// been the last thing on somebody else's page twice now.
//
// IT OWNS ITS OWN READS, which is the point of the split rather than a side effect. When
// /admin was one route, one component issued every query for every panel so that two
// panels could not disagree about the data a moment after a write. With a route per
// concern that argument inverts: an organiser opening the membership table should not pay
// for the mentor list, and an organiser publishing a mentor should not pay for the roster.
//
// WHAT IT COSTS. Aggregates for the counts and for demand — one read each regardless of
// club size, two per mentor — plus the mentor documents themselves. The interest list pages
// at 25, joined to just the profiles those rows name via a single `documentId() in [...]`
// query rather than a scan of the membership. A full scan sits behind a button that says
// what it will cost, because the batch chart and the CSV export need every document by
// definition: batch is derived from the address and cannot be queried.

import { useCallback, useEffect, useState } from "react";
import AdminGate from "@/components/admin/Gate";
import AdminMentors from "@/components/AdminMentors";
import AdminMentorship from "@/components/AdminMentorship";
import SectionHead from "@/components/dashboard/SectionHead";
import { readAllProfiles, readProfilesByIds, type Profile } from "@/lib/profile";
import {
  countDemand,
  countEnrollments,
  readAllEnrollments,
  readEnrollmentPage,
  readMentors,
  type Enrollment,
  type Mentor,
} from "@/lib/mentorship";

/** Rows per page, matching the membership table so the two feel like one product. */
const PAGE = 25;

function Body() {
  const [mentors, setMentors] = useState<Mentor[] | null>(null);
  const [demand, setDemand] = useState<Map<string, { first: number; second: number; total: number }>>(
    new Map(),
  );
  const [enrolledTotal, setEnrolledTotal] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [reloading, setReloading] = useState(false);

  /** The paged interest list, and just the profiles its rows name. */
  const [enrolRows, setEnrolRows] = useState<Enrollment[] | null>(null);
  const [enrolProfiles, setEnrolProfiles] = useState<Map<string, Profile>>(new Map());
  const [enrolCursor, setEnrolCursor] = useState<unknown>(null);
  const [enrolMore, setEnrolMore] = useState(false);
  const [enrolPaging, setEnrolPaging] = useState(false);

  /** THE FULL SCAN, null until asked for. Backs the export and the batch chart. */
  const [everyone, setEveryone] = useState<Profile[] | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [scanning, setScanning] = useState(false);

  const load = useCallback(async () => {
    setError("");
    setReloading(true);
    try {
      const [ms, enrolled] = await Promise.all([readMentors(), countEnrollments()]);
      setMentors(ms);
      setEnrolledTotal(enrolled);
      // Demand needs the ids, so it cannot join the batch above. Two aggregate queries per
      // mentor, all in flight together.
      setDemand(await countDemand(ms.map((m) => m.id)));
      // A refresh discards any scan on screen: it was a snapshot of a moment that has
      // passed, and keeping it would show a chart disagreeing with the counts beside it.
      setEveryone(null);
      setEnrollments(null);
      setEnrolRows(null);
      setEnrolProfiles(new Map());
      setEnrolCursor(null);
      setEnrolMore(false);
    } catch (e) {
      console.error("[osc] could not load mentorship", e);
      setError(
        "Firestore refused the query. Either your address is not in the admins collection, or the rules are not deployed.",
      );
    } finally {
      setReloading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadEnrolPage = useCallback(async (cur: unknown = null) => {
    setEnrolPaging(true);
    try {
      const page = await readEnrollmentPage(PAGE, cur);
      const profs = await readProfilesByIds(page.rows.map((e) => e.uid));
      setEnrolRows((prev) => (cur ? [...(prev ?? []), ...page.rows] : page.rows));
      setEnrolProfiles((prev) => {
        const next = cur ? new Map(prev) : new Map<string, Profile>();
        for (const [k, v] of profs) next.set(k, v);
        return next;
      });
      setEnrolCursor(page.cursor);
      setEnrolMore(page.more);
    } catch (e) {
      console.error("[osc] could not load the interest list", e);
      setError("The interest list did not load. Try again.");
    } finally {
      setEnrolPaging(false);
    }
  }, []);

  const scanEveryone = useCallback(async () => {
    if (everyone || scanning) return;
    setScanning(true);
    try {
      const [ps, es] = await Promise.all([readAllProfiles(), readAllEnrollments()]);
      setEveryone(ps);
      setEnrollments(es);
    } catch (e) {
      console.error("[osc] full scan failed", e);
      setError("Loading everybody failed. Try again.");
    } finally {
      setScanning(false);
    }
  }, [everyone, scanning]);

  return (
    <>
      <SectionHead
        eyebrow="Organisers"
        title="Mentorship."
        action={
          <button
            type="button"
            onClick={() => void load()}
            disabled={reloading}
            className="btn btn-secondary btn-compact disabled:opacity-60"
          >
            {reloading ? "Refreshing…" : "Refresh"}
          </button>
        }
      >
        The mentors members can choose from, and who has chosen whom. Publishing the first
        mentor is what opens enrolment on every member&apos;s dashboard.
      </SectionHead>

      {error && (
        <p className="card rounded-panel bg-raise p-6 text-sm leading-relaxed text-ember" role="alert">
          {error}
        </p>
      )}

      <div className="space-y-8 lg:space-y-10">
        <AdminMentors mentors={mentors} demand={demand} onChanged={() => void load()} />
        <AdminMentorship
          profiles={everyone}
          mentors={mentors}
          demand={demand}
          enrollments={enrollments}
          enrolledTotal={enrolledTotal}
          scanning={scanning}
          onLoadAll={() => void scanEveryone()}
          enrolRows={enrolRows}
          enrolProfiles={enrolProfiles}
          enrolMore={enrolMore}
          enrolPaging={enrolPaging}
          onLoadEnrolPage={(cur: unknown) => void loadEnrolPage(cur)}
          enrolCursor={enrolCursor}
        />
      </div>
    </>
  );
}

export default function MentorshipAdmin() {
  return (
    <AdminGate>
      <Body />
    </AdminGate>
  );
}
