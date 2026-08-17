"use client";

// The whole join flow, as one component with four states.
//
//   not configured  -> say so plainly. No button that cannot work.
//   signed out      -> sign in with the college Google account
//   no profile yet  -> the profile form
//   profile done    -> the finished profile, with an edit button
//
// ONE COMPONENT RATHER THAN FOUR ROUTES, because the site is a static export: there is
// no server to decide which page to send, so a /profile route would ship HTML that
// briefly renders the wrong state before the auth check resolves. Keeping it in one
// place means the branch happens once, after we know, and there is no flash.
//
// That is also why `user === undefined` is treated as its own state rather than folded
// into "signed out". Rendering the sign-in card while the session is still being
// restored shows a sign-in prompt to somebody who is already signed in — every time
// they load the page.

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ProfileForm from "@/components/ProfileForm";
import { useAuth } from "@/lib/auth";
import { DOMAIN, isComplete, readProfile, type Profile } from "@/lib/profile";
import {
  HEARD_FROM,
  HOSTELS,
  INTERESTS,
  LEVELS,
  PATHS,
  PROGRAMS,
} from "@/content/join";
import { LINKS } from "@/content/site";

/** Code -> label, for showing a stored profile back to its owner in human words. Built
 *  from the same content arrays the form renders, so a new option cannot appear in the
 *  form and read as a raw code here. */
function labelOf(list: readonly { value: string; label: string }[], v?: string) {
  if (!v) return "—";
  return list.find((x) => x.value === v)?.label ?? v;
}
function labelsOf(list: readonly { value: string; label: string }[], vs?: string[]) {
  if (!vs?.length) return "—";
  return vs.map((v) => labelOf(list, v)).join(", ");
}

