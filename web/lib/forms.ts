// Forms and polls, which are one thing.
//
// A POLL IS A FORM WITH ONE QUESTION AND ITS ANSWERS SHOWN BACK. Building them as two
// systems would have meant two schemas, two sets of rules, two admin screens and two
// places to fix the same bug — so there is one collection and `show_tally` is the entire
// difference. "Which Saturday suits you" with the counts visible is a poll; "sign up for
// the session" with them hidden is a form.
//
// ONE RESPONSE PER MEMBER, BY CONSTRUCTION. Responses live at
// forms/{id}/responses/{uid}, keyed by the Auth uid — the same trick as users/{uid}. A
// second response is not refused by a check somebody has to remember to write; it cannot
// be expressed.
//
// RESPONSES ARE ATTRIBUTED, and that is only safe because of the read rules. Organisers
// list them and see who answered — which is the point, since most of these are "sign up
// for X" and somebody has to chase the people who did not. Members cannot list them at
// all, so no member ever sees another member's answer. If that read rule is ever
// loosened, this stops being a form system and becomes a public one.
//
// THE TALLY IS NOT WRITTEN HERE, and could not be. A count the client supplies is a
// count the client invented, so `tally` is refused to every client by the rules and
// recomputed by a Cloud Function from the responses themselves. Same reasoning, and same
// shape, as the GitHub contribution counts.

import { FORMS, RESPONSES, getDb } from "@/lib/firebase";

/** What a question can be.
 *
 *  FOUR TYPES, AND NO MORE WITHOUT A REASON. Every extra type is a branch in the builder,
 *  a branch in the renderer, a branch in the tally and a branch in the CSV export. These
 *  four cover what a club actually asks: a name, a paragraph, pick one, pick several. */
export type FieldType = "short" | "long" | "choice" | "multi";

export type Field = {
  /** Stable key. Answers are stored against this, and the rules check answer keys against
   *  the form's `field_ids` — so renaming an id orphans every answer already given. The
   *  builder generates it once and never changes it. */
  id: string;
  label: string;
  type: FieldType;
  /** Required for `choice` and `multi`, meaningless otherwise. */
  options?: string[];
  required?: boolean;
};

export type FormDoc = {
  id: string;
  title: string;
  description?: string;
  fields: Field[];
  /** A flat mirror of `fields[].id`.
   *
   *  IT EXISTS FOR THE RULES, not for the client. Firestore rules cannot iterate a list of
   *  maps, so this is the only way `answers.keys().hasOnly(...)` can be expressed — and
   *  without that clause a member could append arbitrary keys to a document the organisers
   *  export. Written from `fields` by `saveForm` so the two cannot disagree; the rules
   *  additionally require the two lists to be the same length. */
  field_ids: string[];
  open: boolean;
  /** True makes it a poll: members see the counts once they have answered. */
  show_tally: boolean;
  /** field id -> option -> count. Written ONLY by the Cloud Function. */
  tally?: Record<string, Record<string, number>>;
  author_email: string;
  created_at?: unknown;
  updated_at?: unknown;
};

export type ResponseDoc = {
  uid: string;
  email: string;
  name?: string;
  answers: Record<string, string | string[]>;
  submitted_at?: unknown;
  updated_at?: unknown;
};

/** Every form, newest first.
 *
 *  Unpaginated and unfiltered, for the same reason the notice board is: a club runs a
 *  handful of these a term. The member view filters to the open ones in memory rather
 *  than in the query, so an organiser looking at /admin sees the closed ones too without
 *  a second read. */
export async function readForms(): Promise<FormDoc[]> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { collection, getDocs } = await import("firebase/firestore");
  // No orderBy: `created_at` is absent for the moment between a form being written and
  // the server stamping it, and an orderBy drops documents missing the field — which
  // would make a just-created form vanish from its author's screen.
  const snap = await getDocs(collection(db, FORMS));
  return snap.docs
    .map((d) => ({ ...(d.data() as Omit<FormDoc, "id">), id: d.id }))
    .sort((a, b) => ms(b.created_at) - ms(a.created_at));
}

