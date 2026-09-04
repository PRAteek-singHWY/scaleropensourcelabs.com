"use client";

// GSoC mentorship: enrol, and say which mentor you want.
//
// NOT components/Mentors.tsx. That is the public marketing section, hard-coded in
// content/club.ts and consent-gated. This is the signed-in half — mentors an organiser
// publishes from the dashboard, and the preferences members record against them.
//
// THE SHAPE OF THE ASK. A first choice, and then exactly one of two things: a second
// choice, or "first preference only". Those are different statements and the form makes
// the reader pick one rather than inferring from an empty field — somebody who has not
// decided about a second mentor and somebody who has decided they want one mentor look
// identical in the data otherwise, and an organiser pairing thirty students needs to tell
// them apart. firestore.rules enforces the same thing, in both directions.
//
// ONE CHOICE PER SCREEN, and this replaced both lists being on the page at once. With
// everything visible the reader met the same mentors twice, stacked, with a checkbox
// wedged between the two copies — so the page was long, the second list looked like a
// duplicate of the first, and the relationship between the checkbox and the list below it
// had to be worked out. Splitting it means each screen asks one question with the full
// set of answers in front of it, and the second screen can be built out of what the first
// one decided: the mentor you already picked is not offered again, and "no second choice"
// becomes one of the options rather than a modifier attached to the list.
//
// THE "NO SECOND CHOICE" OPTION IS A CARD IN THE SAME GROUP, not a checkbox beside it.
// That is what makes step two always answerable in exactly one action, and it is why
// `first_only` can be a real decision in the data rather than an absence.
//
// NO CAPACITY, DELIBERATELY. Mentors have no slot count and a popular mentor is not shown
// as full. Two reasons: a slot counter turns choosing a mentor into a race, which is a bad
// first experience of a club whose whole argument is that it is not a competition; and the
// pairing is done by a human at the end anyway, so a limit enforced here would only be a
// limit enforced twice, inconsistently. What the organisers get instead is the demand
// numbers on their own dashboard.
//
// WHAT THIS DOES NOT DO. Nothing here allocates. A preference is a preference until an
// organiser says otherwise, and the copy says so — telling somebody they "have" a mentor
// because they picked one would be the same unearned claim the rest of this site refuses
// to make.

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import {
  mentorLabel,
  mentorNames,
  readEnrollment,
  readMentors,
  saveEnrollment,
  withdrawEnrollment,
  type Enrollment,
  type Mentor,
} from "@/lib/mentorship";
import { LINKS } from "@/content/site";

/** The one programme this card is about. The data model carries a programme on every
 *  mentor and every enrollment so a second one needs no schema change — but only GSoC is
 *  surfaced, because only GSoC has a cohort. */
const PROGRAMME = "gsoc";
const PROGRAMME_NAME = "Google Summer of Code";

/** The value of the "no second choice" option. Not a mentor id, and it cannot collide
 *  with one — Firestore ids are 20 alphanumeric characters. */
const NONE = "__none__";

/** A tick, for the selected card. Inline rather than an icon font: the CSP is
 *  `img-src 'self' data:` and `font-src 'self'`, so anything fetched from elsewhere would
 *  be blocked, and one path is not worth a dependency. */
function Check() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 8.5 3.5 3.5L13 5" />
    </svg>
  );
}

/** One mentor, as a card.
 *
 *  A LABEL WRAPPING A VISUALLY HIDDEN RADIO, not a div with an onClick. It keeps arrow-key
 *  navigation within the group, the browser's own checked state, and a screen reader
 *  announcing "2 of 3" — all of which have to be hand-rolled, usually badly, the moment
 *  the input goes away. `peer` carries the selected and focused styling across to the
 *  card, so the ring you see is the real focus ring rather than a painted-on one.
 *
 *  THE DESCRIPTION IS THE POINT OF THE CARD. It is what somebody chooses on — what this
 *  mentor works on, and what they are not the person to ask — so it is never truncated
 *  and never behind a "read more". Four lines of text is cheaper than a click. */
