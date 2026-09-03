"use client";

// What GitHub says the member has been doing.
//
// FIVE STATES, and the four that are not "here are your numbers" are the ones that
// decide whether this panel is useful or insulting:
//
//   no handle        they never gave one. Ask for it, link to the edit form. Do NOT
//                    render zeroes — a panel that says "0 merged" to somebody who never
//                    told us where to look is accusing them of nothing.
//   never synced     handle given, the function has not run for them yet. Say that, and
//                    offer the button.
//   handle not found GitHub answered and there is no such account. Almost always a typo,
//                    so the copy says so and points at the field.
//   stale handle     they changed the handle after the last sync, so these numbers are
//                    the old account's. Flagged rather than silently shown.
//   synced           the numbers.
//
// THE NUMBERS ARE NOT A SCORE, and the copy has to keep saying that. A dashboard that
// ranks members by merged PRs turns a club whose entire pitch is "you do not need to be
// good yet" into a leaderboard that a first-year loses. So: no comparison to anybody
// else, no target, no streak. It is a record of your own work, and the empty version of
// it says "nothing yet" in the same voice as the full one.
//
// WHY THE HANDLE IS NOT PROOF. `github` is free text somebody typed into a form, so this
// panel shows activity for a HANDLE, not for a verified identity. The heading says so.
// See lib/contributions.ts for why verifying it is not worth a second sign-in.

import { useCallback, useEffect, useState } from "react";
import {
  ago,
  readContributions,
  refreshContributions,
  type Contributions as Row,
} from "@/lib/contributions";
import Icon from "@/components/Icon";
import Panel from "@/components/dashboard/Panel";
import { toDate } from "@/lib/profile";

/** A number and what it counts. Not `.num` — that class is the small blue step badge
 *  used in numbered lists, and it renders a headline count as a chip-sized pill. The
 *  admin dashboard learned this the same way. */
function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-tile bg-sunk px-5 py-4">
      <p className="font-display text-display-md font-bold tabular-nums tracking-tight">
        {n}
      </p>
      <p className="mt-1 text-sm text-haze">{label}</p>
    </div>
  );
}

/** The panel frame, so all five states share one header rather than four of them
 *  re-declaring it. `action` is the refresh control, which every state except the
 *  no-handle one offers. */
function Frame({
  action,
  children,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Panel icon="network" title="Your open source" id="open-source" action={action}>
      {children}
    </Panel>
  );
}

/** A pull request's state, as the design's pill. Merged is the accent, still-open is the
 *  yellow — the club's two loudest colours spent on the only two outcomes that matter. */
