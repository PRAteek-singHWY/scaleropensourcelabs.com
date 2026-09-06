"use client";

// Step two of joining: the three questions, on their own route.
//
// It only ever renders one of four things, and the order matters:
//
//   before sign-in   -> handled by MemberOnly, which owns that decision for both new
//                       routes so "still checking" is never mistaken for "signed out"
//   profile loading  -> a neutral card. NOT the form: a returning member who already
//                       answered would see their own questions again for a frame.
//   already done     -> leave for /dashboard, unless ?edit=1 asked for this on purpose
//   otherwise        -> the form
//
// ?path= IS FORWARDED, NOT DROPPED. Every closing action on the site links to
// /join?path=<id>; the gate carries it through sign-in, /dashboard carries it here, and
// this is where it finally gets saved. It is validated against the real PATHS rather than
// trusted, because a hand-edited ?path=anything would otherwise be written to the profile
// and refused by the rules — presenting as a form that will not save.

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "firebase/auth";
import MemberOnly, { GateCard } from "@/components/MemberOnly";
import ProfileForm from "@/components/ProfileForm";
import { Steps } from "@/components/JoinGate";
import { isComplete, readProfile, type Profile } from "@/lib/profile";
import { PATHS } from "@/content/join";

function Body({ user }: { user: User }) {
  const router = useRouter();
  const params = useSearchParams();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [loadError, setLoadError] = useState("");

  const requested = params.get("path");
  const path = PATHS.some((p) => p.id === requested) ? requested! : "";
  // An explicit ?edit=1 is the only way to reach this form with a finished profile. The
  // dashboard's "edit my details" link is what sets it, so arriving here by any other
  // route with a complete profile means the reader is lost and gets sent onward.
  const editing = params.get("edit") === "1";

  const load = useCallback(async (uid: string) => {
    setLoadError("");
    try {
      setProfile(await readProfile(uid));
    } catch (e) {
      // A denied read here is nearly always an off-domain address, which lib/auth
      // should already have signed out — so this is genuinely unexpected and says so
      // rather than pretending there is no profile.
      console.error("[osc] could not read profile", e);
      setProfile(null);
      setLoadError("We could not load your profile. Reload the page, or email us.");
    }
  }, []);

  useEffect(() => {
    void load(user.uid);
  }, [user, load]);

  // Nothing to do here — go and be somewhere useful. An effect rather than a render-time
  // push, and `replace` so the back button from the dashboard does not bounce off this
  // page straight back to the dashboard.
  const done = profile !== undefined && isComplete(profile) && !editing;
  useEffect(() => {
    if (done) router.replace("/dashboard");
  }, [done, router]);

  if (profile === undefined || done) {
    return (
      <GateCard busy>
        <Steps at={2} />
        <p className="mt-6 text-body text-haze">
          {done ? "You have already done this — taking you to your dashboard…" : "Loading your details…"}
        </p>
      </GateCard>
    );
  }

  return (
    <GateCard>
      {/* NO SIGN-OUT BUTTON HERE ANY MORE. It is in the app header, on every signed-in
          route, next to the account it signs out of. Two of them on one screen made the
          card look like it was carrying its own chrome — which it was, back when the
          signed-in flow lived inside a marketing page and had nowhere else to put it. */}
      {/* Editing is not a step in the join — somebody changing their hostel in March is
          not two-thirds of the way into signing up — so the spine is replaced by a plain
          chip in that mode rather than shown at a stage that would be a lie. */}
      {editing ? <p className="chip">Editing your details</p> : <Steps at={2} />}

      {/* The route's h1 already says "Three questions" and the standfirst under it already
          says you only do this once. A second heading and a second paragraph saying the
          same thing was the card competing with the page it sits on. What is left is the
          one sentence the page above cannot say: what happens to the answers. */}
      <p className="mt-6 text-body text-haze">
        {editing
          ? "Change anything and save. Your address stays as it is on your college account."
          : "Your batch and branch come from your college address, so this is everything we cannot work out on our own."}
      </p>

      {loadError && (
        <p className="mt-4 text-sm leading-relaxed text-ember" role="alert">
          {loadError}
        </p>
      )}

      <div className="mt-7">
        <ProfileForm
          user={user}
          profile={profile}
          path={path}
          onSaved={() => {
            // Straight to the dashboard, and no local echo rendered on the way: the
            // finished-profile card that used to live here is the dashboard now. push
            // rather than replace, because arriving at the dashboard by finishing the
            // form is a real step forward and "back" should return here.
            router.push("/dashboard");
          }}
        />
      </div>
    </GateCard>
  );
}

export default function OnboardingGate() {
  return (
    <MemberOnly loading="Checking your sign-in…">
      {(user) => <Body user={user} />}
    </MemberOnly>
  );
}
