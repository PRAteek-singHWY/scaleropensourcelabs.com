"use client";

// What the club is asking this member to answer.
//
// FORMS AND POLLS RENDER THROUGH THE SAME COMPONENT because they are the same thing —
// see lib/forms.ts. `show_tally` decides whether the counts come back after answering,
// and nothing else differs.
//
// THE TALLY IS SHOWN ONLY AFTER YOU HAVE ANSWERED, and that is a deliberate choice rather
// than a technical limit. Seeing "14 people said Saturday" before you pick is an
// invitation to agree with the room, which is exactly what a poll is trying not to
// measure. Afterwards it is information; before, it is pressure.
//
// ANSWERS ARE NOT ANONYMOUS AND THE PANEL SAYS SO, once, plainly. A member filling in
// "which slot suits you" should know the organisers can see it was them — that is the
// point, since somebody has to chase the people who did not answer. Hiding that would be
// the one dishonest thing this screen could do.
//
// ONE READ PER FORM FOR THE MEMBER'S OWN ANSWER. The alternative is a collection-group
// query, which members are not allowed to run and should not be — it would mean reading
// other people's responses and filtering client-side.

import { useCallback, useEffect, useState } from "react";
import Panel from "@/components/dashboard/Panel";
import { useAuth } from "@/lib/auth";
import {
  missingAnswers,
  readForms,
  readMyResponse,
  saveResponse,
  type FormDoc,
  type ResponseDoc,
} from "@/lib/forms";

const ctl =
  "w-full rounded-md border border-seam bg-sunk px-3.5 py-2.5 text-sm text-ink placeholder:text-dust outline-none transition focus:border-accent";

/** The counts, as bars. Same treatment as the organisers' breakdowns — one dimension,
 *  a handful of rows, and the token colours already carry the meaning, so a chart
 *  library would be weight for nothing. */
