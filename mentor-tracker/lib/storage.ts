// Data-access layer for the lead's mentors/mentees.
//
// This used to be localStorage-backed; it is now backed by Postgres via the
// authenticated /api/mentors and /api/mentees routes. The UI only ever calls
// these functions, so the storage backend stayed swappable exactly as intended
// — and now no mentee PII (names, emails) ever touches the browser's storage.

export type Mentee = { id: string; name: string; email: string; github: string };
export type Mentor = {
  id: string;
  name: string;
  github: string | null;
  mentees: Mentee[];
};
export type Store = { mentors: Mentor[] };

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function fetchStore(): Promise<Store> {
  const res = await fetch("/api/mentors", { cache: "no-store" });
  const data = await jsonOrThrow<{ mentors: Mentor[] }>(res);
  return { mentors: data.mentors };
}

export async function createMentor(input: {
  name: string;
  github?: string;
}): Promise<Mentor> {
  const res = await fetch("/api/mentors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await jsonOrThrow<{ mentor: Mentor }>(res);
  return data.mentor;
}

export async function deleteMentor(id: string): Promise<void> {
  const res = await fetch(`/api/mentors/${id}`, { method: "DELETE" });
  await jsonOrThrow<{ ok: true }>(res);
}

export async function createMentee(input: {
  mentorId: string;
  name: string;
  email: string;
  github: string;
}): Promise<Mentee> {
  const res = await fetch("/api/mentees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await jsonOrThrow<{ mentee: Mentee }>(res);
  return data.mentee;
}

export async function deleteMentee(id: string): Promise<void> {
  const res = await fetch(`/api/mentees/${id}`, { method: "DELETE" });
  await jsonOrThrow<{ ok: true }>(res);
}
