"use client";

// The mentor list, as the organisers manage it. Add, edit, hide, delete.
//
// THIS IS THE ONE PLACE IN THE APP WHERE A CLIENT WRITES A DOCUMENT THAT IS NOT ITS OWN.
// The rules permit it for admins only, and they validate the shape anyway — see
// `isWellFormedMentor` in firestore.rules and the note in its header explaining why this
// widening is acceptable here and specifically not for the `admins` collection.
//
// HIDE IS THE NORMAL RETIREMENT, DELETE IS FOR MISTAKES. A mentor who is done for the term
// gets `active: false`: they vanish from the students' picker, and every preference
// already recorded against them still renders their name. Deleting is only offered for a
// mentor NOBODY HAS PICKED, because Firestore rules cannot express "no document in another
// collection references this one" — that needs a query, and rules cannot query. So the
// guard is here in the client, and the button is replaced by the reason rather than
// disabled with no explanation.
//
// THE GUARD IS A COUNT, NOT A LIST, and that distinction is what made it affordable. It
// used to be answered by reading every enrollment in the club and tallying; it is now two
// aggregate queries per mentor, billed on the size of the answer rather than the size of
// the collection. Same guard, and it costs the same at ten members as at ten thousand. Getting it wrong is cosmetic —
// the interest list would show a truncated id where a name should be — but it is exactly
// the kind of cosmetic wrong that nobody can explain six months later.
//
// THE DESCRIPTION IS THE FIELD THAT MATTERS. It is what a student reads before choosing,
// so it gets a textarea and 600 characters rather than an input and 120. The placeholder
// asks for the thing that actually helps — what they work on and what they are useful
// for — because "Priya is great" helps nobody choose between two people.

import { useState } from "react";
import { field, labelOf } from "@/components/admin/ui";
import { PROGRAMS } from "@/content/join";
import { deleteMentor, saveMentor, type Mentor, type MentorInput } from "@/lib/mentorship";

/** A blank mentor, for the add form. `gsoc` because that is the cohort the club runs;
 *  the select is there so a second programme needs no code change. */
const BLANK: MentorInput = {
  name: "",
  description: "",
  programme: "gsoc",
  org: "",
  github: "",
  email: "",
  active: true,
};

