"use client";

// THE PROFILE. This replaces the anonymous application form rather than sitting beside
// it — same questions, same markup, same field styling, but written to users/{uid} and
// editable afterwards instead of being fired once into a collection nobody can read.
//
// What changed from the form it replaces, and why:
//
//   * EMAIL IS NOT A FIELD. It comes from the signed-in Google account and is shown
//     read-only. Letting somebody type it would let them type somebody else's, and the
//     rules pin the stored value to the token anyway — so an editable box could only
//     ever produce a save that fails.
//   * NAME IS PREFILLED from the Google profile, and stays editable. "Prateek Singh" as
//     Google has it is right more often than not, and the ones it gets wrong are
//     exactly the people who want to fix it.
//   * IT LOADS AND SAVES REPEATEDLY, so every default has to come from the stored
//     profile. A form that forgets what you told it last week is not a profile.
//
// FIVE THINGS THIS FORM WILL NOT DO, carried over from the anonymous form it replaces:
//
//   1. No countdown timer. A club timer that silently resets is a dark pattern, and on a
//      site whose whole argument is "every claim here is checkable" it would be the one
//      self-inflicted wound.
//   2. No opt-in tick at all any more. It asked for consent to send messages the club
//      sends regardless, and says it sends on the very next screen — so it was a decision
//      with only one sensible answer, which is a decision not worth asking for.
//   3. No required GitHub field. The site tells beginners repeatedly that they are welcome
//      with no experience; a required GitHub profile would call that a lie at the last
//      possible moment, to exactly the person the club most wants.
//   4. No silent failure. If the save is refused it says so and offers the email address,
//      rather than pretending to have worked.
//   5. No hand-rolled validation where the browser's is better. `required`, `type`, and
//      `maxLength` work before hydration and behave the way the reader's browser has
//      taught them.

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { User } from "firebase/auth";
import {
  HOSTELS,
  LEVELS,
  LEVEL_LABEL,
  PATHS,
  PROGRAMS,
  PROGRAM_OTHER,
} from "@/content/join";
import { saveProfile, type Profile } from "@/lib/profile";
import { LINKS } from "@/content/site";

// One string, applied to every text control, so the form cannot drift field by field.
//
// The focus halo is the same 3px accent ring at 18% that `.card` wears on hover, so a
// focused field and a hovered tile are visibly the same system saying the same thing. It
// rides the bare `transition` already here — Tailwind's `transition` covers box-shadow —
// and it is ADDITIVE to the border recolour rather than a replacement, so the affordance
// survives a forced-colours mode that flattens shadows.
const field =
  "w-full rounded-md border border-seam bg-sunk px-3.5 py-2.5 text-sm text-ink placeholder:text-dust outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_rgb(var(--sky)/0.18)]";

