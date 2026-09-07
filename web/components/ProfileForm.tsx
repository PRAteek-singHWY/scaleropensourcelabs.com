"use client";

// THE PROFILE. Three questions, asked once, editable afterwards.
//
// It began as a copy of the old anonymous application form and has been cut in half twice.
// What decided each cut was the same test: does the answer change anybody's behaviour, and
// could we have got it without asking?
//
//   * EMAIL IS NOT A FIELD. It comes from the signed-in Google account and is shown
//     read-only. Letting somebody type it would let them type somebody else's, and the
//     rules pin the stored value to the token anyway — so an editable box could only
//     ever produce a save that fails.
//   * NEITHER IS YEAR, BRANCH OR ROLL. They are in the address. `abhinav.23bcs10045@…`
//     is batch 2023–27, branch BCS, roll 10045, and lib/batch.ts reads them out on
//     demand. This used to be one free-text box ("1st year, CSE") that the organisers'
//     dashboard then had to guess at with two regexes. The panel at the top of this form
//     shows what was derived, so a member can see it is right rather than trust it.
//   * NAME IS PREFILLED from the Google profile, and stays editable. "Prateek Singh" as
//     Google has it is right more often than not, and the ones it gets wrong are
//     exactly the people who want to fix it.
//   * IT LOADS AND SAVES REPEATEDLY, so every default has to come from the stored
//     profile. A form that forgets what you told it last week is not a profile.
//
// WHAT IS LEFT IS THREE INPUTS: name, GitHub, hostel. Hostel is the one that looks like it
// could go and cannot — build days and evening sessions are planned around which building
// people have to walk back to, and nothing in the address says which.
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

import { useState } from "react";
import type { User } from "firebase/auth";
import { HOSTELS, PATHS } from "@/content/join";
import { batchFromEmail } from "@/lib/batch";
import { saveProfile, type Profile } from "@/lib/profile";
import { LINKS } from "@/content/site";

// One string, applied to every text control, so the form cannot drift field by field.
//
// IT IS DELIBERATELY BIGGER THAN A FORM FIELD. 3.25rem tall and 17px type, against the
// 2.5rem and 14px it was. A stack of small grey inputs is what a form looks like, and
// this screen is not really a form — it is the one page where somebody joins the club,
// asked three questions, once. Controls sized like the buttons around them read as an
// application; controls sized like a spreadsheet read as data entry.
//
// The focus halo is the same 3px accent ring at 18% that `.card` wears on hover, so a
// focused field and a hovered tile are visibly the same system saying the same thing. It
// rides the bare `transition` already here — Tailwind's `transition` covers box-shadow —
// and it is ADDITIVE to the border recolour rather than a replacement, so the affordance
// survives a forced-colours mode that flattens shadows.
const field =
  "w-full rounded-tile border border-seam bg-sunk min-h-[44px] px-4 py-3.5 text-body text-ink placeholder:text-dust outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_rgb(var(--sky)/0.18)]";

/** A field's label. Sentence case at body size rather than the uppercase mono `.label`
 *  token, which is a data label — right above a table column, wrong above something a
 *  person is about to type their own name into. */
const legend = "mb-2.5 block text-sm font-semibold text-ink";

