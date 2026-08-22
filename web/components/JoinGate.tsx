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
//
// ---------------------------------------------------------------------------------
// THE DESIGN, AND WHY IT IS THIS AND NOT SOMETHING CLEVERER.
//
// This card used to be a white rectangle with a chip, a heading, a paragraph, a button
// and a grey footnote — a login panel that would fit any SaaS product and shared nothing
// with the rest of the site, which is loud on purpose: electric blue, high-vis yellow,
// black keylines, hard offset shadows, monospace utility type.
//
// Two directions were considered first and rejected on the page's own terms:
//
//   * THE PULL REQUEST. Model joining as a PR against the club's roster — a branch
//     name, a checks list, "sign in to open the PR". It is the most club-native
//     metaphor available and the site already speaks git fluently. It is also
//     precisely wrong here: the headline six inches to the left says "Most people
//     arrive having never opened a pull request." A door that requires you to
//     understand pull requests contradicts the sentence promising you do not need to.
//
//   * THE TERMINAL. `$ osc join --account you@sst.scaler.com`, reusing the terminal
//     block the footer already carries. Rejected because the standing instruction on
//     this site is LESS techy, and /join is the page held up as the calm one. A
//     command prompt where the sign-in button goes is the opposite of that.
//
// What is here instead is two things, one loud and one quiet.
//
//   THE GATE PLATE is the loud one, and it is the only bold object on the card. The
//   single fact that decides whether a reader can join at all — the address must end
//   @sst.scaler.com — was previously the middle clause of a four-line paragraph.
//   It is now a yellow plate with a black keyline, in the same register as the JOIN
//   button in the nav. Black on #FFD600 is 14.9:1, the highest-contrast pair in the
//   palette, which is what licenses using the loudest colour on the site for the one
//   sentence a reader cannot afford to skim. The same plate returns on the finished
//   state carrying their own address, so the object that opens the flow also closes it.
//
//   THE STEP SPINE is the quiet one. It replaces a "Step 1 of 2" chip, which counted
//   the steps without naming them: a reader could see a second step existed but not
//   what it would ask of them, which is the thing that decides whether they start at
//   all. Two steps, named, with the reached ones filled — and it is a real sequence, so
//   the numbering is carrying information rather than decorating.
//
// Everything else is deliberately unchanged and quiet: the card keeps `.card`'s pale
// border and diffuse shadow rather than the black keyline, because this stylesheet's
// own rule is that controls get the hard shadow and content panels do not — "if
// everything wore the hard shadow the page would be a wall of outlines with nothing to
// press". The plate and the button are the two things you can press or must read; they
// are the two things wearing the keyline.

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ProfileForm from "@/components/ProfileForm";
import { useAuth } from "@/lib/auth";
import { DOMAIN, fmtDate, isComplete, readProfile, toDate, type Profile } from "@/lib/profile";
import { HOSTELS, LEVELS, PATHS, PROGRAMS } from "@/content/join";
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

/** The plate's edge: the black keyline, and DELIBERATELY NOT the offset shadow.
 *
 *  Two reasons, and the second is the one that decided it.
 *
 *  `.hard` — this stylesheet's keyline-and-shadow token for panels — carries
 *  `:hover { translate(2px, 2px) }` for the interactive ones, so a plate of text
 *  wearing it moves under the pointer like a button that does nothing when clicked.
 *
 *  But the shadow itself was the real problem. With it, the plate and the
 *  "Continue with Google" button four inches below were the same object: 2px black
 *  keyline, 4px hard offset, on a saturated fill. This stylesheet's rule is that the
 *  hard shadow marks a CONTROL — "controls get a black keyline and an unblurred
 *  shadow, content panels get a pale border and a diffuse one" — so two identical
 *  objects where exactly one is pressable is the ambiguity that rule exists to
 *  prevent. The keyline keeps the plate loud; the shadow now belongs to the button
 *  alone, which is the only thing on the card you can press.
 *
 *  Costs nothing in dark mode: on a #141822 card a black keyline and a black shadow
 *  are both close to invisible, and the yellow fill was already carrying the shape. */
const PLATE = "border-2 border-black";

/** Where you are, in two named steps.
 *
 *  An ordered list because it is one: `aria-current="step"` marks the live entry, so a
 *  screen reader gets the same "1 of 2, and the next one is about your details" the
 *  filled dots give everybody else. The connector is aria-hidden — it is a rule between
 *  two items, not a third item. */