function Editor({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial: MentorInput;
  saving: boolean;
  onSave: (input: MentorInput) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState<MentorInput>(initial);
  const set = <K extends keyof MentorInput>(k: K, value: MentorInput[K]) =>
    setV((cur) => ({ ...cur, [k]: value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(v);
      }}
      className="space-y-4 rounded-tile border border-seam bg-sunk p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="am-name" className="label mb-2 block">
            Name
          </label>
          <input
            id="am-name"
            required
            maxLength={120}
            className={field}
            value={v.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="am-programme" className="label mb-2 block">
            Programme
          </label>
          <select
            id="am-programme"
            required
            className={field}
            value={v.programme}
            onChange={(e) => set("programme", e.target.value)}
          >
            {PROGRAMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="am-description" className="label mb-2 block">
          Description
        </label>
        <textarea
          id="am-description"
          required
          maxLength={600}
          rows={4}
          className={`${field} resize-y`}
          placeholder="What they work on, and what they are useful for. 'Kubernetes and Go; good on proposal structure; not the person to ask about frontend.'"
          value={v.description}
          onChange={(e) => set("description", e.target.value)}
        />
        {/* A live count, because 600 characters is not a length anybody can eyeball and
            the rules reject the 601st with a permission error that reads like a fault. */}
        <p className="mt-1.5 text-right font-mono text-[1rem] text-dust">
          {v.description.length}/600
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="am-org" className="label mb-2 block">
            Organisation{" "}
            <span className="normal-case tracking-normal text-dust">(optional)</span>
          </label>
          <input
            id="am-org"
            maxLength={120}
            className={field}
            placeholder="CNCF"
            value={v.org ?? ""}
            onChange={(e) => set("org", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="am-github" className="label mb-2 block">
            GitHub{" "}
            <span className="normal-case tracking-normal text-dust">(optional)</span>
          </label>
          <input
            id="am-github"
            maxLength={100}
            className={field}
            placeholder="octocat"
            spellCheck={false}
            value={v.github ?? ""}
            onChange={(e) => set("github", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="am-email" className="label mb-2 block">
            Email{" "}
            <span className="normal-case tracking-normal text-dust">(optional)</span>
          </label>
          <input
            id="am-email"
            type="email"
            maxLength={160}
            className={field}
            spellCheck={false}
            value={v.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={v.active}
          onChange={(e) => set("active", e.target.checked)}
          className="h-4 w-4 shrink-0 accent-[rgb(var(--accent))]"
        />
        <span className="text-sm text-ink">
          Visible to members in the mentor picker
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary btn-compact disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save mentor"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="tap font-mono text-label uppercase text-haze underline transition-colors hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function AdminMentors({
  mentors,
  demand,
  onChanged,
}: {
  mentors: Mentor[] | null;
  /** Picks per mentor, COUNTED ON THE SERVER by countDemand rather than tallied from
   *  every enrollment. This panel only ever needed the numbers — how many chose each
   *  mentor, and whether anybody chose them at all — and reading five hundred documents
   *  to learn "3" was the single most expensive thing on the page. */
  demand: Map<string, { first: number; second: number; total: number }>;
  /** Re-reads the counts in the parent, so every panel sees the same data after a write
   *  rather than each keeping its own idea of the list. */
  onChanged: () => void;
}) {
  /** "new" while adding, a mentor id while editing that one, null when neither. */
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(input: MentorInput, id?: string) {
    setSaving(true);
    setError("");
    try {
      await saveMentor(input, id);
      setEditing(null);
      onChanged();
    } catch (e) {
      console.error("[osc] could not save mentor", e);
      setError(
        "Firestore refused that write. Either your address is not in the admins collection, or the rules are not deployed.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(m: Mentor) {
    if (!window.confirm(`Delete ${m.name}? This cannot be undone.`)) return;
    setError("");
    try {
      await deleteMentor(m.id);
      onChanged();
    } catch (e) {
      console.error("[osc] could not delete mentor", e);
      setError("That delete was refused. Check that your address is still an admin.");
    }
  }

  return (
    <div className="card rounded-panel bg-raise p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="label">Mentors</h3>
          <p className="mt-1 text-sm text-haze">
            {mentors === null
              ? "Loading…"
              : `${mentors.length} published · ${mentors.filter((m) => m.active).length} visible to members`}
          </p>
        </div>
        {editing !== "new" && (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="btn btn-secondary btn-compact"
          >
            Add a mentor
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-ember" role="alert">
          {error}
        </p>
      )}

      {editing === "new" && (
        <div className="mt-5">
          <Editor
            initial={BLANK}
            saving={saving}
            onSave={(input) => void save(input)}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      <div className="mt-5 space-y-3">
        {mentors !== null && mentors.length === 0 && editing !== "new" && (
          // An empty state that says what happens next, not just that the list is empty.
          // Until there is one mentor, every member's dashboard shows "enrolment opens
          // when the organisers add them" — which is a sentence somebody has to act on.
          <p className="rounded-tile border border-dashed border-seam p-5 text-[1.0625rem] leading-relaxed text-dust">
            No mentors yet. Until you add one, the mentorship card on every member&apos;s
            dashboard says enrolment has not opened.
          </p>
        )}

        {(mentors ?? []).map((m) => {
          const c = demand.get(m.id) ?? { first: 0, second: 0, total: 0 };
          const picked = c.total > 0;

          if (editing === m.id) {
            return (
              <Editor
                key={m.id}
                initial={{
                  name: m.name,
                  description: m.description,
                  programme: m.programme,
                  org: m.org ?? "",
                  github: m.github ?? "",
                  email: m.email ?? "",
                  active: m.active,
                }}
                saving={saving}
                onSave={(input) => void save(input, m.id)}
                onCancel={() => setEditing(null)}
              />
            );
          }

          return (
            <div
              key={m.id}
              className="rounded-tile border border-seam bg-sunk p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {m.name}
                    {m.org && (
                      <span className="ml-2 font-mono text-[1rem] font-normal text-dust">
                        {m.org}
                      </span>
                    )}
                    {!m.active && (
                      <span className="ml-2 rounded-md border border-seam px-2 py-0.5 font-mono text-[0.9167rem] uppercase tracking-wider text-dust">
                        hidden
                      </span>
                    )}
                  </p>
                  <p className="mt-1 font-mono text-[1rem] text-dust">
                    {labelOf(PROGRAMS, m.programme)}
                  </p>
                </div>
                {/* The demand, inline, so the list doubles as the answer to "who is
                    oversubscribed" without scrolling to the charts. */}
                <p className="shrink-0 font-mono text-[1rem] text-haze">
                  1st: <span className="text-ink">{c.first}</span> · 2nd:{" "}
                  <span className="text-ink">{c.second}</span>
                </p>
              </div>

              <p className="mt-3 text-[1.0625rem] leading-relaxed text-haze">{m.description}</p>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-seam pt-4">
                <button
                  type="button"
                  onClick={() => setEditing(m.id)}
                  className="tap font-mono text-label uppercase text-accent underline transition-colors hover:text-ink"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void save(
                      {
                        name: m.name,
                        description: m.description,
                        programme: m.programme,
                        org: m.org ?? "",
                        github: m.github ?? "",
                        email: m.email ?? "",
                        active: !m.active,
                      },
                      m.id,
                    )
                  }
                  className="tap font-mono text-label uppercase text-haze underline transition-colors hover:text-ink"
                >
                  {m.active ? "Hide from members" : "Show to members"}
                </button>
                {/* THE GUARD. Not a disabled button — a sentence saying why, and what to
                    do instead. A greyed-out Delete with no explanation is the organiser
                    reloading the page to see whether it comes back. */}
                {picked ? (
                  <p className="text-[1rem] text-dust">
                    {c.total} student{c.total === 1 ? "" : "s"} picked this mentor — hide
                    instead of deleting.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => void remove(m)}
                    className="tap font-mono text-label uppercase text-haze underline transition-colors hover:text-ember"
                  >
                    Delete
                  </button>
                )}
                {m.github && (
                  <a
                    href={`https://github.com/${m.github}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto font-mono text-xs text-dust transition-colors hover:text-accent"
                  >
                    @{m.github}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