export default function ProfileForm({
  user,
  profile,
  /** The `?path=` a reader arrived with, already validated against PATHS by the caller.
   *
   *  NOT A FORM FIELD, and that is the point. Every closing action on the site links to
   *  /join?path=<id>, so a reader who pressed "join the program track" has answered this
   *  question already; asking it again on the next screen is the site forgetting what it
   *  was just told. It rides through sign-in and the redirect to /onboarding in the query
   *  string, is saved silently, and is shown back on the dashboard where it can be
   *  changed or cleared.
   *
   *  An existing profile's stored value always wins, or coming back through an old link
   *  would quietly rewrite what somebody chose. */
  path = "",
  onSaved,
}: {
  user: User;
  /** null on a first visit; the stored profile when editing. */
  profile: Profile | null;
  path?: string;
  onSaved: (p: Profile) => void;
}) {
  const isFirstSave = profile === null;
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  const batch = batchFromEmail(user.email);
  const effectivePath = profile?.path ?? path;

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
        hostel: str("hostel"),
        github: str("github"),
        path: effectivePath,
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
    <form onSubmit={onSubmit} className="space-y-8">
      {/* WHO WE THINK YOU ARE, shown rather than assumed. This is the address the club
          will use to contact them and the one their membership hangs on, so seeing it
          here is how somebody notices they signed in with the wrong account.
          The chips underneath are the derived half, and they are displayed for a specific
          reason: a value read out of somebody's address without telling them is the kind
          of quiet inference that feels like surveillance when they find out. Showing it
          makes it checkable, and makes a parse failure visible to the one person who can
          tell us the address is unusual.
          AN IDENTITY PANEL, NOT A GREY BOX. It was a `bg-sunk` rectangle with two lines of
          small mono in it, which is how a form displays a value it could not make
          editable. The accent hairline and the initial disc make it the same object as
          the account chip in the header above — one idea, in two places. */}
      <div className="rounded-panel border border-edge bg-sunk p-5">
        <div className="flex items-center gap-3.5">
          <span
            aria-hidden
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent font-display text-lg font-bold text-bg"
          >
            {(user.displayName || user.email || "·").trim()[0]?.toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="label">Signed in as</p>
            <p className="mt-0.5 break-all font-mono text-sm text-ink">{user.email}</p>
          </div>
        </div>

        {batch ? (
          <>
            {/* Four facts, four objects. As one run-on mono line it read as a debug
                string; as chips it reads as a record of who you are, which is what it
                is. */}
            <ul className="mt-4 flex flex-wrap gap-2">
              {[batch.label, batch.branch, batch.yearLabel, `Roll ${batch.roll}`].map((v) => (
                <li
                  key={v}
                  className="rounded-full border border-seam bg-raise px-3 py-1 font-mono text-sm text-haze"
                >
                  {v}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-dust">
              Read from your college address, so we do not have to ask. Wrong? Tell an
              organiser — nobody can edit it here, and nothing depends on it.
            </p>
          </>
        ) : (
          // NOT AN ERROR, AND NOT SILENT. Organisers and anybody on an older address land
          // here. Saying so is better than showing nothing, because the alternative is a
          // member wondering later why their batch is blank on the dashboard.
          <p className="mt-4 text-sm leading-relaxed text-dust">
            We could not read a batch from this address, which is fine — nothing depends
            on it.
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="pf-name" className={legend}>
            What should we call you?
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
          <label htmlFor="pf-github" className={legend}>
            GitHub{" "}
            <span className="font-normal text-dust">— if you have one</span>
          </label>
          {/* A `@` sitting in the field rather than a placeholder saying "octocat".
              The placeholder was doing two jobs badly: naming the format and standing in
              for a label. The prefix names the format permanently and survives the
              first keystroke. */}
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-body text-dust"
            >
              @
            </span>
            <input
              id="pf-github"
              name="github"
              maxLength={100}
              className={`${field} pl-9 font-mono`}
              placeholder="octocat"
              autoComplete="off"
              spellCheck={false}
              defaultValue={profile?.github ?? ""}
            />
          </div>
        </div>
      </div>

      {/* TWO TILES, NOT A DROPDOWN. There are exactly two hostels and there always will
          be until a third building exists, so a <select> was hiding a two-way choice
          behind a tap and a scrolling list — the single most form-like control on the
          screen, spent on the question with the fewest possible answers.
          Still radios underneath, so `required` bites, arrow keys work, and a screen
          reader gets "1 of 2" rather than a pile of clickable divs. */}
      <fieldset>
        <legend className={legend}>Which hostel are you in?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {HOSTELS.map((h, i) => (
            <label
              key={h.value}
              className="flex cursor-pointer items-center gap-3 rounded-tile border border-seam bg-sunk min-h-[44px] px-4 py-3.5 transition hover:border-accent/50 has-[:checked]:border-accent has-[:checked]:bg-raise"
            >
              <input
                // The id stays on the first radio: it is what the smoke test looks for
                // when asserting the form is not rendered to a signed-out reader.
                id={i === 0 ? "pf-hostel" : undefined}
                type="radio"
                name="hostel"
                value={h.value}
                required
                defaultChecked={profile?.hostel === h.value}
                className="h-4 w-4 shrink-0 accent-[rgb(var(--accent))]"
              />
              <span className="text-body text-ink">{h.label}</span>
            </label>
          ))}
        </div>
        <p className="mt-2.5 text-sm leading-relaxed text-dust">
          Build days and evening sessions get planned around which building people have to
          walk back to. That is the only thing this is used for.
        </p>
      </fieldset>

      {/* The carried-in path, stated rather than hidden. It is not an input — there is
          nothing to decide here — but a value being saved that the member cannot see is
          the thing this line exists to avoid. It is changeable on the dashboard. */}
      {effectivePath && (
        <p className="rounded-tile border border-dashed border-seam px-4 py-3 text-sm leading-relaxed text-dust">
          You arrived from{" "}
          <strong className="font-semibold text-haze">
            {PATHS.find((p) => p.id === effectivePath)?.name ?? effectivePath}
          </strong>
          , so that is recorded as how you found us. You can change it later.
        </p>
      )}

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
        <p className="text-sm leading-relaxed text-ember" role="alert">
          {message}{" "}
          <a href={`mailto:${LINKS.email}`} className="underline">
            {LINKS.email}
          </a>
        </p>
      )}

      {/* What happens to the data, next to the button rather than in a policy page
          nobody opens. It is the member's information, not ours. */}
      <p className="border-t border-seam pt-5 text-sm leading-relaxed text-dust">
        Your details are visible to you and to the club organisers, and to nobody else.
        Nothing here is published on this site — the names on it are only there because those
        people were asked and said yes. You can edit or correct any of this at any time.
      </p>
    </form>
  );
}
