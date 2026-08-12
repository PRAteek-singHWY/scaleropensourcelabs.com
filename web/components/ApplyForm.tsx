"use client";

// The join form.
//
// Eleven fields, which is a lot, and every one of them is here because it changes what
// somebody does with the application rather than because it would be nice to know.
// The test applied to each: if two people answer differently, do they get a different
// first conversation? Where the answer was no, the field is not here.
//
// FIVE THINGS THIS FORM WILL NOT DO.
//
// 1. No countdown timer. The reference this form's layout came from counts down to a
//    real dated admissions deadline; a club timer that silently resets is a dark
//    pattern, and on a site whose entire argument is "every claim here is checkable"
//    it would be the one self-inflicted wound. The deadline below renders ONLY when
//    a real future date is configured, and disappears once it passes.
//
// 2. No pre-ticked opt-in. Pre-ticked consent is not consent — the same rule the
//    rest of this site applies to publishing a student's face.
//
// 3. No required GitHub field. The site tells beginners repeatedly that they are
//    welcome with no experience; a required GitHub profile would call that a lie at
//    the last possible moment, and it is exactly the person the club most wants who
//    would close the tab.
//
// 4. No silent failure. With no Firebase project configured the form SAYS so instead
//    of pretending to submit. A form that swallows an application is worse than one
//    that admits it is not wired up. This is also the default for every contributor:
//    the repo ships no credentials, so a local checkout gets the honest message rather
//    than writing test entries into the real collection.
//
// 5. No fake validation. `type="email"` and `required` are the browser's, so they
//    work before hydration and behave the way the reader's browser has taught them.
//
// PATH PRESELECTION. Every page's closing action links here with ?path=<id>, so a
// reader who clicked "join the program track" arrives with that already chosen. It
// is a default, not a lock — the whole point of showing four paths is that people
// reclassify themselves while reading, and the field stays editable.

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  HEARD_FROM,
  HOSTELS,
  INTERESTS,
  LEVELS,
  LEVEL_LABEL,
  PATHS,
  PROGRAMS,
  PROGRAM_OTHER,
} from "@/content/join";
import { LINKS } from "@/content/club";
import { APPLICATIONS, getDb, isConfigured } from "@/lib/firebase";
import { celebrate } from "@/components/fx/celebrate";
/** ISO date. Renders only while genuinely in the future. */
const DEADLINE = process.env.NEXT_PUBLIC_COHORT_DEADLINE ?? "";

/** Distinguishes "we gave up waiting" from "Firestore said no", because the two need
 *  different words in front of an applicant. A named class rather than a string match
 *  on the message, so it cannot be confused with a Firebase error that happens to
 *  mention time. */
class TimeoutError extends Error {
  constructor() {
    super("Timed out waiting for the application store");
    this.name = "TimeoutError";
  }
}

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

// bg-sunk, not bg-bg. On the light theme --bg and --raise are both #FFFFFF, so a
// white field on a white card is distinguished only by its 1px border. --sunk is the
// recessed fill and exists for exactly this.
const field =
  // The halo on focus is the same 3px accent ring at 18% that .card wears on
  // hover, so a focused field and a hovered tile are visibly the same system
  // saying the same thing. It rides the `transition` already here — Tailwind's
  // bare `transition` covers box-shadow — and it is additive to the border
  // recolour rather than a replacement for it, so the affordance still survives
  // being flattened by a forced-colours mode.
  "w-full rounded-md border border-seam bg-sunk px-3.5 py-2.5 text-sm text-ink placeholder:text-dust outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_rgb(var(--sky)/0.18)]";

