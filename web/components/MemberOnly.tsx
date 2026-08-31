"use client";

// The three states that come before "signed in", in one place, because /onboarding and
// /dashboard both have them and two copies would drift.
//
// WHY THIS IS NOT A SECURITY BOUNDARY, and nothing about it should ever be mistaken for
// one. The site is a static export: every route's HTML is on the CDN and anybody can
// fetch it, signed in or not. What this component does is decide what to PAINT. What
// refuses to hand over data is firestore.rules, and only that. If you find yourself
// reasoning "the page is hidden, so the data is safe", read the note at the top of
// lib/auth.tsx first — it is the same trap, written down before it was fallen into.
//
// THE ORDER OF THE BRANCHES IS THE WHOLE POINT. `user === undefined` means the session is
// still being restored, and it has to be its own state rather than folded into "signed
// out". A static route ships before auth resolves, so treating unknown as signed-out
// means every returning member sees a sign-in prompt flash before their own page. That
// is the specific bug the single-component JoinGate was built to avoid, and splitting the
// flow across routes brings it back unless every route is careful. This is where the care
// lives.

import type { ReactNode } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";
import { useAuth } from "@/lib/auth";
import { DOMAIN } from "@/lib/profile";
import { LINKS } from "@/content/site";

/** A plain card, so the four states below are visibly the same object in four moods
 *  rather than four different panels. */
export function GateCard({
  busy = false,
  children,
}: {
  busy?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="card rounded-panel bg-raise p-8 sm:p-10" aria-busy={busy || undefined}>
      {children}
    </div>
  );
}

export default function MemberOnly({
  /** What the reader is waiting for, e.g. "Loading your dashboard…". Named rather than a
   *  generic spinner because on a slow connection this is on screen long enough to read,
   *  and "Checking your sign-in" answers the question a blank card raises. */
  loading = "Checking your sign-in…",
  children,
}: {
  loading?: string;
  children: (user: User) => ReactNode;
}) {
  const { user, configured } = useAuth();

  if (!configured) {
    return (
      <GateCard>
        <p className="text-display-md font-semibold">Sign-in is not set up here.</p>
        <p className="measure mt-4 text-body text-haze">
          This deployment has no Firebase configuration, so there is nothing to sign in
          to. If you are running the site locally, see <code>web/.env.example</code>. If
          you are seeing this on the live site, that is a bug — please tell us.
        </p>
        <a href={`mailto:${LINKS.email}`} className="btn btn-secondary mt-6">
          Email the organisers
        </a>
      </GateCard>
    );
  }

  if (user === undefined) {
    return (
      <GateCard busy>
        <p className="label">One moment</p>
        <p className="mt-3 text-body text-haze">{loading}</p>
      </GateCard>
    );
  }

  if (user === null) {
    return (
      <GateCard>
        <p className="chip">Members only</p>
        <h2 className="mt-4 font-display text-display-md font-bold tracking-tight">
          Sign in first.
        </h2>
        <p className="measure mt-4 text-body text-haze">
          This page is for club members. Sign in with your{" "}
          <strong className="text-ink">@{DOMAIN}</strong> account and you will land back
          here.
        </p>
        {/* The sign-in button itself is not repeated here. It lives on /join with the
            domain rule, the privacy links and the explanation of why Google — all of
            which a reader deciding whether to hand over their college identity should
            have in front of them. Two sign-in buttons on two pages means one of them
            eventually stops carrying that context. */}
        <Link href="/join" className="btn btn-primary mt-7">
          Go to sign in
        </Link>
      </GateCard>
    );
  }

  return <>{children(user)}</>;
}
