// The members-only notice board: its shape, and the four operations on it.
//
// WHY A COLLECTION RATHER THAN content/*.ts. Every other piece of copy on this site is
// a TypeScript file that ships with the build, and that is the right default — it is
// reviewable, diffable and free. It is the wrong answer here for one reason: this site
// is a static export deployed by a build, so a notice written in a content file is a
// notice that needs a commit, a CI run and a deploy before anybody can read it. An
// organiser posting "no session this Saturday" on a Friday night cannot be waiting on a
// pipeline. So the notice board is the one piece of copy that lives in Firestore.
//
// THE READ IS BULK, AND THAT IS THE EXCEPTION IN THIS APP. users/{uid} is admin-only to
// list, because every row is somebody's address. A post carries nothing personal beyond
// the organiser's byline, so members list it directly. Adding a field here that names a
// member means revisiting the `list` rule in firestore.rules before doing anything else.
//
// UNPAGINATED, deliberately, and on the same reasoning as the admin table: a club posts
// a few notices a week, the dashboard shows the newest handful, and pagination would be
// machinery with no user. `LIMIT` below is what keeps that honest as the collection
// grows — the query stops at the cap rather than reading five years of notices to render
// six of them.

import { ANNOUNCEMENTS, getDb } from "@/lib/firebase";
import { queryableAudiences, type Audience } from "@/lib/audience";

/** The three kinds of notice a club actually posts. A closed set, mirrored in
 *  firestore.rules, because each renders as a differently-coloured chip and an unknown
 *  value would render as an unstyled one. */
export type Category = "general" | "event" | "deadline";

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "general", label: "General" },
  { value: "event", label: "Event" },
  { value: "deadline", label: "Deadline" },
];

export type Announcement = {
  /** Firestore's generated document id. Not stored in the body — it is the key, and
   *  duplicating it buys nothing here because no rule compares against it. */
  id: string;
  title: string;
  body: string;
  /** Optional, and https-only — the rules reject anything else. A `javascript:` href in
   *  a field that renders as a link is the obvious hole in a board organisers type into,
   *  and it is closed in the rules rather than here, because here is a client. */
  link?: string;
  /** Pinned posts sort above everything, regardless of date. For the one notice that has
   *  to stay visible for a fortnight — a deadline, a venue change. */
  pinned: boolean;
  /** What kind of notice it is, shown as a chip so the board is scannable at a glance.
   *
   *  OPTIONAL, AND ABSENT MEANS "general". Notices posted before this field existed carry
   *  neither it nor `archived`, and the rules deliberately do not require either — a
   *  strict list would have made every existing notice unsaveable the moment those rules
   *  deployed. */
  category?: Category;
  /** Archived notices stay in the collection and stop being shown.
   *
   *  A HIDE RATHER THAN A DELETE, which is the difference between taking a notice down
   *  and destroying the only record that the club ever said it. Delete still exists for a
   *  notice posted by mistake; this is the ordinary way one comes off the board. */
  archived?: boolean;
  /** WHO THE NOTICE IS FOR. Absent means everyone — see lib/audience.ts for why that
   *  default is the only backward-compatible one, and firestore.rules for the copy of
   *  it that is actually enforced. */
  audience?: Audience;
  /** The organiser who posted. Pinned by the rules to the signed-in address, so a byline
   *  cannot be forged. */
  author_email: string;
  created_at?: unknown;
  updated_at?: unknown;
};

/** The newest posts, pinned ones first.
 *
 *  ORDERED IN JS RATHER THAN IN THE QUERY, and this is a real trade rather than
 *  laziness. `orderBy("pinned", "desc"), orderBy("created_at", "desc")` is a composite
 *  index, which means the first read on a fresh project fails with a
 *  `failed-precondition` and a console URL somebody has to click. The collection is
 *  capped at LIMIT documents in memory, so sorting two keys over at most 50 rows costs
 *  nothing and removes a deployment step that would otherwise be discovered in
 *  production. Order by created_at alone in the query so the LIMIT still takes the
 *  NEWEST rows rather than an arbitrary 50. */
const LIMIT = 50;

/** @param forClubMember  what the reader is, which decides what the QUERY may ask for —
 *    not what gets filtered afterwards. Pass `undefined` only for an organiser reading
 *    the board they administer; the rules let an admin see every audience, so their
 *    query carries no audience clause at all.
 *
 *  THE `where` CLAUSE IS NOT AN OPTIMISATION, IT IS WHAT MAKES THE READ SUCCEED. A
 *  Firestore list rule is judged against the QUERY rather than the rows it returns: the
 *  read is allowed only if the query's constraints prove the rule holds for anything it
 *  could match. Without this clause a member reading the board gets permission-denied
 *  outright — not a shorter list, and not only once a members-only notice exists. The
 *  rules and this clause have to describe the same set; queryableAudiences() is the
 *  single definition of it.
 *
 *  THE COMPOSITE INDEX IS THE COST, and it is the thing the header note above went out
 *  of its way to avoid for `pinned`. `where("audience", "in", …)` alongside
 *  `orderBy("created_at")` needs one, and unlike the pinned sort it cannot be done in
 *  memory — the filtering has to happen in the query or the read is refused. It is
 *  declared in firestore.indexes.json so it deploys with the rules rather than being
 *  discovered as a failed-precondition error in production. */
