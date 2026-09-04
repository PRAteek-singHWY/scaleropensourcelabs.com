// What the team page SAYS about each person, as opposed to who is on it.
//
// THE SPLIT THIS FILE EXISTS TO MAKE. The core-team roster lives in Firestore now, so
// that adding or retiring somebody is one action by an owner and cannot drift from who
// actually has access. But two of the fields the team page renders are not roster data
// at all — they are edited prose with rules of their own, and the file that defines them
// is emphatic about it:
//
//   remit       "a remit rather than a bio ... 'Owns the review queue' is checkable by
//               anyone who opens a PR; 'passionate about open source' is not, and it is
//               the sentence this field would turn into the moment it became optional
//               and somebody filled one in for flavour." Also: no pronouns, because a
//               remit is reworded at handover rather than rewritten.
//   highlights  a person's own record, and deliberately asymmetric — most people have
//               none and are not diminished by it. "Filling these in for the sake of
//               evenness is how the list stops being checkable."
//
// Neither survives being typed into an admin form at eleven at night by somebody adding
// a new lead in a hurry. Both survive a pull request, where somebody else reads them.
// So membership is live and the writing is reviewed, and scripts/team-roster.mjs merges
// the two.
//
// KEYED BY COLLEGE ADDRESS, because that is the roster's key too and it is the one
// identifier that does not change. Keying by name would break on a spelling correction
// and would silently orphan the entry — the sync script fails loudly on an unmatched
// key rather than dropping the prose.
//
// ADDING SOMEBODY IS THEREFORE TWO STEPS, ON PURPOSE:
//   1. an owner adds them on /admin      -> they get access immediately
//   2. somebody writes their remit here  -> they appear on the public team page
// `npm run team:sync` refuses to build a page for an active member with no remit, and
// names them. That is the forcing function: access is instant, publication is reviewed.

import type { Highlight } from "@/content/club";

export type Editorial = {
  remit: string;
  highlights?: Highlight[];
};

/** Address -> what the page says about them. Lowercase keys, matching the roster. */
export const TEAM_EDITORIAL: Record<string, Editorial> = {
  // ---------------------------------------------------------------------------
  // SEEDED FROM content/club.ts, which held these alongside the names until the
  // roster moved to Firestore. The prose is unchanged; only its home moved.
  //
  // The addresses below are placeholders and MUST be corrected to each person's real
  // college address before `npm run team:sync` will match them — it fails on an
  // editorial key that no roster row claims, precisely so a typo cannot silently drop
  // somebody's remit and leave the page rendering a bare name.
  // ---------------------------------------------------------------------------
};