function MentorCard({
  mentor,
  group,
  checked,
  onChange,
}: {
  mentor: Mentor;
  group: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="group relative flex cursor-pointer">
      <input
        type="radio"
        name={group}
        value={mentor.id}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span className="flex w-full flex-col rounded-panel border border-seam bg-sunk p-5 transition hover:border-accent/50 peer-checked:border-accent peer-checked:bg-raise peer-checked:shadow-[0_0_0_3px_rgb(var(--sky)/0.18)] peer-focus-visible:border-accent peer-focus-visible:shadow-[0_0_0_3px_rgb(var(--sky)/0.35)]">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-body-lg font-semibold text-ink">{mentor.name}</span>
            {mentor.org && (
              <span className="mt-0.5 block font-mono text-[0.8125rem] text-dust">
                {mentor.org}
              </span>
            )}
          </span>
          {/* The empty ring is the unselected state drawn rather than absent: a card that
              only shows a mark when chosen gives the reader nothing to aim at, and no way
              to see at a glance that these are alternatives rather than links. */}
          <span
            aria-hidden
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-seam text-transparent transition group-has-[:checked]:border-accent group-has-[:checked]:bg-accent group-has-[:checked]:text-bg"
          >
            <Check />
          </span>
        </span>

        <span className="mt-3 block text-[0.9375rem] leading-relaxed text-haze">
          {mentor.description}
        </span>

        {mentor.github && (
          <span className="mt-3 block font-mono text-xs text-dust">@{mentor.github}</span>
        )}
      </span>
    </label>
  );
}

/** The "no second choice" card. Same group, same shape, deliberately quieter — dashed
 *  rather than solid, because it is the option that declines the question. */
function NoneCard({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="group relative flex cursor-pointer">
      <input
        type="radio"
        name="mentor_2"
        value={NONE}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span className="flex w-full flex-col rounded-panel border border-dashed border-seam bg-transparent p-5 transition hover:border-accent/50 peer-checked:border-solid peer-checked:border-accent peer-checked:bg-raise peer-checked:shadow-[0_0_0_3px_rgb(var(--sky)/0.18)] peer-focus-visible:border-accent peer-focus-visible:shadow-[0_0_0_3px_rgb(var(--sky)/0.35)]">
        <span className="flex items-start justify-between gap-3">
          <span className="block text-body-lg font-semibold text-ink">
            Just my first preference
          </span>
          <span
            aria-hidden
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-seam text-transparent transition group-has-[:checked]:border-accent group-has-[:checked]:bg-accent group-has-[:checked]:text-bg"
          >
            <Check />
          </span>
        </span>
        {/* THIS LINE HAS BEEN CUT TWICE, AND BOTH CUTS WENT THE SAME WAY. It began as a
            warning — "if your first choice is oversubscribed an organiser has nothing to
            fall back on and will have to ask you again" — which is the site talking
            somebody out of an option it had just offered them. Rewriting it as "you would
            rather wait for your first" was better and still wrong: it put a motive in the
            reader's mouth that they had not stated.
            What is left states the choice and nothing else. It is a legitimate answer and
            the card does not editorialise about it. */}
        <span className="mt-3 block text-[0.9375rem] leading-relaxed text-haze">
          You only want your first preference.
        </span>
      </span>
    </label>
  );
}

