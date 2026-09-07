"use client";

// Where owners change who runs the club.
//
// IT IS VISIBLE TO EVERY ADMIN AND USABLE ONLY BY OWNERS, deliberately. Hiding it from
// admins entirely would leave the rest of the core team unable to see who has access —
// which is the question this screen mostly gets asked — and would make "why can't I add
// anyone" a mystery rather than a stated rule. So admins read the roster and see the
// controls disabled with a sentence saying why.
//
// NONE OF THAT IS A BOUNDARY. A disabled button is a rendering decision; `isOwner()` in
// firestore.rules is what refuses the write. If you ever move the check out of the rules
// and into this file, you have removed the security, not relocated it.
//
// THE FORM IS "APPOINT OR EDIT", NOT TWO MODES. Appointing somebody who has a retired
// row is the same write as bringing them back, which is the common case between years —
// so typing an address that already exists loads that row rather than erroring.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/firebase";
import { fmtDate } from "@/lib/profile";
import {
  GROUPS,
  isCollegeAddress,
  readRoster,
  saveRosterRow,
  type Group,
  type Role,
  type RosterRow,
} from "@/lib/roster";

/** One string for every control, so four inputs cannot drift apart a class at a time.
 *  Lifted from AdminDashboard's `ctl` for exactly that reason. */
const ctl =
  "w-full rounded-inline border border-seam bg-sunk px-3.5 py-2.5 text-sm text-ink placeholder:text-dust outline-none transition focus:border-accent disabled:opacity-60";

const BLANK = {
  name: "",
  title: "",
  photo: "",
  role: "admin" as Role,
  active: true,
  group: "lead" as Group,
  batch: "",
  github: "",
  shadow_of: "",
};