function Steps({ at }: { at: 1 | 2 }) {
  const steps = [
    { n: "01", name: "Sign in" },
    { n: "02", name: "Your details" },
  ] as const;

  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-2" aria-label="Where you are">
      {steps.map((s, i) => {
        const idx = i + 1;
        const done = idx < at;
        const live = idx === at;
        return (
          <li key={s.n} className="flex items-center gap-3">
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className={[
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-[12px] font-bold leading-none",
                  done || live
                    ? "bg-accent text-bg"
                    : // Dashed, not solid: a step you have not reached is not a box that
                      // is empty, it is one that has not been drawn yet.
                      "border border-dashed border-seam text-dust",
                ].join(" ")}
              >
                {done ? "✓" : s.n}
              </span>
              <span
                aria-current={live ? "step" : undefined}
                className={[
                  "font-mono text-label uppercase tracking-wider",
                  live ? "font-bold text-ink" : done ? "text-haze" : "text-dust",
                ].join(" ")}
              >
                {s.name}
              </span>
            </span>
            {/* A CONNECTOR JOINS TWO THINGS, so it has to disappear when they stop being
                side by side — otherwise it is a rule pointing at nothing, which is what
                it was at 320px.
                376px IS MEASURED, NOT PICKED. Sweeping the viewport 320→420 in 4px steps
                with the connector forced visible, the two steps sit on one row from
                376px up and on two rows below it. A round 360 was the first guess and
                was wrong by four steps of the sweep. */}
            {i === 0 && (
              <span aria-hidden className="hidden h-px w-5 bg-seam min-[376px]:block sm:w-8" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function JoinGate() {
  const { user, configured, busy, error, wrongAccount, signIn, signOut, isAdmin } =
    useAuth();
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
      // The spine renders here too, so the card does not reflow when the check
      // resolves into the sign-in state a fraction of a second later.
      <div className="card rounded-panel bg-raise p-8 sm:p-10" aria-busy="true">
        <Steps at={1} />
        <p className="mt-6 text-body text-haze">Checking your sign-in…</p>
      </div>
    );
  }

  // ---------------------------------------------------------------- signed out
  if (!user) {
    return (
      <div className="card rounded-panel bg-raise p-8 sm:p-10">
        <Steps at={1} />

        <h2 className="mt-6 font-display text-display-md font-bold tracking-tight">
          Sign in with your college account
        </h2>

        {/* THE ONE FACT THAT DECIDES EVERYTHING, given the loudest object on the card.
            It was the middle clause of a paragraph before, which is where a reader who
            skims — every reader — loses it, and being refused for the wrong Google
            account is the single most common way this page fails somebody. */}
        <div className={`${PLATE} mt-6 rounded-tile bg-pop px-5 py-4 text-black`}>
          <p className="font-mono text-label uppercase tracking-wider text-black/70">
            Open to
          </p>
          {/* break-all, because the address is the one string here that cannot be
              allowed to push the card wider than its column on a 390px phone. */}
          <p className="mt-1 break-all font-mono text-[1.0625rem] font-bold leading-tight">
            @{DOMAIN}
          </p>
          <p className="mt-2 text-[0.8125rem] leading-snug text-black/80">
            No other address can register. That is the whole check.
          </p>
        </div>

        <p className="measure mt-6 text-body text-haze">
          No fee, no interview, no prior experience. Sign in, fill in your details once,
          and you never fill this form again.
        </p>

        <button
          type="button"
          onClick={() => void signIn()}
          disabled={busy}
          className="btn btn-primary mt-7 disabled:opacity-60"
        >
          {/* The label changes once an attempt has been refused: pressing the same
              "Continue with Google" again reads like it will do the same thing, when in
              fact the chooser now reopens and a different account can be picked. */}
          {busy
            ? "Opening Google…"
            : wrongAccount
              ? "Choose a different account"
              : "Continue with Google"}
        </button>

        {error && (
          <div className="mt-5" role="alert">
            <p className="text-[15px] leading-relaxed text-ember">{error}</p>
            {/* A REFUSAL USED TO BE A DEAD END. Somebody signed into a personal Gmail on
                a shared laptop was told their address was wrong and left looking at the
                same button, with no hint that the fix is to pick another account. The
                button above now says so, and this line names what to look for. */}
            {wrongAccount && (
              <p className="mt-2 text-[15px] leading-relaxed text-dust">
                You signed in as{" "}
                <span className="font-mono text-haze">{wrongAccount}</span>. Press the
                button again and pick your college account from the list — Google will
                ask which one to use.
              </p>
            )}
          </div>
        )}

        {/* NO "NO COLLEGE ACCOUNT?" FALLBACK, and this reverses a judgement I made a
            turn earlier. I added an organisers' email here on the reasoning that a closed
            door should have a bell on it. The club's answer is that the door is the point:
            an @sst.scaler.com address IS the membership test, so somebody without one is
            not a student here, and offering them a way in invites exactly the conversation
            the restriction exists to avoid. The footer carries the organisers' address on
            every page for anyone who genuinely needs to reach the club. */}
        {/* LABELLED, so it can be skipped. The same words as an unlabelled grey block
            read as terms nobody finishes; under a heading that says what they answer,
            the reader who wondered can stop and everybody else can move on. */}
        <div className="mt-8 border-t border-seam pt-5">
          <p className="font-mono text-label uppercase tracking-wider text-dust">
            Why Google, not a password
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-dust">
            So nobody can register an address they do not own, and so you have no password
            to invent or lose. We never see your password. We store only the details you
            type in on the next step.
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- profile form
  const complete = isComplete(profile);
  if (!complete || editing) {
    return (
      <div className="card rounded-panel bg-raise p-8 sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          {/* Editing is not a step in the join — somebody changing their hostel in
              March is not two-thirds of the way into signing up — so the spine is
              replaced by a plain chip in that mode rather than shown at a stage that
              would be a lie. */}
          {editing ? <p className="chip">Editing your details</p> : <Steps at={2} />}
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
        {/* "JOIN THE CLUB", NOT "CREATE YOUR PROFILE". Signing in is not joining — it only
            proves which college you are at. This step is the join, so it says so, and the
            reader is not left wondering what a "profile" is for or whether they are
            already a member. */}
        <h2 className="mt-6 font-display text-display-md font-bold tracking-tight">
          {editing ? "Update your details" : "Join the club"}
        </h2>
        <p className="measure mt-4 text-body text-haze">
          {editing
            ? "Change anything and save. Your name and address stay as they are on your college account."
            : "Fill in these details to finish joining. It takes a minute, you only do it once, and it is what the organisers see when they are putting build-day pairs and programme cohorts together."}
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
  const joined = toDate(p.created_at);
  const rows: [string, string][] = [
    ["Name", p.name],
    ["Year and branch", p.year_branch],
    ["Hostel", labelOf(HOSTELS, p.hostel)],
    ["Experience", labelOf(LEVELS, p.level)],
    ["Route in", PATHS.find((x) => x.id === p.path)?.name ?? p.path],
    ["Programmes", labelsOf(PROGRAMS, p.programs)],
    ...(p.programs_other ? ([["Other programme", p.programs_other]] as [string, string][]) : []),
    ["GitHub", p.github ? `github.com/${p.github}` : "not given"],
  ];

  return (
    <div className="card rounded-panel bg-raise p-8 sm:p-10">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        {/* The ORDINARY blue chip, not `chip-pop`. It was yellow, which put two yellow
            objects in one card — and the plate below is the one that has to carry it.
            Yellow is the loudest colour on this site; spending it twice on one screen
            spends it on nothing. The chip is a transient "that worked", the plate is
            the standing fact, and only one of them needs to be the loud one. */}
        <p className="chip">Details saved</p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="tap font-mono text-label uppercase text-haze underline transition-colors hover:text-ink"
        >
          Sign out
        </button>
      </div>

      {/* NOT "You're in the club." That was the copy here first and it overclaims at
          exactly the wrong moment: filling in a form is not membership, and telling
          somebody they have arrived before they have been to a single session is the kind
          of unearned claim the rest of this site refuses to make. What is true is that
          their details are in and somebody will be in touch — so it says that, and the
          club part happens on a Saturday. */}
      <h2 className="mt-5 font-display text-display-md font-bold tracking-tight">
        That&apos;s you signed up.
      </h2>
      <p className="measure mt-4 text-body text-haze">
        Somebody will message you before the next session. There is nothing else to do
        and nothing to prepare — turn up with a laptop and you are in.
      </p>

      {/* THE GATE PLATE, RETURNED. The same yellow object that carried the domain rule
          on the way in now carries the address it let through, which is what makes the
          two screens one flow rather than two forms.
          "REGISTERED", not "MEMBER" — for the same reason the heading above is not "you
          are in the club". Being on the list is what has happened; the club part happens
          on a Saturday, and the plate does not get to promise it either. */}
      <div className={`${PLATE} mt-7 rounded-tile bg-pop px-5 py-4 text-black`}>
        <p className="font-mono text-label uppercase tracking-wider text-black/70">
          Registered
        </p>
        <p className="mt-1 break-all font-mono text-[1.0625rem] font-bold leading-tight">
          {p.email}
        </p>
        {/* Only when there is a real timestamp. A "signed up —" line is worse than no
            line: it invites the reader to wonder what went wrong with a date. */}
        {joined && (
          <p className="mt-2 font-mono text-[0.8125rem] uppercase tracking-wider text-black/80">
            Signed up {fmtDate(p.created_at)}
          </p>
        )}
      </div>

      {/* The address is on the plate above, so it is not repeated as a row — it was the
          only row in this table that the reader could already see twice on the screen. */}
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
