"use client";

// THE APPLICATION FORM. Anonymous, one-shot, and independent of sign-in.
//
// WHY THIS EXISTS AGAIN. For a while this route WAS the sign-in flow: register with a
// college Google account, then fill a profile. That collapsed two different things into
// one screen and got the order wrong. Applying is how a stranger asks to join; signing
// in is how a member proves who they are. Requiring the second before the first meant
// the club's front door needed the key you get by walking through it — and it
// contradicted the headline six inches to the left, which promises the reader they need
// nothing but a laptop and a GitHub account.
//
// So the two are separate features now:
//
//   /join       this form. No account, no sign-in, no session. Writes one immutable row
//               to applications/{id} and says thank you.
//   /dashboard  sign in, fill a profile, come back to it. See components/SignInCard.tsx.
//
// They deliberately DO NOT share a component. The field lists are nearly identical and
// that is exactly the trap: a shared form would need a prop for "is there a user", and
// every branch behind that prop is a place where an applicant's path and a member's path
// can silently swap. Two forms that never surprise anybody beat one that needs a
// diagram. What they DO share is the option lists in content/join.ts, which is the part
// that actually must not drift — and firestore.rules checks both against them.
//
// FIVE THINGS THIS FORM WILL NOT DO.
//
// 1. No sign-in, ever. See above. If a future change wants the address verified, that is
//    a mail loop or an organiser reading the row — not an auth gate on the one page
//    whose whole argument is that you need nothing to start.
//
// 2. No countdown timer. The reference this layout came from counts down to a real dated
//    admissions deadline; a club timer that silently resets is a dark pattern, and on a
//    site whose entire argument is "every claim here is checkable" it would be the one
//    self-inflicted wound. The deadline below renders ONLY when a real future date is
//    configured, and disappears once it passes.
//
// 3. No required GitHub field. The site tells beginners repeatedly that they are welcome
//    with no experience; a required GitHub profile would call that a lie at the last
//    possible moment, to exactly the person the club most wants.
//
// 4. No silent failure. With no Firebase project configured the form still RENDERS and
//    still VALIDATES, and says so when you press the button rather than pretending to
//    submit. That is the documented promise in web/.env.example, and it is the default
//    for every contributor: the repo ships no credentials, so a local checkout gets an
//    honest message instead of writing test rows into the organisers' real collection.
//    It is also why the unconfigured state is NOT a card that replaces the form — a
//    contributor fixing the copy or the spacing here needs to see the fields.
//
// 5. No hand-rolled validation where the browser's is better. `required`, `type` and
//    `maxLength` work before hydration and behave the way the reader's browser has
//    taught them.
//
// PATH PRESELECTION. Every page's closing action links here with ?path=<id>, so a reader
// who clicked "join the program track" arrives with that already chosen. It is a
// default, not a lock — the whole point of showing four paths is that people reclassify
// themselves while reading, and the field stays editable.

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  HOSTELS,
  LEVEL_LABEL,
  PATHS,
  PROGRAMS,
  PROGRAM_OTHER,
} from "@/content/join";
import { LINKS } from "@/content/site";
import { NotConfiguredError, TimeoutError, submitApplication } from "@/lib/applications";
import { celebrate } from "@/components/fx/celebrate";

/** ISO date. Renders only while genuinely in the future — see point 2 above. */
const DEADLINE = process.env.NEXT_PUBLIC_COHORT_DEADLINE ?? "";