export default function JoinGate() {
  const { user, configured, busy, error, signIn, signOut, isAdmin } = useAuth();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [loadError, setLoadError] = useState("");

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
    if (user) void load(user.uid);
    else if (user === null) setProfile(null);
  }, [user, load]);

  // ---------------------------------------------------------------- unconfigured
  if (!configured) {
    return (
      <div className="card rounded-panel bg-raise p-8 sm:p-10">
        <p className="text-display-md font-semibold">Sign-in is not set up here.</p>
        <p className="measure mt-4 text-body text-haze">
          This deployment has no Firebase configuration, so registration is switched off.
          If you are running the site locally, see <code>web/.env.example</code>. If you
          are seeing this on the live site, that is a bug — please tell us.
        </p>
        <a href={`mailto:${LINKS.email}`} className="btn btn-secondary mt-6">
          Email the organisers
        </a>
      </div>
    );
  }

  // ---------------------------------------------------------------- still checking
  if (user === undefined || (user && profile === undefined)) {
    return (
      <div className="card rounded-panel bg-raise p-8 sm:p-10" aria-busy="true">
        <p className="label">One moment</p>
        <p className="mt-3 text-body text-haze">Checking your sign-in…</p>
      </div>
    );
  }

  // ---------------------------------------------------------------- signed out
  if (!user) {
    return (
      <div className="card rounded-panel bg-raise p-8 sm:p-10">
        <p className="chip">Step 1 of 2</p>
        <h2 className="mt-4 font-display text-display-md font-bold tracking-tight">
          Sign in with your college account
        </h2>
        <p className="measure mt-4 text-body text-haze">
          Registration is open to <strong className="text-ink">@{DOMAIN}</strong> accounts
          only. That is the whole check — no fee, no interview, no prior experience. Once
          you are in you fill a profile once, and you never fill this form again.
        </p>

        <button
          type="button"
          onClick={() => void signIn()}
          disabled={busy}
          className="btn btn-primary mt-7 disabled:opacity-60"
        >
          {busy ? "Opening Google…" : "Continue with Google"}
        </button>

        {error && (
          <p className="mt-4 text-[15px] leading-relaxed text-ember" role="alert">
            {error}
          </p>
        )}

        <p className="mt-7 border-t border-seam pt-5 text-[15px] leading-relaxed text-dust">
          We use Google sign-in rather than a password so that nobody can register an
          address they do not own — and so you have no password to invent or lose. We
          never see your password, and we store only what you type into the profile.
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------- profile form
  const complete = isComplete(profile);
  if (!complete || editing) {
    return (
      <div className="card rounded-panel bg-raise p-8 sm:p-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="chip">{editing ? "Editing your profile" : "Step 2 of 2"}</p>
          <div className="flex items-baseline gap-4">
            {/* ALSO HERE, not only on the finished profile. An organiser who has not
                filled in a profile of their own — which is most of them, at least at
                first — would otherwise land on this form with no way to reach the
                dashboard except by typing the URL. Found by signing in as an admin with
                no profile and looking for the link. */}
            {isAdmin && (
              <Link
                href="/admin"
                className="tap font-mono text-label uppercase text-accent underline transition-colors hover:text-ink"
              >
                Dashboard
              </Link>
            )}
            <button
              type="button"
              onClick={() => void signOut()}
              className="tap font-mono text-label uppercase text-haze underline transition-colors hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </div>
        <h2 className="mt-4 font-display text-display-md font-bold tracking-tight">
          {editing ? "Update your details" : "Create your profile"}
        </h2>
        <p className="measure mt-4 text-body text-haze">
          {editing
            ? "Change anything and save. Your name and address stay as they are on your college account."
            : "Fill this once. It is what the organisers see when they are putting build-day pairs and programme cohorts together."}
        </p>

        {loadError && (
          <p className="mt-4 text-[15px] leading-relaxed text-ember" role="alert">
            {loadError}
          </p>
        )}

        {/* useSearchParams inside ProfileForm needs a Suspense boundary, or `next build`
            refuses to prerender this route — at BUILD time rather than at runtime, which
            is the good version of that error. The fallback reserves roughly the form's
            height so the card does not jump when it resolves. */}
        <div className="mt-8">
          <Suspense fallback={<div className="h-[44rem]" aria-hidden />}>
          <ProfileForm
            user={user}
            profile={profile ?? null}
            onSaved={(p) => {
              setProfile(p);
              setEditing(false);
              // Re-read so the rendered profile shows the server's timestamps rather
              // than the local echo the form handed back.
              void load(user.uid);
            }}
          />
          </Suspense>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- done
  const p = profile!;
  const rows: [string, string][] = [
    ["Name", p.name],
    ["College email", p.email],
    ["Year and branch", p.year_branch],
    ["Hostel", labelOf(HOSTELS, p.hostel)],
    ["Experience", labelOf(LEVELS, p.level)],
    ["Route in", PATHS.find((x) => x.id === p.path)?.name ?? p.path],
    ["Programmes", labelsOf(PROGRAMS, p.programs)],
    ...(p.programs_other ? ([["Other programme", p.programs_other]] as [string, string][]) : []),
    ["Interests", labelsOf(INTERESTS, p.interests)],
    ["GitHub", p.github ? `github.com/${p.github}` : "not given"],
    ["Heard about us via", labelOf(HEARD_FROM, p.heard_from)],
    ["Session updates", p.updates ? "yes" : "no"],
  ];

  return (
    <div className="card rounded-panel bg-raise p-8 sm:p-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="chip chip-pop">You&apos;re registered</p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="tap font-mono text-label uppercase text-haze underline transition-colors hover:text-ink"
        >
          Sign out
        </button>
      </div>

      <h2 className="mt-4 font-display text-display-md font-bold tracking-tight">
        You&apos;re in the club.
      </h2>
      <p className="measure mt-4 text-body text-haze">
        Somebody will message you before the next session. There is nothing else to do
        and nothing to prepare — bring a laptop.
      </p>

      <dl className="mt-8 divide-y divide-seam border-y border-seam">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
            <dt className="label">{k}</dt>
            <dd className="text-sm text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="btn btn-secondary"
        >
          Edit my details
        </button>
        {/* Only rendered for an admin, and it is a convenience rather than a gate — the
            dashboard refuses to load data for anybody else because the rules refuse the
            query, not because this link is hidden. */}
        {isAdmin && (
          <Link href="/admin" className="btn btn-primary">
            Open the admin dashboard
          </Link>
        )}
      </div>
    </div>
  );
}
