// The member profile: its shape, and the two operations on it.
//
// ONE DOCUMENT PER MEMBER, AT users/{uid}. Keyed by the Firebase Auth uid rather than
// storing the uid as a field, which buys two things that are easy to miss:
//
//   * the ownership rule is `request.auth.uid == uid` — a comparison, not a query, so
//     it is cheap and cannot be fooled by a document that lies about whose it is;
//   * a second profile for the same person is impossible by construction rather than
//     by a uniqueness check nobody remembers to write.
//
// THE FIELD LIST IS THE SHORTEST THING THAT ANSWERS A REAL QUESTION. It started as a
// copy of the old anonymous application form and eight fields have since been cut,
// because each one cost a member time at sign-up and nothing read it back:
//
//   why         a 400-character essay. Nothing consumed it. The single biggest piece of
//               friction on the form, asked of somebody who has not joined yet.
//   heard_from  marketing attribution nobody was attributing.
//   interests   a second taxonomy that overlapped `programs` — the dashboard was
//               charting both and they answered the same question twice.
//   updates     a consent tick for messages the club sends anyway, and says it sends
//               on the very next screen.
//   year_branch FREE TEXT FOR SOMETHING THE ADDRESS ALREADY SAYS. A member typed
//               "1st year, CSE" and the dashboard then guessed at it with two regexes
//               and an "Unparsed" bucket for the ones it could not read. The batch,
//               branch and roll are all in `abhinav.23bcs10045@sst.scaler.com`, which
//               the rules pin to the auth token — so it is now derived on read by
//               lib/batch.ts and never stored. See that file for why not stored.
//   level       "never contributed / some Git / merged PRs". A self-assessment made
//               before joining, that nothing acted on and that stops being true a
//               fortnight later.
//   programs    ten checkboxes of programme interest, answered by somebody who had not
//               yet met the club. Replaced by enrolling in a programme's mentorship
//               from the dashboard, which is a decision with a consequence rather than
//               a preference nobody reads. See lib/mentorship.ts.
//   programs_other  the free-text half of the same question.
//
// What is left is the three things a member has to tell us because nothing else can:
// their name, their hostel, and their GitHub if they have one.
//
// `email` is stored even though it is already on the Auth record. It is denormalised on
// purpose: the admin dashboard lists members without being able to read the Auth API
// from a browser, so without this every row would show a uid and no way to contact
// anybody. The rules pin it to `request.auth.token.email`, so it cannot drift or be
// forged into somebody else's address.

import { ALLOWED_EMAIL_DOMAIN, USERS, getDb } from "@/lib/firebase";

export type Profile = {
  /** Auth uid. Duplicated into the body as well as being the document id so a row read
   *  in the admin table knows its own key without threading it separately. */
  uid: string;
  /** Pinned to the signed-in address by the rules. Also the source of the batch, branch
   *  and roll — see lib/batch.ts. */
  email: string;
  name: string;
  hostel: string;
  github?: string;
  /** Which of the four entry paths brought them here.
   *
   *  THE ONE FIELD NOBODY IS ASKED FOR. Every closing action on the site links to
   *  /join?path=<id>, so a reader who pressed "join the program track" has already
   *  answered this — asking again on the next screen would be the site forgetting what
   *  it was just told. It is carried through sign-in and onboarding in the query string
   *  and saved silently, then shown back on the dashboard where it can be cleared.
   *
   *  Optional, because somebody who typed the URL or followed the nav button never
   *  passed one, and inventing a default would put every one of them in the same
   *  bucket in the organisers' breakdown. */
  path?: string;
  /** WHETHER THIS STUDENT IS ACTUALLY IN THE CLUB — the one field on this document its
   *  subject cannot write.
   *
   *  Signing in proves somebody studies here; it has never meant they joined anything.
   *  Everything else in this type is the member describing themselves, and it is
   *  theirs to edit. This is the club's statement about them, so the rules split
   *  users/{uid} into two write paths: the member may change everything except these
   *  three keys, and an admin may change nothing else. See onlyMembershipChanged() in
   *  firestore.rules — without it, a member could grant themselves membership by
   *  editing their own profile, and membership decides what they are allowed to read.
   *
   *  ABSENT MEANS NOT A MEMBER. Every profile written before this field existed belongs
   *  to somebody who signed in, which by itself was never membership in anything — so
   *  the default is the safe reading rather than a grandfather clause. Contrast
   *  `active` on a roster row, where an absent field means yes for the opposite
   *  reason. */
  membership?: "member" | "student";
  /** Which organiser last changed it, and when. Required by the rules on any write
   *  that touches `membership`, and stamped from the caller's own token rather than
   *  from the request body, so it cannot name somebody else. "Who is in this club" is
   *  the question the organisers' page opens with; a membership that changed with no
   *  record of who changed it cannot answer the follow-up. */
  membership_by?: string;
  membership_at?: unknown;
  /** Server timestamps, not client clocks. `created_at` is written once and the rules
   *  refuse to let an update change it, so "member since" is trustworthy. */
  created_at?: unknown;
  updated_at?: unknown;
};

