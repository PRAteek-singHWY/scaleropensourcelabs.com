// WHO A NOTICE IS FOR, and the one place that decides it.
//
// THE DISTINCTION THIS FILE EXISTS TO DRAW. Signing in proves somebody is a student at
// this college; it does not make them a member of this club. Those were the same thing
// until this file existed — `isMember()` in firestore.rules meant "has a verified
// @sst.scaler.com address", and every notice, form and session was gated on it, so
// every student on the domain read everything the organisers posted. That was not a
// decision anybody made. It was a function name that stopped being true.
//
// The rules function is now `isStudent()`, and `isClubMember()` is a separate question
// answered by the `membership` field on the reader's own profile. This file is the
// vocabulary both halves share.
//
// THREE AUDIENCES, AND ALL THREE DO SOMETHING THE OTHERS CANNOT:
//
//   members   the club's own business. Standup moved, the review rota, a deadline that
//             only means something if you are already contributing.
//   students  the college, minus the people who have already joined. This is the one
//             that looks redundant and is not: "applications are open" is addressed to
//             exactly the students who are not members, and sending it to the whole
//             domain means every member gets asked to join a club they run.
//   both      everyone signed in. Django Day, a talk, anything where the club is the
//             host rather than the subject.
//
// `both` IS THE DEFAULT, AND THAT IS A BACKWARD-COMPATIBILITY DECISION rather than a
// taste one. Every notice, form and session written before this field existed carries
// no `audience` at all, and those were posted into a world where everybody saw
// everything. Reading an absent field as `members` would silently retract them from
// most of their readers; reading it as `both` keeps them exactly as visible as they
// were the day they were written. The rules apply the same default — see the
// `.get('audience', 'both')` calls in firestore.rules, and change neither alone.

/** Who may read a notice, form or session. Mirrored in firestore.rules. */
export type Audience = "members" | "students" | "both";

export const DEFAULT_AUDIENCE: Audience = "both";

/** The picker, in the order an organiser thinks about it: widest first, because most
 *  things are for everybody and the default should be the least effort to accept. */
export const AUDIENCES: { value: Audience; label: string; hint: string }[] = [
  {
    value: "both",
    label: "Everyone",
    hint: "Every student who signs in, members included",
  },
  {
    value: "members",
    label: "Members only",
    hint: "Only students the club has admitted",
  },
  {
    value: "students",
    label: "Students who are not members",
    hint: "For recruiting — members will not see it",
  },
];

export const AUDIENCE_LABEL: Record<Audience, string> = {
  members: "Members only",
  students: "Non-members",
  both: "Everyone",
};

/** Read an audience off a stored document, defaulting as the rules do. Anything
 *  unrecognised also reads as `both`: a value this build does not know about came from
 *  a newer one, and hiding a notice because of a vocabulary mismatch is the worse of
 *  the two failures. */
export function audienceOf(v: unknown): Audience {
  return v === "members" || v === "students" ? v : "both";
}

/** May this reader see it? The single predicate; nothing else should compare these
 *  strings. `isClubMember` is undefined while the profile is still loading, which is
 *  NOT the same as false — treat it as "not yet known" and show nothing rather than
 *  flashing members-only content at a student, or recruitment copy at a member. */
export function visibleTo(
  audience: Audience,
  isClubMember: boolean | undefined,
): boolean {
  if (audience === "both") return true;
  if (isClubMember === undefined) return false;
  return audience === "members" ? isClubMember : !isClubMember;
}

/** THE VALUES THIS READER MAY QUERY FOR, and the reason this is not just a UI filter.
 *
 *  A Firestore `list` rule is evaluated against the QUERY, not against the rows it
 *  returns. The query is allowed only if its own constraints PROVE the rule holds for
 *  every document that could match — so an unconstrained read is refused outright, even
 *  when every document in the collection happens to be addressed to everyone. Nothing
 *  is filtered; the whole read fails. Adding `where("audience", "in", ...)` is what
 *  makes it provable, which is why this clause is mandatory rather than an
 *  optimisation, and why it cannot be dropped after checking that no members-only
 *  notice exists yet.
 *
 *  This is also why the backfill matters: a `where` clause does not match documents
 *  that lack the field at all, so a notice with no `audience` is invisible to an
 *  `in` query however permissive the rules are. See scripts/backfill-audience.mjs. */
export function queryableAudiences(isClubMember: boolean): Audience[] {
  return isClubMember ? ["both", "members"] : ["both", "students"];
}
