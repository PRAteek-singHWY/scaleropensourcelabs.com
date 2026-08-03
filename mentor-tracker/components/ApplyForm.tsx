"use client";

// The apply form, in the hero.
//
// Measured off scaler.com/school-of-business/minimal-landing: the form is not a
// link to a form, it is the form, pinned right, above the fold, visible before any
// scroll. Their button is 14px/600 at 6px radius. Every club page that actually
// converts does some version of this; the closest comparable that does NOT — Ohio
// State's Open Source Club, whose only CTA is a mailto — now displays "This website
// is not currently maintained".
//
// Deliberately five fields. Each additional field costs completions, and none of
// the ones we cut tell us anything we cannot ask later.
//
// TWO THINGS I WILL NOT COPY FROM THE REFERENCE:
//
//   1. A countdown timer. Scaler's counts down to a real, dated admissions
//      deadline. A club timer that silently resets is a dark pattern, and on a
//      site whose entire argument is "every claim here is checkable" it would be
//      the one self-inflicted wound. The deadline below renders ONLY when a real
//      future date is configured, and disappears once it passes.
//
//   2. A pre-ticked messaging opt-in. Theirs is checked by default. Ours is not,
//      because pre-ticked consent is not consent — the same rule the rest of this
//      site applies to publishing a student's face.
//
// No backend: the site is static. The form posts to whatever form service the club
// configures. With none configured it says so plainly rather than silently
// swallowing a submission, which is the worse failure.

import { useState } from "react";

const ENDPOINT = process.env.NEXT_PUBLIC_APPLY_ENDPOINT ?? "";
/** ISO date. Renders only while genuinely in the future. */
const DEADLINE = process.env.NEXT_PUBLIC_COHORT_DEADLINE ?? "";

function deadlineLabel(): string | null {
  if (!DEADLINE) return null;
  const d = new Date(DEADLINE);
  if (Number.isNaN(d.getTime()) || d.getTime() < Date.now()) return null;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const field =
  "w-full rounded-md border border-seam bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-dust outline-none transition focus:border-accent";

export default function ApplyForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const deadline = deadlineLabel();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;

    if (!ENDPOINT) {
      setState("error");
      setMessage(
        "No form endpoint is configured yet, so this would go nowhere. Set NEXT_PUBLIC_APPLY_ENDPOINT before launch.",
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
      <div className="rounded-[10px] border border-seam bg-raise p-7">
        <p className="text-display-md font-semibold">You&apos;re in the queue.</p>
        <p className="measure mt-3 text-body text-haze">
          Someone will message you before the next session. Nothing else to do —
          bring a laptop.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] border border-seam bg-raise shadow-[0_13px_27px_-5px_rgba(50,50,93,0.18),0_8px_16px_-8px_rgba(0,0,0,0.25)]">
      <div className="border-b border-seam px-7 py-5">
        <p className="label">Open to all years</p>
        <p className="mt-1.5 text-body-lg font-semibold">Join the club</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 px-7 py-6">
        <div>
          <label htmlFor="af-name" className="label mb-2 block">
            Name
          </label>
          <input id="af-name" name="name" required className={field} autoComplete="name" />
        </div>

        <div>
          <label htmlFor="af-github" className="label mb-2 block">
            GitHub username
          </label>
          <input
            id="af-github"
            name="github"
            required
            className={field}
            placeholder="octocat"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div>
          <label htmlFor="af-year" className="label mb-2 block">
            Year and branch
          </label>
          <input
            id="af-year"
            name="year"
            required
            className={field}
            placeholder="2nd year, CSE"
          />
        </div>

        <div>
          <label htmlFor="af-link" className="label mb-2 block">
            One link to anything you&apos;ve built{" "}
            <span className="normal-case tracking-normal text-dust">(optional)</span>
          </label>
          <input
            id="af-link"
            name="link"
            className={field}
            placeholder="A repo, a deploy, a half-finished thing"
          />
        </div>

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
          <p className="pt-1 text-[13px] font-medium text-ember">
            Applications for this cohort close {deadline}.
          </p>
        )}

        <button
          type="submit"
          disabled={state === "sending"}
          className="w-full rounded-md bg-accent px-4 py-3 text-sm font-semibold text-bg transition hover:brightness-110 disabled:opacity-60"
        >
          {state === "sending" ? "Sending…" : "Apply to join"}
        </button>

        {state === "error" && (
          <p className="text-[13px] leading-relaxed text-ember">{message}</p>
        )}

        <p className="border-t border-seam pt-4 text-[13px] leading-relaxed text-dust">
          Not ready to apply? Sit in on a session first — no signup, just turn up.
        </p>
      </form>
    </div>
  );
}
