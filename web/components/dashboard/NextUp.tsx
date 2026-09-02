"use client";

// What to actually do next, answered against what this member chose.
//
// THE PANEL THAT STOPS THE DASHBOARD BEING A RECEIPT. Without it the page is three
// read-only facts — your details, your counts, the club's notices — and a member who
// opens it has nowhere to go. This is the only panel on the page with an outbound door.
//
// IT IS BUILT FROM CONTENT, NOT FROM FIRESTORE. The route they picked and the programmes
// they ticked are already on the profile, and everything this panel says about them
// already exists in content/join.ts and content/club.ts. So there is nothing to fetch,
// nothing to keep in sync, and no new collection — the personalisation is a lookup.
//
// WHY THE FIRST LINE NAMES THEIR ROUTE. "Here are some links" is a panel every member
// scrolls past. "You said fast-track, so here is the fast-track door" is the club having
// remembered — which is the whole difference between a dashboard and a footer.

import Link from "next/link";
import Icon from "@/components/Icon";
import Panel from "@/components/dashboard/Panel";
import { PATHS } from "@/content/join";
import { LINKS } from "@/content/site";
import type { Profile } from "@/lib/profile";

/** One door. `external` decides between next/link and a plain anchor — a Link to an
 *  off-site URL renders, prefetches nothing, and quietly loses the new-tab behaviour. */
type Door = { label: string; hint: string; href: string; external?: boolean };

/** The doors that are the same for everybody. Ordered by how soon somebody should walk
 *  through them, not by importance: a good first issue is the thing to do this week, the
 *  contributing guide is the thing to read before the first patch, and the club's own
 *  repo is where a member who has caught the bug goes next. */
const COMMON: Door[] = [
  {
    label: "Find a good first issue",
    hint: "Open, unclaimed, and sized for a first attempt.",
    href: LINKS.issues,
    external: true,
  },
  {
    label: "Read the contributing guide",
    hint: "How a patch gets from your laptop to merged.",
    href: LINKS.contributing,
    external: true,
  },
  {
    label: "See what the club is working on",
    hint: "Every project members have landed work in.",
    href: "/projects",
  },
];

export default function NextUp({ profile }: { profile: Profile }) {
  const path = PATHS.find((p) => p.id === profile.path);
  // Their ticked programmes, in human words. Capped at three in the sentence below,
  // because a member who ticked eight would otherwise get a paragraph of acronyms where
  // a sentence belongs.
  // THE PROGRAMMES CLAUSE IS GONE, and it was the better half of this panel — "you have
  // your eye on GSoC" is the club having remembered something. Upstream's merge moved
  // "which programmes are you chasing" off the Profile and into the mentorship model, so
  // there is nothing here to personalise against except the route they came in through.
  //
  // An empty list rather than a deletion: the sentence below already handles "nothing
  // picked", because older profiles never had any — so re-attaching this to the mentorship
  // enrolment later is one line here and nothing else.
  const picked: string[] = [];

  const doors: Door[] = [
    // The programmes door only appears when they actually ticked something, which is
    // always today — `programs` is required — but the panel should not assume a required
    // field will stay required.
    ...(picked.length
      ? [
          {
            label: "Deadlines for the programmes you picked",
            hint: "When applications open, and what they want to see by then.",
            href: "/programmes",
          } as Door,
        ]
      : []),
    ...COMMON,
  ];

  return (
    <Panel icon="compass" title="Where to go next" tone="accent">
      {/* THE REMEMBERED BIT, and the reason this panel is the one filled surface on the
          page. "Here are some links" is a panel every member scrolls past; "you said
          fast-track, so here is the fast-track door" is the club having remembered, and
          that is worth the only block of colour on the screen.

          Both clauses are conditional because both fields can be missing on an older
          profile, and a sentence with a blank in it is worse than a shorter sentence. */}
      <p className="text-body leading-relaxed">
        {path ? (
          <>
            You came in through{" "}
            <span className="font-semibold">{path.name.toLowerCase()}</span>
            {picked.length ? ", and you have your eye on " : ". "}
          </>
        ) : null}
        {picked.length ? (
          <>
            <span className="font-semibold">
              {picked.slice(0, 2).join(", ")}
              {picked.length > 2 ? ` and ${picked.length - 2} more` : ""}
            </span>
            . Here is what moves that along.
          </>
        ) : (
          "Here is what to do with the week you have."
        )}
      </p>

      {/* BUTTONS ON THE PLATE, not the underlined list this panel used to carry. On a
          filled surface an underline is the only thing distinguishing a link from the
          sentence around it, and at this contrast that is not enough — the design makes
          each one a pressable object instead, which is also what they are. */}
      <ul className="mt-5 space-y-2.5">
        {doors.map((d) => {
          const inner = (
            <>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{d.label}</span>
                <span className="block truncate text-[0.8125rem] opacity-80">{d.hint}</span>
              </span>
              <Icon name={d.external ? "external" : "arrow-right"} size="1rem" />
            </>
          );
          // `bg-raise` is the ink-flipping token again: it is white on the light theme's
          // blue and near-black on the dark theme's periwinkle, so these read as raised
          // objects on the plate in both. See the note in Panel.tsx.
          const cls =
            "tap flex w-full items-center justify-between gap-3 rounded-tile bg-raise/15 px-4 py-3 text-left transition-colors hover:bg-raise/25";
          return (
            <li key={d.href}>
              {d.external ? (
                <a href={d.href} target="_blank" rel="noopener noreferrer" className={cls}>
                  {inner}
                </a>
              ) : (
                <Link href={d.href} className={cls}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-5 text-sm opacity-90">
        Stuck on any of it?{" "}
        <a href={`mailto:${LINKS.email}`} className="tap underline underline-offset-2">
          Email us
        </a>{" "}
        — that is what we are for.
      </p>
    </Panel>
  );
}
