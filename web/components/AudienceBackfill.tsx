"use client";

// A ONE-TIME MIGRATION, WITH A BUTTON, AND IT DISAPPEARS WHEN IT IS DONE.
//
// WHY THIS IS UI AND NOT A SCRIPT. Every other repo would put this in scripts/ and run
// it once from a laptop. This one cannot: the site is a static export with no server,
// the only Firebase credentials in existence belong to a signed-in organiser, and
// sign-in is Google-only — so there is no headless way to authenticate as somebody
// allowed to make these writes. `firebase-admin` and a service-account key would create
// a second, stronger credential for the club to look after, for one afternoon's work.
// The organisers' page is where admin-authorised code already runs.
//
// WHAT IT FIXES, AND WHY DOING NOTHING IS NOT AN OPTION. Announcements, sessions and
// forms written before the audience picker existed carry no `audience` field. The rules
// read that as "everyone", so those documents are still permitted to every reader — but
// permission is not the problem. Every member-facing read now carries
// `where("audience", "in", …)`, and a Firestore inequality does not match documents that
// lack the field AT ALL. A notice with no audience is therefore invisible to everybody
// except an organiser, whose query has no such clause. It looks deleted. Stamping the
// default explicitly is what puts it back.
//
// IT RENDERS NOTHING WHEN THERE IS NOTHING TO DO, so it is not a permanent button
// waiting to be pressed by mistake — after one successful run this component is a blank
// space on the page, and whoever eventually deletes it can see it was finished.

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { ANNOUNCEMENTS, FORMS, SESSIONS, getDb } from "@/lib/firebase";
import { DEFAULT_AUDIENCE } from "@/lib/audience";

const COLLECTIONS = [
  [ANNOUNCEMENTS, "notices"],
  [SESSIONS, "sessions"],
  [FORMS, "forms"],
] as const;

export default function AudienceBackfill() {
  const { isAdmin } = useAuth();
  /** collection -> ids still missing an audience. null while unknown. */
  const [stale, setStale] = useState<Record<string, string[]> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(0);

  const scan = useCallback(async () => {
    try {
      const db = await getDb();
      if (!db) return;
      const { collection, getDocs } = await import("firebase/firestore");
      const found: Record<string, string[]> = {};
      for (const [name] of COLLECTIONS) {
        // READ THE WHOLE COLLECTION AND FILTER HERE. There is no query for "documents
        // missing this field" — that is the entire problem being fixed — so the scan
        // has to look at every row. It is a few dozen documents, once.
        const snap = await getDocs(collection(db, name));
        const ids = snap.docs.filter((d) => d.data().audience === undefined).map((d) => d.id);
        if (ids.length) found[name] = ids;
      }
      setStale(found);
    } catch (e) {
      // A failed scan is not worth an error on the organisers' page: it means the rules
      // are not deployed yet, which every other panel here is already saying loudly.
      console.error("[osc] could not scan for legacy audiences", e);
      setStale({});
    }
  }, []);

  useEffect(() => {
    if (isAdmin !== true) return;
    void scan();
  }, [isAdmin, scan]);

  async function run() {
    if (!stale) return;
    setError("");
    setBusy(true);
    try {
      const db = await getDb();
      if (!db) throw new Error("Firebase is not configured");
      const { doc, serverTimestamp, updateDoc } = await import("firebase/firestore");
      let n = 0;
      for (const [name, ids] of Object.entries(stale)) {
        for (const id of ids) {
          // updated_at goes with it because the rules require every write to these
          // collections to carry the server's clock — the same validator that checks a
          // real edit checks this one. It does mean each migrated document's "last
          // edited" becomes today, which is the honest record of what happened to it.
          await updateDoc(doc(db, name, id), {
            audience: DEFAULT_AUDIENCE,
            updated_at: serverTimestamp(),
          });
          n += 1;
        }
      }
      setDone(n);
      await scan();
    } catch (e) {
      console.error("[osc] backfill failed", e);
      setError(
        "Firestore refused part of that. Nothing is half-written — each document is its own write, so run it again and it will pick up whatever is left.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (isAdmin !== true) return null;
  const total = stale ? Object.values(stale).reduce((a, b) => a + b.length, 0) : 0;
  if (stale !== null && total === 0) {
    // Confirm the run that just happened, then go quiet for good.
    return done > 0 ? (
      <p className="text-sm text-haze">
        Stamped {done} older {done === 1 ? "item" : "items"} as visible to everyone. Nothing
        left to migrate.
      </p>
    ) : null;
  }
  if (stale === null) return null;

  return (
    <div className="card rounded-panel border border-accent/40 bg-raise p-6 sm:p-7">
      <h2 className="font-display text-body-lg font-semibold text-ink">
        {total} older {total === 1 ? "item is" : "items are"} not showing to anyone
      </h2>
      <p className="measure mt-2 text-body text-haze">
        {Object.entries(stale)
          .map(([name, ids]) => `${ids.length} ${COLLECTIONS.find((c) => c[0] === name)?.[1] ?? name}`)
          .join(", ")}{" "}
        were posted before notices had an audience. Members cannot see them until they are
        marked. This sets them to <strong className="text-ink">everyone</strong>, which is
        who they reached when they were written.
      </p>
      {error && (
        <p className="mt-4 text-sm leading-relaxed text-ember" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => void run()}
        disabled={busy}
        className="btn btn-primary btn-compact mt-4 disabled:opacity-60"
      >
        {busy ? "Marking…" : `Mark all ${total} as everyone`}
      </button>
    </div>
  );
}