export default function ProfileForm({
  user,
  profile,
  onSaved,
}: {
  user: User;
  /** null on a first visit; the stored profile when editing. */
  profile: Profile | null;
  onSaved: (p: Profile) => void;
}) {
  const isFirstSave = profile === null;

  // PATH PRESELECTION SURVIVES SIGN-IN, and this is a regression fix rather than a new
  // feature. Every page's closing action links here as /join?path=<id>, so a reader who
  // clicked "join the program track" should arrive with that chosen. Adding a sign-in step
  // in front of the form silently broke that: the gate does not navigate — signInWithPopup
  // keeps the URL, query string and all — so the parameter is still there when this form
  // finally renders, and all that was missing was reading it.
  //
  // It is a DEFAULT, not a lock, and only for a first save: an existing profile's stored
  // path always wins, or coming back through an old link would quietly rewrite what
  // somebody chose.
  //
  // Validated against the real list rather than trusted. A hand-edited ?path=anything
  // would otherwise become the select's value and save a path that does not exist —
  // which the rules would reject, presenting as a broken form.
  const params = useSearchParams();
  const requested = params.get("path");
  const preselectedPath = PATHS.some((p) => p.id === requested) ? requested! : "";

  const [programs, setPrograms] = useState<string[]>(profile?.programs ?? []);
  const firstProgram = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  // setCustomValidity rather than a banner of our own. `required` on a checkbox means
  // "this box must be ticked", not "one of this group", so the browser has no native check
  // for "pick at least one" — and rather than invent one, this borrows the browser's,
  // including the scroll-into-view and the focus we would otherwise reimplement badly.
  // Cleared the moment something is ticked, or the form stays permanently unsubmittable.
  useEffect(() => {
    firstProgram.current?.setCustomValidity(
      programs.length === 0
        ? "Pick at least one programme — or Other, and tell us which."
        : "",
    );
  }, [programs]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "saving") return;

    // Read the fields BEFORE the first await. `e.currentTarget` is null by the time an
    // async handler resumes, so building FormData afterwards throws — in the one code
    // path a test that never submits would not cover.
    const data = new FormData(e.currentTarget);
    setState("saving");
    setMessage("");

    const str = (k: string) => String(data.get(k) ?? "").trim();

    try {
      const body = {
        name: str("name"),
        year_branch: str("year_branch"),
        hostel: str("hostel"),
        level: str("level"),
        path: str("path"),
        programs: data.getAll("programs").map(String),
        programs_other: str("programs_other"),
        github: str("github"),
      };

      await saveProfile(user.uid, user.email!, body, isFirstSave);

      onSaved({
        ...body,
        uid: user.uid,
        email: user.email!,
        // Local echo so the finished profile renders immediately. The authoritative
        // values are the server timestamps, which the next read returns.
        created_at: profile?.created_at,
      } as Profile);
    } catch (err) {
      setState("error");
      // The raw Firebase message is not shown. "Missing or insufficient permissions"
      // reads as though the member did something wrong, when it almost always means a
      // closed-set value drifted between content/join.ts and firestore.rules.
      console.error("[osc] profile save failed", err);
      setMessage(
        "That did not save. The fault is ours rather than yours — nothing was lost, so please try again, or email us:",
      );
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Who you are signed in as. Shown rather than assumed: this is the address the
          club will use to contact them and the one their membership hangs on, so seeing
          it here is how somebody notices they signed in with the wrong account. */}
      <div className="rounded-md border border-seam bg-sunk px-3.5 py-3">
        <p className="label mb-1">Signed in as</p>
        <p className="font-mono text-sm text-ink">{user.email}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pf-name" className="label mb-2 block">
            Name
          </label>
          <input
            id="pf-name"
            name="name"
            required
            maxLength={120}
            className={field}
            autoComplete="name"
            defaultValue={profile?.name ?? user.displayName ?? ""}
          />
        </div>
        <div>
          <label htmlFor="pf-year" className="label mb-2 block">
            Year and branch
          </label>
          <input
            id="pf-year"
            name="year_branch"
            required
            maxLength={120}
            className={field}
            placeholder="1st year, CSE"
            defaultValue={profile?.year_branch ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pf-hostel" className="label mb-2 block">
            Hostel
          </label>
          {/* The empty first option is what makes `required` bite: a select whose
              default is already a real hostel can never be "unanswered", so the browser
              would let a wrong-by-default answer through. */}
          <select
            id="pf-hostel"
            name="hostel"
            required
            className={field}
            defaultValue={profile?.hostel ?? ""}
          >
            <option value="" disabled>
              Select your hostel
            </option>
            {HOSTELS.map((h) => (
              <option key={h.value} value={h.value}>
                {h.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pf-github" className="label mb-2 block">
            GitHub{" "}
            <span className="normal-case tracking-normal text-dust">(optional)</span>
          </label>
          <input
            id="pf-github"
            name="github"
            maxLength={100}
            className={field}
            placeholder="octocat"
            autoComplete="off"
            spellCheck={false}
            defaultValue={profile?.github ?? ""}
          />
        </div>
      </div>

      <fieldset>
        <legend className="label mb-3">Where you are right now</legend>
        <div className="space-y-2">
          {LEVELS.map((l) => (
            <label
              key={l.value}
              className="flex cursor-pointer items-center gap-3 rounded-md border border-seam bg-sunk px-3.5 py-3 transition hover:border-accent/50"
            >
              <input
                type="radio"
                name="level"
                value={l.value}
                required
                defaultChecked={profile?.level === l.value}
                className="h-4 w-4 shrink-0 accent-[rgb(var(--accent))]"
              />
              <span className="text-sm text-ink">{l.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="pf-path" className="label mb-2 block">
          Which path interests you
        </label>
        <select
          id="pf-path"
          name="path"
          required
          className={field}
          defaultValue={profile?.path ?? preselectedPath}
        >
          <option value="" disabled>
            Pick one — you can change your mind later
          </option>
          {(["beginner", "intermediate"] as const).map((level) => (
            <optgroup key={level} label={LEVEL_LABEL[level]}>
              {PATHS.filter((p) => p.level === level).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="label mb-3">
          Open source programs you are interested in{" "}
          <span className="normal-case tracking-normal text-dust">
            (pick at least one)
          </span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {PROGRAMS.map((p, i) => (
            <label
              key={p.value}
              className="flex cursor-pointer items-center gap-2.5 rounded-md border border-seam bg-sunk px-3.5 py-2.5 transition hover:border-accent/50"
            >
              <input
                // Only the first box needs the ref: the message belongs to the group and
                // the browser reports it on whichever element carries it.
                ref={i === 0 ? firstProgram : undefined}
                type="checkbox"
                name="programs"
                value={p.value}
                checked={programs.includes(p.value)}
                onChange={(e) =>
                  setPrograms((current) =>
                    e.target.checked
                      ? [...current, p.value]
                      : current.filter((v) => v !== p.value),
                  )
                }
                className="h-4 w-4 shrink-0 accent-[rgb(var(--accent))]"
              />
              <span className="text-sm text-ink">{p.label}</span>
            </label>
          ))}
        </div>
        {programs.includes(PROGRAM_OTHER) && (
          <div className="mt-3">
            <label htmlFor="pf-programs-other" className="label mb-2 block">
              Which programme
            </label>
            <input
              id="pf-programs-other"
              name="programs_other"
              required
              maxLength={120}
              className={field}
              placeholder="The name of it, or a link"
              defaultValue={profile?.programs_other ?? ""}
            />
          </div>
        )}
      </fieldset>

      <button
        type="submit"
        disabled={state === "saving"}
        className="btn btn-primary w-full disabled:opacity-60"
      >
        {/* "Finish joining", not "Create my profile" and not "Join the club". The first
            described a mechanism nobody cares about; the second would repeat the heading
            two inches above it, and a button that echoes its own heading reads as a
            placeholder. This names the outcome, and it matches the sentence above the
            fields — "fill in these details to finish joining". */}
        {state === "saving"
          ? "Saving…"
          : isFirstSave
            ? "Finish joining"
            : "Save changes"}
      </button>

      {state === "error" && (
        <p className="text-[15px] leading-relaxed text-ember" role="alert">
          {message}{" "}
          <a href={`mailto:${LINKS.email}`} className="underline">
            {LINKS.email}
          </a>
        </p>
      )}

      {/* What happens to the data, next to the button rather than in a policy page
          nobody opens. It is the member's information, not ours. */}
      <p className="border-t border-seam pt-5 text-[15px] leading-relaxed text-dust">
        Your details are visible to you and to the club organisers, and to nobody else.
        Nothing here is published on this site — the names on it are only there because those
        people were asked and said yes. You can edit or correct any of this at any time.
      </p>
    </form>
  );
}