function ms(v: unknown): number {
  if (v && typeof (v as { toMillis?: unknown }).toMillis === "function") {
    return (v as { toMillis: () => number }).toMillis();
  }
  return 0;
}

/** The signed-in member's own answer, or null. */
export async function readMyResponse(
  formId: string,
  uid: string,
): Promise<ResponseDoc | null> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, FORMS, formId, RESPONSES, uid));
  return snap.exists() ? (snap.data() as ResponseDoc) : null;
}

/** Every answer to one form. Admins only — the rules refuse the list to anybody else. */
export async function readResponses(formId: string): Promise<ResponseDoc[]> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, FORMS, formId, RESPONSES));
  return snap.docs.map((d) => ({ ...(d.data() as ResponseDoc), uid: d.id }));
}

/** Create or edit a form. Admins only.
 *
 *  `tally` is never sent. The rules refuse it on create and require it unchanged on
 *  update, so including it here would make every edit of a poll fail the moment it had
 *  any votes — which is exactly when somebody first tries to fix a typo in the question. */
export async function saveForm(
  id: string | null,
  authorEmail: string,
  data: {
    title: string;
    description?: string;
    fields: Field[];
    open: boolean;
    show_tally: boolean;
  },
  existing: FormDoc | null,
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { addDoc, collection, doc, serverTimestamp, setDoc } = await import(
    "firebase/firestore"
  );

  const body: Record<string, unknown> = {
    title: data.title.trim(),
    fields: data.fields,
    // Derived here, never typed, so it cannot disagree with `fields`.
    field_ids: data.fields.map((f) => f.id),
    open: data.open,
    show_tally: data.show_tally,
    // Frozen by the rules after the first write, so an edit returns the stored byline
    // rather than the current editor — otherwise editing somebody's form claims it.
    author_email: existing ? existing.author_email : authorEmail,
    updated_at: serverTimestamp(),
  };
  if (data.description?.trim()) body.description = data.description.trim();
  if (!existing) body.created_at = serverTimestamp();
  else if (existing.created_at) body.created_at = existing.created_at;

  if (id) {
    await setDoc(doc(db, FORMS, id), body);
    return id;
  }
  const ref = await addDoc(collection(db, FORMS), body);
  return ref.id;
}

/** Submit or change the signed-in member's answer.
 *
 *  `submitted_at` is written once and left alone afterwards, so "answered on the 3rd"
 *  stays true even after somebody changes their mind on the 5th. The rules do not freeze
 *  it — nothing depends on it being trustworthy — but rewriting it would quietly destroy
 *  the only record of when the club actually heard from somebody. */
export async function saveResponse(
  formId: string,
  uid: string,
  email: string,
  name: string | undefined,
  answers: Record<string, string | string[]>,
  existing: ResponseDoc | null,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Firebase is not configured");
  const { doc, serverTimestamp, setDoc } = await import("firebase/firestore");

  const body: Record<string, unknown> = {
    uid,
    email,
    answers,
    updated_at: serverTimestamp(),
  };
  if (name?.trim()) body.name = name.trim();
  if (!existing) body.submitted_at = serverTimestamp();
  else if (existing.submitted_at) body.submitted_at = existing.submitted_at;

  await setDoc(doc(db, FORMS, formId, RESPONSES, uid), body);
}

/** What the form still needs before it can be submitted. Empty means good to go.
 *
 *  Mirrors nothing in the rules deliberately: `required` is a courtesy to the member, not
 *  a boundary, and the rules do not enforce it. A club would rather have a half-filled
 *  sign-up than none. */
export function missingAnswers(
  form: FormDoc,
  answers: Record<string, string | string[]>,
): string[] {
  const out: string[] = [];
  for (const f of form.fields) {
    if (!f.required) continue;
    const v = answers[f.id];
    if (Array.isArray(v) ? v.length === 0 : !String(v ?? "").trim()) out.push(f.label);
  }
  return out;
}

/** A stable field id from a label, plus an index so two identically-named questions do
 *  not collide. Generated once at creation — see the note on `Field.id`. */
export function fieldId(label: string, i: number): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return slug ? `${slug}-${i}` : `q-${i}`;
}
