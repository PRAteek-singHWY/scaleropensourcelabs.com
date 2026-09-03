"use client";

// WHO IS THIS FOR — asked once, the same way, on all three things an organiser posts.
//
// ONE COMPONENT RATHER THAN THREE SELECTS, and the reason is not line count. A notice,
// a session and a form are written on three different screens by the same person on the
// same afternoon, and an audience that is worded differently in each place is an
// audience they have to re-read each time. It is also the field with the widest
// consequence on any of those forms — get the category of a notice wrong and it sorts
// oddly; get this wrong and the wrong half of the college reads it — so it is worth the
// hint text underneath, which a bare <select> of three words does not give room for.
//
// THE HINT CHANGES WITH THE SELECTION rather than listing all three at once. An
// organiser picking "members only" wants confirmation of what they just chose, not a
// comparison table; the comparison is in the option labels, which is where a comparison
// belongs.
//
// NOT A SECURITY CONTROL, and worth saying plainly because it looks like one. This
// writes a string into a document. What actually withholds a members-only notice from a
// student is canSeeAudience() in firestore.rules, which is evaluated on every read and
// cannot be talked past by a client that skips this component.

import { AUDIENCES, type Audience } from "@/lib/audience";

export default function AudiencePicker({
  id,
  value,
  onChange,
  /** What is being posted, so the label reads as a sentence about the actual thing
   *  rather than as the word "content". */
  noun = "notice",
  controlClassName,
  className = "",
}: {
  id: string;
  value: Audience;
  onChange: (v: Audience) => void;
  noun?: string;
  /** The host form's own input class. PASSED IN RATHER THAN OWNED HERE because the
   *  three admin forms each keep their own copy of that Tailwind string — see the note
   *  above `ctl` in Composer.tsx — and a fourth copy in here would be the one that
   *  drifts, leaving this control looking subtly unlike every field around it. */
  controlClassName: string;
  className?: string;
}) {
  const hint = AUDIENCES.find((a) => a.value === value)?.hint ?? "";
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        Who sees this {noun}
      </label>
      <select
        id={id}
        className={`${controlClassName} mt-2`}
        value={value}
        onChange={(e) => onChange(e.target.value as Audience)}
        // The hint is the description of the current choice, so it is wired up as one
        // rather than left as decoration a screen reader never reaches.
        aria-describedby={`${id}-hint`}
      >
        {AUDIENCES.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </select>
      <p id={`${id}-hint`} className="mt-2 text-sm text-haze">
        {hint}
      </p>
    </div>
  );
}
