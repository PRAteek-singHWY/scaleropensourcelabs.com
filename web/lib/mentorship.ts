// Mentorship: the mentors an organiser publishes, and the preferences a member records
// against them. Two collections, one feature, one module.
//
// NOT TO BE CONFUSED WITH components/Mentors.tsx AND `MENTORS` IN content/club.ts. Those
// are a PUBLIC MARKETING section — hard-coded, consent-gated, rendered to anybody reading
// the site, and currently empty. This is the private, signed-in machinery the club runs
// its GSoC cohort with. The two will look similar in a file listing and have nothing to do
// with each other; if they ever need to share data, it is the marketing page that should
// read from here, never the reverse, because a mentor consenting to run office hours is
// not the same as consenting to be named on a public web page.
//
// WHY PREFERENCES AND NOT ASSIGNMENTS. A member records a first choice and either a second
// choice or "first preference only". Nothing here turns that into an allocation: no
// capacity, no approval queue, no confirmed-mentor field. That is a deliberate stopping
// point rather than an unfinished one — pairing thirty students with six mentors is a
// conversation an organiser has once a term with the whole picture in front of them, and a
// half-built approval workflow would be a queue somebody has to staff for no gain. The
// dashboard gives them the picture; the pairing stays a human decision.
//
// ONE READ PER COLLECTION PER DASHBOARD LOAD, unpaginated, for the same reason as
// readAllProfiles: a few hundred documents against a 50,000-a-day free quota.

import { ENROLLMENTS, MENTORS, getDb } from "@/lib/firebase";

/** A mentor, as an organiser writes them. Every field here is published to every signed-in
 *  member, so nothing personal beyond what the mentor agreed to be listed with belongs in
 *  it. */
export type Mentor = {
  /** Firestore's generated id. Not stored in the body — unlike a profile's uid, nothing
   *  reads a mentor row without already knowing which one it fetched. */
  id: string;
  name: string;
  /** The long field, and the one that decides whether a student picks them. What they
   *  work on, what they are useful for, what they are not. */
  description: string;
  /** A value from PROGRAMS in content/join.ts. `gsoc` for now; the closed set is there so
   *  a second programme does not need a schema change. */
  programme: string;
  /** The organisation they got into, when there is one. */
  org?: string;
  github?: string;
  /** How a matched student reaches them. Optional because an organiser may prefer to
   *  make the introduction themselves. */
  email?: string;
  /** False hides them from the picker while leaving every existing preference resolving
   *  to their name. The normal way to retire a mentor; deleting is for a row that was
   *  created by mistake. */
  active: boolean;
  created_at?: unknown;
  updated_at?: unknown;
};

/** What an organiser fills in. The id and the timestamps are not theirs to set. */
export type MentorInput = Omit<Mentor, "id" | "created_at" | "updated_at">;

/** A member's recorded interest in one programme's mentorship. */
export type Enrollment = {
  /** Also the document id. */
  uid: string;
  /** Pinned to the signed-in address by the rules, and denormalised for the same reason
   *  as on a profile: the dashboard cannot read the Auth API from a browser. */
  email: string;
  programme: string;
  /** Mentor ids. `mentor_2` is absent exactly when `first_only` is true. */
  mentor_1: string;
  mentor_2?: string;
  /** "I want my first preference only." Stored rather than inferred from the absence of
   *  mentor_2, because those are two different statements: one is a decision, the other
   *  is an unanswered question, and an organiser reading the list needs to tell them
   *  apart. The rules enforce that exactly one of the two is present. */
  first_only: boolean;
  created_at?: unknown;
  updated_at?: unknown;
};

// ---------------------------------------------------------------------- mentors

/** Every mentor, including hidden ones. Any signed-in member may read this; the picker
 *  filters to `active` itself so the dashboard can still name a hidden mentor somebody
 *  already picked.
 *
 *  Ordered by name rather than by creation. A list an organiser scans for a person is
 *  alphabetical; "newest first" is right for a roster and wrong for a directory. */
export async function readMentors(): Promise<Mentor[]> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { collection, getDocs, orderBy, query } = await import("firebase/firestore");
  const snap = await getDocs(query(collection(db, MENTORS), orderBy("name")));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<Mentor, "id">), id: d.id }));
}

/** Create a mentor (no id) or update one (id given). Admins only — the rules refuse
 *  everybody else, and this function does not check, because a client-side check would be
 *  a second answer to a question the rules already answer. */
export async function saveMentor(input: MentorInput, id?: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { addDoc, collection, deleteField, doc, serverTimestamp, setDoc } = await import(
    "firebase/firestore"
  );

  // Optional fields omitted rather than written empty, as everywhere else in this repo.
  const body: Record<string, unknown> = {
    name: input.name.trim(),
    description: input.description.trim(),
    programme: input.programme,
    active: input.active,
    updated_at: serverTimestamp(),
  };

  if (id) {
    // MERGE, PLUS AN EXPLICIT deleteField() ON EVERY OPTIONAL. Merge alone is the trap
    // here: an organiser who empties the "org" box means "this mentor has no
    // organisation", and a plain merge would silently keep last week's value — they would
    // watch it save, reload, and find their deletion undone. Naming the deletion says it
    // outright.
    //
    // Merge is what keeps created_at intact without re-sending it, so an edit cannot
    // accidentally forge the one date the rules freeze.
    for (const key of ["org", "github", "email"] as const) {
      const v = input[key]?.trim();
      body[key] = v ? v : deleteField();
    }
    await setDoc(doc(db, MENTORS, id), body, { merge: true });
    return id;
  }

  for (const key of ["org", "github", "email"] as const) {
    const v = input[key]?.trim();
    if (v) body[key] = v;
  }
  body.created_at = serverTimestamp();
  const ref = await addDoc(collection(db, MENTORS), body);
  return ref.id;
}

