"use client";

// Where organisers ask the club something.
//
// ONE BUILDER FOR FORMS AND POLLS. The only control that distinguishes them is "show
// everyone the counts" — see lib/forms.ts for why they are one collection rather than
// two features. A poll is a form with one question and its answers shown back.
//
// FIELD IDS ARE GENERATED ONCE AND NEVER CHANGE. Answers are stored against them and the
// rules check answer keys against the form's `field_ids`, so renaming an id orphans every
// answer already given — silently, because the old answers simply stop matching anything
// the page renders. That is why editing a question changes its LABEL and keeps its id,
// and why removing a question from a form that already has responses is warned about
// rather than done quietly.
//
// NO PREVIEW PANE. The member's view of a form is three inputs and a button; a preview
// would be a second renderer to keep in step with the first, for a screen an organiser
// can simply open on /dashboard.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  fieldId,
  readForms,
  readResponses,
  saveForm,
  type Field,
  type FieldType,
  type FormDoc,
  type ResponseDoc,
} from "@/lib/forms";
import { fmtDate } from "@/lib/profile";

const ctl =
  "w-full rounded-md border border-seam bg-sunk px-3.5 py-2.5 text-sm text-ink placeholder:text-dust outline-none transition focus:border-accent";

const TYPES: { value: FieldType; label: string }[] = [
  { value: "short", label: "Short answer" },
  { value: "long", label: "Paragraph" },
  { value: "choice", label: "Pick one" },
  { value: "multi", label: "Pick several" },
];

/** A question while it is being edited. `id` is empty until first saved — see the note at
 *  the top about why it is then frozen. */
type Draft = { id: string; label: string; type: FieldType; options: string; required: boolean };

const BLANK_FIELD: Draft = { id: "", label: "", type: "short", options: "", required: false };

