// The batch, the branch and the roll number — read out of the college address rather
// than asked for.
//
// Every member signs in as something like `abhinav.23bcs10045@sst.scaler.com`. The `23`
// is the year they started, `bcs` the branch, `10045` the roll. All three were previously
// collected as ONE FREE-TEXT FIELD ("1st year, CSE") which the organisers' dashboard then
// had to guess at with two regexes and an explicit "Unparsed" bucket for when they failed.
//
// WHY NOTHING HERE IS STORED IN FIRESTORE, which is the decision this file turns on.
// The address already lives on the profile, and firestore.rules pins it to
// `request.auth.token.email` on every write — so a value derived from it is exactly as
// trustworthy as the token, cannot be mistyped, and cannot drift out of step with the
// document it describes. Storing a `batch` field would add a number that could disagree
// with the address next to it, and a rule to stop that disagreeing would have to re-derive
// this parse in a language with no regex captures. Deriving it on read costs nothing and
// removes the whole class of problem.
//
// A CONSEQUENCE WORTH KNOWING: this cannot be queried. Firestore cannot filter on a value
// that is not a field, so "everyone in the 2024 batch" is a client-side filter over the
// membership the dashboard has already read. That is fine at a few hundred members and is
// the same trade the rest of that page already makes. If the club ever needs a server-side
// batch query, the answer is a stored field written from this function, not a rewrite.

/** A parsed college address. Every field is derived; none of it is stored. */
export type Batch = {
  /** The year they started. 2023. */
  start: number;
  /** The year they are expected to finish. 2027. */
  end: number;
  /** The branch code exactly as it appears in the address, lowercased. "bcs" */
  code: string;
  /** A human label for the branch, or the uppercased code when we do not have one. */
  branch: string;
  /** The roll digits. Kept as a string — it is an identifier, not a quantity, and
   *  a leading zero would be lost the moment it became a number. */
  roll: string;
  /** "2023–27". An en dash, because it is a range. */
  label: string;
  /** Academic year, 1 to 4, as of today. null once they are past `end`. */
  year: number | null;
  /** "3rd year", or "Alumni". */
  yearLabel: string;
};

/** Branch code -> what it is called.
 *
 *  DELIBERATELY EMPTY. The only code anybody has actually seen is `bcs`, and nobody has
 *  confirmed what it expands to — "B.Tech Computer Science" is a guess, and this repo's
 *  standing rule is that a claim without a source does not ship. An unknown code renders
 *  as the uppercased code ("BCS"), which is honest and still groups and sorts correctly.
 *
 *  Fill this in when the club confirms the list. Nothing else has to change. */
export const BRANCH_LABELS: Record<string, string> = {};

/** The shape of a college address, after the name and before the domain.
 *
 *  Anchored at both ends and applied to the LOCAL PART ONLY, so an address that merely
 *  contains something batch-shaped cannot be read as one. The name segment is `[^.]+`
 *  rather than `.+` so that a hypothetical `first.last.23bcs1@…` fails rather than
 *  quietly parsing `last.23bcs1` — an address we have not seen should return null, not a
 *  confident wrong answer. */
const ADDRESS = /^([^.]+)\.(\d{2})([a-z]+)(\d+)$/i;

/** How long the programme runs. Four years. */
const DURATION = 4;

/** The month a new academic year starts, zero-indexed. July.
 *
 *  It matters that this is not January: on 30 August a 2023-batch student is in their
 *  fourth year, and a calendar-year subtraction would call them a third-year for the
 *  seven months when the answer changes most often. */
const ACADEMIC_YEAR_STARTS = 6;

/** The academic year a date falls in. 30 Aug 2026 and 3 Feb 2027 are both 2026. */
function academicYearOf(d: Date): number {
  return d.getMonth() >= ACADEMIC_YEAR_STARTS ? d.getFullYear() : d.getFullYear() - 1;
}

/** "1st", "2nd", "3rd", "4th". Only ever called with 1-4. */
function ordinal(n: number): string {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
}

/** Parse a college address. Returns null for anything that is not shaped like one.
 *
 *  NULL IS A NORMAL RESULT, not an error path. Organisers, alumni on older addresses and
 *  anybody whose address predates the current scheme all land here, and every caller is
 *  expected to render an em dash rather than a guess. That is the same honesty the
 *  dashboard's old "Unparsed" bucket was reaching for — this just moves it to the one
 *  place that can be sure.
 *
 *  `now` is injectable so the year arithmetic can be tested without waiting for July. */
export function batchFromEmail(
  email: string | null | undefined,
  now: Date = new Date(),
): Batch | null {
  if (!email) return null;

  const at = email.indexOf("@");
  if (at === -1) return null;
  const m = ADDRESS.exec(email.slice(0, at).trim());
  if (!m) return null;

  const [, , yy, rawCode, roll] = m;
  const code = rawCode.toLowerCase();
  // Two digits, so this has to pick a century. Every address in play is 20xx and will be
  // for the lifetime of this club; a window would be machinery for a problem nobody has.
  const start = 2000 + Number(yy);
  const end = start + DURATION;

  const nth = academicYearOf(now) - start + 1;
  // Before their course starts, `nth` is 0 or less — an address issued early, or a clock
  // that is wrong. Clamped to 1 rather than shown as "0th year".
  const year = nth > DURATION ? null : Math.max(1, nth);

  return {
    start,
    end,
    code,
    branch: BRANCH_LABELS[code] ?? code.toUpperCase(),
    roll,
    label: `${start}–${String(end).slice(2)}`,
    year,
    yearLabel: year === null ? "Alumni" : `${ordinal(year)} year`,
  };
}

/** "2023–27 · BCS · 4th year", for a one-line summary. An em dash when the address does
 *  not parse, so an unreadable value reads as absent rather than as a blank. */
export function batchSummary(email: string | null | undefined, now?: Date): string {
  const b = batchFromEmail(email, now);
  return b ? `${b.label} · ${b.branch} · ${b.yearLabel}` : "—";
}

/** The bucket a member belongs to in a breakdown, e.g. "2023–27". "Unknown" when the
 *  address does not parse — named rather than dropped, so a count is never quietly short. */
export function batchBucket(email: string | null | undefined): string {
  return batchFromEmail(email)?.label ?? "Unknown";
}

/** Same, for a branch breakdown. */
export function branchBucket(email: string | null | undefined): string {
  return batchFromEmail(email)?.branch ?? "Unknown";
}

/** Same, for a year breakdown. Sorts naturally because the labels share a prefix. */
export function yearBucket(email: string | null | undefined): string {
  return batchFromEmail(email)?.yearLabel ?? "Unknown";
}
