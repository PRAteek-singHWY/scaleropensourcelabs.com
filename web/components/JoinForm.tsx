"use client";

// The join form.
//
// Nine fields, which is a lot, and every one of them is here because it changes what
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
// 4. No silent failure. There is no backend — the site is static — so with no
//    endpoint configured the form SAYS so instead of pretending to submit. A form
//    that swallows an application is worse than one that admits it is not wired up.
//
// 5. No fake validation. `type="email"` and `required` are the browser's, so they
//    work before hydration and behave the way the reader's browser has taught them.
//
// PATH PRESELECTION. Every page's closing action links here with ?path=<id>, so a
// reader who clicked "join the program track" arrives with that already chosen. It
// is a default, not a lock — the whole point of showing four paths is that people
// reclassify themselves while reading, and the field stays editable.

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { HEARD_FROM, INTERESTS, LEVELS, LEVEL_LABEL, PATHS } from "@/content/join";
import { LINKS } from "@/content/site";

const ENDPOINT = process.env.NEXT_PUBLIC_APPLY_ENDPOINT ?? "";
/** ISO date. Renders only while genuinely in the future. */
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

// bg-sunk, not bg-bg. On the light theme --bg and --raise are both #FFFFFF, so a
// white field on a white card is distinguished only by its 1px border. --sunk is the
// recessed fill and exists for exactly this.
const field =
  "w-full rounded-md border border-seam bg-sunk px-3.5 py-2.5 text-sm text-ink placeholder:text-dust outline-none transition focus:border-accent";

function Fields() {
  const params = useSearchParams();
  // Validated against the real list rather than trusted. A hand-edited
  // ?path=anything would otherwise become the select's value and submit a path
  // that does not exist.
  const requested = params.get("path");
  const preselected = PATHS.some((p) => p.id === requested) ? requested! : "";

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="jf-name" className="label mb-2 block">
            Name
          </label>
          <input id="jf-name" name="name" required className={field} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="jf-email" className="label mb-2 block">
            Email
          </label>
          <input
            id="jf-email"
            name="email"
            type="email"
            required
            className={field}
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="jf-year" className="label mb-2 block">
            Year and branch
          </label>
          <input
            id="jf-year"
            name="year_branch"
            required
            className={field}
            placeholder="1st year, CSE"
          />
        </div>
        <div>
          <label htmlFor="jf-github" className="label mb-2 block">
            GitHub{" "}
            <span className="normal-case tracking-normal text-dust">(optional)</span>
          </label>
          <input
            id="jf-github"
            name="github"
            className={field}
            placeholder="octocat"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="mt-2 text-[13px] leading-relaxed text-dust">
            Leave it blank if you have never used it. That is genuinely fine.
          </p>
        </div>
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
        <label htmlFor="jf-path" className="label mb-2 block">
          Which path interests you
        </label>
        <select
          id="jf-path"
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

      <div>
        <label htmlFor="jf-why" className="label mb-2 block">
          One line on why open source interests you
        </label>
        <textarea
          id="jf-why"
          name="why"
          required
          rows={3}
          maxLength={400}
          className={`${field} resize-y`}
          placeholder="Anything honest. &quot;I want a job&quot; is a real answer and we would rather have it than a paragraph you think we want."
        />
      </div>

      <div>
        <label htmlFor="jf-heard" className="label mb-2 block">
          How you heard about us
        </label>
        <select id="jf-heard" name="heard_from" className={field} defaultValue="">
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

    if (!ENDPOINT) {
      setState("error");
      setMessage(
        "This form has no endpoint configured yet, so submitting would send your application nowhere. Email us instead and it will actually reach somebody.",
      );
      return;
    }

    setState("sending");
    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Submit failed (${res.status})`);
      setState("done");
    } catch (err) {
      setState("error");
      setMessage(
        err instanceof Error
          ? `${err.message}. Email us instead and we'll pick it up.`
          : "Something went wrong. Email us instead.",
      );
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-panel border border-seam bg-raise p-8 sm:p-10">
        <p className="text-display-md font-semibold">You&apos;re in the queue.</p>
        <p className="measure mt-4 text-body text-haze">
          Somebody will message you before the next session. There is nothing else to
          do and nothing to prepare — bring a laptop.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-panel border border-seam bg-raise shadow-[0_13px_27px_-5px_rgba(50,50,93,0.18),0_8px_16px_-8px_rgba(0,0,0,0.25)]">
      <div className="border-b border-seam px-7 py-5 sm:px-9">
        <p className="label">Open to all years, no experience needed</p>
        <p className="mt-2 text-body-lg font-semibold">Join the club</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6 px-7 py-7 sm:px-9 sm:py-8">
        {/* useSearchParams needs a Suspense boundary or the page cannot be
            statically rendered — Next throws at build time rather than at runtime,
            which is the good version of this error. The fallback is a plain height
            reservation so the card does not jump on hydration. */}
        <Suspense fallback={<div className="h-[42rem]" aria-hidden />}>
          <Fields />
        </Suspense>

        <label className="flex cursor-pointer gap-3 pt-1">
          {/* Unticked. Pre-ticked consent is not consent. */}
          <input
            type="checkbox"
            name="updates"
            className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--accent))]"
          />
          <span className="text-[13px] leading-relaxed text-haze">
            Message me about sessions and application deadlines.
          </span>
        </label>

        {deadline && (
          <p className="text-[13px] font-medium text-ember">
            Applications for this cohort close {deadline}.
          </p>
        )}

        <button
          type="submit"
          disabled={state === "sending"}
          className="btn btn-primary w-full disabled:opacity-60"
        >
          {state === "sending" ? "Sending…" : "Send it"}
        </button>

        {state === "error" && (
          <p className="text-[13px] leading-relaxed text-ember" role="alert">
            {message}{" "}
            <a href={`mailto:${LINKS.email}`} className="underline">
              {LINKS.email}
            </a>
          </p>
        )}

        <p className="border-t border-seam pt-5 text-[13px] leading-relaxed text-dust">
          Not ready to apply? Turn up to a build day instead — no signup, no form, and
          nobody will ask whether you have contributed before.
        </p>
      </form>
    </div>
  );
}