export default function MentorPicker({ user }: { user: User }) {
  const [mentors, setMentors] = useState<Mentor[] | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null | undefined>(undefined);
  const [error, setError] = useState("");

  /** Closed until they say they are interested. The picker is a long list and putting it
   *  on the dashboard unasked would make the page mostly about a programme most members
   *  are not in yet. */
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [firstOnly, setFirstOnly] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [ms, en] = await Promise.all([readMentors(), readEnrollment(user.uid)]);
      setMentors(ms);
      setEnrollment(en);
      if (en) {
        setFirst(en.mentor_1);
        setSecond(en.mentor_2 ?? "");
        setFirstOnly(en.first_only);
      }
    } catch (e) {
      console.error("[osc] could not load mentorship", e);
      setMentors([]);
      setEnrollment(null);
      setError("We could not load the mentor list. Reload the page, or email us.");
    }
  }, [user.uid]);

  useEffect(() => {
    void load();
  }, [load]);

  const names = useMemo(() => mentorNames(mentors ?? []), [mentors]);
  /** Hidden mentors are excluded from the PICKER but not from `names` above, so somebody
   *  who chose a mentor before they were retired still sees a name rather than an id. */
  const choosable = useMemo(
    () => (mentors ?? []).filter((m) => m.active && m.programme === PROGRAMME),
    [mentors],
  );
  /** Step two never offers the mentor step one picked. The old single-screen version had
   *  to render them disabled with a line explaining why; not offering them at all says the
   *  same thing in no words. */
  const remaining = useMemo(() => choosable.filter((m) => m.id !== first), [choosable, first]);

  /** Open the picker at the beginning, with whatever is stored as the starting point. */
  function openPicker() {
    setFirst(enrollment?.mentor_1 ?? "");
    setSecond(enrollment?.mentor_2 ?? "");
    setFirstOnly(enrollment?.first_only ?? false);
    setState("idle");
    setStep(1);
    setOpen(true);
  }

  function closePicker() {
    setState("idle");
    setStep(1);
    setOpen(false);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "saving") return;
    setState("saving");
    setMessage("");
    // DERIVED HERE, NOT READ FROM STATE, and that is a bug fix rather than a
    // refactor. With one mentor published there is no step two, so "first choice
    // only" is the only honest answer — and the submit button used to say so by
    // calling setFirstOnly(true) in its own onClick. It is a type="submit" button:
    // React processes that click and the form's submit in the same batch, so this
    // handler still closed over the OLD value and sent first_only: false with no
    // mentor_2. firestore.rules refuses exactly that pair — "not first-choice-only"
    // has to come with a second choice — so enrolment failed every time for the
    // whole period a club has published its first mentor and not yet its second.
    // The reader saw "That did not save. The fault is ours rather than yours",
    // which was true and unhelpful.
    const onlyChoice = onlyOneMentor || firstOnly;
    try {
      await saveEnrollment(
        user.uid,
        user.email!,
        {
          programme: PROGRAMME,
          mentor_1: first,
          mentor_2: onlyChoice ? undefined : second,
          first_only: onlyChoice,
        },
        enrollment === null,
      );
      await load();
      closePicker();
    } catch (err) {
      setState("error");
      console.error("[osc] enrollment save failed", err);
      setMessage(
        "That did not save. The fault is ours rather than yours — nothing was lost, so please try again, or email us:",
      );
      return;
    }
    setState("idle");
  }

  async function onWithdraw() {
    // A confirm() rather than a second screen. It is one destructive action on a page
    // with no others, the browser's dialog is keyboard-accessible and translated, and a
    // hand-rolled modal here would be a lot of markup to say one sentence.
    if (!window.confirm("Withdraw from GSoC mentorship? You can enrol again later.")) return;
    try {
      await withdrawEnrollment(user.uid);
      setFirst("");
      setSecond("");
      setFirstOnly(false);
      closePicker();
      await load();
    } catch (err) {
      console.error("[osc] withdraw failed", err);
      setError("That did not go through. Please try again, or email us.");
    }
  }

  // Step two is complete when either a mentor or the "just my first" card is chosen.
  const secondAnswered = firstOnly || Boolean(second);
  /** With only one mentor published there is no second preference to give, so step two
   *  would offer one card saying "no". The flow collapses to a single step instead. */
  const onlyOneMentor = choosable.length <= 1;

  if (mentors === null || enrollment === undefined) {
    return (
      <div className="card rounded-panel bg-raise p-6 sm:p-8" aria-busy="true">
        <p className="label">GSoC mentorship</p>
        <p className="mt-3 text-body text-haze">Loading…</p>
      </div>
    );
  }

  return (
    <div className="card rounded-panel bg-raise p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div>
          <p className="label">Mentorship</p>
          <h2 className="mt-2 font-display text-display-md font-bold tracking-tight">
            {PROGRAMME_NAME}
          </h2>
        </div>
        {enrollment && !open && <p className="chip">Enrolled</p>}
      </div>

      {error && (
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-ember" role="alert">
          {error}
        </p>
      )}

      {/* ------------------------------------------------------------ enrolled */}
      {enrollment && !open && (
        <>
          <p className="measure mt-4 text-body text-haze">
            Your preferences are recorded. An organiser pairs the cohort by hand once
            enrolment closes, so this is what they will be working from — it is not a
            confirmed mentor yet.
          </p>
          {/* RANKED ROWS, NOT A DEFINITION LIST. The old markup was a `<dl>` with
              "First preference" in a 14rem label column — correct semantics for a term
              and its definition, and the wrong shape for an ordered choice. These are
              first and second, so they are numbered, and the number is the object that
              says so. It is the same accent-filled disc as the step markers on the
              sign-in card and the initial in the header: one device, used three times. */}
          <ol className="mt-6 space-y-2.5">
            {[
              ["01", mentorLabel(names, enrollment.mentor_1), true],
              [
                "02",
                enrollment.first_only
                  ? "No second choice — you asked for your first preference only."
                  : mentorLabel(names, enrollment.mentor_2),
                !enrollment.first_only,
              ],
            ].map(([n, label, filled]) => (
              <li
                key={n as string}
                className="flex items-center gap-3.5 rounded-tile border border-seam bg-sunk px-4 py-3.5"
              >
                <span
                  aria-hidden
                  className={[
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full font-mono text-[0.75rem] font-bold leading-none",
                    filled
                      ? "bg-accent text-bg"
                      : // Dashed, not solid: a preference nobody gave is not an empty
                        // box, it is one that was never drawn.
                        "border border-dashed border-seam text-dust",
                  ].join(" ")}
                >
                  {n as string}
                </span>
                <span
                  className={`text-[1.0625rem] ${filled ? "font-semibold text-ink" : "text-dust"}`}
                >
                  {label as string}
                </span>
              </li>
            ))}
          </ol>
          {/* gap-x-6, not gap-3, and items-center. `.btn-secondary` carries a 4px hard
              offset shadow that extends past its own box, so a 12px gap measured from the
              border left about 8px of visible air and the withdraw link read as being
              attached to the button. */}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <button type="button" onClick={openPicker} className="btn btn-secondary">
              Change my preferences
            </button>
            <button
              type="button"
              onClick={() => void onWithdraw()}
              className="tap font-mono text-label uppercase tracking-wider text-haze underline decoration-seam underline-offset-4 transition-colors hover:text-ember"
            >
              Withdraw
            </button>
          </div>
        </>
      )}

      {/* --------------------------------------------------------- not enrolled */}
      {!enrollment && !open && (
        <>
          <p className="measure mt-4 text-body text-haze">
            The club runs a GSoC cohort: weekly sessions, proposal review, and a mentor
            who has been through it recently. If you want in, say so here and pick the
            mentors you would like to work with.
          </p>
          {choosable.length === 0 ? (
            // AN HONEST EMPTY STATE, not a disabled button. Nobody has published a mentor
            // yet, and telling the reader that is more useful than a control that does
            // nothing when pressed.
            <p className="mt-6 rounded-tile border border-dashed border-seam p-5 text-[0.9375rem] leading-relaxed text-dust">
              No mentors have been published yet. Enrolment opens when the organisers add
              them — check back, or ask in the club channel.
            </p>
          ) : (
            <button type="button" onClick={openPicker} className="btn btn-primary mt-6">
              Start my enrolment
            </button>
          )}
        </>
      )}

      {/* --------------------------------------------------------------- picker */}
      {open && (
        <form onSubmit={onSubmit} className="mt-7">
          {/* WHERE YOU ARE, in two named steps. The same spine the sign-in card uses, for
              the same reason: a "step 1 of 2" chip counts the steps without naming them,
              so a reader can see a second step exists but not what it will ask — which is
              the thing that decides whether they start. */}
          <ol
            className="flex flex-wrap items-center gap-x-3 gap-y-2"
            aria-label="Where you are"
          >
            {([
              [1, "Your first choice"],
              [2, "A backup"],
            ] as const).map(([n, label], i) => {
              const done = n < step;
              const live = n === step;
              return (
                <li key={n} className="flex items-center gap-3">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={[
                        "grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-[0.75rem] font-bold leading-none",
                        done || live
                          ? "bg-accent text-bg"
                          : "border border-dashed border-seam text-dust",
                      ].join(" ")}
                    >
                      {done ? "✓" : `0${n}`}
                    </span>
                    <span
                      aria-current={live ? "step" : undefined}
                      className={[
                        "font-mono text-label uppercase tracking-wider",
                        live ? "font-bold text-ink" : done ? "text-haze" : "text-dust",
                      ].join(" ")}
                    >
                      {label}
                    </span>
                  </span>
                  {i === 0 && (
                    <span
                      aria-hidden
                      className="hidden h-px w-5 bg-seam min-[376px]:block sm:w-8"
                    />
                  )}
                </li>
              );
            })}
          </ol>

          {/* ------------------------------------------------------------ step one */}
          {step === 1 && (
            <fieldset className="mt-7">
              <legend className="font-display text-display-md font-bold tracking-tight">
                Who would you most like to work with?
              </legend>
              <p className="measure mt-2 text-body text-haze">
                Read what each of them is useful for. You are not committing to anything —
                an organiser pairs the cohort by hand at the end.
              </p>
              <div className="mt-6 grid gap-3 lg:grid-cols-2">
                {choosable.map((m) => (
                  <MentorCard
                    key={m.id}
                    mentor={m}
                    group="mentor_1"
                    checked={first === m.id}
                    onChange={() => {
                      setFirst(m.id);
                      // Picking a new first choice invalidates a second choice that was
                      // the same person. Cleared here rather than validated later, so the
                      // next screen cannot open in a state it would have to reject.
                      if (second === m.id) setSecond("");
                    }}
                  />
                ))}
              </div>
            </fieldset>
          )}

          {/* ------------------------------------------------------------ step two */}
          {step === 2 && (
            <fieldset className="mt-7">
              <legend className="font-display text-display-md font-bold tracking-tight">
                And if they are taken?
              </legend>
              <p className="measure mt-2 text-body text-haze">
                Your first choice is{" "}
                <strong className="font-semibold text-ink">
                  {mentorLabel(names, first)}
                </strong>
                . Pick somebody else as a backup, or say you would rather wait for them.
              </p>
              <div className="mt-6 grid gap-3 lg:grid-cols-2">
                {remaining.map((m) => (
                  <MentorCard
                    key={m.id}
                    mentor={m}
                    group="mentor_2"
                    checked={!firstOnly && second === m.id}
                    onChange={() => {
                      setSecond(m.id);
                      setFirstOnly(false);
                    }}
                  />
                ))}
                <NoneCard
                  checked={firstOnly}
                  onChange={() => {
                    setFirstOnly(true);
                    setSecond("");
                  }}
                />
              </div>
            </fieldset>
          )}

          {/* --------------------------------------------------------------- footer */}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-seam pt-6">
            {step === 1 && !onlyOneMentor ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!first}
                className="btn btn-primary disabled:opacity-60"
              >
                Next
              </button>
            ) : (
              <>
                {step === 2 && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn btn-secondary"
                  >
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  // With one mentor published there is no step two, so the only thing that
                  // has to be true is a first choice — and `first_only` is the only
                  // honest answer to a question with no other candidates.
                  disabled={
                    !first || (!onlyOneMentor && !secondAnswered) || state === "saving"
                  }
                  // No onClick. It used to set firstOnly here and onSubmit could not
                  // see it in time — see the note in onSubmit, which now derives it.
                  className="btn btn-primary disabled:opacity-60"
                >
                  {state === "saving"
                    ? "Saving…"
                    : enrollment
                      ? "Save my preferences"
                      : "Enrol"}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={closePicker}
              className="tap font-mono text-label uppercase tracking-wider text-haze underline decoration-seam underline-offset-4 transition-colors hover:text-ink"
            >
              Cancel
            </button>

            {/* The reason a control is off, stated. A disabled button with no explanation
                is the reader wondering what they missed. */}
            {((step === 1 && !first) || (step === 2 && !secondAnswered)) && (
              <p className="text-[0.8125rem] text-dust">
                {step === 1
                  ? "Choose a mentor to continue."
                  : "Choose a backup, or say you only want your first choice."}
              </p>
            )}
          </div>

          {state === "error" && (
            <p className="mt-5 text-[0.9375rem] leading-relaxed text-ember" role="alert">
              {message}{" "}
              <a href={`mailto:${LINKS.email}`} className="underline">
                {LINKS.email}
              </a>
            </p>
          )}
        </form>
      )}
    </div>
  );
}
