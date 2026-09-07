// Confirm the thing answering on SITE_URL is actually this site.
//
// Written after a real incident: port 3000 was occupied by an unrelated app, our
// dev server died with EADDRINUSE, curl still returned 200, and the QA sweep
// cheerfully measured the other application and reported 32 accessibility issues
// against it. Every one was a false positive about somebody else's page.
//
// A checker that measures whatever answers the port is worse than no checker,
// because its output looks exactly like a real result. So every script asserts
// identity before it measures anything.

export const SITE = process.env.SITE_URL ?? "http://localhost:3000";

/** Every route on the site. Checks sweep all of them, not just the home page.
    Ordered as a reader would meet them, with the form last.

    `app: true` marks the SIGNED-IN routes, which carry a different shell: no marketing
    nav, no four-column footer, no Join button. That is not an omission to be tolerated —
    it is the point of app/(app)/layout.tsx — so the checks branch on this flag rather
    than being loosened for everybody. A marketing route that lost its nav must still
    fail. */
export const ROUTES = [
  { path: "/", name: "essence", inNav: true },
  { path: "/projects", name: "projects", inNav: true },
  { path: "/programmes", name: "programmes", inNav: true },
  { path: "/hall-of-fame", name: "hall-of-fame", inNav: true },
  { path: "/team", name: "team", inNav: true },
  { path: "/how-to-join", name: "how-to-join", inNav: true },
  // `inNav: false` is load-bearing, not a detail. /join is the destination of the
  // nav's Join BUTTON, which is an action rather than a page, and it is deliberately
  // never marked aria-current — an action that greys itself out at the moment it
  // becomes relevant is a bug. So on this route exactly zero nav items are current,
  // and a check expecting one would be asserting the bug.
  { path: "/join", name: "join", inNav: false },
  // Also inNav: false, and for a different reason from /join's. /privacy is a reference
  // document, not a stop on the tour — it is reached from the sign-in card, at the one
  // moment somebody is deciding whether to hand over their college identity. Listed here
  // anyway so smoke and the QA sweep cover it: a page nothing links from the nav is
  // exactly the page that rots unnoticed.
  { path: "/privacy", name: "privacy", inNav: false },
  // THE TWO SIGNED-IN ROUTES, swept SIGNED OUT. Every check in this directory runs
  // without a session, so what they measure here is the "sign in first" card — which is
  // exactly what a stranger who guesses the URL sees, and therefore exactly what has to
  // meet the same contrast, tap-target and overflow bar as everything else.
  //
  // What they cannot cover is the signed-in half. That is scripts/e2e-auth.mjs, which
  // drives a real browser against the Auth emulator. Do not read a green run here as
  // "the dashboard works"; it means the door to it is not broken.
  { path: "/onboarding", name: "onboarding", inNav: false, app: true },
  { path: "/dashboard", name: "dashboard", inNav: false, app: true },
  // THE SIGNED-IN AREA IS SEVERAL ROUTES NOW, and each one's signed-out state is what a
  // stranger who guesses the URL sees — so each has to meet the same contrast, tap-target
  // and overflow bar as everything else. Swept signed out, like the two above.
  { path: "/dashboard/mentorship", name: "dash-mentorship", inNav: false, app: true },
  { path: "/dashboard/details", name: "dash-details", inNav: false, app: true },
];

const MARKER = "Scaler Open Source Club";

/** Confirm the thing answering is this site, on either shell.
 *
 *  It used to require `nav[aria-label="Main"]` on every page, which was a sound identity
 *  marker while every route carried the same nav. The signed-in routes do not carry it any
 *  more — that is the whole point of the app shell — so the check now accepts either that
 *  nav or the app header's wordmark link home.
 *
 *  IT IS NOT WEAKER FOR IT. The failure this guards against is measuring somebody else's
 *  application on a port we assumed was ours, and an unrelated app on :3000 has neither
 *  marker and does not have our title. Callers that know which shell to expect assert the
 *  specific one — see the per-route branch in smoke.mjs. */
export async function assertOurSite(page) {
  const found = await page.evaluate(() => ({
    title: document.title,
    hasNav: !!document.querySelector('nav[aria-label="Main"]'),
    hasAppHeader: !!document.querySelector('header a[href="/"]'),
  }));
  if (!found.title.includes(MARKER) || !(found.hasNav || found.hasAppHeader)) {
    throw new Error(
      `${SITE} is not this site.\n` +
        `  expected a title containing "${MARKER}", and either nav[aria-label="Main"]\n` +
        `  (marketing routes) or the app header (signed-in routes)\n` +
        `  got title: ${JSON.stringify(found.title)}, nav: ${found.hasNav}, app header: ${found.hasAppHeader}\n` +
        `  Something else is probably on that port. Set SITE_URL to the right one.`,
    );
  }
}
