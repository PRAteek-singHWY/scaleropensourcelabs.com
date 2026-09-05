"use client";

// The finished profile, shown back to the member who filled it in.
//
// EXTRACTED FROM THE OLD JOIN GATE SO TWO SCREENS COULD NOT DRIFT. A copy of a component
// that maps stored codes back to labels is a copy that goes stale the first time somebody
// adds a hostel, so both screens were made to share this one.
//
// `tone` is what let the two screens frame the same facts differently, and it is the ONLY
// thing it changes:
//
//   "receipt"  — seconds after the first save. Leads with "that's you signed up", because
//                the reader's question is "did that work".
//   "record"   — any day after. Leads with the details themselves, because the reader
//                already knows it worked and came here to check or change something.
//
// ONLY "record" HAS A CALLER TODAY, and the reason is worth knowing before anyone deletes
// the other half or reaches for it. The receipt existed for the last step of /join while
// /join was the sign-up flow. It is the anonymous application form again, and the "did
// that work" moment moved with it — ApplyForm owns its own done state now, with copy about
// an application in a queue rather than about a profile that saved.
//
// The receipt cannot simply be pointed at /dashboard instead: the only first-save moment
// left there renders inside the full dashboard, under a heading that has already greeted
// the member by name, and "that's you signed up" under "Good to see you, Prateek" tells
// somebody who joined in March that they have just arrived. That is the same reason the
// record tone does not carry the line — see the note further down.
//
// `isAdmin` and `onSignOut` are in the same position: both were the receipt's, because
// /join was once the only screen an organiser reached before they knew the dashboard
// existed. They are kept rather than pruned because the props are load-bearing the moment
// a first-save screen wants its own framing again, and because a component that renders a
// member's whole record is the wrong place to be churning an API for tidiness.
//
// It deliberately does NOT own the edit form. `onEdit` is a callback, so the page decides
// what editing looks like — the dashboard swaps this card for the form within its own
// panel. A card that mounted ProfileForm itself would force every caller to agree.

import Link from "next/link";
import Panel from "@/components/dashboard/Panel";
import { useAuth } from "@/lib/auth";
import { fmtDate, toDate, type Profile } from "@/lib/profile";
import { HOSTELS, PATHS } from "@/content/join";

/** Code -> label, so a stored profile reads back in human words. Built from the same
 *  content arrays the form renders, so a new option cannot appear in the form and read
 *  as a raw code here. */
function labelOf(list: readonly { value: string; label: string }[], v?: string) {
  if (!v) return "—";
  return list.find((x) => x.value === v)?.label ?? v;
}
function labelsOf(list: readonly { value: string; label: string }[], vs?: string[]) {
  if (!vs?.length) return "—";
  return vs.map((v) => labelOf(list, v)).join(", ");
}

/** The plate's edge: the black keyline, and deliberately not the offset shadow. The hard
 *  shadow marks a CONTROL in this stylesheet — "controls get a black keyline and an
 *  unblurred shadow, content panels get a pale border and a diffuse one" — and this plate
 *  is text you read rather than a thing you press. The same object wearing the same edge
 *  for the same reason is on the sign-in card; see components/SignInCard.tsx, which is
 *  where the fuller argument lives now. */
const PLATE = "border-2 border-black";