function Tally({
  options,
  counts,
  mine,
}: {
  options: string[];
  counts: Record<string, number>;
  mine?: string | string[];
}) {
  const total = options.reduce((n, o) => n + (counts[o] ?? 0), 0);
  const picked = (o: string) => (Array.isArray(mine) ? mine.includes(o) : mine === o);
  return (
    <ul className="mt-3 space-y-2.5">
      {options.map((o) => {
        const n = counts[o] ?? 0;
        const pct = total > 0 ? Math.round((n / total) * 100) : 0;
        return (
          <li key={o}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-ink">
                {o}
                {/* Your own answer marked, so the bars are readable as "where I sit"
                    rather than only as an aggregate. */}
                {picked(o) && <span className="text-accent"> · yours</span>}
              </span>
              <span className="font-mono text-sm text-haze">
                {n}
                <span className="text-dust"> · {pct}%</span>
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-sunk">
              <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function OneForm({
  form,
  uid,
  email,
  name,
  mine,
  onSaved,
}: {
  form: FormDoc;
  uid: string;
  email: string;
  name?: string;
  /** The member's stored answer, or null. Owned by the PARENT rather than fetched here.
   *
   *  It used to be fetched per form, in this component. That was fine while this panel was
   *  the only thing that cared — but the dashboard's summary strip needs to know how many
   *  forms are still waiting on you, and computing that meant either fetching every
   *  response a second time upstairs or threading a count back up through a callback.
   *  One place doing the IO is cheaper than both and is where it belonged anyway. */
  mine: ResponseDoc | null | undefined;
  onSaved: () => Promise<void>;
}) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Seed the inputs from the stored answer once it arrives, so "change my answer" opens
  // with what they said rather than empty.
  useEffect(() => {
    if (mine) setAnswers(mine.answers ?? {});
  }, [mine]);

  async function submit() {
    setError("");
    const missing = missingAnswers(form, answers);
    if (missing.length) {
      setError(`Still needed: ${missing.join(", ")}.`);
      return;
    }
    setBusy(true);
    try {
      await saveResponse(form.id, uid, email, name, answers, mine ?? null);
      setEditing(false);
      await onSaved();
    } catch (e) {
      console.error("[osc] could not save your answer", e);
      // The most likely cause by far is the form having closed between the page loading
      // and the button being pressed, which the rules refuse — so that is named first.
      setError(
        "That did not save. The form may have closed since you opened this page — reload and check.",
      );
    } finally {
      setBusy(false);
    }
  }

  const set = (id: string, v: string | string[]) => setAnswers({ ...answers, [id]: v });
  const answered = mine != null;
  const showForm = form.open && (!answered || editing);

  return (
    <li className="border-t border-seam pt-5 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {!form.open && <span className="chip">Closed</span>}
        {answered && form.open && <span className="chip">Answered</span>}
        <h4 className="text-body font-semibold text-ink">{form.title}</h4>
      </div>
      {form.description && (
        <p className="measure mt-2 whitespace-pre-line text-sm leading-relaxed text-haze">
          {form.description}
        </p>
      )}

      {mine === undefined && (
        <p className="mt-3 text-sm text-dust" aria-busy="true">
          Checking…
        </p>
      )}

      {showForm && mine !== undefined && (
        <div className="mt-4 space-y-4">
          {form.fields.map((f) => (
            <div key={f.id}>
              <label htmlFor={`${form.id}-${f.id}`} className="label">
                {f.label}
                {f.required && <span className="text-accent"> *</span>}
              </label>

              {f.type === "short" && (
                <input
                  id={`${form.id}-${f.id}`}
                  className={`${ctl} mt-2`}
                  value={String(answers[f.id] ?? "")}
                  maxLength={300}
                  onChange={(e) => set(f.id, e.target.value)}
                />
              )}

              {f.type === "long" && (
                <textarea
                  id={`${form.id}-${f.id}`}
                  className={`${ctl} mt-2 min-h-[6rem] resize-y`}
                  value={String(answers[f.id] ?? "")}
                  maxLength={2000}
                  onChange={(e) => set(f.id, e.target.value)}
                />
              )}

              {f.type === "choice" && (
                /* Radios rather than a select. A club poll has two to five options and
                   they should all be visible — a select hides the choice behind a tap and
                   makes "how many options are there" a thing you have to open to learn. */
                <div className="mt-2 space-y-2">
                  {(f.options ?? []).map((o) => (
                    <label key={o} className="tap flex items-center gap-3 text-sm text-ink">
                      <input
                        type="radio"
                        name={`${form.id}-${f.id}`}
                        value={o}
                        checked={answers[f.id] === o}
                        onChange={() => set(f.id, o)}
                        className="h-4 w-4 accent-accent"
                      />
                      {o}
                    </label>
                  ))}
                </div>
              )}

              {f.type === "multi" && (
                <div className="mt-2 space-y-2">
                  {(f.options ?? []).map((o) => {
                    const cur = Array.isArray(answers[f.id]) ? (answers[f.id] as string[]) : [];
                    return (
                      <label key={o} className="tap flex items-center gap-3 text-sm text-ink">
                        <input
                          type="checkbox"
                          checked={cur.includes(o)}
                          onChange={(e) =>
                            set(f.id, e.target.checked ? [...cur, o] : cur.filter((x) => x !== o))
                          }
                          className="h-4 w-4 accent-accent"
                        />
                        {o}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {error && (
            <p className="text-sm leading-relaxed text-ember" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy}
              className="btn btn-primary btn-compact disabled:opacity-60"
            >
              {busy ? "Sending…" : answered ? "Save changes" : "Send it"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setAnswers(mine?.answers ?? {});
                  setError("");
                }}
                className="tap self-center font-mono text-label uppercase text-haze underline hover:text-ink"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Answered, and not currently editing. */}
      {answered && !editing && (
        <div className="mt-4">
          {form.open && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="tap font-mono text-label uppercase text-haze underline hover:text-ink"
            >
              Change my answer
            </button>
          )}

          {/* THE COUNTS, ONLY NOW — see the note at the top of this file. */}
          {form.show_tally &&
            form.fields
              .filter((f) => (f.type === "choice" || f.type === "multi") && f.options?.length)
              .map((f) => (
                <div key={f.id} className="mt-4">
                  <p className="label">{f.label}</p>
                  <Tally
                    options={f.options ?? []}
                    counts={form.tally?.[f.id] ?? {}}
                    mine={mine?.answers?.[f.id]}
                  />
                </div>
              ))}
          {form.show_tally && !form.tally && (
            <p className="mt-3 text-sm text-dust">
              Counts appear within a minute of people answering.
            </p>
          )}
        </div>
      )}

      {!form.open && !answered && (
        <p className="mt-3 text-sm text-haze">This one closed before you got to it.</p>
      )}
    </li>
  );
}

export default function Forms({
  uid,
  email,
  name,
  onPending,
}: {
  uid: string;
  email: string;
  name?: string;
  /** Reports how many OPEN forms this member has not answered, so the dashboard's summary
   *  strip can say "2 waiting on you" without repeating every read this panel just did. */
  onPending?: (n: number) => void;
}) {
  const { isClubMember } = useAuth();
  const [forms, setForms] = useState<FormDoc[] | null>(null);
  /** form id -> this member's answer. Undefined for a form still being looked up. */
  const [mine, setMine] = useState<Record<string, ResponseDoc | null>>({});
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    // See the note on the effect below: nothing is asked for until we know whether the
    // reader is in the club, because that decides which audiences the query may name.
    if (isClubMember === undefined) return;
    try {
      const rows = await readForms(isClubMember);
      setForms(rows);
      // ONE READ PER FORM, IN PARALLEL. The alternative is a collection-group query over
      // every response in the club, which members are not allowed to run and should not
      // be — it would mean reading other people's answers and filtering client-side.
      const pairs = await Promise.all(
        rows.map(async (f) => [f.id, await readMyResponse(f.id, uid).catch(() => null)] as const),
      );
      setMine(Object.fromEntries(pairs));
    } catch (e) {
      console.error("[osc] could not read forms", e);
      // NOT FOLDED INTO THE EMPTY STATE, unlike the board's. That panel now reads "No
      // notices at the moment" whether it is empty or broken; this one still keeps the two
      // apart, because a form is something an organiser is waiting on an answer to — a
      // member told there is nothing to fill in is a member who misses the sign-up that
      // was open. If the two panels should behave alike, this is the line to change.
      setError("The forms didn't load. Give it a refresh?");
      setForms([]);
    }
  }, [uid, isClubMember]);

  // WAIT FOR A DEFINITE ANSWER BEFORE ASKING. `isClubMember` is undefined until the
  // profile read comes back, and a query built from it while it is unknown asks as the
  // wrong person — which for a form means either missing a members-only sign-up or
  // being refused the whole list. The panel holds its loading state for that moment.
  useEffect(() => {
    void load();
  }, [load]);

  // Reported up rather than rendered here, because the number belongs to the page's
  // summary strip and this panel already knows it.
  useEffect(() => {
    if (!forms) return;
    onPending?.(forms.filter((f) => f.open && !mine[f.id]).length);
  }, [forms, mine, onPending]);

  // Closed forms the member never answered are dropped entirely: a list of things you can
  // no longer do is not a to-do list. A closed form they DID answer stays, so they can
  // still see what they said and how the vote went.
  const visible = forms?.filter((f) => f.open || f.show_tally) ?? [];

  return (
    <Panel icon="chart" title="Asked of you">

      {error && (
        <p className="mt-3 text-sm leading-relaxed text-ember" role="alert">
          {error}
        </p>
      )}

      {forms === null && (
        <p className="text-body text-haze" aria-busy="true">
          Loading…
        </p>
      )}

      {forms !== null && visible.length === 0 && !error && (
        <>
          <h3 className="font-display text-display-md font-bold tracking-tight">
            Nothing to fill in at the moment
          </h3>
          <p className="measure mt-3 text-body text-haze">
            Sign-ups and the odd &ldquo;which Saturday suits everyone&rdquo; turn up here when the
            organisers need to know something.
          </p>
        </>
      )}

      {visible.length > 0 && (
        <>
          <ul className="space-y-5">
            {visible.map((f) => (
              <OneForm
                key={f.id}
                form={f}
                uid={uid}
                email={email}
                name={name}
                mine={f.id in mine ? mine[f.id] : undefined}
                onSaved={load}
              />
            ))}
          </ul>
          {/* Said once, at the foot, rather than on every form. */}
          <p className="mt-5 text-sm text-dust">
            The organisers can see who answered — these are not anonymous.
          </p>
        </>
      )}
    </Panel>
  );
}
