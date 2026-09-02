// When the club actually meets.
//
// WHY THIS IS NOT A NOTICE. The board and this collection look similar enough that the
// club ran sessions as pinned notices for a while, and it failed in two ways that a
// second field could not fix:
//
//   * a notice has no time, only a posting date, so "Saturday, 4pm, Lab 2" lived in the
//     body as prose and nothing could sort or filter on it; and
//   * a notice never stops being current, so last week's session sat above this week's
//     until somebody remembered to unpin it.
//
// A session has a `starts_at`, so the only two questions anyone asks of it — what is next,
// and has it happened — are answered by the data rather than by whoever is reading.
//
// `starts_at` IS THE ONE DATE IN THIS APP THAT IS NOT SERVER-STAMPED, and the rules make
// that explicit. Every other timestamp is pinned to `request.time` so a client cannot
// backdate a record; this one is chosen by the organiser and is nearly always in the
// future, so the same rule would make scheduling impossible.

import { SESSIONS, getDb } from "@/lib/firebase";
import { toDate } from "@/lib/profile";

export type SessionDoc = {
  id: string;
  title: string;
  /** Left off rather than guessed. The design shows "TBA" for an unbooked speaker, and an
   *  empty field says that more honestly than the word does. */
  speaker?: string;
  location?: string;
  notes?: string;
  /** A Firestore Timestamp on the way back, a Date on the way in. */
  starts_at: unknown;
  created_by: string;
  created_at?: unknown;
  updated_at?: unknown;
};

/** Every session, soonest first.
 *
 *  ORDERED IN MEMORY, not by the query. `orderBy("starts_at")` would be the obvious
 *  choice and is wrong here for the same reason it was wrong on the roster: it silently
 *  DROPS any document missing the field, and a session written by hand in the console —
 *  which is exactly how the first few will appear — is the most likely one to be missing
 *  it. A club has a few dozen of these; sorting them client-side costs nothing and cannot
 *  hide one. */
export async function readSessions(): Promise<SessionDoc[]> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, SESSIONS));
  return snap.docs
    .map((d) => ({ ...(d.data() as Omit<SessionDoc, "id">), id: d.id }))
    .sort((a, b) => (toDate(a.starts_at)?.getTime() ?? 0) - (toDate(b.starts_at)?.getTime() ?? 0));
}

/** The ones still to come.
 *
 *  A session counts as upcoming until it has STARTED, not until it has ended, because
 *  nothing here records a duration — and a member looking at the dashboard ten minutes
 *  into a session should still see where it is. */
export function upcoming(rows: SessionDoc[], now: Date = new Date()): SessionDoc[] {
  return rows.filter((r) => {
    const d = toDate(r.starts_at);
    return d !== null && d.getTime() >= now.getTime();
  });
}

/** Schedule one, or change it. Admins only — the rules refuse anybody else. */
export async function saveSession(
  id: string | null,
  authorEmail: string,
  data: { title: string; speaker?: string; location?: string; notes?: string; starts_at: Date },
  existing: SessionDoc | null,
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { addDoc, collection, doc, serverTimestamp, setDoc } = await import(
    "firebase/firestore"
  );

  const body: Record<string, unknown> = {
    title: data.title.trim(),
    starts_at: data.starts_at,
    // Frozen by the rules after the first write, so an edit returns the stored byline
    // rather than the current editor — otherwise editing somebody's session claims it.
    created_by: existing ? existing.created_by : authorEmail,
    updated_at: serverTimestamp(),
  };
  if (data.speaker?.trim()) body.speaker = data.speaker.trim();
  if (data.location?.trim()) body.location = data.location.trim();
  if (data.notes?.trim()) body.notes = data.notes.trim();
  if (!existing) body.created_at = serverTimestamp();
  else if (existing.created_at) body.created_at = existing.created_at;

  if (id) {
    await setDoc(doc(db, SESSIONS, id), body);
    return id;
  }
  const ref = await addDoc(collection(db, SESSIONS), body);
  return ref.id;
}

/** Cancel one. Admins only.
 *
 *  A real delete, unlike a notice's archive: a session carries nobody's answer, so nothing
 *  is lost — and a cancelled session that cannot be taken off the list is the club telling
 *  its members to turn up to a room nobody booked. */
export async function deleteSession(id: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { deleteDoc, doc } = await import("firebase/firestore");
  await deleteDoc(doc(db, SESSIONS, id));
}

/** "Oct 24, 18:00" — the design's two-line date cell, as one string per line. */
export function sessionWhen(v: unknown): { day: string; time: string } {
  const d = toDate(v);
  if (!d) return { day: "TBA", time: "" };
  return {
    day: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }).toUpperCase(),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

/** What `<input type="datetime-local">` wants, which is the local clock with no zone and
 *  no seconds. Built by hand rather than with toISOString(), which converts to UTC and
 *  would show an organiser in India a time several hours off the one they just picked. */
export function toLocalInput(v: unknown): string {
  const d = toDate(v);
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