export async function readAnnouncements(
  forClubMember?: boolean,
): Promise<Announcement[]> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { collection, getDocs, limit, orderBy, query, where } = await import("firebase/firestore");
  const scope =
    forClubMember === undefined
      ? []
      : [where("audience", "in", queryableAudiences(forClubMember))];
  const snap = await getDocs(
    query(collection(db, ANNOUNCEMENTS), ...scope, orderBy("created_at", "desc"), limit(LIMIT)),
  );
  const rows = snap.docs.map((d) => ({ ...(d.data() as Omit<Announcement, "id">), id: d.id }));
  // ARCHIVED ROWS ARE RETURNED, not filtered out here. The organisers' screen has to show
  // them — an archive nobody can see is a delete with extra steps — so the filtering is
  // the member view's job. `live()` below is what that view calls.
  // Stable within each group because the query already ordered by date.
  return rows.sort((a, b) => Number(b.pinned) - Number(a.pinned));
}

/** The notices a member should see: everything that has not been taken down. */
export function live(rows: Announcement[]): Announcement[] {
  return rows.filter((r) => !r.archived);
}

/** What the composer must fill in. Mirrors `hasAll` in firestore.rules. */
export function isWellFormedPost(p: { title?: string; body?: string }): boolean {
  return Boolean(p.title?.trim()) && Boolean(p.body?.trim());
}

/** Post a notice. Admins only — the rules refuse a write to anybody else.
 *
 *  `link` is omitted rather than written empty, so an absent link unambiguously means
 *  "no link" and the rules' `!('link' in d)` branch is the one that runs. */
export async function createAnnouncement(
  authorEmail: string,
  data: {
    title: string;
    body: string;
    link?: string;
    pinned: boolean;
    category?: Category;
    audience: Audience;
  },
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { addDoc, collection, serverTimestamp } = await import("firebase/firestore");

  const body: Record<string, unknown> = {
    title: data.title.trim(),
    body: data.body.trim(),
    pinned: data.pinned,
    author_email: authorEmail,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };
  if (data.link?.trim()) body.link = data.link.trim();
  if (data.category) body.category = data.category;
  // ALWAYS WRITTEN, even when it is the default. Every other optional field here is
  // omitted when empty, and this one deliberately is not: a notice with no `audience`
  // key is invisible to the `where("audience", "in", …)` clause every reader now uses,
  // so omitting it would publish a notice that nobody but an organiser can see. Absent
  // still MEANS "both" for the rows written before this existed — it just must not be
  // how new ones are written.
  body.audience = data.audience;

  await addDoc(collection(db, ANNOUNCEMENTS), body);
}

/** Unpin or repin an existing notice.
 *
 *  A FULL setDoc, NOT updateDoc with one field. `isWellFormedPost` in the rules uses
 *  `hasOnly`/`hasAll` against `request.resource.data`, which on an update is the WHOLE
 *  merged document — so a one-field update still has to satisfy every clause, including
 *  `updated_at == request.time`. Sending only `pinned` leaves updated_at at its old
 *  value and the write is refused. That is the kind of failure that only appears the
 *  first time somebody presses the button in production. */
export async function setFlags(
  post: Announcement,
  flags: { pinned?: boolean; archived?: boolean },
): Promise<void> {
  const pinned = flags.pinned ?? post.pinned;
  const archived = flags.archived ?? post.archived ?? false;
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { doc, serverTimestamp, setDoc } = await import("firebase/firestore");

  const body: Record<string, unknown> = {
    title: post.title,
    body: post.body,
    pinned,
    author_email: post.author_email,
    updated_at: serverTimestamp(),
  };
  if (post.category) body.category = post.category;
  // Written only when true, so a notice that has never been archived keeps the field
  // absent and the rules' `!('archived' in d)` branch is the one that runs.
  if (archived) body.archived = true;
  // FROZEN BY THE RULES, SO IT IS SENT BACK UNCHANGED rather than omitted: the update
  // clause is `request.resource.data.created_at == resource.data.created_at`, and a write
  // that leaves the field out is indistinguishable from one erasing the date the notice
  // went up. The emulator suite asserts both directions.
  //
  // Guarded rather than assigned directly because `setDoc` REJECTS an explicit undefined
  // by default, and it would throw here with a message about the field rather than about
  // the read that failed to return it. Omitting it instead means the rules refuse the
  // write and the composer shows its ordinary error -- a bad outcome either way, but a
  // legible one.
  if (post.created_at !== undefined && post.created_at !== null) {
    body.created_at = post.created_at;
  }
  if (post.link) body.link = post.link;

  await setDoc(doc(db, ANNOUNCEMENTS, post.id), body);
}

/** Delete a notice. Admins only.
 *
 *  Deletable, unlike a profile — the reasoning is in firestore.rules. A notice with the
 *  wrong date has to be retractable, and there is no roster to lose here. */
export async function deleteAnnouncement(id: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { deleteDoc, doc } = await import("firebase/firestore");
  await deleteDoc(doc(db, ANNOUNCEMENTS, id));
}
