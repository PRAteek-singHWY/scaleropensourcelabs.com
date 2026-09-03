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
  /** Server timestamps, not client clocks. `created_at` is written once and the rules
   *  refuse to let an update change it, so "member since" is trustworthy. */
  created_at?: unknown;
  updated_at?: unknown;
};

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

/** Read every profile. Admins only — the rules refuse a list to anybody else.
 *
 *  Unpaginated on purpose: the club is a few hundred people, one read per member per
 *  dashboard load, against a free quota of 50,000 reads a day. Paginating that would be
 *  machinery with no user. If the club ever passes a few thousand members this needs
 *  revisiting, and the dashboard says so on screen rather than degrading quietly. */
export async function readAllProfiles(): Promise<Profile[]> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { collection, getDocs, orderBy, query } = await import("firebase/firestore");
  // Ordered newest first. Members who predate created_at would be dropped by this
  // orderBy, which is acceptable only because the field has existed since the first
  // profile ever written — there are no such rows.
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