/** One mentor by id, or null. */
export async function readMentor(id: string): Promise<Mentor | null> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, MENTORS, id));
  return snap.exists() ? { ...(snap.data() as Omit<Mentor, "id">), id: snap.id } : null;
}

/** Delete a mentor. Admins only.
 *
 *  THE CALLER MUST CHECK THAT NOBODY HAS PICKED THEM. Firestore rules cannot express
 *  "no document in another collection references this one" — that would need a query,
 *  and rules cannot query — so the guard lives in AdminMentors.tsx, which already has
 *  every enrollment in memory and hides the button when the count is not zero. A mentor
 *  removed out from under a preference would leave the interest list showing an id, so
 *  if you ever call this from somewhere else, do the same check first. */
export async function deleteMentor(id: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { deleteDoc, doc } = await import("firebase/firestore");
  await deleteDoc(doc(db, MENTORS, id));
}

// ------------------------------------------------------------------ enrollments

/** The signed-in member's own enrollment, or null when they have not made one. */
export async function readEnrollment(uid: string): Promise<Enrollment | null> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, ENROLLMENTS, uid));
  return snap.exists() ? ({ ...(snap.data() as Enrollment), uid: snap.id }) : null;
}

/** Record or change a member's preferences.
 *
 *  Same created_at-once rule as a profile, and the same reason: the rules freeze it, so
 *  re-sending it on an edit would make every edit fail.
 *
 *  mentor_2 is deleted rather than omitted when `first_only` is set, because a member
 *  switching from "second choice" to "first preference only" is exactly the edit that
 *  would otherwise leave a stale second choice in the document — and the rules reject a
 *  document carrying both, so it would present as a save that stopped working. */
export async function saveEnrollment(
  uid: string,
  email: string,
  data: { programme: string; mentor_1: string; mentor_2?: string; first_only: boolean },
  isFirstSave: boolean,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { deleteField, doc, serverTimestamp, setDoc } = await import("firebase/firestore");

  const body: Record<string, unknown> = {
    uid,
    email,
    programme: data.programme,
    mentor_1: data.mentor_1,
    first_only: data.first_only,
    updated_at: serverTimestamp(),
  };
  if (isFirstSave) body.created_at = serverTimestamp();

  if (!data.first_only && data.mentor_2) body.mentor_2 = data.mentor_2;
  else if (!isFirstSave) body.mentor_2 = deleteField();

  await setDoc(doc(db, ENROLLMENTS, uid), body, { merge: true });
}

/** Withdraw. The member's own decision, so it is a button rather than an email — see the
 *  note on ENROLLMENTS in lib/firebase.ts for why this is allowed where a profile delete
 *  is not. */
export async function withdrawEnrollment(uid: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { deleteDoc, doc } = await import("firebase/firestore");
  await deleteDoc(doc(db, ENROLLMENTS, uid));
}

/** Every enrollment. Admins only — the rules refuse a list to anybody else. */
export async function readAllEnrollments(): Promise<Enrollment[]> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { collection, getDocs, orderBy, query } = await import("firebase/firestore");
  const snap = await getDocs(
    query(collection(db, ENROLLMENTS), orderBy("created_at", "desc")),
  );
  return snap.docs.map((d) => ({ ...(d.data() as Enrollment), uid: d.id }));
}

// ----------------------------------------------------------------------- shared

/** How many members picked each mentor, in each position.
 *
 *  Computed here rather than in the two components that need it — the admin table's
 *  delete guard and the statistics panel — so "how many people picked this mentor" has
 *  one definition. A member counts once per position, so somebody who put a mentor first
 *  and nobody second contributes 1 to `first` and 0 to `second`. */
export function pickCounts(
  enrollments: Enrollment[],
): Map<string, { first: number; second: number; total: number }> {
  const out = new Map<string, { first: number; second: number; total: number }>();
  const bump = (id: string | undefined, key: "first" | "second") => {
    if (!id) return;
    const row = out.get(id) ?? { first: 0, second: 0, total: 0 };
    row[key] += 1;
    row.total += 1;
    out.set(id, row);
  };
  for (const e of enrollments) {
    bump(e.mentor_1, "first");
    bump(e.mentor_2, "second");
  }
  return out;
}

/** Mentor id -> name, for rendering a stored preference. Falls back to a visibly broken
 *  string rather than an empty cell: an id showing through means a mentor was deleted
 *  while somebody had picked them, and that should look wrong rather than look absent. */
export function mentorNames(mentors: Mentor[]): Map<string, string> {
  return new Map(mentors.map((m) => [m.id, m.name]));
}

/** The label for a stored mentor id. */
export function mentorLabel(names: Map<string, string>, id?: string): string {
  if (!id) return "—";
  return names.get(id) ?? `deleted mentor (${id.slice(0, 6)})`;
}
