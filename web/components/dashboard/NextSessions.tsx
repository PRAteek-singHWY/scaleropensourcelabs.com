"use client";

// When the club next meets, on a member's dashboard.
//
// THE HALF OF "SESSIONS" THAT FACES THE MEMBER. Organisers schedule them on /admin; this
// shows the next few and nothing else — a member does not need the archive, and a list
// that includes last term's sessions is a list nobody scans.
//
// THREE, NOT ALL OF THEM. The panel answers "what is next", and the fourth session down
// is not an answer to that. Everything past the cap is reachable from the notice board
// where the club talks about the term, so nothing is hidden — it is just not here.
//
// IT RENDERS NOTHING AT ALL WHEN THE COLLECTION IS EMPTY, which is the exception to this
// dashboard's rule that every panel keeps its empty state. The others are permanent parts
// of the page and their emptiness is information — "nothing waiting on you" is worth
// saying. A club that has not scheduled anything yet has no schedule, and a card
// announcing that is a card apologising for a feature.

import { useEffect, useState } from "react";
import Panel from "@/components/dashboard/Panel";
import { useAuth } from "@/lib/auth";
import { readSessions, sessionWhen, upcoming, type SessionDoc } from "@/lib/sessions";

const SHOWN = 3;

export default function NextSessions() {
  const { isClubMember } = useAuth();
  const [rows, setRows] = useState<SessionDoc[] | null>(null);

  // WAIT FOR A DEFINITE ANSWER BEFORE ASKING. `isClubMember` is undefined until the
  // profile read comes back, and the query built from it decides which audiences this
  // request may even mention — so firing it early would ask as the wrong person and
  // either miss the members' notices or be refused outright. The panel stays in its
  // loading state for the extra moment instead.
  useEffect(() => {
    if (isClubMember === undefined) return;
    let alive = true;
    (async () => {
      try {
        const all = await readSessions(isClubMember);
        if (alive) setRows(upcoming(all).slice(0, SHOWN));
      } catch (e) {
        // Silent, and deliberately: a schedule that fails to load should cost the member
        // a panel, not an error message about a collection they have never heard of. The
        // console keeps the detail for whoever is debugging.
        console.error("[osc] could not read sessions", e);
        if (alive) setRows([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isClubMember]);

  if (rows === null || rows.length === 0) return null;

  return (
    <Panel icon="calendar" title="What's on">
      <ul className="space-y-2.5">
        {rows.map((s) => {
          const when = sessionWhen(s.starts_at);
          return (
            <li
              key={s.id}
              className="flex items-center gap-4 rounded-tile bg-sunk px-4 py-3"
            >
              {/* The date as its own block, in the accent, so a member scanning the panel
                  reads WHEN before what — which is the question they opened it with. */}
              <span className="shrink-0 text-center">
                <span className="block font-mono text-xs font-medium uppercase tracking-wider text-accent">
                  {when.day}
                </span>
                <span className="block font-mono text-xs text-dust">{when.time}</span>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">{s.title}</span>
                <span className="block truncate text-sm text-haze">
                  {[s.speaker, s.location].filter(Boolean).join(" · ") || "Details to come"}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