function deadlineLabel(): string | null {
  if (!DEADLINE) return null;
  const d = new Date(DEADLINE);
  if (Number.isNaN(d.getTime()) || d.getTime() < Date.now()) return null;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// One string, applied to every text control, so the form cannot drift field by field.
// Identical to ProfileForm's — the two forms are separate but they are the same system,
// and a field that looked different on the two screens would read as a different site.
//
// bg-sunk, not bg-bg: on the light theme --bg and --raise are both #FFFFFF, so a white
// field on a white card is distinguished only by its 1px border. --sunk is the recessed
// fill and exists for exactly this.
//
// The focus halo is the same 3px accent ring at 18% that `.card` wears on hover, so a
// focused field and a hovered tile are visibly the same system saying the same thing. It
// rides the bare `transition` already here — Tailwind's `transition` covers box-shadow —
// and it is ADDITIVE to the border recolour rather than a replacement, so the affordance
// survives a forced-colours mode that flattens shadows.
const field =
  "w-full rounded-md border border-seam bg-sunk px-3.5 py-2.5 text-sm text-ink placeholder:text-dust outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_rgb(var(--sky)/0.18)]";

/** The fields, split out for one mechanical reason: `useSearchParams` needs a Suspense
 *  boundary or `next build` refuses to prerender this route — at BUILD time rather than
 *  at runtime, which is the good version of that error. */
function Fields() {
  const params = useSearchParams();
  // Validated against the real list rather than trusted. A hand-edited ?path=anything
  // would otherwise become the select's value and submit a path that does not exist,
  // which the rules reject — presenting as a broken form rather than as a bad link.
  const requested = params.get("path");
  const preselected = PATHS.some((p) => p.id === requested) ? requested! : "";

  // The programmes group is the only control here React has to hold state for, and it
  // holds it for two reasons rather than one: to reveal the "which one" field when Other
  // is ticked, and to enforce "at least one" — see the comment on the fieldset.
  const [programs, setPrograms] = useState<string[]>([]);
  const firstProgram = useRef<HTMLInputElement>(null);

  // setCustomValidity rather than a banner of our own. `required` on a checkbox means
  // "this box must be ticked", not "one of this group", so the browser has no native
  // check for "pick at least one" — and rather than invent one, this borrows the
  // browser's, including the scroll-into-view and the focus we would otherwise
  // reimplement badly. Cleared the moment something is ticked, or the form stays
  // permanently unsubmittable.
  useEffect(() => {
    firstProgram.current?.setCustomValidity(
      programs.length === 0
        ? "Pick at least one programme — or Other, and tell us which."
        : "",
    );
  }, [programs]);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="af-name" className="label mb-2 block">
            Name
          </label>
          <input
            id="af-name"
            name="name"
            required
            maxLength={120}
            className={field}
            autoComplete="name"
          />
        </div>
        <div>
          {/* ASKED HERE, UNLIKE ON THE PROFILE FORM, and this is the one field the two
              genuinely differ on. A profile takes the address from the signed-in Google
              account, because letting somebody type it would let them type somebody
              else's. An applicant has no account to take it from, so it is a field —
              and `type="email"` plus the regex in the rules is the whole check. */}
          <label htmlFor="af-email" className="label mb-2 block">
            Email
          </label>
          <input
            id="af-email"
            name="email"
            type="email"
            required
            maxLength={200}
            className={field}
            placeholder="you@sst.scaler.com"
            autoComplete="email"
            spellCheck={false}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="af-year" className="label mb-2 block">
            Year and branch
          </label>
          <input
            id="af-year"
            name="year_branch"
            required
            maxLength={120}
            className={field}
            placeholder="1st year, CSE"
          />
        </div>
        <div>
          <label htmlFor="af-hostel" className="label mb-2 block">
            Hostel
          </label>
          {/* The empty first option is what makes `required` bite: a select whose default
              is already a real hostel can never be "unanswered", so the browser would let
              a wrong-by-default answer through. */}
          <select id="af-hostel" name="hostel" required className={field} defaultValue="">
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
      </div>

      <div>
        <label htmlFor="af-github" className="label mb-2 block">
          GitHub{" "}
          <span className="normal-case tracking-normal text-dust">(optional)</span>
        </label>
        <input
          id="af-github"
          name="github"
          maxLength={100}
          className={field}
          placeholder="octocat"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <fieldset>
        <legend className="label mb-3">Where you are right now</legend>
        <div className="space-y-2">
          {/* UPSTREAM REPLACED THE `LEVELS` ARRAY WITH `LEVEL_LABEL`, a Record keyed by the
              stored value. Object.entries gives back the same [value, label] pairs the
              array used to hold, so the markup below is unchanged apart from the names. */}
          {Object.entries(LEVEL_LABEL).map(([value, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-3 rounded-md border border-seam bg-sunk px-3.5 py-3 transition hover:border-accent/50"
            >
              {/* NOT pre-checked. A pre-checked first option makes `required` toothless
                  and turns "never contributed" into an answer nobody actually gave. */}
              <input
                type="radio"
                name="level"
                value={value}
                required
                className="h-4 w-4 shrink-0 accent-[rgb(var(--accent))]"
              />
              <span className="text-sm text-ink">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="af-path" className="label mb-2 block">
          Which path interests you
        </label>
        <select
          id="af-path"
          name="path"
          required
          className={field}
          defaultValue={preselected}
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
        {/* Ticking Other reveals a REQUIRED free-text field rather than accepting a bare
            "other" — an unqualified "other" is the one answer that would change nobody's
            first conversation, which is the test every field here has to pass. */}
        {programs.includes(PROGRAM_OTHER) && (
          <div className="mt-3">
            <label htmlFor="af-programs-other" className="label mb-2 block">
              Which programme
            </label>
            <input
              id="af-programs-other"
              name="programs_other"
              required
              maxLength={120}
              className={field}
              placeholder="The name of it, or a link"
            />
          </div>
        )}
      </fieldset>
    </>
  );
}

export default function ApplyForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const deadline = deadlineLabel();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;

    // Read the fields BEFORE the first await. `e.currentTarget` is null by the time an
    // async handler resumes, so building FormData afterwards throws — in the one code
    // path a test that never submits would not cover.
    const data = new FormData(e.currentTarget);
    setState("sending");
    setMessage("");

    const str = (k: string) => String(data.get(k) ?? "").trim();

    try {
      await submitApplication({
        name: str("name"),
        email: str("email"),
        year_branch: str("year_branch"),
        hostel: str("hostel"),
        level: str("level"),
        path: str("path"),
        // Required and never empty — the browser refused the submit otherwise, and the
        // rules refuse an empty list on the way in as well.
        programs: data.getAll("programs").map(String),
        programs_other: str("programs_other"),
        github: str("github"),
      });

      setState("done");
      // The confetti, and it fires HERE rather than anywhere earlier — after the write
      // has been confirmed, not when the button is pressed. A celebration over a request
      // that is still in flight and might yet fail is the one moment on this site where
      // a bit of delight would become a lie.
      //
      // Deliberately not awaited, and the void is the point rather than tidiness:
      // celebrate() dynamically imports canvas-confetti, so it can reject on a slow or
      // blocked network. Awaited, a failed confetti chunk would throw into the catch
      // below and tell somebody whose application HAD been saved that it had not.
      void celebrate();
    } catch (err) {
      setState("error");
      // The raw Firebase message is never shown. "Missing or insufficient permissions"
      // tells an applicant nothing and reads as though they did something wrong; it goes
      // to the console for whoever is debugging instead.
      console.error("[osc] application submit failed", err);
      // THREE CASES, THREE DIFFERENT SENTENCES, and the distinctions are not pedantry.
      // On a timeout the queued write may still reach Firestore later, so claiming
      // "nothing was saved" could be false and could produce a duplicate if they
      // resubmit. And an unconfigured deployment is not a failure of theirs or of the
      // network — telling them to try again would be telling them to fail again.
      setMessage(
        err instanceof NotConfiguredError
          ? "This form is not connected to anything yet, so submitting would send your application nowhere. Email us instead and it will actually reach somebody:"
          : err instanceof TimeoutError
            ? "We could not confirm that went through — it may be our end or the network. Rather than have you send it twice, email us and we'll check:"
            : "That did not go through, and the fault is ours rather than yours. Nothing was saved, so please email us and we'll pick it up:",
      );
    }
  }

  if (state === "done") {
    return (
      <div className="card rounded-panel bg-raise p-8 sm:p-10">
        <p className="chip">Application received</p>
        <h2 className="mt-4 font-display text-display-md font-bold tracking-tight">
          You&apos;re in the queue.
        </h2>
        <p className="measure mt-4 text-body text-haze">
          Somebody will message you before the next session. There is nothing else to do
          and nothing to prepare — bring a laptop.
        </p>
      </div>
    );
  }

  return (
    <div className="card rounded-panel bg-raise p-8 sm:p-10">
      <p className="label">Open to all years, no experience needed</p>
      <h2 className="mt-4 font-display text-display-md font-bold tracking-tight">
        Apply to join
      </h2>
      {/* NAMES THE ABSENT STEPS, because the reader's question at a form is not "what do
          I fill in" but "what happens after I do". No account to make and no interview is
          the unusual half, and it is the half that decides whether somebody starts. */}
      <p className="measure mt-4 text-body text-haze">
        One form, about a minute. No account to make, no interview, and nothing to
        prepare — the organisers read it and message you before the next session.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        {/* The fallback is a plain height reservation so the card does not jump on
            hydration — see the note on Fields for why the boundary is mandatory. */}
        <Suspense fallback={<div className="h-[46rem]" aria-hidden />}>
          <Fields />
        </Suspense>

        {deadline && (
          <p className="text-[15px] font-medium text-ember">
            Applications for this cohort close {deadline}.
          </p>
        )}

        <button
          type="submit"
          disabled={state === "sending"}
          className="btn btn-primary w-full disabled:opacity-60"
        >
          {state === "sending" ? "Sending…" : "Apply to join"}
        </button>

        {state === "error" && (
          <p className="text-[15px] leading-relaxed text-ember" role="alert">
            {message}{" "}
            <a href={`mailto:${LINKS.email}`} className="underline">
              {LINKS.email}
            </a>
          </p>
        )}

        {/* WHAT HAPPENS TO THE DATA, placed where it is read before submitting rather
            than in a policy page nobody opens. A form that quietly began keeping names,
            emails and hostels without saying so would be the exact behaviour this site
            criticises elsewhere, and it is the applicant's information, not ours. */}
        <p className="border-t border-seam pt-5 text-[15px] leading-relaxed text-dust">
          What we do with this: your answers go to the club organisers and nowhere else.
          Nothing here is published on the site — the names on it are only there because
          those people were asked and said yes.
        </p>

        <p className="text-[15px] leading-relaxed text-dust">
          Not ready to apply? Turn up to a build day instead — no signup, no form, and
          nobody will ask whether you have contributed before.
        </p>
      </form>
    </div>
  );
}
