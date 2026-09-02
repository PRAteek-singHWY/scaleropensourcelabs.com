// The core-team roster: who runs the club, and what that entitles them to.
//
// ONE ROW PER PERSON, KEYED BY EMAIL, holding BOTH halves of "core team":
//
//   the access grant   role + active, which firestore.rules reads on every request
//   the public billing name + title + photo, which the /team page shows
//
// THEY ARE ONE ROW BECAUSE THEY WERE TWO LISTS AND THE TWO LISTS DRIFTED. The club kept
// its team in `content/club.ts` (a commit and a deploy) and its access in `admins` (a
// console edit), and nothing connected them — so the failure was silent in both
// directions: somebody who left still had admin, or a new lead could not get in but
// appeared on the site. A club whose team turns over yearly cannot maintain that.
//
// KEYED BY EMAIL RATHER THAN uid, which is the decision that makes churn cheap: an
// organiser can be added BEFORE they have ever signed in. With uid keys you would have
// to make them sign in, read their uid out of the Auth tab, and only then grant access.
// For a club adding people monthly that is a bad first day, every month.
//
// RETIRING IS `active: false`, NEVER A DELETE — the rules refuse deletes outright. It
// revokes just as fast (the rules read the field on every request) and keeps the record
// of who ran the club when, which is the thing a handover actually needs.
//
// WHY THE PUBLIC HALF DOES NOT REACH /team FROM HERE. Firestore rules are per-DOCUMENT,
// not per-field: a public page reading this collection would read whole rows, and the
// document id IS an email — so it would publish every organiser's inbox alongside their
// name. The public page is generated from these rows at BUILD time instead, by
// scripts/team-roster.mjs, which takes only the public fields.

import { ADMINS, getDb } from "@/lib/firebase";

/** `admin` runs the club. `owner` additionally changes this list.
 *
 *  Two tiers rather than one, because both alternatives were worse: console-only
 *  appointment makes every addition wait on whoever holds console access — and that
 *  person eventually graduates — while letting any admin appoint any admin means one
 *  compromised college account can appoint accomplices and demote everybody else. */
export type Role = "owner" | "admin";

/** Which tier of the public chart somebody sits on.
 *
 *  A CLOSED SET, mirrored in firestore.rules, because the team page emits one section per
 *  known value — an unrecognised tier would drop that person off the page ENTIRELY rather
 *  than render them oddly, which is the kind of failure nobody notices until the person
 *  asks why they are not on the site. */
export type Group = "officer" | "lead" | "shadow";

export const GROUPS: { value: Group; label: string }[] = [
  { value: "officer", label: "Officer — president, vice-president" },
  { value: "lead", label: "Lead — runs a function" },
  { value: "shadow", label: "Shadow — learning an office" },
];

export type RosterRow = {
  /** Lowercased. It is also the document id; the rules require the two to agree so a row
   *  cannot grant access to one address while claiming to describe another. */
  email: string;
  name: string;
  /** What they do — "Lead", "Design", "Shadow". Free text, because a club invents titles
   *  faster than any enum survives. */
  title?: string;
  /** Path under /public, or an absolute URL. Optional: the team page already falls back
   *  to a designed monogram, so a new lead is not blocked on finding a photo. */
  photo?: string;
  role: Role;
  active: boolean;
  /** Absent on rows written before the team page was driven from here. `npm run
   *  team:sync` names anybody missing it rather than guessing a tier. */
  group?: Group;
  /** Graduating batch, written as it is said out loud: "'28". Optional and left off
   *  rather than guessed — it is the fact a reader uses to place everybody else, so an
   *  approximate one is worse than none. */
  batch?: string;
  github?: string;
  /** The OFFICE a shadow shadows ("Repo Lead"), not the person holding it — the whole
   *  point of a shadow is that the office outlives whoever currently has it. */
  shadow_of?: string;
  added_by: string;
  added_at?: unknown;
  updated_at?: unknown;
};

