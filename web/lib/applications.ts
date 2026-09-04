// THE APPLICATION: one anonymous submission, fired once into applications/{id}.
//
// SEPARATE FROM lib/profile.ts ON PURPOSE, and the separation is the whole point of
// this file rather than an accident of history. They look similar — near-identical
// field lists, the same closed sets — and the temptation is to share one module and
// one form. What makes them different is not the shape of the data but WHO IS ASKING:
//
//   an application  is written by a stranger. There is no uid, no verified address and
//                   nothing to prove ownership with, so it is create-only, immutable,
//                   and validated entirely by firestore.rules on the way in.
//   a profile       is written by a signed-in member against their own uid, and can be
//                   read back and edited for as long as they are a member.
//
// Collapsing those two into one code path is what produced the state this replaced,
// where you could not apply at all without first having a college Google account —
// the club's front door required the key you get by walking through it.
//
// APPLYING DOES NOT REQUIRE SIGN-IN AND MUST NEVER START TO. If a future change wants
// the applicant's email verified, the answer is a mail loop or an organiser reading the
// row, not an auth gate: the site's own headline promises the reader they need nothing
// but a laptop and a GitHub account, and a Google-account wall on the apply form makes
// that sentence false at the exact moment somebody acts on it.
//
// NOBODY CAN READ THIS COLLECTION FROM THE CLIENT, including admins — see the match
// block in firestore.rules. Organisers read applications in the Firebase console. That
// is a deliberate floor rather than a missing feature: these rows hold names, addresses
// and hostels belonging to people who are not members yet and never agreed to appear
// in anything, so the smallest surface that still lets the club act on them is the
// right one. If an organisers' view is ever wanted, it needs its own admin-only read
// rule and a decision about retention, not a loosened `allow read`.

import { APPLICATIONS, getDb, isConfigured } from "@/lib/firebase";

/** Everything the form collects. Field names are the form's own, so a stored document
 *  reads the same as the markup that produced it, and `isWellFormedApplication` in
 *  firestore.rules validates this exact shape — `npm run rules` keeps the two honest. */
export type Application = {
  name: string;
  /** Asked, unlike on a profile, because there is no signed-in account to take it from.
   *  NOT restricted to the college domain: somebody applying from a personal address is
   *  an applicant to talk to, not a forgery to reject, and the domain rule belongs on
   *  membership rather than on the act of asking. */
  email: string;
  year_branch: string;
  hostel: string;
  level: string;
  path: string;
  programs: string[];
  programs_other?: string;
  github?: string;
};

/** Distinguishes "we gave up waiting" from "Firestore said no", because the two need
 *  different words in front of an applicant — see the race in `submitApplication`. A
 *  named class rather than a string match on the message, so it cannot be confused with
 *  a Firebase error that happens to mention time. */
export class TimeoutError extends Error {
  constructor() {
    super("Timed out waiting for the application store");
    this.name = "TimeoutError";
  }
}

/** Thrown when there is no Firebase project to write to. Separate from every other
 *  failure because it is not a failure of the applicant's or of the network — it is
 *  this deployment not being wired up, which needs different words and no retry. */
export class NotConfiguredError extends Error {
  constructor() {
    super("Firebase is not configured");
    this.name = "NotConfiguredError";
  }
}

/** How long to wait before telling the applicant we could not confirm the write.
 *
 *  12s is chosen to be longer than a slow-but-working submit on campus wifi and short
 *  enough that nobody assumes the page is broken. A rejected permission or a validation
 *  failure still arrives in well under a second and takes the caller's catch instead. */
const TIMEOUT_MS = 12_000;

/** Submit one application. Resolves when Firestore has confirmed the write.
 *
 *  Throws `NotConfiguredError` when this deployment has no Firebase project,
 *  `TimeoutError` when the write could not be confirmed, and whatever Firestore threw
 *  otherwise. The caller is expected to say something different for each. */
export async function submitApplication(data: Application): Promise<void> {
  // Checked before touching the SDK so an unconfigured deployment fails instantly and
  // by name, rather than after a dynamic import and a queued write that never settles.
  if (!isConfigured()) throw new NotConfiguredError();

  const db = await getDb();
  // Belt and braces: isConfigured() already returned true, so this is only reachable
  // if the SDK import itself failed.
  if (!db) throw new NotConfiguredError();

  const { addDoc, collection, serverTimestamp } = await import("firebase/firestore");

  const doc: Record<string, unknown> = {
    name: data.name,
    email: data.email,
    year_branch: data.year_branch,
    hostel: data.hostel,
    level: data.level,
    path: data.path,
    programs: data.programs,
    // The SERVER's clock. The rules require `submitted_at == request.time`, so a
    // client-supplied Date is rejected — which is the point: submission order cannot be
    // forged even though every other field here is supplied by a stranger.
    submitted_at: serverTimestamp(),
  };

  // Optional fields are OMITTED rather than written empty, matching the
  // present-or-absent shape the rules allow. An absent `github` then means "not given"
  // rather than "gave an empty string", and the stored shape stays predictable for
  // whoever reads these rows later.
  if (data.github) doc.github = data.github;
  // Only ever present when Other is ticked, because that is the only state in which the
  // input exists to be read. The rules enforce the pairing in BOTH directions, so a
  // hand-rolled SDK call cannot send one without the other.
  if (data.programs_other) doc.programs_other = data.programs_other;

  // RACED AGAINST A TIMEOUT, because addDoc does not reject when the backend is
  // unreachable — it queues the write and retries the channel indefinitely. Found by
  // pointing the client at a project that does not exist: six retries went out, the
  // promise never settled, and the button said "Sending…" forever with no message. An
  // applicant would sit there, then leave.
  await Promise.race([
    addDoc(collection(db, APPLICATIONS), doc),
    new Promise((_, reject) => setTimeout(() => reject(new TimeoutError()), TIMEOUT_MS)),
  ]);
}
