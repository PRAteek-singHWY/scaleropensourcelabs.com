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
import { celebrate } from "@/components/fx/celebrate";

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

// bg-sunk, not bg-bg. Once the light page became pure white to let the section
// bands read, --bg and --raise were both #FFFFFF — so a white field sat on a white
// card and only its 1px border said it was an input at all. --sunk is the recessed
// fill and exists for exactly this.
// 2px rather than 1px, and the reason is that this form sits inside a card that
// is itself 1px-bordered on a dotted page. At 1px the fields read as ruled lines
// in a table rather than as things you type into; the extra pixel is what makes
// each one look like its own object.
//
// The focus ring is additive to the global :focus-visible outline rather than a
// replacement for it: the outline only fires for keyboard focus, and a form this
// long deserves an obvious target under the mouse too. Both are the accent, so
// a pointer user and a keyboard user see the same colour mean the same thing.
const field =
  // Black keyline and a 4px hard shadow, like every other control in the system —
  // an input that does not share the button's construction reads as a different
  // kind of object, and in a form the two sit inches apart.
  //
  // On focus the shadow goes electric blue rather than shrinking. The press
  // animation the buttons use is wrong here: a field is not pressed, it is
  // entered, and moving it 2px when the caret lands would shift the text somebody
  // is about to type.
  "w-full rounded-lg border-2 border-black bg-raise px-3.5 py-2.5 text-sm text-ink placeholder:text-dust outline-none shadow-[4px_4px_0_0_#000] transition duration-150 ease-out focus:shadow-[4px_4px_0_0_#0038FF]";

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
      // The one moment on this page that has genuinely earned a celebration:
      // a submitted application. Fired after the success state is set, and not
      // awaited — a failed confetti chunk must never be able to swallow the
      // "you're in the queue" render behind it.
      void celebrate();
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
      <div className="card card-still rounded-tile bg-raise p-7">
        <p className="text-display-md font-semibold">You&apos;re in the queue.</p>
        <p className="measure mt-3 text-body text-haze">
          Someone will message you before the next session. Nothing else to do —
          bring a laptop.
        </p>
      </div>
    );
  }

  return (
    // A reveal group, so the card's header strip and the form body arrive one
    // after the other rather than together. Deliberately only those two — the
    // group's children are its DIRECT children, so the fields inside the <form>
    // are untouched. Staggering individual inputs would mean a form that is
    // visibly assembling itself while somebody is trying to fill it in, which is
    // the one place on this page where motion would cost a reader something.
    <div
      className="card card-still rounded-tile bg-raise shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
      data-reveal-group
    >
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

        {/* Which programme they are aiming at, and where.
            Asked because it is the single most useful thing to know before the
            first conversation: someone aiming at GSoC in eight months needs a
            different first patch than someone who wants an LFX term next quarter.

            A select, not free text, because the answer has to be countable — the
            point is to group people by target so a session can serve several at
            once. "Not sure yet" is a real option and the DEFAULT, because most
            people genuinely do not know and forcing a guess produces noise. It is
            also honest: this page tells beginners they are welcome, so the form
            must not immediately demand a plan. */}
        <div>
          <label htmlFor="af-target" className="label mb-2 block">
            Which programme are you aiming at
          </label>
          <select id="af-target" name="target" defaultValue="unsure" className={field}>
            <option value="unsure">Not sure yet — help me pick</option>
            <option value="GSOC">Google Summer of Code</option>
            <option value="LFX">LFX Mentorship</option>
            <option value="C4GT">Code for GovTech</option>
            <option value="SOB">Summer of Bitcoin</option>
            <option value="OUTREACHY">Outreachy</option>
          </select>
        </div>

        {/* Two org preferences rather than one. Nobody gets their first choice
            reliably — the whole argument of this site is that these are
            competitive — so asking for a second is realistic rather than
            pessimistic, and it gives us somewhere to point them when the first
            organisation has no tractable issues open.

            Optional on purpose. A beginner who has not yet read any org's issue
            tracker cannot answer this, and requiring it would filter out exactly
            the people the club exists for. */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* One note for the pair. Repeating "(optional)" in both labels made each
              wrap to two lines inside the two-column grid. */}
          <p className="text-[15px] text-dust sm:col-span-2">
            Both optional — leave them blank if you have not looked yet.
          </p>
          {/* `flex flex-col` plus `mt-auto` on the input, rather than the plain
              divs this used to be, and it fixes a real misalignment: the column is
              about 172px inside a 26rem card, and "Second choice org" set in the
              label face is just wide enough to wrap where "First choice org" does
              not. With the label taller on one side, the two inputs sat at
              different heights — the kind of 20px offset nobody can name and
              everybody notices.

              Pushing the input to the bottom of its (grid-stretched, therefore
              equal-height) cell aligns them for ANY label that wraps, rather than
              for the current strings at the current font. Shortening the copy
              would have fixed today's render and broken again on the next
              translation or type change. */}
          <div className="flex flex-col">
            <label htmlFor="af-org1" className="label mb-2 block">
              First choice org
            </label>
            <input
              id="af-org1"
              name="org1"
              className={`${field} mt-auto`}
              placeholder="Kubernetes, OWASP…"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="af-org2" className="label mb-2 block">
              Second choice org
            </label>
            <input
              id="af-org2"
              name="org2"
              className={`${field} mt-auto`}
              placeholder="A backup you would be happy with"
              autoComplete="off"
            />
          </div>
        </div>

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
          <p className="pt-1 text-[15px] font-medium text-ember">
            Applications for this cohort close {deadline}.
          </p>
        )}

        <button
          type="submit"
          disabled={state === "sending"}
          // btn-pop, not btn-primary: the brief names the join action as the
          // yellow one, and this is that action.
          className="btn btn-pop w-full disabled:opacity-60"
        >
          {state === "sending" ? "Sending…" : "Apply to join"}
        </button>

        {state === "error" && (
          <p className="text-[15px] leading-relaxed text-ember">{message}</p>
        )}

        <p className="border-t border-seam pt-4 text-[15px] leading-relaxed text-dust">
          Not ready to apply? Sit in on a session first — no signup, just turn up.
        </p>
      </form>
    </div>
  );
}
