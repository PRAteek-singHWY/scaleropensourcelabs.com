"use client";

// Where organisers write to the notice board.
//
// IT EXISTS BECAUSE THE ALTERNATIVE IS THE FIREBASE CONSOLE, and a notice board that can
// only be written from a console is a notice board nobody writes to. Everything else an
// organiser does by hand here — appointing admins, removing a member — is rare, dangerous
// and correctly console-only. Posting "no session this Saturday" is none of those: it
// happens weekly, it is reversible, and the person doing it is on a phone.
//
// THIS IS THE ONE PLACE A CLIENT WRITES AN ADMIN-ONLY COLLECTION, which is a departure
// from `admins` (write: if false for everybody) and is argued for in firestore.rules
// rather than assumed here. The short version: adminship is the privilege that grants
// privileges, and a notice is not.
//
// NO RICH TEXT. The body is stored and rendered as plain text — see the note in
// Board.tsx. A composer that offered bold would need a sanitiser on the read side, and
// the value of bold in a club notice does not pay for one.
//
// THE LIST BELOW IS PART OF THE COMPOSER, not a separate panel, because the mistake this
// screen actually has to catch is a duplicate post — somebody pressing publish twice, or
// posting a notice that is already up. Showing what is already on the board directly
// under the form is what prevents that; a "manage posts" tab elsewhere would not.

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import AudiencePicker from "@/components/AudiencePicker";
import { DEFAULT_AUDIENCE, type Audience } from "@/lib/audience";
import {
  CATEGORIES,
  createAnnouncement,
  deleteAnnouncement,
  isWellFormedPost,
  readAnnouncements,
  setFlags,
  type Announcement,
  type Category,
} from "@/lib/announcements";
import { fmtDate } from "@/lib/profile";

/** One string for both inputs and the textarea, so three controls cannot drift apart a
 *  class at a time. Lifted from AdminDashboard's `ctl` for exactly that reason. */
const ctl =
  "w-full rounded-inline border border-seam bg-sunk px-3.5 py-2.5 text-sm text-ink placeholder:text-dust outline-none transition focus:border-accent";

