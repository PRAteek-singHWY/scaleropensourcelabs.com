"use client";

// The app shell: the chrome that both the member dashboard and the organisers' page sit
// inside, taken from the Stitch designs.
//
// TWO SCREENS, ONE SHELL. The admin design and the member design are the same frame with
// different content in the middle — same bar, same sidebar, same footer — so building it
// twice would guarantee they drift the first time either moves. The page supplies its own
// content and nothing else.
//
// IT REPLACES THE MARKETING CHROME RATHER THAN SITTING INSIDE IT. The site's nav is a
// floating rounded-inline plate with six links arguing for the club; every reader here has
// already joined. See components/ChromeGate.tsx for the suppression, and app/layout.tsx
// for where it is applied.
//
// THE SIDEBAR'S FOUR ITEMS ARE NOT FOUR ROUTES, and that is the one place this deviates
// from the design. Only /dashboard exists as a page; the design shows Pull Requests,
// Projects and Settings as siblings of it. Rather than ship three dead links or three
// empty pages, each points at the thing it actually names: Pull Requests and Settings
// scroll to the panels that hold them, Projects goes to the site's own projects page.
// They are marked with `anchor` below so that turning any of them into a real route later
// is a one-line change here and nothing else.

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import ThemeToggle from "@/components/ThemeToggle";
import DevLoginSlot from "@/components/dev/DevLoginSlot";
import { useAuth } from "@/lib/auth";
import { LINKS } from "@/content/site";

type NavItem = {
  label: string;
  href: string;
  icon: "grid" | "folder" | "settings" | "megaphone" | "compass";
  /** Shown only while the reader is inside /admin. Six organiser links in a sidebar about
   *  a member's week would be six links most readers can never use. */
  adminArea?: boolean;
  /** Only rendered for an admin. A convenience, never a gate: /admin ships its markup to
   *  anybody who asks for it, and what refuses a non-admin is firestore.rules, which
   *  denies every read the page depends on. */
  adminOnly?: boolean;
  /** True when the destination is a section of this page rather than a route of its own.
   *  Kept explicit so the distinction is visible to whoever adds the real page. */
  anchor?: boolean;
};

const NAV: NavItem[] = [
  // Dashboard stays in the list but is HIDDEN on /dashboard itself — see the filter in
  // the sidebar. It is the only way back from the organisers' page, so removing it
  // outright would strand an organiser there.
  { label: "Dashboard", href: "/dashboard", icon: "grid" },
  // THE ORGANISERS' PAGE HAD NO LINK ANYWHERE, which made it unreachable except by typing
  // the URL. It lived on the member dashboard's old header band, and rebuilding that page
  // to the design dropped the band and the link with it — the kind of regression that
  // breaks nothing, fails no test, and is only found by asking "how does an organiser
  // actually get there".
  { label: "Organisers", href: "/admin", icon: "megaphone", adminOnly: true },
  // THE ORGANISER SECTIONS, listed only while an organiser is inside them. /admin was one
  // route with six panels; splitting it into six means the sidebar has to be the way
  // between them, and a member — or an organiser reading their own dashboard — has no use
  // for six admin links in a bar about their week.
  { label: "Members", href: "/admin/members", icon: "grid", adminOnly: true, adminArea: true },
  { label: "Mentorship", href: "/admin/mentorship", icon: "compass", adminOnly: true, adminArea: true },
  { label: "Notices", href: "/admin/notices", icon: "megaphone", adminOnly: true, adminArea: true },
  { label: "Sessions", href: "/admin/sessions", icon: "grid", adminOnly: true, adminArea: true },
  { label: "Forms", href: "/admin/forms", icon: "folder", adminOnly: true, adminArea: true },
  { label: "Team", href: "/admin/team", icon: "settings", adminOnly: true, adminArea: true },
  // PULL REQUESTS IS GONE FOR NOW. It anchored to the GitHub panel, which cannot say
  // anything until the contribution sync is deployed and members have handles on their
  // profiles — so it was a nav item leading to a card that reads "tell us where to look".
  // The panel itself stays, and still carries id="open-source", so restoring this is one
  // line when there is something behind it.
  { label: "Projects", href: "/projects", icon: "folder" },
  // MENTORSHIP IS A ROUTE NOW rather than the last panel on the overview. It is the club's
  // headline activity and the reason most people join, and it was below four weekly panels
  // on a page about the week — buried, and mixed in with things it has nothing to do with.
  { label: "Mentorship", href: "/dashboard/mentorship", icon: "compass" },
  // "MY DETAILS", NOT "SETTINGS". The design's word promised a settings page — notification
  // preferences, account options — and there are none: the only thing a member can change
  // about themselves is their profile. A label that names a page which does not exist is
  // the kind of thing a reader clicks once, finds nothing, and stops trusting the nav over.
  // If anything genuinely settings-shaped ever arrives, it earns the name back.
  // AN ANCHOR NO LONGER. `/dashboard#details` scrolled to a panel in the right-hand
  // column, which is the kind of nav item somebody presses once, watches the page jump,
  // and stops trusting. It is a page, so the link goes somewhere.
  { label: "My details", href: "/dashboard/details", icon: "settings" },
];