/** Everybody, retired included, newest first among the actives.
 *
 *  RETIRED ROWS ARE RETURNED RATHER THAN FILTERED OUT, because the roster screen has to
 *  show them: an owner needs to see that somebody was retired in order to bring them
 *  back, and a handover record nobody can read is not a record. Callers that want only
 *  the current team filter on `active` — `publicRoster()` below does exactly that. */
export async function readRoster(): Promise<RosterRow[]> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { collection, getDocs } = await import("firebase/firestore");
  // No orderBy. `added_at` is absent on every row seeded before this field existed, and
  // an orderBy silently DROPS documents missing the field — which would hide exactly the
  // longest-serving organisers. Sorted in memory instead; the roster is a dozen rows.
  const snap = await getDocs(collection(db, ADMINS));
  return snap.docs
    .map((d) => ({ ...(d.data() as Omit<RosterRow, "email">), email: d.id }))
    .sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      if (a.role !== b.role) return a.role === "owner" ? -1 : 1;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });
}

/** The current team, in the order the public page should show them. */
export function publicRoster(rows: RosterRow[]): RosterRow[] {
  return rows.filter((r) => r.active);
}

/** Add somebody, or change what they are. Owners only — the rules refuse anybody else.
 *
 *  ONE FUNCTION FOR BOTH, because `setDoc` with an email key is idempotent: appointing
 *  somebody who already has a retired row is the same write as bringing them back, and a
 *  separate `create` would fail on exactly that case — which is the common one, since a
 *  club re-appoints people between years.
 *
 *  `added_by` and `added_at` are sent ONLY on a first write. The rules freeze both
 *  afterwards, so sending them on every save would make every edit fail — the kind of bug
 *  that appears the second time somebody uses the screen, not the first. */
export async function saveRosterRow(
  email: string,
  data: {
    name: string;
    title?: string;
    photo?: string;
    role: Role;
    active: boolean;
    group?: Group;
    batch?: string;
    github?: string;
    shadow_of?: string;
  },
  actorEmail: string,
  existing: RosterRow | null,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { doc, serverTimestamp, setDoc } = await import("firebase/firestore");

  const key = email.trim().toLowerCase();
  const body: Record<string, unknown> = {
    email: key,
    name: data.name.trim(),
    role: data.role,
    active: data.active,
    // Frozen by the rules once written, so an edit must return the stored value rather
    // than the current actor — otherwise every edit rewrites history to say the last
    // person to touch the row is the one who granted it.
    added_by: existing ? existing.added_by : actorEmail,
    updated_at: serverTimestamp(),
  };
  if (!existing) body.added_at = serverTimestamp();
  else if (existing.added_at !== undefined && existing.added_at !== null) {
    body.added_at = existing.added_at;
  }
  // Optional fields are OMITTED rather than written empty, so an absent photo
  // unambiguously means "no photo" and the rules' `!('photo' in d)` branch runs.
  if (data.title?.trim()) body.title = data.title.trim();
  if (data.photo?.trim()) body.photo = data.photo.trim();
  if (data.group) body.group = data.group;
  if (data.batch?.trim()) body.batch = data.batch.trim();
  if (data.github?.trim()) body.github = data.github.trim();
  // Only meaningful for a shadow. Dropped otherwise, so changing somebody from shadow to
  // lead does not leave a stale "shadows the Repo Lead" on their row.
  if (data.group === "shadow" && data.shadow_of?.trim()) {
    body.shadow_of = data.shadow_of.trim();
  }

  await setDoc(doc(db, ADMINS, key), body);
}

/** True for an address this club will register, reused for the roster form so somebody
 *  cannot be appointed at an address that can never sign in. The rules enforce the same
 *  thing; this is so the screen can say so instead of the write failing. */
export function isCollegeAddress(email: string, domain: string): boolean {
  return new RegExp(`^[^@\\s]+@${domain.replace(/\./g, "\\.")}$`, "i").test(email.trim());
}
