"use client";

// The dashboard OVERVIEW. One question: is anything waiting for me?
//
// IT USED TO BE THE WHOLE SIGNED-IN AREA — four figures, the forms, the notice board, the
// sessions, the GitHub panel, the profile record, the profile form and the entire
// mentorship flow, in two columns on one route. Everything the club could say to a member
// arrived at once, so nothing arrived first, and the two panels somebody returns for each
// week sat under a form they fill in once.
//
// It is three sections now, one per route, and the sidebar moves between them:
//
//   /dashboard             this: what is waiting, what is on, what to do next
//   /dashboard/mentorship  the GSoC cohort — a decision made once a term
//   /dashboard/details     the record the club holds, and the form to change it
//
// WHAT STAYED IS WHAT CHANGES WEEKLY: a form to fill in, a notice, a session, a figure
// that moved. Everything standing still moved out.
//
// THE PROFILE IS GUARANTEED PAST RequireProfile, so there is no "you have not filled this
// in" branch below and no hidden h1 — the section has a real title now. See that component
// for why the gate exists and why the form deliberately does not live behind it.

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import RequireProfile from "@/components/dashboard/RequireProfile";
import SectionHead from "@/components/dashboard/SectionHead";
import Board from "@/components/dashboard/Board";
import Contributions from "@/components/dashboard/Contributions";
import Forms from "@/components/dashboard/Forms";
import NextSessions from "@/components/dashboard/NextSessions";
import NextUp from "@/components/dashboard/NextUp";
import type { Profile } from "@/lib/profile";

/** One figure in the strip.
 *
 *  `note` is the small coloured line beside some of the numbers — "in review". Optional,
 *  because only some have anything true to say there, and inventing one for the others to
 *  make the row even is how a strip of facts becomes a strip of decoration. */
function Stat({
  n,
  label,
  note,
}: {
  n: number | string;
  label: string;
  note?: string;
}) {
  return (
    <div className="card rounded-panel bg-raise px-5 py-4">
      <p className="font-mono text-label font-medium uppercase leading-tight tracking-[0.12em] text-haze">
        {label}
      </p>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="font-display text-display-md font-bold leading-none tabular-nums tracking-tight">
          {n}
        </span>
        {note && <span className="text-sm font-medium text-ember">{note}</span>}
      </p>
    </div>
  );
}

function Overview({ user, profile }: { user: User; profile: Profile }) {
  const router = useRouter();
  /** Reported up by the panels that already did the reads, so the strip costs no extra
   *  queries. `null` means "not known yet", which renders as an em dash rather than a
   *  zero — "0 merged" and "we have not looked yet" are different sentences and only the
   *  second is true at first paint. */
  const [pending, setPending] = useState<number | null>(null);
  const [merged, setMerged] = useState<number | null>(null);
  const [repos, setRepos] = useState<number | null>(null);
  const [openPrs, setOpenPrs] = useState<number | null>(null);

  // Stable identities, so the child effects reporting these numbers do not re-fire on
  // every render.
  const onPending = useCallback((n: number) => setPending(n), []);
  const onSummary = useCallback((m: number, r: number, o: number) => {
    setMerged(m);
    setRepos(r);
    setOpenPrs(o);
  }, []);

  const first = profile.name.trim().split(/\s+/)[0] || "Hello";

  return (
    <>
      <SectionHead eyebrow="Your week" title={`${first}.`}>
        Anything the club needs from you turns up here. When this page is quiet there is
        genuinely nothing to do — which is most weeks, and is not a sign you are behind.
      </SectionHead>

      {/* "WAITING ON YOU" LEADS, and it is the one figure the design did not have. Opening
          on a contribution total makes the page a leaderboard, which is the wrong
          instrument for a club whose pitch is "you do not need to be good yet".

          THE GITHUB FIGURES ARE ONLY DRAWN WHEN THEY CAN HOLD A NUMBER. All three are read
          from GitHub, so a member with no handle met three em-dashes in a row — a strip
          that read as a dashboard with its data missing rather than one with nothing to
          say yet. The prompt that fixes it belongs with the control that does it, in the
          panel below, not as three dead tiles repeating it. */}
      {profile.github ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat n={pending ?? "—"} label="Waiting on you" />
          <Stat n={merged ?? "—"} label="Pull requests merged" />
          <Stat n={openPrs ?? "—"} label="Open pull requests" note={openPrs ? "in review" : undefined} />
          <Stat n={repos ?? "—"} label="Projects touched" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat n={pending ?? "—"} label="Waiting on you" />
        </div>
      )}

      {/* THE GAP IS THE DESIGN. These panels ran together at `space-y-5` into one column of
          cards with no rhythm; at 6/8 the eye gets a break between things that are not
          related to each other, which is most of what makes a page of panels read as
          sections rather than as a list. */}
      <div className="mt-10 grid gap-6 lg:mt-14 lg:grid-cols-[1.6fr_1fr] lg:items-start lg:gap-8">
        <div className="space-y-6 lg:space-y-8">
          {/* ABOVE THE BOARD, because a sign-up nobody scrolls to is a sign-up nobody
              fills in — and unlike a notice, this one asks for something back. */}
          <Forms
            uid={user.uid}
            email={user.email ?? ""}
            name={profile.name}
            onPending={onPending}
          />
          {/* A session is the most time-bound thing here — miss it and it is gone — so it
              sits above the notices, which keep. It renders nothing at all when there is
              no schedule; see NextSessions.tsx for why it is the one panel with no empty
              state. */}
          <NextSessions />
          <Board />
          <Contributions
            uid={user.uid}
            handle={profile.github}
            onEditProfile={() => router.push("/dashboard/details")}
            onSummary={onSummary}
          />
        </div>

        <div className="space-y-6 lg:space-y-8">
          {/* The only filled surface on the page, and the one thing here addressed to
              somebody with nothing waiting: what to do with the week anyway. */}
          <NextUp profile={profile} />
        </div>
      </div>
    </>
  );
}

export default function MemberDashboard() {
  return (
    <RequireProfile>
      {({ user, profile }) => <Overview user={user} profile={profile} />}
    </RequireProfile>
  );
}