/** The sidebar's link styling.
 *
 *  THERE IS NO LONGER AN "ACTIVE" STATE, and that follows from the list above rather than
 *  being a separate decision. The design marked the current page with a yellow plate and a
 *  black keyline — the tokens this system uses for a CONTROL, a thing you press — on an
 *  item that, being the page you are already on, does nothing when pressed. The loudest
 *  object in the sidebar was the one dead link in it.
 *
 *  So the current page is not styled differently; it is simply not listed. The sidebar
 *  says where you can go, and the app bar above already says where you are. */
/* NO `.tap` ON THESE ROWS, AND THAT IS THE FIX RATHER THAN A REGRESSION.
 *
 *  `.tap` is for a STANDALONE INLINE LINK: 14px of block padding with a matching -14px
 *  margin, so the hit area grows to the 44px floor and nothing on screen moves. It works
 *  because an inline link has no visible box — there is nothing to see growing.
 *
 *  These rows have one. They are `rounded-tile` with `hover:bg-sunk`, so the padding
 *  `.tap` adds is PAINTED, and the negative margin then pulls the next row up into it.
 *  Measured on /dashboard at 1440x900: "Projects" occupied y 161-213 and "My details"
 *  y 191-243 — a 22px overlap, in which the top of one row sits inside the click target
 *  of the row above it. A pointer near that boundary follows the wrong link, and the
 *  hover fill lights up a row you are not on.
 *
 *  So the row IS the target instead: py-3 on a 24px line box is 48px, clear of the 44px
 *  floor (WCAG 2.5.5) with no negative margin, and the fill it paints is exactly the
 *  area you can press. The sidebar's rows are 48px tall in layout rather than 24px,
 *  which is the honest height they were already claiming from the pointer.
 *
 *  `npm run qa` reports this as `tap-margin-clash`, which is what found it. */
