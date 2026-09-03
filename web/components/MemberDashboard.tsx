"use client";

// The member's dashboard, laid out to the Stitch design.
//
// THE PROFILE FORM IS A PANEL, NOT A GATE. It used to render INSTEAD of the dashboard
// whenever a profile was incomplete, so a member signing in for the first time met a
// hostel dropdown and everything worth arriving for sat behind it — which is why the
// club's own organisers reported the site "has no dashboard". They had never got past the
// form. Nothing is blocked on it now; the club simply knows less about somebody until
// they fill it in.
//
// THE ORDER IS THE DESIGN'S, AND IT IS ORDERED BY WHAT CHANGED:
//
//   the strip      four figures, so the page answers "anything for me?" before a word
//   left column    what moved and what is asked of you
//   right column   what is standing: where to go next, and what we hold about you
//
// NO GREETING HEADING, WHICH THE PREVIOUS VERSION HAD. The design opens straight on the
// figures, and it is right to: "Good to see you, Asha" is the page being pleased with
// itself, and it pushed the only line that answers a question below the fold on a laptop.
// The h1 the document still needs is visually hidden — see the note on it.

import { Suspense, useCallback, useEffect, useState } from "react";
import ProfileCard from "@/components/ProfileCard";
import ProfileForm from "@/components/ProfileForm";
import SignInCard from "@/components/SignInCard";
import Board from "@/components/dashboard/Board";
import Contributions from "@/components/dashboard/Contributions";
import Forms from "@/components/dashboard/Forms";
import NextSessions from "@/components/dashboard/NextSessions";
import MentorPicker from "@/components/MentorPicker";
import NextUp from "@/components/dashboard/NextUp";
import Panel from "@/components/dashboard/Panel";
import { isComplete, readProfile, type Profile } from "@/lib/profile";
import { useAuth } from "@/lib/auth";

/** One figure in the strip.
 *
 *  `note` is the small coloured line the design puts beside several of the numbers —
 *  "+12 this week", "pending review". It is optional because only some of the four have
 *  anything true to say there, and inventing one for the others to make the row even is
 *  how a strip of facts becomes a strip of decoration. */
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
      <p className="font-mono text-[0.6875rem] font-medium uppercase leading-tight tracking-[0.12em] text-haze">
        {label}
      </p>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="font-display text-[2.125rem] font-bold leading-none tabular-nums tracking-tight">
          {n}
        </span>
        {note && <span className="text-sm font-medium text-ember">{note}</span>}
      </p>
    </div>
  );
}