/** Is this profile's owner in the club?
 *
 *  THE ONLY PLACE THIS FIELD IS COMPARED TO A STRING. Every call site asks a yes/no
 *  question, and a bare `p.membership === "member"` scattered through the components
 *  is how one of them ends up written as `"Member"` and silently answers no forever.
 *  Mirrors isClubMember() in firestore.rules, which is the actual boundary — this is
 *  what the screen uses to decide what to draw. */
export function isClubMember(p: Profile | null | undefined): boolean {
  return p?.membership === "member";
}

/** What the form must fill in before a profile counts as complete. Mirrors the
 *  `hasAll` list in firestore.rules; `npm run rules` fails if they diverge. */
export const REQUIRED_FIELDS = ["name", "email", "hostel"] as const;

/** True when every required field carries a real answer.
 *
 *  Used to decide whether to show the profile form or the finished profile, so it has
 *  to agree with the rules — a profile the rules accepted but this calls incomplete
 *  would trap a member in the form forever. */
export function isComplete(p: Partial<Profile> | null | undefined): boolean {
  if (!p) return false;
  for (const f of REQUIRED_FIELDS) {
    const v = (p as Record<string, unknown>)[f];
    if (typeof v !== "string" || v.trim() === "") return false;
  }
  return true;
}

/** Read the signed-in member's own profile. Returns null when they have not made one.
 *
 *  A permission error is NOT swallowed: it means the rules refused, which on this
 *  collection almost always means the address is off-domain, and hiding that would
 *  present as "your profile vanished". */
export async function readProfile(uid: string): Promise<Profile | null> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, USERS, uid));
  return snap.exists() ? ({ ...(snap.data() as Profile) }) : null;
}

/** Create or update the signed-in member's profile.
 *
 *  `setDoc` with merge is deliberate over `addDoc`/`updateDoc`: the same call has to
 *  work for a first save and for an edit, and merge means an edit that omits an
 *  optional field does not silently wipe a field the member filled in last week.
 *
 *  created_at is only sent on the FIRST save. The rules forbid changing it afterwards,
 *  so sending it on every save would make every edit fail — the kind of bug that only
 *  appears the second time somebody uses the page.
 *
 *  MERGE MEANS AN OPTIONAL FIELD CANNOT BE CLEARED BY OMITTING IT, which is the whole
 *  point of merge and also its one sharp edge. An empty string for `github` or `path`
 *  therefore means "remove this", and is sent as deleteField() rather than as "" — the
 *  rules require every stored string to be non-empty, so writing "" would be refused,
 *  and a member who cleared a field would see a save failure with no explanation. */
export async function saveProfile(
  uid: string,
  email: string,
  data: Omit<Profile, "uid" | "email" | "created_at" | "updated_at">,
  isFirstSave: boolean,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { deleteField, doc, serverTimestamp, setDoc } = await import("firebase/firestore");

  // Optional fields are OMITTED rather than written empty, so an absent github means
  // "not given" and the stored shape stays predictable for whoever reads these later.
  const body: Record<string, unknown> = {
    uid,
    email,
    name: data.name.trim(),
    hostel: data.hostel,
    updated_at: serverTimestamp(),
  };
  if (isFirstSave) body.created_at = serverTimestamp();

  for (const key of ["github", "path"] as const) {
    const v = data[key]?.trim() ?? "";
    if (v) body[key] = v;
    // Nothing to delete on a first save, and deleteField() in a create is rejected.
    else if (!isFirstSave) body[key] = deleteField();
  }

  await setDoc(doc(db, USERS, uid), body, { merge: true });
}

/** Admit somebody to the club, or remove them. Organisers only.
 *
 *  THE ONE WRITE IN THIS FILE TO SOMEBODY ELSE'S DOCUMENT, and it is deliberately the
 *  narrowest: three keys, merged, with the actor and the time supplied by the server
 *  and the rules refusing the write if any other field differs. An organiser cannot use
 *  this to correct a member's name — that stays the member's own, which is the point of
 *  splitting the write paths rather than giving admins a blanket update.
 *
 *  `by` IS PASSED IN RATHER THAN READ FROM THE AUTH CLIENT HERE, so this module stays
 *  free of the auth context and testable without one. It must be the caller's own
 *  address: the rules compare it against request.auth.token.email and refuse anything
 *  else, so passing another organiser's address fails the write rather than
 *  misattributing it. */