const NAV_CLASS =
  "flex items-center gap-3 rounded-tile px-3.5 py-3 text-sm font-semibold text-slate transition-colors hover:bg-sunk hover:text-ink";

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, signOut } = useAuth();
  const pathname = usePathname();
  /** ONBOARDING GETS THE BAR AND THE FOOTER AND NOTHING ELSE.
   *
   *  Finishing the profile is a gate: an incomplete one is sent here and the dashboard is
   *  not reachable until it is done. A sidebar offering Good first issues, Projects and My
   *  details next to that form is three invitations to leave the one screen the member has
   *  to finish — and two of them lead to a dashboard that would bounce them straight back.
   *
   *  The bar stays, because sign-out has to remain reachable from every signed-in page.
   *  Somebody who lands here with the wrong Google account needs a way out that is not the
   *  back button. */
  const bare = pathname === "/onboarding";

  const handle = user?.email?.split("@")[0] ?? "";
  const onAdmin = pathname.startsWith("/admin");

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* ------------------------------------------------------------- top bar
          Flush, full width, square-cornered — deliberately the opposite shape to the
          site's inset floating plate, because the dashboard opens in a new browser tab
          and the reader has to tell the two apart from the top forty pixels. */}
      <header
        data-app-bar
        className="sticky top-0 z-50 border-b border-seam bg-raise/95 backdrop-blur"
      >
        <div className="flex h-[56px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="tap shrink-0 font-display text-sm font-bold tracking-tight text-ink transition-colors hover:text-accent"
          >
            {/* THE CRUMB NAMES THE PAGE, and on /onboarding that is not the dashboard —
                which is the one page a member being gated here cannot reach yet. Saying
                DASHBOARD over a form that stands between them and it is the chrome
                contradicting the flow. */}
            OSC <span className="text-dust">/</span> {bare ? "FINISH JOINING" : "DASHBOARD"}
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* THE VIEW SWITCH, AND IT LIVES IN THE BAR RATHER THAN ONLY IN THE SIDEBAR.
                The sidebar is `lg:flex` — hidden below 1024px — so on a laptop window that
                is merely narrow, and on every phone, an organiser had NO way to reach
                their own page. The link was in the DOM and invisible, which is the worst
                version of missing: nothing failed, and the page looked complete.

                It is contextual rather than two controls, because there are exactly two
                places to be and the useful one is always the other one. */}
            {isAdmin && (
              <Link
                href={onAdmin ? "/dashboard" : "/admin"}
                className="tap flex items-center gap-2 rounded-full border border-seam px-3 py-1.5 text-sm font-semibold text-slate transition-colors hover:bg-sunk hover:text-ink"
              >
                <Icon name={onAdmin ? "grid" : "megaphone"} size="1rem" strokeWidth={1.75} />
                {/* The label is dropped on the narrowest screens, where the bar has room
                    for the icon and nothing else. The aria-label carries it instead so the
                    control never becomes an unlabelled glyph. */}
                <span className="hidden sm:inline">
                  {onAdmin ? "My dashboard" : "Organisers"}
                </span>
                <span className="sr-only sm:hidden">
                  {onAdmin ? "My dashboard" : "Organisers"}
                </span>
              </Link>
            )}
            <ThemeToggle />
            {user && (
              <button
                type="button"
                onClick={() => void signOut()}
                aria-label="Sign out"
                className="tap grid h-9 w-9 place-items-center rounded-full text-haze transition-colors hover:bg-sunk hover:text-ink"
              >
                <Icon name="log-out" size="1.125rem" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* ----------------------------------------------------------- sidebar
            lg+ ONLY. At phone width it would eat half the screen to show four links, so
            below that the dashboard is simply one column — which is what the content
            wants anyway, since every panel is full width there. The sign-out and theme
            controls live in the bar above, so nothing is lost by its absence. */}
        {!bare && (
        <aside className="hidden w-60 shrink-0 flex-col border-r border-seam bg-sunk/60 px-4 py-6 lg:flex">
          {/* Who you are, which the top bar no longer has room for. */}
          {user && (
            <div className="flex items-center gap-3 px-1.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                <Icon name="user" size="1.125rem" strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink">
                  {isAdmin ? "Organiser" : "Learner"}
                </span>
                <span className="block truncate font-mono text-xs text-dust">
                  {handle}
                </span>
              </span>
            </div>
          )}

          {/* THE ONE FILLED BUTTON IN THE SIDEBAR, and it points at the club's own
              good-first-issue list — this site's repo, since the site is one of the
              club's projects.

              IT SAYS WHAT IS ON THE OTHER END OF THE LINK. The design labelled it "New
              Contribution", which promises a flow this site does not have, and a button
              whose label describes an action it cannot perform is worse than a plain
              one. "Good first issues" is the term the whole of open source already uses,
              so a member who has read CONTRIBUTING.md recognises the destination before
              clicking — and "good first" is doing real work for a first-year who has
              never opened a pull request and is deciding whether this button is for
              them. "Contribute to this site" says the same thing and was measured at
              227px against 198px of room; it wraps the one filled control into the
              tallest object in the column. */}
          <a
            href={LINKS.issues}
            target="_blank"
            rel="noopener noreferrer"
            /* whitespace-nowrap is a guard rather than a fix now: the label measures
               183px of the 198px between the button's padding, so it holds one line on
               its own. It stays because .btn uppercases whatever it is given, and the
               next label somebody tries will not be measured first. */
            className="btn btn-primary mt-6 w-full justify-center whitespace-nowrap text-sm"
          >
            {/* `external`, not `plus`. A plus means "create a new thing here", which is
                exactly the promise the old label made and could not keep; this opens
                GitHub in a new tab, and ↗ is how that is said everywhere else on the
                site — the nav's "GitHub ↗", every citation on the home page. */}
            <Icon name="external" size="1rem" />
            Good first issues
          </a>

          <nav aria-label="Dashboard" className="mt-6 flex flex-col gap-1.5">
            {NAV
              // Admin-only items for admins, and never the page you are already on: an
              // item that navigates nowhere is not worth the row it sits in. Anchors are
              // exempt because they scroll somewhere real on this same page.
              // `adminArea` items appear only inside /admin — see the note on the field.
              // The current page is filtered out rather than styled as current: a link to
              // where you already are is the one dead item in a sidebar.
              .filter(
                (item) =>
                  (!item.adminOnly || isAdmin) &&
                  (!item.adminArea || pathname.startsWith("/admin")) &&
                  (item.anchor || item.href !== pathname),
              )
              .map((item) => (
                <Link key={item.label} href={item.href} className={NAV_CLASS}>
                  <Icon name={item.icon} size="1.0625rem" strokeWidth={1.75} />
                  {item.label}
                </Link>
              ))}
          </nav>

          <div className="mt-auto flex flex-col gap-1.5 border-t border-seam pt-4">
            <a
              href={`mailto:${LINKS.email}`}
              className="flex items-center gap-3 rounded-tile px-3.5 py-3 text-sm font-semibold text-slate transition-colors hover:bg-sunk hover:text-ink"
            >
              <Icon name="help" size="1.0625rem" strokeWidth={1.75} />
              Help
            </a>
            {user && (
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex items-center gap-3 rounded-tile px-3.5 py-3 text-left text-sm font-semibold text-slate transition-colors hover:bg-sunk hover:text-ink"
              >
                <Icon name="log-out" size="1.0625rem" strokeWidth={1.75} />
                Sign out
              </button>
            )}
          </div>
        </aside>
        )}

        <main id="main" className="min-w-0 flex-1 px-4 pb-14 pt-6 sm:px-6 sm:pt-8">
          <div className="mx-auto max-w-[72rem]">
            {children}
            {/* THE DEV LOGIN LIVES ON THE SHELL, not on the cards that refuse you, and
                that is the difference between a shortcut and a switch. Put on the sign-in
                card alone it got you IN as somebody; here it is on all eleven signed-in
                routes in every state, so swapping from the test member to the test
                organiser and back is one click from wherever you already are rather than
                sign out, /join, sign in.
                Renders nothing unless an emulator is configured, and is not in the bundle
                at all when one is not — see components/dev/DevLoginSlot.tsx. */}
            <DevLoginSlot />
          </div>
        </main>
      </div>

      {/* -------------------------------------------------------------- footer
          The design carries its own, and it is nothing like the site's: three links and a
          line, rather than the full sitemap a prospective member gets. */}
      <footer className="border-t border-seam px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-[72rem] flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <p className="text-sm text-haze">
            © {new Date().getFullYear()} Scaler Open Source Club
          </p>
          <nav aria-label="Dashboard footer" className="flex flex-wrap gap-x-6 gap-y-2">
            <a
              href={LINKS.contributing}
              target="_blank"
              rel="noopener noreferrer"
              className="tap font-mono text-label uppercase tracking-wider text-haze transition-colors hover:text-ink"
            >
              Documentation
            </a>
            <a
              href={LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
              className="tap font-mono text-label uppercase tracking-wider text-haze transition-colors hover:text-ink"
            >
              GitHub
            </a>
            <Link
              href="/privacy"
              className="tap font-mono text-label uppercase tracking-wider text-haze transition-colors hover:text-ink"
            >
              Privacy policy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