export default function Composer() {
  const { user, isAdmin } = useAuth();
  const [posts, setPosts] = useState<Announcement[] | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>(DEFAULT_AUDIENCE);
  const [link, setLink] = useState("");
  const [pinned, setPin] = useState(false);
  const [category, setCategory] = useState<Category>("general");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      setPosts(await readAnnouncements());
    } catch (e) {
      console.error("[osc] could not read the board", e);
      setError("Could not load what is already posted. The rules may not be deployed.");
      setPosts([]);
    }
  }, []);

  useEffect(() => {
    if (isAdmin !== true) return;
    void load();
  }, [isAdmin, load]);

  // The page around this already refuses non-admins, so this is belt and braces rather
  // than the gate — and it keeps the composer from rendering a form that cannot save if
  // it is ever mounted somewhere else.
  if (isAdmin !== true || !user?.email) return null;

  async function publish() {
    setError("");
    setNote("");
    if (!isWellFormedPost({ title, body })) {
      setError("A notice needs both a title and something to say.");
      return;
    }
    // Checked here as well as in the rules so the reader gets a sentence instead of a
    // permission error. The rules are what actually refuse it.
    if (link.trim() && !/^https:\/\//i.test(link.trim())) {
      setError("A link has to start with https://.");
      return;
    }
    setBusy(true);
    try {
      await createAnnouncement(user!.email!, { title, body, link, pinned, category, audience });
      setTitle("");
      setBody("");
      setLink("");
      setPin(false);
      setCategory("general");
      // The audience is NOT reset. Unlike the other fields it is a habit rather than a
      // property of the notice just posted — an organiser working through three
      // members-only notices should not have to re-pick it three times, and the picker
      // stays on screen showing what the next one will be.
      setNote(
        audience === "members"
          ? "Posted. Club members see it on their dashboard now."
          : audience === "students"
            ? "Posted. Students who are not members see it; members will not."
            : "Posted. Everyone who signs in sees it on their dashboard now.",
      );
      await load();
    } catch (e) {
      console.error("[osc] could not post", e);
      setError(
        "Firestore refused that. Either the rules are not deployed, or your address is not in the admins collection.",
      );
    } finally {
      setBusy(false);
    }
  }

  /** One writer for both flags. Pinning and archiving are the SAME write — a full
   *  document with one boolean different — so two functions would have been two copies of
   *  the "send created_at back unchanged" rule that the rules refuse a write without. */
  async function setFlag(
    post: Announcement,
    flags: { pinned?: boolean; archived?: boolean },
  ) {
    setError("");
    setNote("");
    try {
      await setFlags(post, flags);
      await load();
    } catch (e) {
      console.error("[osc] could not update the notice", e);
      setError("Could not change that. Reload and try again.");
    }
  }

  async function remove(post: Announcement) {
    setError("");
    // A browser confirm rather than a bespoke modal. It is a destructive action an
    // organiser takes about twice a year, and the native dialogue is the one thing on
    // the page that cannot be mis-clicked through.
    if (!window.confirm(`Delete “${post.title}”? Members will stop seeing it.`)) return;
    try {
      await deleteAnnouncement(post.id);
      await load();
    } catch (e) {
      console.error("[osc] could not delete", e);
      setError("Could not delete that. Reload and try again.");
    }
  }

  return (
    <div className="card rounded-panel bg-raise p-6 sm:p-8">
      <p className="label">The notice board</p>
      <h3 className="mt-3 font-display text-display-md font-bold tracking-tight">
        Tell everyone something.
      </h3>
      <p className="measure mt-3 text-body text-haze">
        This lands on every member&apos;s dashboard the moment you post it. Pin the one
        that has to survive a fortnight.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="an-title" className="label">
            Title
          </label>
          <input
            id="an-title"
            className={`${ctl} mt-2`}
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="No session this Saturday"
          />
        </div>

        <div>
          <label htmlFor="an-body" className="label">
            What they need to know
          </label>
          <textarea
            id="an-body"
            className={`${ctl} mt-2 min-h-[8rem] resize-y`}
            value={body}
            maxLength={2000}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Blank lines become paragraph breaks. Nothing else is formatted."
          />
          {/* Only past halfway. A counter that is visible from the first keystroke reads
              as a limit somebody is about to hit; one that appears at 1000 characters is
              information at the moment it becomes useful. */}
          {body.length > 1000 && (
            <p className="mt-1 font-mono text-xs text-dust">
              {2000 - body.length} characters left
            </p>
          )}
        </div>

        <div>
          <label htmlFor="an-link" className="label">
            A link, if there is one
          </label>
          <input
            id="an-link"
            className={`${ctl} mt-2`}
            value={link}
            maxLength={300}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://…"
          />
        </div>

        <div>
          <label htmlFor="an-cat" className="label">
            What kind of notice
          </label>
          <select
            id="an-cat"
            className={`${ctl} mt-2`}
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <AudiencePicker
          id="an-audience"
          noun="notice"
          value={audience}
          onChange={setAudience}
          controlClassName={ctl}
        />

        <label className="tap flex items-center gap-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPin(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          Pin it to the top
        </label>
      </div>

      {error && (
        <p className="mt-4 text-sm leading-relaxed text-ember" role="alert">
          {error}
        </p>
      )}
      {note && !error && <p className="mt-4 text-sm text-haze">{note}</p>}

      <button
        type="button"
        onClick={() => void publish()}
        disabled={busy}
        className="btn btn-primary mt-6 disabled:opacity-60"
      >
        {busy ? "Posting…" : "Post it"}
      </button>

      {/* WHAT IS ALREADY UP. The duplicate-post guard described at the top of this file. */}
      <div className="mt-10 border-t border-seam pt-6">
        <p className="label">Already on the board</p>
        {posts === null && (
          <p className="mt-3 text-sm text-haze" aria-busy="true">
            Loading…
          </p>
        )}
        {posts?.length === 0 && (
          <p className="mt-3 text-sm text-haze">Nothing yet.</p>
        )}
        {posts && posts.length > 0 && (
          <ul className="mt-3 divide-y divide-seam border-y border-seam">
            {posts.map((post) => (
              <li key={post.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-2 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                    {post.pinned && <span className="chip">Pinned</span>}
                    {post.archived && <span className="chip chip-quiet">Archived</span>}
                    <span className="font-mono text-label uppercase tracking-wider text-haze">
                      {CATEGORIES.find((c) => c.value === (post.category ?? "general"))?.label}
                    </span>
                    {post.title}
                  </p>
                  <p className="mt-1 font-mono text-xs uppercase tracking-wider text-dust">
                    {fmtDate(post.created_at)} · {post.author_email}
                  </p>
                </div>
                <div className="flex shrink-0 gap-4">
                  <button
                    type="button"
                    onClick={() => void setFlag(post, { pinned: !post.pinned })}
                    className="tap font-mono text-label uppercase text-haze underline transition-colors hover:text-ink"
                  >
                    {post.pinned ? "Unpin" : "Pin"}
                  </button>
                  {/* ARCHIVE FIRST, DELETE SECOND, and the order is the point: archiving is
                      what an organiser almost always means, and it is reversible. Delete
                      destroys the only record the club has of what it said, so it sits
                      after and wears the warning colour. */}
                  <button
                    type="button"
                    onClick={() => void setFlag(post, { archived: !post.archived })}
                    className="tap font-mono text-label uppercase text-haze underline transition-colors hover:text-ink"
                  >
                    {post.archived ? "Restore" : "Archive"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(post)}
                    className="tap font-mono text-label uppercase text-haze underline transition-colors hover:text-ember"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
