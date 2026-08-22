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
// copy of the old anonymous application form and four fields have since been cut,
// because each one cost a member time at sign-up and nothing read it back:
//
//   why         a 400-character essay. Nothing consumed it. The single biggest piece of
//               friction on the form, asked of somebody who has not joined yet.
//   heard_from  marketing attribution nobody was attributing.
//   interests   a second taxonomy that overlapped `programs` — the dashboard was
//               charting both and they answered the same question twice.
//   updates     a consent tick for messages the club sends anyway, and says it sends
//               on the very next screen.
//
// What is left is exactly what the organisers' dashboard counts: who, which year and
// branch, which hostel, how experienced, which route in, which programmes.
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
  /** Pinned to the signed-in address by the rules. */
  email: string;
  name: string;
  year_branch: string;
  hostel: string;
  level: string;
  path: string;
  programs: string[];
  programs_other?: string;
  github?: string;
  /** Server timestamps, not client clocks. `created_at` is written once and the rules
   *  refuse to let an update change it, so "member since" is trustworthy. */
  created_at?: unknown;
  updated_at?: unknown;
};

/** What the form must fill in before a profile counts as complete. Mirrors the
 *  `hasAll` list in firestore.rules; `npm run rules` fails if they diverge. */
export const REQUIRED_FIELDS = [
  "name",
  "email",
  "year_branch",
  "hostel",
  "level",
  "path",
  "programs",
] as const;

/** True when every required field carries a real answer.
 *
 *  Used to decide whether to show the profile form or the finished profile, so it has
 *  to agree with the rules — a profile the rules accepted but this calls incomplete
 *  would trap a member in the form forever. */
export function isComplete(p: Partial<Profile> | null | undefined): boolean {
  if (!p) return false;
  for (const f of REQUIRED_FIELDS) {
    const v = (p as Record<string, unknown>)[f];
    if (Array.isArray(v)) {
      if (v.length === 0) return false;
    } else if (typeof v !== "string" || v.trim() === "") {
      return false;
    }
  }
  // 'other' without the text naming it is not a complete answer, and the rules reject
  // it too. Checked here so the form can say so instead of the write failing.
  if (p.programs?.includes("other") && !p.programs_other?.trim()) return false;
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
 *  appears the second time somebody uses the page. */
export async function saveProfile(
  uid: string,
  email: string,
  data: Omit<Profile, "uid" | "email" | "created_at" | "updated_at">,
  isFirstSave: boolean,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { doc, serverTimestamp, setDoc } = await import("firebase/firestore");

  // Optional fields are OMITTED rather than written empty, so an absent github means
  // "not given" and the stored shape stays predictable for whoever reads these later.
  const body: Record<string, unknown> = {
    uid,
    email,
    name: data.name.trim(),
    year_branch: data.year_branch.trim(),
    hostel: data.hostel,
    level: data.level,
    path: data.path,
    programs: data.programs,
    updated_at: serverTimestamp(),
  };
  if (isFirstSave) body.created_at = serverTimestamp();
  if (data.programs.includes("other") && data.programs_other?.trim()) {
    body.programs_other = data.programs_other.trim();
  }
  if (data.github?.trim()) body.github = data.github.trim();

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
