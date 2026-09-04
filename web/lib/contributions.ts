// A member's open-source contributions, as GitHub reports them.
//
// THE CLIENT NEVER WRITES THIS, and that constraint is the whole design rather than a
// precaution. The obvious build — fetch GitHub from the browser and store the counts —
// fails on both halves:
//
//   * a browser calling api.github.com unauthenticated gets 60 requests an hour PER IP,
//     which on a college network is 60 requests an hour for the entire club; and
//   * a count the client writes is a count the client can invent. "Merged pull requests"
//     is the one number on this dashboard somebody has a reason to inflate, and the
//     first time a member edited it in the console the panel would stop meaning
//     anything.
//
// So the fetch lives in a Cloud Function using the Admin SDK, which bypasses the rules,
// and `contributions/{uid}` is write-denied to every client including its owner. This
// file only reads, plus one callable that asks the function to run for the caller.
//
// WHY THE HANDLE IS NOT TRUSTED EITHER. `github` on the profile is free text a member
// typed, so it proves nothing about who owns that account — this panel says "GitHub
// activity for the handle you gave us", not "your contributions", and the UI must keep
// saying that. Verifying it would mean OAuthing GitHub as well as Google, which is a
// second sign-in for a panel nobody is scored on. If that ever changes, it changes here
// and in the copy together.

import { CONTRIBUTIONS, getDb, getFunctionsClient } from "@/lib/firebase";

/** One pull request, as the dashboard shows it. A deliberate subset of what GitHub
 *  returns: the function stores these fields and no others, so a stored row cannot grow
 *  a payload nobody reviewed. */
export type Pull = {
  title: string;
  /** "owner/name". Already the display form, so nothing downstream reassembles it. */
  repo: string;
  url: string;
  merged_at?: string;
  state: "merged" | "open" | "closed";
};

export type Contributions = {
  uid: string;
  /** The handle these counts are FOR, stored alongside them. Without it, a member who
   *  corrects a typo in their handle would see the old account's numbers with no way to
   *  tell they were stale — the panel compares this against the profile and says so. */
  github: string;
  merged: number;
  open: number;
  /** Distinct repositories with at least one merged PR. The number the club actually
   *  quotes, and not derivable from `merged`. */
  repos: number;
  /** Newest first, capped by the function. */
  recent: Pull[];
  /** Set when GitHub answered but the handle does not exist. The panel says so plainly
   *  rather than rendering three zeroes, which read as "you have done nothing". */
  not_found?: boolean;
  synced_at?: unknown;
};

/** Read one member's row. Returns null when the sync has never run for them.
 *
 *  A permission error is NOT swallowed, for the same reason as readProfile: on this
 *  collection it means the rules refused, and hiding that presents as an empty panel. */
export async function readContributions(uid: string): Promise<Contributions | null> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, CONTRIBUTIONS, uid));
  return snap.exists() ? ({ ...(snap.data() as Contributions) }) : null;
}

/** What the callable can come back with, so the panel can say something specific.
 *
 *  `cooldown` is not an error and must not be rendered as one: it means the numbers on
 *  screen are already recent. Telling somebody "that failed" when the answer is "that
 *  was unnecessary" is the wrong sentence. */
export type RefreshResult =
  | { ok: true; contributions: Contributions }
  | { ok: false; reason: "no-handle" | "cooldown" | "not-found" | "github-down" };

/** Ask the Cloud Function to re-fetch GitHub for the signed-in member.
 *
 *  A CALLABLE RATHER THAN AN HTTP ENDPOINT, because callables pass the Firebase ID token
 *  automatically and the function reads the uid from it. An HTTP endpoint would take the
 *  uid as a parameter, and a parameter is a thing somebody can change — the first
 *  version of this shape lets anybody refresh anybody's row, which is harmless here but
 *  is the same mistake that is not harmless elsewhere.
 *
 *  The daily scheduled sync is what normally fills this in; this is the "I merged
 *  something an hour ago" button. The function enforces the cooldown, not this file —
 *  a client-side timer is a suggestion. */
export async function refreshContributions(): Promise<RefreshResult> {
  const fns = await getFunctionsClient();
  if (!fns) throw new Error("Firebase is not configured");
  const { httpsCallable } = await import("firebase/functions");
  const call = httpsCallable<void, RefreshResult>(fns, "refreshContributions");
  const res = await call();
  return res.data;
}

/** "3 days ago", for a sync timestamp.
 *
 *  Relative rather than absolute because the only question this line answers is "are
 *  these numbers current". A date makes the reader do the subtraction. */
export function ago(d: Date | null): string {
  if (!d) return "never";
  const mins = Math.floor((Date.now() - +d) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}
