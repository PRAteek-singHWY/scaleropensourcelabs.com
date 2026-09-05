"use client";

// The notice board, as a member reads it.
//
// THE ONE THING ON THIS DASHBOARD THAT CHANGES WITHOUT THE MEMBER DOING ANYTHING, which
// is why it sits at the top of the column rather than under the profile: a member who
// opens the dashboard twice in a week has already read their own details, and the only
// reason to come back is to find out what the club has said since.
//
// NO MARKDOWN, NO HTML, AND THAT IS DELIBERATE. The body renders as plain text with
// `whitespace-pre-line`, so paragraph breaks survive and nothing else does. Rendering
// organiser-typed markup would mean either shipping a sanitiser or trusting that no
// admin account is ever compromised — and the value of bold text in a club notice is not
// worth either. A single optional link covers the real need, and the rules force it to
// be https.
//
// READ ONCE PER MOUNT. A board that polls spends reads to tell somebody nothing changed;
// the club posts a few times a week and the reader is going to reload anyway.

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import Panel from "@/components/dashboard/Panel";
import { useAuth } from "@/lib/auth";
import { CATEGORIES, live, readAnnouncements, type Announcement } from "@/lib/announcements";
import { fmtDate } from "@/lib/profile";

export default function Board() {
  const { isClubMember } = useAuth();
  const [posts, setPosts] = useState<Announcement[] | null>(null);

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
        // ARCHIVED NOTICES ARE DROPPED HERE rather than in the query: the rules cannot
        // filter, and the organisers\u2019 screen needs the same read to include them.
        const rows = live(await readAnnouncements(isClubMember));
        if (alive) setPosts(rows);
      } catch (e) {
        // A refusal here means the rules are not deployed, or the collection has never
        // been written to on a fresh project. Neither is the member's problem, and
        // neither should take the rest of the dashboard down — so this panel falls back
        // to its empty state and the page carries on.
        //
        // THE EMPTY STATE IS ALSO THE FAILURE STATE, deliberately: the panel reads "No
        // notices at the moment" whether nothing was posted or the read failed, so a
        // member never meets an error message they cannot act on.
        //
        // THE COST IS REAL AND BELONGS IN WRITING. A failed read now presents as an empty
        // board, so a deadline that WAS posted reads as nothing to catch — the panel is
        // at its most reassuring exactly when it knows least. The console line below is
        // the only thing that still tells the two apart, which is why it stays.
        console.error("[osc] could not read the board", e);
        if (alive) setPosts([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isClubMember]);

  return (
    <Panel icon="megaphone" title="From the organisers">

      {posts === null && (
        <p className="text-body text-haze" aria-busy="true">
          Loading the board…
        </p>
      )}

      {posts?.length === 0 && (
        <>
          <h3 className="font-display text-display-md font-bold tracking-tight">
            No notices at the moment
          </h3>
          <p className="measure mt-3 text-body text-haze">
            When there is a session, a deadline worth catching, or a repo that suddenly
            needs hands, it lands here first.
          </p>
        </>
      )}

      {posts && posts.length > 0 && (
        <ul className="space-y-4">
          {posts.map((post) => (
            <li
              key={post.id}
              /* TWO VARIANTS, AS THE DESIGN HAS THEM: a pinned notice sits on a warm
                 tinted plate with a keyline, an ordinary one on the recessed grey. The
                 tint is `--pop` at low alpha rather than a new peach token — the design's
                 salmon is not in this site's palette, and adding a colour for one card is
                 how a palette stops being one. At 12% the yellow reads as the warm plate
                 the design wants and still holds body text at full contrast. */
              className={
                post.pinned
                  ? "rounded-tile border-2 border-black/80 bg-pop/[0.12] p-5"
                  : "rounded-tile bg-sunk p-5"
              }
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0 text-haze">
                  <Icon name={post.pinned ? "pin" : "info"} size="1rem" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <span className="font-mono text-[0.9167rem] uppercase tracking-wider text-dust">
                    {CATEGORIES.find((c) => c.value === (post.category ?? "general"))?.label}
                  </span>
                  <h3 className="text-body font-semibold text-ink">{post.title}</h3>
                </div>
              </div>
              <p className="measure mt-2 whitespace-pre-line text-sm leading-relaxed text-haze">
                {post.body}
              </p>
              {post.link && (
                <a
                  href={post.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tap link-u mt-3 inline-block text-sm text-accent"
                >
                  Open the link
                </a>
              )}
              <p className="mt-3 font-mono text-[0.9583rem] uppercase tracking-wider text-dust">
                {fmtDate(post.created_at)} · {post.author_email}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