export default function Roster() {
  const { user, isAdmin, isOwner } = useAuth();
  const [rows, setRows] = useState<RosterRow[] | null>(null);
  const [email, setEmail] = useState("");
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      setRows(await readRoster());
    } catch (e) {
      console.error("[osc] could not read the roster", e);
      setError("Could not load the roster. The rules may not be deployed.");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    if (isAdmin !== true) return;
    void load();
  }, [isAdmin, load]);

  /** The row the typed address already has, if any. This is what makes the form
   *  "appoint or edit" rather than two screens. */
  const existing = useMemo(() => {
    const key = email.trim().toLowerCase();
    if (!key || !rows) return null;
    return rows.find((r) => r.email.toLowerCase() === key) ?? null;
  }, [email, rows]);

  // Typing a known address loads that person, so an owner bringing somebody back does not
  // retype their name and title from memory — and cannot accidentally overwrite them with
  // blanks, which a naive form would do on save.
  useEffect(() => {
    if (!existing) return;
    setForm({
      name: existing.name ?? "",
      title: existing.title ?? "",
      photo: existing.photo ?? "",
      role: existing.role ?? "admin",
      active: existing.active !== false,
      group: existing.group ?? "lead",
      batch: existing.batch ?? "",
      github: existing.github ?? "",
      shadow_of: existing.shadow_of ?? "",
    });
  }, [existing]);

  if (isAdmin !== true || !user?.email) return null;

  const self = email.trim().toLowerCase() === user.email.toLowerCase();

  async function save() {
    setError("");
    setNote("");
    const key = email.trim().toLowerCase();
    if (!isCollegeAddress(key, ALLOWED_EMAIL_DOMAIN)) {
      setError(`That has to be an @${ALLOWED_EMAIL_DOMAIN} address — no other address can sign in.`);
      return;
    }
    if (!form.name.trim()) {
      setError("A roster row needs a name, because this is also what the team page shows.");
      return;
    }
    // THE LOCKOUT GUARD, stated before the write rather than after the refusal. The rules
    // refuse it too; this is so the reason is a sentence instead of a permission error.
    if (self) {
      setError(
        "You cannot change your own row. That is what stops an owner demoting themselves " +
          "into a state only another owner can undo — ask one of the others.",
      );
      return;
    }
    setBusy(true);
    try {
      await saveRosterRow(key, form, user!.email!, existing);
      setNote(
        existing
          ? `${form.name} updated.`
          : `${form.name} can now sign in to the organisers' page.`,
      );
      setEmail("");
      setForm(BLANK);
      await load();
    } catch (e) {
      console.error("[osc] could not save the roster row", e);
      setError(
        "Firestore refused that. Either the rules are not deployed, or your row is not an owner.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function setActive(row: RosterRow, active: boolean) {
    setError("");
    setNote("");
    try {
      await saveRosterRow(
        row.email,
        {
          name: row.name,
          title: row.title,
          photo: row.photo,
          role: row.role,
          active,
          group: row.group,
          batch: row.batch,
          github: row.github,
          shadow_of: row.shadow_of,
        },
        user!.email!,
        row,
      );
      await load();
    } catch (e) {
      console.error("[osc] could not retire/restore", e);
      setError("Could not change that. Only owners can, and never their own row.");
    }
  }

  const actives = rows?.filter((r) => r.active).length ?? 0;
  const owners = rows?.filter((r) => r.active && r.role === "owner").length ?? 0;

  return (
    <div className="card rounded-panel bg-raise p-6 sm:p-8">
      <p className="label">The core team</p>
      <h3 className="mt-3 font-display text-display-md font-bold tracking-tight">
        Who runs this, and who can let others in.
      </h3>
      <p className="measure mt-3 text-body text-haze">
        One list. It decides who reaches this page <em>and</em> who appears on the public
        team page, so there is nothing to keep in step by hand.
      </p>

      {isOwner !== true && (
        <p className="mt-5 rounded-tile bg-sunk px-4 py-3 text-sm text-haze">
          You can see the roster but not change it — that is kept to the owners, so that one
          compromised account cannot appoint more. Ask an owner below.
        </p>
      )}

      {/* ------------------------------------------------------------- the form */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="ro-email" className="label">
            College address
          </label>
          <input
            id="ro-email"
            className={`${ctl} mt-2`}
            value={email}
            disabled={isOwner !== true}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={`newlead@${ALLOWED_EMAIL_DOMAIN}`}
          />
          {/* Both of these are answers to "why did nothing happen", given before the
              button is pressed rather than after. */}
          {existing && (
            <p className="mt-1.5 text-sm text-haze">
              Already on the roster{existing.active ? "" : " but retired"} — saving updates
              them{existing.active ? "" : " and brings them back"}.
            </p>
          )}
          {self && (
            <p className="mt-1.5 text-sm text-ember">
              That is you. Nobody can change their own row.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="ro-name" className="label">
            Name
          </label>
          <input
            id="ro-name"
            className={`${ctl} mt-2`}
            value={form.name}
            maxLength={120}
            disabled={isOwner !== true}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="ro-title" className="label">
            Title <span className="text-dust">(optional)</span>
          </label>
          <input
            id="ro-title"
            className={`${ctl} mt-2`}
            value={form.title}
            maxLength={120}
            disabled={isOwner !== true}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Lead, Design, Shadow…"
          />
        </div>

        <div>
          <label htmlFor="ro-photo" className="label">
            Photo path <span className="text-dust">(optional)</span>
          </label>
          <input
            id="ro-photo"
            className={`${ctl} mt-2`}
            value={form.photo}
            maxLength={300}
            disabled={isOwner !== true}
            onChange={(e) => setForm({ ...form, photo: e.target.value })}
            placeholder="/people/name.jpg"
          />
        </div>

        <div>
          <label htmlFor="ro-group" className="label">
            Where on the team chart
          </label>
          <select
            id="ro-group"
            className={`${ctl} mt-2`}
            value={form.group}
            disabled={isOwner !== true}
            onChange={(e) => setForm({ ...form, group: e.target.value as Group })}
          >
            {GROUPS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ro-batch" className="label">
            Batch <span className="text-dust">(optional)</span>
          </label>
          <input
            id="ro-batch"
            className={`${ctl} mt-2`}
            value={form.batch}
            maxLength={8}
            disabled={isOwner !== true}
            onChange={(e) => setForm({ ...form, batch: e.target.value })}
            placeholder="'28"
          />
        </div>

        <div>
          <label htmlFor="ro-github" className="label">
            GitHub <span className="text-dust">(optional)</span>
          </label>
          <input
            id="ro-github"
            className={`${ctl} mt-2`}
            value={form.github}
            maxLength={100}
            disabled={isOwner !== true}
            onChange={(e) => setForm({ ...form, github: e.target.value })}
          />
        </div>

        {/* Only for a shadow, and it names the OFFICE rather than the person — that is
            what makes a shadow survive the officer changing. */}
        {form.group === "shadow" && (
          <div>
            <label htmlFor="ro-shadow" className="label">
              Shadows which office
            </label>
            <input
              id="ro-shadow"
              className={`${ctl} mt-2`}
              value={form.shadow_of}
              maxLength={120}
              disabled={isOwner !== true}
              onChange={(e) => setForm({ ...form, shadow_of: e.target.value })}
              placeholder="Repo Lead"
            />
          </div>
        )}

        <div>
          <label htmlFor="ro-role" className="label">
            Can they change this list?
          </label>
          <select
            id="ro-role"
            className={`${ctl} mt-2`}
            value={form.role}
            disabled={isOwner !== true}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
          >
            <option value="admin">No — organiser</option>
            <option value="owner">Yes — owner</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="mt-4 text-sm leading-relaxed text-ember" role="alert">
          {error}
        </p>
      )}
      {note && !error && <p className="mt-4 text-sm text-haze">{note}</p>}

      <button
        type="button"
        onClick={() => void save()}
        disabled={busy || isOwner !== true}
        className="btn btn-primary mt-6 disabled:opacity-60"
      >
        {busy ? "Saving…" : existing ? "Update them" : "Add them"}
      </button>

      {/* ------------------------------------------------------------- the list */}
      <div className="mt-10 border-t border-seam pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <p className="label">On the roster</p>
          {rows !== null && (
            <p className="font-mono text-sm text-dust">
              {actives} active · {owners} {owners === 1 ? "owner" : "owners"}
            </p>
          )}
        </div>

        {/* A club with one owner is one graduation away from nobody being able to change
            this list again. Said here, where it can be acted on, rather than in a doc. */}
        {rows !== null && owners < 2 && (
          <p className="mt-3 rounded-tile bg-sunk px-4 py-3 text-sm text-haze">
            Only {owners === 0 ? "nobody is" : "one person is"} an owner. Make a second one
            before they graduate — otherwise this list can never be changed again without
            the Firebase console.
          </p>
        )}

        {rows === null && (
          <p className="mt-3 text-sm text-haze" aria-busy="true">
            Loading…
          </p>
        )}

        {rows && rows.length > 0 && (
          <ul className="mt-3 divide-y divide-seam border-y border-seam">
            {rows.map((r) => {
              const isSelf = r.email.toLowerCase() === user.email!.toLowerCase();
              return (
                <li
                  key={r.email}
                  className={`flex flex-wrap items-baseline gap-x-4 gap-y-2 py-3 ${r.active ? "" : "opacity-60"}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">
                      {r.role === "owner" && r.active && <span className="chip mr-2">Owner</span>}
                      {!r.active && <span className="chip mr-2">Retired</span>}
                      {r.name || r.email}
                      {r.title && <span className="text-haze"> · {r.title}</span>}
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-dust">
                      {r.email}
                      {r.added_at ? ` · added ${fmtDate(r.added_at)}` : ""}
                    </p>
                  </div>
                  {isOwner === true && !isSelf && (
                    <button
                      type="button"
                      onClick={() => void setActive(r, !r.active)}
                      className="tap shrink-0 font-mono text-label uppercase text-haze underline transition-colors hover:text-ink"
                    >
                      {r.active ? "Retire" : "Bring back"}
                    </button>
                  )}
                  {isSelf && (
                    <span className="shrink-0 font-mono text-label uppercase text-dust">You</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