function Fields() {
  const params = useSearchParams();
  // Validated against the real list rather than trusted. A hand-edited
  // ?path=anything would otherwise become the select's value and submit a path
  // that does not exist.
  const requested = params.get("path");
  const preselected = PATHS.some((p) => p.id === requested) ? requested! : "";

  // The programmes group is the only control here that React has to hold state for,
  // and it holds it for two reasons rather than one: to reveal the "which one" field
  // when Other is ticked, and to enforce "at least one" — see the comment on the
  // fieldset for why that cannot be `required`.
  const [programs, setPrograms] = useState<string[]>([]);
  const firstProgram = useRef<HTMLInputElement>(null);

  // setCustomValidity, not an error banner of our own. The browser then refuses the
  // submit and shows the message in its own bubble, anchored on the first checkbox,
  // which is the same behaviour every other required field on this form already has
  // — including the scroll-into-view and the focus that we would otherwise have to
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
          <input id="af-name" name="name" required className={field} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="af-email" className="label mb-2 block">
            Email
          </label>
          <input
            id="af-email"
            name="email"
            type="email"
            required
            className={field}
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>
      </div>

      {/* Year, branch and hostel sit together because they are the same kind of
          question — where on campus you are — and both belong near the top, where
          somebody is still answering things they know off the top of their head.
          GitHub moved to its own row below: it is the one field here that makes people
          hesitate, and it reads better with its reassurance beside it than squeezed
          next to a dropdown. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="af-year" className="label mb-2 block">
            Year and branch
          </label>
          <input
            id="af-year"
            name="year_branch"
            required
            className={field}
            placeholder="1st year, CSE"
          />
        </div>
        <div>
          <label htmlFor="af-hostel" className="label mb-2 block">
            Hostel
          </label>
          {/* Required, and the empty first option is what makes `required` bite: a
              select whose default is already a real hostel can never be "unanswered",
              so the browser would let a wrong-by-default answer through. Disabled so
              it cannot be chosen back once left. See the note in content/join.ts. */}
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
          className={field}
          placeholder="octocat"
          autoComplete="off"
          spellCheck={false}
        />
        <p className="mt-2 text-[15px] leading-relaxed text-dust">
          Leave it blank if you have never used it. That is genuinely fine.
        </p>
      </div>

      {/* Level. A radio group rather than a select, because the three options are the
          form's most important answer and burying them behind a tap is the wrong
          trade. Also: reading the three options is itself reassuring — "never
          contributed" being listed first says the club expects it. */}
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
                /* NOT pre-checked. The first option was, which made `required`
                   decorative and let somebody submit without ever considering the
                   one answer that decides what their first conversation is about.
                   Listing "never contributed" first is the reassurance; ticking it
                   on their behalf is just bad data. */
                className="h-4 w-4 shrink-0 accent-[rgb(var(--accent))]"
              />
              <span className="text-sm text-ink">{l.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Path. A select, because there are four with long names and four more radio
          cards would make this form look twice as long as it is — which costs
          completions on the one page where that matters most. */}
      <div>
        <label htmlFor="af-path" className="label mb-2 block">
          Which path interests you
        </label>
        <select
          id="af-path"
          name="path"
          className={field}
          defaultValue={preselected}
          required
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

      {/* Interests. Checkboxes, because these genuinely are not exclusive and forcing
          one answer would produce worse data than allowing three.
          The whole control is a <label>, so the tap target is the full 44px row
          rather than the 16px box — a tap-target check once flagged the box here and
          was measuring something no finger ever touches. */}
      <fieldset>
        <legend className="label mb-3">
          Areas you are curious about{" "}
          <span className="normal-case tracking-normal text-dust">
            (pick any)
          </span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => (
            <label
              key={i.value}
              className="flex cursor-pointer items-center gap-2.5 rounded-md border border-seam bg-sunk px-3.5 py-2.5 transition hover:border-accent/50"
            >
              <input
                type="checkbox"
                name="interests"
                value={i.value}
                className="h-4 w-4 shrink-0 accent-[rgb(var(--accent))]"
              />
              <span className="text-sm text-ink">{i.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Programmes. REQUIRED, at least one, and the only group on this form where
          the browser has no native check for that: `required` on a checkbox means
          that one box must be ticked, unlike a radio group where it means one of the
          set. So rather than invent a validation banner — point 5 of the header —
          the first box carries a setCustomValidity message and the browser blocks the
          submit itself. See the effect above.

          Ticking Other reveals a required free-text field rather than accepting a
          bare "other", because "other" on its own is the one answer here that tells
          an organiser nothing. */}
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
                // Only the first box needs the ref: the message belongs to the group,
                // and the browser reports it on whichever element carries it.
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

      <div>
        <label htmlFor="af-why" className="label mb-2 block">
          One line on why open source interests you
        </label>
        <textarea
          id="af-why"
          name="why"
          required
          rows={3}
          maxLength={400}
          className={`${field} resize-y`}
          placeholder="Anything honest. &quot;I want a job&quot; is a real answer and we would rather have it than a paragraph you think we want."
        />
      </div>

      <div>
        <label htmlFor="af-heard" className="label mb-2 block">
          How you heard about us
        </label>
        <select id="af-heard" name="heard_from" className={field} defaultValue="">
          <option value="" disabled>
            Pick one
          </option>
          {HEARD_FROM.map((h) => (
            <option key={h.value} value={h.value}>
              {h.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

export default function JoinForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const deadline = deadlineLabel();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;

    if (!isConfigured()) {
      setState("error");
      setMessage(
        "This form is not connected to anything yet, so submitting would send your application nowhere. Email us instead and it will actually reach somebody.",
      );
      return;
    }

    // Read the fields BEFORE the first await. `e.currentTarget` is null by the time an
    // async handler resumes — React pools the event and the form reference is gone —
    // so building FormData after awaiting the Firebase import throws, and it throws in
    // the one code path a test that never submits would not cover.
    const data = new FormData(e.currentTarget);
    setState("sending");

    try {
      const db = await getDb();
      // Belt and braces: isConfigured() already returned true, so this is only
      // reachable if the SDK import itself failed.
      if (!db) throw new Error("Could not reach the application store");

      const { addDoc, collection, serverTimestamp } = await import("firebase/firestore");

      const str = (k: string) => String(data.get(k) ?? "").trim();
      // Field names are the form's own, so the stored document reads the same as the
      // markup. The rules file validates this exact shape — see firestore.rules, and
      // `npm run rules` for the check that keeps the two in agreement.
      const doc: Record<string, unknown> = {
        name: str("name"),
        email: str("email"),
        year_branch: str("year_branch"),
        hostel: str("hostel"),
        level: str("level"),
        path: str("path"),
        why: str("why"),
        interests: data.getAll("interests").map(String),
        // Required and never empty — the browser refused the submit otherwise, and
        // the rules refuse an empty list on the way in as well.
        programs: data.getAll("programs").map(String),
        updates: data.get("updates") !== null,
        // The SERVER's clock. The rules require `submitted_at == request.time`, so a
        // client-supplied Date would be rejected — which is the point: submission
        // order cannot be forged.
        submitted_at: serverTimestamp(),
      };
      // Optional fields are omitted rather than stored empty, matching the
      // present-or-absent shape the rules allow.
      const github = str("github");
      if (github) doc.github = github;
      const heard = str("heard_from");
      if (heard) doc.heard_from = heard;
      // Only present when Other is ticked, because that is the only state in which
      // the input exists to be read. The rules enforce the pairing in both
      // directions, so a hand-rolled SDK call cannot send one without the other.
      const programsOther = str("programs_other");
      if (programsOther) doc.programs_other = programsOther;

      // RACED AGAINST A TIMEOUT, because addDoc does not reject when the backend is
      // unreachable — it queues the write and retries the channel indefinitely. Found
      // by pointing the client at a project that does not exist: six retries went out,
      // the promise never settled, and the button said "Sending…" forever with no
      // message. An applicant would sit there, then leave.
      //
      // 12s is chosen to be longer than a slow-but-working submit on campus wifi and
      // short enough that nobody assumes the page is broken. A rejected permission or
      // a validation failure still arrives fast and takes the catch below.
      await Promise.race([
        addDoc(collection(db, APPLICATIONS), doc),
        new Promise((_, reject) =>
          setTimeout(() => reject(new TimeoutError()), 12_000),
        ),
      ]);
      setState("done");
      // The confetti, and it fires HERE rather than anywhere earlier — after the
      // write has been confirmed, not when the button is pressed. A celebration on
      // submit would fire over a request that is still in flight and might yet fail,
      // which is the one moment on this site where a bit of delight would become a
      // lie.
      //
      // Deliberately not awaited, and the void is the point rather than tidiness:
      // celebrate() dynamically imports canvas-confetti, so it can reject on a slow
      // or blocked network. Awaited, a failed confetti chunk would throw into the
      // catch below and tell somebody whose application HAD been saved that it had
      // not. The success state is already set above and does not depend on it.
      void celebrate();
    } catch (err) {
      setState("error");
      // The raw Firebase message is not shown. "Missing or insufficient permissions"
      // tells an applicant nothing and reads as though they did something wrong; it
      // goes to the console for whoever is debugging instead.
      console.error("[osc] application submit failed", err);
      // The two cases need different words, and the distinction is not pedantry: on a
      // timeout the queued write may still reach Firestore later, so claiming "nothing
      // was saved" could be false and could produce a duplicate if they resubmit.
      setMessage(
        err instanceof TimeoutError
          ? "We could not confirm that went through — it may be our end or the network. Rather than have you send it twice, email us and we'll check:"
          : "That did not go through, and the fault is ours rather than yours. Nothing was saved, so please email us and we'll pick it up:",
      );
    }
  }

  if (state === "done") {
    return (
      <div className="card card-still rounded-tile bg-raise p-7">
        <p className="text-display-md font-semibold">You&apos;re in the queue.</p>
        <p className="measure mt-4 text-body text-haze">
          Somebody will message you before the next session. There is nothing else to
          do and nothing to prepare — bring a laptop.
        </p>
      </div>
    );
  }

  return (
    <div className="card card-still rounded-tile bg-raise shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
      <div className="border-b border-seam px-7 py-5">
        <p className="label">Open to all years, no experience needed</p>
        <p className="mt-2 text-body-lg font-semibold">Join the club</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 px-7 py-6">
        {/* useSearchParams needs a Suspense boundary or the page cannot be
            statically rendered — Next throws at build time rather than at runtime,
            which is the good version of this error. The fallback is a plain height
            reservation so the card does not jump on hydration. */}
        <Suspense fallback={<div className="h-[52rem]" aria-hidden />}>
          <Fields />
        </Suspense>

        <label className="flex cursor-pointer gap-3 pt-1">
          {/* Unticked. Pre-ticked consent is not consent. */}
          <input
            type="checkbox"
            name="updates"
            className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--accent))]"
          />
          <span className="text-[15px] leading-relaxed text-haze">
            Message me about sessions and application deadlines.
          </span>
        </label>

        {deadline && (
          <p className="text-[15px] font-medium text-ember">
            Applications for this cohort close {deadline}.
          </p>
        )}

        <button
          type="submit"
          disabled={state === "sending"}
          className="btn btn-pop w-full disabled:opacity-60"
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

        {/* WHAT HAPPENS TO THE DATA. Added when the form started storing submissions
            instead of posting them nowhere. A form that quietly began keeping names,
            emails and colleges without saying so would be the exact behaviour this
            site criticises elsewhere, and it is the applicant's information, not
            ours. Kept to two sentences and placed where it is read before submitting
            rather than in a policy page nobody opens. */}
        <p className="border-t border-seam pt-5 text-[15px] leading-relaxed text-dust">
          What we do with this: your answers go to the club organisers and nowhere
          else. Nothing here is published on the site — the names on it are only there
          because those people were asked and said yes.
        </p>

        <p className="text-[15px] leading-relaxed text-dust">
          Not ready to apply? Turn up to a build day instead — no signup, no form, and
          nobody will ask whether you have contributed before.
        </p>
      </form>
    </div>
  );
}
