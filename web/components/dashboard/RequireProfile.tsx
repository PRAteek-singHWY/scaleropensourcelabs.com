"use client";

// The gate every signed-in section sits behind, in one place.
//
// THREE STATES BEFORE THE PAGE, and the order matters:
//
//   still checking   a neutral card. `user === undefined` means the session is being
//                    restored, and treating that as "signed out" flashes a sign-in prompt
//                    at every returning member on every load.
//   signed out       the sign-in card.
//   no profile yet   sent to /onboarding, and NOTHING of the section renders.
//
// WHY THE GATE EXISTS, AND WHY IT ONCE DID NOT. The profile form used to render instead of
// the dashboard, inside the dashboard component, and the club's organisers reported that
// the site "has no dashboard" — they had met a hostel dropdown and never got past it. The
// fix at the time was to demote the form to a panel and let everything else through.
//
// It is a gate again because the club asked for it: nobody should be half-registered, and
// an organiser reading the roster should be able to trust that a row means a member. What
// is different is where the form lives. It is not here. An incomplete profile goes to
// /onboarding, which is a PAGE about being three questions — a two-step spine showing that
// signing in was step one, a heading that says "Three questions", and a button that says
// "Finish joining" and lands on the dashboard. The old failure was a form with no frame:
// it looked like the destination rather than a step, so nothing told anybody they were
// nearly through.
//
// IT IS NOT A PRIVILEGE BOUNDARY. Every one of these routes is static HTML on a CDN and
// anybody can fetch it; what refuses to hand over data is firestore.rules. See the note at
// the top of lib/auth.tsx before concluding that a redirect makes anything safe.

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import SignInCard from "@/components/SignInCard";
import { useAuth } from "@/lib/auth";
import { isComplete, readProfile, type Profile } from "@/lib/profile";

export default function RequireProfile({
  /** Named so the waiting card can say what is being waited for. A blank card on a slow
   *  connection is on screen long enough to read. */
  loading = "Finding your things…",
  children,
}: {
  loading?: string;
  children: (ctx: { user: User; profile: Profile; reload: () => void }) => ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async (uid: string) => {
    setLoadError("");
    try {
      setProfile(await readProfile(uid));
    } catch (e) {
      // A denied read here is almost always an off-domain address, which lib/auth should
      // already have signed out — so this is genuinely unexpected and says so rather than
      // pretending there is no profile.
      console.error("[osc] could not read profile", e);
      setProfile(null);
      setLoadError("We could not load your details. Reload the page, or email us.");
    }
  }, []);

  useEffect(() => {
    if (user) void load(user.uid);
    else if (user === null) setProfile(null);
  }, [user, load]);

  // `loadError` is in the condition on purpose: a profile we FAILED to read is not a
  // profile that does not exist, and bouncing somebody into onboarding on a dropped
  // connection would ask a member who joined in August to register a second time.
  const needsOnboarding =
    Boolean(user) && profile !== undefined && !isComplete(profile) && !loadError;

  useEffect(() => {
    if (needsOnboarding) router.replace("/onboarding");
  }, [needsOnboarding, router]);

  if (user === undefined || (user && profile === undefined) || needsOnboarding) {
    return (
      <div className="card rounded-panel bg-raise p-8" aria-busy="true">
        {/* THE HIDDEN H1 IS HERE TOO, because this is a state the route can be LOADED IN
            rather than a flicker between two states that have one. Without it the document
            has no name for as long as the check takes. */}
        <h1 className="sr-only">Your dashboard</h1>
        <p className="label">One moment</p>
        <p className="mt-3 text-body text-haze">
          {needsOnboarding ? "Just three questions first…" : loading}
        </p>
      </div>
    );
  }

  if (!user) return <SignInCard />;

  if (!profile) {
    return (
      <div className="card rounded-panel bg-raise p-8">
        <h1 className="sr-only">Your dashboard</h1>
        <p className="chip">Something went wrong</p>
        <p className="mt-4 text-body text-ember" role="alert">
          {loadError || "We could not load your details."}
        </p>
      </div>
    );
  }

  return <>{children({ user, profile, reload: () => void load(user.uid) })}</>;
}