export default function MemberDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [loadError, setLoadError] = useState("");
  /** Reported up by the panels that already did the reads, so the strip costs no extra
   *  queries. `null` means "not known yet", which renders as an em dash rather than a
   *  zero — "0 merged" and "we have not looked yet" are different sentences and only the
   *  second is true at first paint. */
  const [pending, setPending] = useState<number | null>(null);
  const [merged, setMerged] = useState<number | null>(null);
  const [repos, setRepos] = useState<number | null>(null);
  const [openPrs, setOpenPrs] = useState<number | null>(null);

  const load = useCallback(async (uid: string) => {
    setLoadError("");
    try {
      setProfile(await readProfile(uid));
    } catch (e) {
      // NOT swallowed into "no profile yet". A refusal here means the rules said no, which
      // on this collection almost always means an off-domain address — and presenting that
      // as an empty form would silently ask somebody to fill in details that cannot save.
      console.error("[osc] could not read profile", e);
      setLoadError("We could not load your details. Reload the page, or email us.");
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(user === null ? null : undefined);
      return;
    }
    void load(user.uid);
  }, [user, load]);

  // Stable identities, so the child effects reporting these numbers do not re-fire on
  // every render of this component.
  const onPending = useCallback((n: number) => setPending(n), []);
  const onSummary = useCallback((m: number, r: number, o: number) => {
    setMerged(m);
    setRepos(r);
    setOpenPrs(o);
  }, []);

  // `user === undefined` is its own state rather than being folded into "signed out":
  // rendering a sign-in prompt while the session is still being restored shows it to
  // somebody who is already signed in, every time they load the page.
  if (user === undefined || (user && profile === undefined)) {
    return (
      <div className="card rounded-panel bg-raise p-8" aria-busy="true">
        <p className="label">One moment</p>
        <p className="mt-3 text-body text-haze">Finding your things…</p>
      </div>
    );
  }

  // The card itself, not a link to one: /join is the anonymous application form, and
  // sending a returning member there would hand them an application to fill in again.
  if (!user) return <SignInCard />;

  const complete = isComplete(profile);

  return (
    <div className="space-y-5">
      {/* THE H1 THE DESIGN DOES NOT DRAW. The page opens on the figures, so there is no
          visible heading to carry the document's title — but a page with no h1 hands a
          screen-reader user a document with no name, and the site's own checks require
          exactly one. Hidden rather than invented. */}
      <h1 className="sr-only">Your dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* "WAITING ON YOU" LEADS, and it is the one figure the design does not have.
            Stitch opens with Total Contributions, which is an achievement — and a
            dashboard whose first number is a score is a leaderboard, which is the wrong
            instrument for a club whose whole pitch is "you do not need to be good yet".
            The other three are the design's, in its order. */}
        <Stat n={pending ?? "—"} label="Waiting on you" />
        <Stat n={merged ?? "—"} label="Pull requests merged" />
        <Stat n={openPrs ?? "—"} label="Open pull requests" note={openPrs ? "in review" : undefined} />
        <Stat n={repos ?? "—"} label="Projects touched" />
      </div>

      {loadError && (
        <p
          className="card rounded-panel bg-raise p-6 text-[15px] leading-relaxed text-ember"
          role="alert"
        >
          {loadError}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="space-y-5">
          {/* ABOVE THE BOARD, because a sign-up nobody scrolls to is a sign-up nobody
              fills in — and unlike a notice, this one is asking for something back. */}
          <Forms
            uid={user.uid}
            email={user.email ?? ""}
            name={profile?.name ?? user.displayName ?? undefined}
            onPending={onPending}
          />
          {/* WHAT'S ON, BETWEEN THE FORMS AND THE BOARD. A session is the most
              time-bound thing on the page — miss it and it is gone — so it sits above the
              notices, which keep. It renders nothing at all when there is no schedule; see
              the note in NextSessions.tsx for why that panel is the one exception to
              every-panel-keeps-its-empty-state. */}
          <NextSessions />
          <Board />
          <Contributions
            uid={user.uid}
            handle={profile?.github}
            onEditProfile={() => setEditing(true)}
            onSummary={onSummary}
          />
        </div>

        <div className="space-y-5">
          {/* The only filled surface on the page. NextUp reads the member's chosen route
              and programmes, so it has nothing to say until there is a profile. */}
          {profile && complete && <NextUp profile={profile} />}

          {editing || !complete ? (
            <Panel
              icon="user"
              title="Your details"
              id="details"
              action={
                editing && complete ? (
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="tap font-mono text-label uppercase text-haze underline transition-colors hover:text-ink"
                  >
                    Cancel
                  </button>
                ) : undefined
              }
            >
              {/* THE PROMPT THAT REPLACED THE GATE. It says what the details are FOR,
                  because "fill in this form" with no reason attached is the thing
                  everybody skips — and it is honest that nothing is blocked on it. */}
              {!complete && (
                <p className="measure mb-5 text-body text-haze">
                  Everything else here already works. This is just so the organisers know
                  which hostel to find you in and what you are chasing — a minute, once.
                </p>
              )}
              {/* SUSPENSE IS REQUIRED, not tidiness: ProfileForm reads useSearchParams for
                  the ?path= preselect, and an unwrapped useSearchParams fails the static
                  export build outright. */}
              <Suspense fallback={<div className="h-[42rem]" aria-hidden />}>
                <ProfileForm
                  user={user}
                  profile={profile ?? null}
                  onSaved={() => {
                    setEditing(false);
                    // Re-read rather than trusting the local echo, so the card shows the
                    // server's timestamps rather than a client clock.
                    void load(user.uid);
                  }}
                />
              </Suspense>
            </Panel>
          ) : (
            profile && (
              <ProfileCard profile={profile} tone="record" onEdit={() => setEditing(true)} />
            )
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- the programmes
          RESTORED, NOT NEW. This was rendered here in b996d6a and disappeared in the
          merge that took upstream's structure alongside this dashboard — the component,
          its library and its firestore rules all survived, and only the one line that
          put it on screen was lost. The result was a mentorship system that was fully
          built, fully protected, and unreachable: a member had no way to pick a mentor
          and nothing on the page said so. Same failure as the /join form the rules file
          documents — correct in git, correct in review, and wrong about which features
          were reachable.

          It owns its own reads and its own signed-out state, so it goes at the foot of
          the page rather than inside the two-column grid: it is a section, not a panel,
          and it is the one thing here a member acts on once a term rather than weekly. */}
      <MentorPicker user={user} />
    </div>
  );
}