export default function ProfileCard({
  profile,
  tone,
  onEdit,
  onSignOut,
}: {
  profile: Profile;
  tone: "receipt" | "record";
  onEdit: () => void;
  /** Omitted on the dashboard, where signing out belongs to the page header rather than
   *  to one panel inside it. Rendering it in both places would put two sign-out controls
   *  on one screen. */
  onSignOut?: () => void;
}) {
  const { isAdmin } = useAuth();
  const p = profile;
  const joined = toDate(p.created_at);
  const receipt = tone === "receipt";

  // The design's list leads with GitHub, role and joined — the three facts a member
  // actually comes back to check. The profile answers are kept underneath them rather
  // than dropped: they are the only place a member can see what the club recorded, and a
  // panel called "your details" that omits most of them is misnamed.
  // THE LIST SHRANK IN THE UPSTREAM MERGE, and this is what survived rather than what was
  // cut for design reasons. Upstream's Profile dropped `year_branch`, `level`, `programs`
  // and `programs_other` — the programmes a member is chasing moved into the mentorship
  // model, and the other two stopped being asked for at all. A row for a field that no
  // longer exists prints "undefined" at a member, so they are gone from here too.
  //
  // `path` is optional now, so its row appears only when there is one.
  const rows: [string, string][] = [
    ["GitHub", p.github ? `@${p.github}` : "not given"],
    ["Role", isAdmin ? "Organiser" : "Learner"],
    ["Joined", joined ? fmtDate(p.created_at) : "—"],
    ["Name", p.name],
    ["Hostel", labelOf(HOSTELS, p.hostel)],
    ...(p.path
      ? ([["Route in", PATHS.find((x) => x.id === p.path)?.name ?? p.path]] as [string, string][])
      : []),
  ];

  // ---------------------------------------------------------------- record
  // THE DASHBOARD'S VERSION, and the design's: a labelled list in the mono face, one row
  // per fact, with the edit control in the panel header rather than under the table.
  //
  // WHAT WENT, AND WHY. This branch used to render the receipt's whole card — a
  // display-size "What we have on you.", a paragraph, and the yellow REGISTERED plate.
  // All three belong to the moment somebody first saves: the headline answers "did that
  // work", and the plate is the gate's own object returning to say which address got
  // through. On a dashboard they are a panel shouting a fact the reader established weeks
  // ago, and the plate put the page's second yellow object directly opposite the
  // sidebar's — which spends the loudest colour in the system on nothing.
  if (!receipt) {
    return (
      <Panel
        icon="user"
        title="Your details"
        id="details"
        action={
          <button
            type="button"
            onClick={onEdit}
            className="tap font-mono text-label uppercase tracking-wider text-haze underline transition-colors hover:text-ink"
          >
            Edit
          </button>
        }
      >
        <dl className="divide-y divide-seam">
          {rows.map(([k, v]) => (
            <div
              key={k}
              className="grid grid-cols-[7.5rem_1fr] items-baseline gap-4 py-2.5 first:pt-0"
            >
              <dt className="font-mono text-[0.9167rem] font-medium uppercase tracking-[0.1em] text-haze">
                {k}
              </dt>
              <dd className="text-sm text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    );
  }

  // --------------------------------------------------------------- receipt
  return (
    <div className="card rounded-panel bg-raise p-8 sm:p-10">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        {/* The ORDINARY blue chip, not `chip-pop`. It was yellow, which put two yellow
            objects in one card — and the plate below is the one that has to carry it.
            Yellow is the loudest colour on this site; spending it twice on one screen
            spends it on nothing. */}
        <p className="chip">{receipt ? "Details saved" : "Your details"}</p>
        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="tap font-mono text-label uppercase text-haze underline transition-colors hover:text-ink"
          >
            Sign out
          </button>
        )}
      </div>

      {/* NOT "You're in the club." That was the copy here first and it overclaims at
          exactly the wrong moment: filling in a form is not membership, and telling
          somebody they have arrived before they have been to a single session is the
          kind of unearned claim the rest of this site refuses to make.

          THE RECORD TONE DOES NOT REPEAT IT. On the dashboard this card sits under a
          heading that already greeted the reader by name, so a second "that's you signed
          up" would be the page telling somebody who has been in the club a month that
          they have just joined. */}
      {receipt ? (
        <>
          <h2 className="mt-5 font-display text-display-md font-bold tracking-tight">
            That&apos;s you signed up.
          </h2>
          <p className="measure mt-4 text-body text-haze">
            Somebody will message you before the next session. There is nothing else to do
            and nothing to prepare — turn up with a laptop and you are in.
          </p>
        </>
      ) : (
        <>
          <h2 className="mt-5 font-display text-display-md font-bold tracking-tight">
            What we have on you.
          </h2>
          <p className="measure mt-4 text-body text-haze">
            All of it, and nothing else. Change any of it whenever you like — a new hostel,
            a GitHub handle you finally made, a programme you have decided to chase.
          </p>
        </>
      )}

      {/* THE GATE PLATE. The same yellow object that carried the domain rule on the way
          in now carries the address it let through, which is what makes the two screens
          one flow rather than two forms.
          "REGISTERED", not "MEMBER" — for the same reason the heading above is not "you
          are in the club". Being on the list is what has happened; the club part happens
          on a Saturday, and the plate does not get to promise it either. */}
      <div className={`${PLATE} mt-7 rounded-tile bg-pop px-5 py-4 text-black`}>
        <p className="font-mono text-label uppercase tracking-wider text-black/70">
          Registered
        </p>
        <p className="mt-1 break-all font-mono text-[1.125rem] font-bold leading-tight">
          {p.email}
        </p>
        {/* Only when there is a real timestamp. A "signed up —" line is worse than no
            line: it invites the reader to wonder what went wrong with a date. */}
        {joined && (
          <p className="mt-2 font-mono text-[1rem] uppercase tracking-wider text-black/80">
            Signed up {fmtDate(p.created_at)}
          </p>
        )}
      </div>

      {/* The address is on the plate above, so it is not repeated as a row — it was the
          only row in this table that the reader could already see twice on the screen. */}
      <dl className="mt-8 divide-y divide-seam border-y border-seam">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
            <dt className="label">{k}</dt>
            <dd className="text-sm text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={onEdit} className="btn btn-secondary">
          Edit my details
        </button>
        {/* THE RECEIPT'S ONWARD DOOR, and the reason it is only on the receipt: the
            dashboard IS this link's destination, so rendering it there would be a page
            offering to take you to itself. */}
        {/* OPENS IN A NEW TAB, so whatever the reader was doing on this one survives.
              `target="_blank"` on a real anchor click is NOT the thing popup blockers
              stop — that is script-driven window.open, which browsers refuse unless it is
              a direct response to a click, and which the Google sign-in popup has usually
              spent already. An anchor is always honoured.

              `rel="noopener"` even though this is same-origin: without it the opened tab
              gets a live `window.opener` handle back to this one, and it costs nothing to
              deny. The sr-only text is how a screen reader learns the same thing sighted
              readers learn from the tab appearing. */}
        {receipt && (
          <Link
            href="/dashboard"
            target="_blank"
            rel="noopener"
            className="btn btn-primary"
          >
            Open my dashboard
            <span className="sr-only"> (opens in a new tab)</span>
          </Link>
        )}
        {/* Only rendered for an admin, and it is a convenience rather than a gate — the
            organisers' page refuses to load data for anybody else because the rules
            refuse the query, not because this link is hidden. */}
        {receipt && isAdmin && (
          <Link href="/admin" className="btn btn-secondary">
            Open the admin dashboard
          </Link>
        )}
      </div>
    </div>
  );
}