function StatePill({ state }: { state: string }) {
  const merged = state === "merged";
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[0.6875rem] font-medium uppercase tracking-wider ${
        merged ? "bg-accent-soft text-accent" : "border border-black/70 bg-pop text-black"
      }`}
    >
      {merged ? "Merged" : "Open"}
    </span>
  );
}

export default function Contributions({
  uid,
  handle,
  onEditProfile,
  onSummary,
}: {
  uid: string;
  /** Reports merged / projects / open up to the dashboard's summary strip, so three of
   *  its four figures cost no extra reads. */
  onSummary?: (merged: number, repos: number, open: number) => void;
  /** The handle currently on the profile, which is what `row.github` is compared
   *  against. Undefined when they never gave one. */
  handle?: string;
  onEditProfile: () => void;
}) {
  const [row, setRow] = useState<Row | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setRow(await readContributions(uid));
    } catch (e) {
      console.error("[osc] could not read contributions", e);
      // Same shape as the forms' — "X didn't load. Give it a refresh?" A member who meets
      // both in one session should not be able to tell that two different people wrote them.
      // The board no longer carries this shape: it falls back to its empty state instead.
      setError("Your GitHub activity didn't load. Give it a refresh?");
      setRow(null);
    }
  }, [uid]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (row) onSummary?.(row.merged, row.repos, row.open);
  }, [row, onSummary]);

  async function refresh() {
    setBusy(true);
    setNote("");
    setError("");
    try {
      const res = await refreshContributions();
      if (res.ok) {
        setRow(res.contributions);
        setNote("Up to date.");
      } else if (res.reason === "cooldown") {
        // NOT AN ERROR, and it must not be worded as one. It means the numbers on
        // screen are already recent — telling somebody "that failed" when the answer is
        // "that was unnecessary" is the wrong sentence.
        setNote("Already checked in the last few minutes — these numbers are current.");
      } else if (res.reason === "no-handle") {
        setError("Add your GitHub handle to your details first.");
      } else if (res.reason === "not-found") {
        setError("GitHub has no account with that handle. Check it for a typo.");
        await load();
      } else {
        setError("GitHub did not answer. Try again in a minute.");
      }
    } catch (e) {
      // A callable throws for reasons that are not GitHub's fault at all — the function
      // not deployed, the region wrong, App Check refusing. The console gets the code;
      // the member gets a sentence that does not blame their account.
      console.error("[osc] refresh failed", e);
      setError("We could not reach the sync just now. Try again in a minute.");
    } finally {
      setBusy(false);
    }
  }

  const RefreshButton = (
    <button
      type="button"
      onClick={() => void refresh()}
      disabled={busy}
      className="btn btn-secondary btn-compact disabled:opacity-60"
    >
      {busy ? "Checking GitHub…" : "Check GitHub now"}
    </button>
  );

  // ------------------------------------------------------------- no handle
  if (!handle?.trim()) {
    return (
      <Frame action={RefreshButton}>
        <h3 className="font-display text-display-md font-bold tracking-tight">
          Tell us where to look.
        </h3>
        <p className="measure mt-3 text-body text-haze">
          Add your GitHub handle to your details and this panel starts keeping count of
          every pull request you land — including the ones you have already forgotten
          about.
        </p>
        <button type="button" onClick={onEditProfile} className="btn btn-primary mt-5">
          Add my GitHub handle
        </button>
      </Frame>
    );
  }

  // -------------------------------------------------------------- loading
  if (row === undefined) {
    return (
      <Frame>
        <p className="text-body text-haze" aria-busy="true">
          Looking up @{handle}…
        </p>
      </Frame>
    );
  }

  const synced = toDate(row?.synced_at ?? null);
  // The stored handle and the profile's, compared case-insensitively — GitHub handles
  // are case-preserving but not case-sensitive, so "Asha" and "asha" are one account and
  // flagging that as a mismatch would be a warning about nothing.
  const stale =
    row !== null && row.github.trim().toLowerCase() !== handle.trim().toLowerCase();

  return (
    <Frame>
      {/* The handle is stated first, because the whole panel is only true OF that handle
          — see the note at the top about what it does and does not prove. */}
      <p className="font-mono text-[0.8125rem] text-haze">@{handle}</p>

      {error && (
        <p className="mt-4 text-sm leading-relaxed text-ember" role="alert">
          {error}
        </p>
      )}
      {note && !error && <p className="mt-4 text-sm text-haze">{note}</p>}

      {stale && (
        <p className="mt-4 rounded-tile bg-sunk px-4 py-3 text-sm text-haze">
          These are for <span className="font-mono text-ink">@{row!.github}</span>, the
          handle we had before you changed it. Press “Check GitHub now” to count the new
          one.
        </p>
      )}

      {row === null ? (
        <p className="measure mt-4 text-body text-haze">
          We have not counted yet. It happens automatically once a day, or you can ask for
          it now.
        </p>
      ) : row.not_found ? (
        <p className="measure mt-4 text-body text-haze">
          GitHub has no account called <span className="font-mono text-ink">@{row.github}</span>.
          Almost always a typo —{" "}
          <button type="button" onClick={onEditProfile} className="tap link-u text-accent">
            fix the handle
          </button>{" "}
          and we will try again.
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Stat n={row.merged} label="pull requests merged" />
            <Stat n={row.open} label="still open" />
            <Stat n={row.repos} label="projects touched" />
          </div>

          {row.merged === 0 && row.open === 0 ? (
            /* THE EMPTY STATE THAT MATTERS. Most members will see this for weeks, and
               it is the one place this panel could make somebody feel behind. It does
               not: nothing is wrong, the count is simply waiting. */
            <p className="measure mt-6 text-body text-haze">
              Nothing yet — which is exactly where almost everybody here started. Your
              first one shows up on this panel the day it is merged.
            </p>
          ) : (
            <ul className="mt-5 space-y-2.5">
              {row.recent.map((pr) => (
                <li key={pr.url}>
                  <a
                    href={pr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tap flex items-center justify-between gap-3 rounded-tile bg-sunk px-4 py-3 transition-colors hover:bg-accent-soft"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[0.8125rem] text-ink">
                        {pr.title}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[0.75rem] text-dust">
                        {pr.repo}
                      </span>
                    </span>
                    <StatePill state={pr.state} />
                  </a>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-5 font-mono text-[0.8125rem] uppercase tracking-wider text-dust">
            Checked {ago(synced)}
          </p>
        </>
      )}
    </Frame>
  );
}