export async function setMembership(
  uid: string,
  member: boolean,
  by: string,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { doc, serverTimestamp, setDoc } = await import("firebase/firestore");
  // Written as "student" rather than removed, so the record says somebody decided this
  // rather than leaving it indistinguishable from a profile nobody has looked at.
  await setDoc(
    doc(db, USERS, uid),
    {
      membership: member ? "member" : "student",
      membership_by: by,
      membership_at: serverTimestamp(),
    },
    { merge: true },
  );
}

// READING THE MEMBERSHIP, AND WHAT IT COSTS.
//
// This used to be one function that read every profile on every dashboard load, and the
// comment defending it said the club was a few hundred people and pagination would be
// machinery with no user. That was true and is no longer: at 1,000 members one page load
// was ~1,000 reads, every Refresh was another 1,000, and about 33 of them would exhaust
// the 50,000-a-day free quota — for EVERYONE, including members trying to read their own
// profile. Three organisers planning a cohort could get there in an afternoon.
//
// So the page now pays for what it actually shows:
//
//   countProfiles()     1 read per 1,000 documents. Aggregates are billed on the size
//                       of the RESULT, not the scan, so the headline count is ~1 read.
//   readProfilePage()   one page of rows, 25 reads.
//   readAllProfiles()   still here, still a full scan — but nothing calls it on load.
//                       The breakdowns, the CSV export and search-across-everybody need
//                       every document by definition, so they are behind a control that
//                       says what it will cost.
//
// WHY THE BREAKDOWNS CANNOT BE AGGREGATED AWAY. Batch, branch and year are derived from
// the address by lib/batch.ts and are not fields — which is what makes them impossible to
// forge, and also what makes them impossible to query. `where('batch','==',...)` has
// nothing to match. That trade was made deliberately and is written up in FIREBASE.md;
// this is the bill for it. Hostel and path COULD be counted with aggregates, but a
// breakdown where three of five rows need a full scan anyway would be reading everything
// regardless, so they ride along.

/** How many members there are, without reading them.
 *
 *  `getCountFromServer` is billed at one read per 1,000 documents counted, so this is one
 *  read for the whole club rather than one per member. */
export async function countProfiles(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { collection, getCountFromServer } = await import("firebase/firestore");
  return (await getCountFromServer(collection(db, USERS))).data().count;
}

/** How many members joined in a window. One read, whatever the answer is.
 *
 *  This is what the eight-week trend is built from: eight of these is eight reads, where
 *  computing the same chart from the documents was one read per member. `end` is
 *  exclusive so consecutive buckets cannot both claim a profile written on the boundary. */
export async function countProfilesBetween(start: Date, end: Date): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { collection, getCountFromServer, query, where } = await import("firebase/firestore");
  return (
    await getCountFromServer(
      query(
        collection(db, USERS),
        where("created_at", ">=", start),
        where("created_at", "<", end),
      ),
    )
  ).data().count;
}

/** How many members gave a GitHub handle.
 *
 *  `> ""` rather than `!= null`, and the difference matters: an optional field is OMITTED
 *  when not given rather than written empty (see saveProfile), and Firestore excludes
 *  documents missing the field from any inequality. So this counts exactly the profiles
 *  that have a non-empty handle, which is the question being asked. */
export async function countProfilesWithGithub(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { collection, getCountFromServer, query, where } = await import("firebase/firestore");
  return (
    await getCountFromServer(query(collection(db, USERS), where("github", ">", "")))
  ).data().count;
}

/** An opaque cursor. It is really a QueryDocumentSnapshot, and it is deliberately not
 *  typed as one: callers pass it back and never look inside it, and threading Firestore's
 *  types through the components is how a "no Firebase import outside lib/" rule dies. */
export type Cursor = unknown;

export type ProfilePage = {
  rows: Profile[];
  /** null when there is nothing after this page. */
  cursor: Cursor | null;
  /** False when the last page has been reached, so the caller can hide "Load more"
   *  rather than offering a button that returns nothing. */
  more: boolean;
};

/** One page of members, newest first.
 *
 *  THE CURSOR IS A SNAPSHOT, NOT A TIMESTAMP. `startAfter(lastCreatedAt)` looks simpler
 *  and silently skips rows whenever two profiles share a created_at — which happens
 *  whenever two people finish the form in the same second, i.e. exactly during a
 *  build day. A snapshot cursor is positional and cannot tie. */