export default function FormBuilder() {
  const { user, isAdmin } = useAuth();
  const [forms, setForms] = useState<FormDoc[] | null>(null);
  const [editing, setEditing] = useState<FormDoc | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<Draft[]>([{ ...BLANK_FIELD }]);
  const [showTally, setShowTally] = useState(false);
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  /** Which form's responses are expanded, and what they are. */
  const [viewing, setViewing] = useState<string | null>(null);
  const [responses, setResponses] = useState<ResponseDoc[] | null>(null);

  const load = useCallback(async () => {
    try {
      setForms(await readForms());
    } catch (e) {
      console.error("[osc] could not read forms", e);
      setError("Could not load the forms. The rules may not be deployed.");
      setForms([]);
    }
  }, []);

  useEffect(() => {
    if (isAdmin !== true) return;
    void load();
  }, [isAdmin, load]);

  const reset = () => {
    setEditing(null);
    setTitle("");
    setDescription("");
    setFields([{ ...BLANK_FIELD }]);
    setShowTally(false);
    setOpen(true);
    setError("");
  };

  function edit(f: FormDoc) {
    setEditing(f);
    setTitle(f.title);
    setDescription(f.description ?? "");
    setShowTally(f.show_tally);
    setOpen(f.open);
    setFields(
      f.fields.map((x) => ({
        id: x.id,
        label: x.label,
        type: x.type,
        options: (x.options ?? []).join("\n"),
        required: Boolean(x.required),
      })),
    );
    setNote("");
    setError("");
  }

  const answered = useMemo(
    () => new Set((editing?.field_ids ?? []).map(String)),
    [editing],
  );

  async function publish() {
    setError("");
    setNote("");
    if (!title.trim()) {
      setError("A form needs a title.");
      return;
    }
    const clean = fields.filter((f) => f.label.trim());
    if (!clean.length) {
      setError("A form needs at least one question.");
      return;
    }
    for (const f of clean) {
      if ((f.type === "choice" || f.type === "multi") && !f.options.trim()) {
        setError(`"${f.label.trim()}" is a pick-one question with no options.`);
        return;
      }
    }
    setBusy(true);
    try {
      const built: Field[] = clean.map((f, i) => {
        const out: Field = {
          // KEPT if it already has one. Regenerating would orphan every answer given so
          // far, and nothing on screen would look wrong.
          id: f.id || fieldId(f.label, i),
          label: f.label.trim(),
          type: f.type,
        };
        if (f.type === "choice" || f.type === "multi") {
          out.options = f.options
            .split("\n")
            .map((o) => o.trim())
            .filter(Boolean);
        }
        if (f.required) out.required = true;
        return out;
      });

      await saveForm(
        editing?.id ?? null,
        user!.email!,
        { title, description, fields: built, open, show_tally: showTally },
        editing,
      );
      setNote(
        editing ? "Updated." : `Posted. Every member sees it on their dashboard now.`,
      );
      reset();
      await load();
    } catch (e) {
      console.error("[osc] could not save the form", e);
      setError(
        "Firestore refused that. Either the rules are not deployed, or your address is not in the admins collection.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleOpen(f: FormDoc) {
    setError("");
    try {
      await saveForm(
        f.id,
        user!.email!,
        {
          title: f.title,
          description: f.description,
          fields: f.fields,
          open: !f.open,
          show_tally: f.show_tally,
        },
        f,
      );
      await load();
    } catch (e) {
      console.error("[osc] could not open/close", e);
      setError("Could not change that. Reload and try again.");
    }
  }

  async function view(f: FormDoc) {
    if (viewing === f.id) {
      setViewing(null);
      return;
    }
    setViewing(f.id);
    setResponses(null);
    try {
      setResponses(await readResponses(f.id));
    } catch (e) {
      console.error("[osc] could not read responses", e);
      setResponses([]);
      setError("Could not load the responses.");
    }
  }

  /** Responses as CSV, because the thing an organiser does next with a sign-up sheet is
   *  paste it somewhere else. Built here rather than server-side for the same reason the
   *  membership export is: it is a few hundred rows already in memory. */
  function exportCsv(f: FormDoc, rows: ResponseDoc[]) {
    const cell = (v: unknown) => {
      const s = Array.isArray(v) ? v.join("; ") : String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const head = ["name", "email", ...f.fields.map((x) => x.label)];
    const body = rows.map((r) => [
      cell(r.name),
      cell(r.email),
      ...f.fields.map((x) => cell(r.answers?.[x.id])),
    ]);
    const csv = [head.map(cell).join(","), ...body.map((b) => b.join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${f.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isAdmin !== true || !user?.email) return null;

  const setField = (i: number, patch: Partial<Draft>) =>
    setFields(fields.map((f, j) => (i === j ? { ...f, ...patch } : f)));

  return (
    <div className="card rounded-panel bg-raise p-6 sm:p-8">
      <p className="label">Forms and polls</p>
      <h3 className="mt-3 font-display text-display-md font-bold tracking-tight">
        {editing ? "Editing a form." : "Ask the club something."}
      </h3>
      <p className="measure mt-3 text-body text-haze">
        A sign-up sheet, or a poll — the only difference is whether everyone sees the
        counts afterwards.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="fb-title" className="label">
            Title
          </label>
          <input
            id="fb-title"
            className={`${ctl} mt-2`}
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Saturday session — which slot?"
          />
        </div>

        <div>
          <label htmlFor="fb-desc" className="label">
            Anything they need to know first <span className="text-dust">(optional)</span>
          </label>
          <textarea
            id="fb-desc"
            className={`${ctl} mt-2 min-h-[5rem] resize-y`}
            value={description}
            maxLength={1000}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* --------------------------------------------------------- questions */}
        <div className="space-y-4">
          <p className="label">Questions</p>
          {fields.map((f, i) => (
            <div key={i} className="rounded-tile bg-sunk p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-label uppercase text-dust">
                  {i + 1}
                  {/* An id means it has been saved and answered against. Removing it now
                      is not a tidy-up. */}
                  {f.id && answered.has(f.id) && " · already answered"}
                </p>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setFields(fields.filter((_, j) => j !== i))}
                    className="tap font-mono text-label uppercase text-haze underline hover:text-ember"
                  >
                    Remove
                  </button>
                )}
              </div>

              <input
                className={`${ctl} mt-3`}
                value={f.label}
                maxLength={200}
                onChange={(e) => setField(i, { label: e.target.value })}
                placeholder="Which slot suits you?"
                aria-label={`Question ${i + 1}`}
              />

              <select
                className={`${ctl} mt-3`}
                value={f.type}
                onChange={(e) => setField(i, { type: e.target.value as FieldType })}
                aria-label={`Question ${i + 1} type`}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              {(f.type === "choice" || f.type === "multi") && (
                <textarea
                  className={`${ctl} mt-3 min-h-[5rem] resize-y`}
                  value={f.options}
                  onChange={(e) => setField(i, { options: e.target.value })}
                  placeholder={"One option per line\n10am\n2pm"}
                  aria-label={`Question ${i + 1} options`}
                />
              )}

              <label className="tap mt-3 flex items-center gap-3 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={f.required}
                  onChange={(e) => setField(i, { required: e.target.checked })}
                  className="h-4 w-4 accent-accent"
                />
                They have to answer this one
              </label>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setFields([...fields, { ...BLANK_FIELD }])}
            disabled={fields.length >= 20}
            className="btn btn-secondary btn-compact disabled:opacity-60"
          >
            Another question
          </button>
        </div>

        <label className="tap flex items-center gap-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={showTally}
            onChange={(e) => setShowTally(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          Show everyone the counts — this makes it a poll
        </label>
        <label className="tap flex items-center gap-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={open}
            onChange={(e) => setOpen(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          Open for answers
        </label>
      </div>

      {error && (
        <p className="mt-4 text-sm leading-relaxed text-ember" role="alert">
          {error}
        </p>
      )}
      {note && !error && <p className="mt-4 text-sm text-haze">{note}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void publish()}
          disabled={busy}
          className="btn btn-primary disabled:opacity-60"
        >
          {/* NOT "Post it", which is what the notice composer's button says a few inches
              up this same page. Two identical labels on one screen is a coin flip for
              somebody scanning it, and the two do completely different things. */}
          {busy ? "Saving…" : editing ? "Save changes" : "Post the form"}
        </button>
        {editing && (
          <button
            type="button"
            onClick={reset}
            className="tap self-center font-mono text-label uppercase text-haze underline hover:text-ink"
          >
            Cancel
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------- existing */}
      <div className="mt-10 border-t border-seam pt-6">
        <p className="label">Already asked</p>

        {forms === null && (
          <p className="mt-3 text-sm text-haze" aria-busy="true">
            Loading…
          </p>
        )}
        {forms?.length === 0 && <p className="mt-3 text-sm text-haze">Nothing yet.</p>}

        {forms && forms.length > 0 && (
          <ul className="mt-3 divide-y divide-seam border-y border-seam">
            {forms.map((f) => (
              <li key={f.id} className="py-3">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">
                      {f.show_tally && <span className="chip mr-2">Poll</span>}
                      {!f.open && <span className="chip mr-2">Closed</span>}
                      {f.title}
                    </p>
                    <p className="mt-1 font-mono text-[0.75rem] uppercase tracking-wider text-dust">
                      {fmtDate(f.created_at)} · {f.author_email} · {f.fields.length}{" "}
                      question{f.fields.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-4">
                    <button
                      type="button"
                      onClick={() => void view(f)}
                      className="tap font-mono text-label uppercase text-haze underline hover:text-ink"
                    >
                      {viewing === f.id ? "Hide" : "Answers"}
                    </button>
                    <button
                      type="button"
                      onClick={() => edit(f)}
                      className="tap font-mono text-label uppercase text-haze underline hover:text-ink"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleOpen(f)}
                      className="tap font-mono text-label uppercase text-haze underline hover:text-ink"
                    >
                      {f.open ? "Close" : "Reopen"}
                    </button>
                  </div>
                </div>

                {viewing === f.id && (
                  <div className="mt-4 rounded-tile bg-sunk p-4">
                    {responses === null && (
                      <p className="text-sm text-haze" aria-busy="true">
                        Loading answers…
                      </p>
                    )}
                    {responses?.length === 0 && (
                      <p className="text-sm text-haze">Nobody has answered yet.</p>
                    )}
                    {responses && responses.length > 0 && (
                      <>
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                          <p className="font-mono text-label uppercase text-dust">
                            {responses.length} answer{responses.length === 1 ? "" : "s"}
                          </p>
                          <button
                            type="button"
                            onClick={() => exportCsv(f, responses)}
                            className="tap font-mono text-label uppercase text-haze underline hover:text-ink"
                          >
                            Download CSV
                          </button>
                        </div>
                        <div className="mt-3 overflow-x-auto">
                          <table className="w-full min-w-[36rem] text-left text-sm">
                            <thead>
                              <tr className="text-dust">
                                <th className="py-2 pr-4 font-normal">Who</th>
                                {f.fields.map((x) => (
                                  <th key={x.id} className="py-2 pr-4 font-normal">
                                    {x.label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {responses.map((r) => (
                                <tr key={r.uid} className="border-t border-seam align-top">
                                  <td className="py-2 pr-4">
                                    <span className="text-ink">{r.name ?? "—"}</span>
                                    <br />
                                    <span className="break-all font-mono text-[0.75rem] text-dust">
                                      {r.email}
                                    </span>
                                  </td>
                                  {f.fields.map((x) => (
                                    <td key={x.id} className="py-2 pr-4 text-haze">
                                      {Array.isArray(r.answers?.[x.id])
                                        ? (r.answers[x.id] as string[]).join(", ")
                                        : String(r.answers?.[x.id] ?? "—")}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