export async function readProfilePage(
  pageSize = 25,
  cursor: Cursor | null = null,
): Promise<ProfilePage> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { collection, getDocs, limit, orderBy, query, startAfter } = await import(
    "firebase/firestore"
  );
  // Ordered newest first. Members who predate created_at would be dropped by this
  // orderBy, which is acceptable only because the field has existed since the first
  // profile ever written — there are no such rows.
  //
  // One extra row is fetched and then discarded: it is how you know whether a next page
  // exists without a second query, and it costs one read rather than a round trip.
  const parts = [collection(db, USERS), orderBy("created_at", "desc")] as const;
  const q = cursor
    ? query(...parts, startAfter(cursor as never), limit(pageSize + 1))
    : query(...parts, limit(pageSize + 1));
  const snap = await getDocs(q);

  const more = snap.docs.length > pageSize;
  const docs = more ? snap.docs.slice(0, pageSize) : snap.docs;
  return {
    rows: docs.map((d) => ({ ...(d.data() as Profile), uid: d.id })),
    cursor: docs.length ? docs[docs.length - 1] : null,
    more,
  };
}

/** The profiles for a specific set of uids, in as few queries as possible.
 *
 *  WHY THIS EXISTS. The organisers' interest list is a join: one row per enrollment, but
 *  the NAME on that row lives on the member's profile. Done naively that is either a
 *  getDoc per row — 25 round trips for a page — or a full scan of the membership to build
 *  a lookup, which is what it used to do and what costs one read per member.
 *
 *  `documentId() in [...]` fetches them in one query per chunk instead, and the reads are
 *  exactly the documents wanted. THIRTY IS FIRESTORE'S LIMIT for an `in` clause, not a
 *  round number picked here — a page of 25 fits in one query, and the chunking is for
 *  callers that ask for more.
 *
 *  Missing uids are simply absent from the map. An enrollment whose member has no profile
 *  is a real possibility (the rules do not couple the two collections) and the caller
 *  renders it rather than dropping the row — an enrolment nobody can see is the worst
 *  outcome here. */
export async function readProfilesByIds(uids: string[]): Promise<Map<string, Profile>> {
  const out = new Map<string, Profile>();
  const wanted = [...new Set(uids)].filter(Boolean);
  if (wanted.length === 0) return out;

  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { collection, documentId, getDocs, query, where } = await import("firebase/firestore");

  const chunks: string[][] = [];
  for (let i = 0; i < wanted.length; i += 30) chunks.push(wanted.slice(i, i + 30));

  await Promise.all(
    chunks.map(async (chunk) => {
      const snap = await getDocs(
        query(collection(db, USERS), where(documentId(), "in", chunk)),
      );
      for (const d of snap.docs) out.set(d.id, { ...(d.data() as Profile), uid: d.id });
    }),
  );
  return out;
}

/** Every profile, in one go. One read per member.
 *
 *  NOT CALLED ON PAGE LOAD ANY MORE. It backs the breakdowns, the CSV export and
 *  search-across-the-whole-club — all of which genuinely need every document — and the
 *  dashboard states the cost before spending it. */
export async function readAllProfiles(): Promise<Profile[]> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { collection, getDocs, orderBy, query } = await import("firebase/firestore");
  const snap = await getDocs(query(collection(db, USERS), orderBy("created_at", "desc")));
  return snap.docs.map((d) => ({ ...(d.data() as Profile), uid: d.id }));
}

/** For the empty-state copy, so the domain is not written out twice. */
export const DOMAIN = ALLOWED_EMAIL_DOMAIN;

/** A Firestore timestamp, an ISO string or a Date -> a Date, or null.
 *
 *  Lives here rather than in a component because created_at is now read in two
 *  places — the organisers' table and the member's own card — and a six-line date
 *  coercion copied into both is a copy that drifts. It takes `unknown` because that
 *  is genuinely what a stored timestamp is on the client: the SDK hands back a
 *  Timestamp, the REST API and the emulator hand back a string, and a locally
 *  echoed profile can hold a Date. */
export function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(+v) ? null : v;
  if (typeof v === "object" && typeof (v as { toDate?: unknown }).toDate === "function") {
    const d = (v as { toDate: () => Date }).toDate();
    return isNaN(+d) ? null : d;
  }
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    return isNaN(+d) ? null : d;
  }
  return null;
}

/** "20 Aug 26". An em dash when there is no date, so a missing value reads as
 *  absent rather than as the epoch. */
export function fmtDate(v: unknown): string {
  const d = toDate(v);
  return d
    ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })
    : "\u2014";
}
