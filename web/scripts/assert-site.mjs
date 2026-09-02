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
    Ordered as a reader would meet them, with the form last. */
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
  // inNav: false, and for the same reason as /join -- it is the OTHER half of the nav's
  // far-end button, which reads "Join" signed out and "Dashboard" signed in. Neither is a
  // stop on the tour, and neither is ever marked aria-current.
  //
  // LISTED HERE ANYWAY, and the reason is worth stating: signed out this route renders a
  // "sign in first" card and nothing else, which is exactly the kind of page that rots
  // unnoticed -- no contributor visits it, and every sweep that skips it would keep
  // passing while its contrast, tap targets or layout quietly broke. The signed-in view
  // is covered by scripts/e2e-auth.mjs instead, because it needs a session.
  // `appShell: true` — the ONE route that is an app rather than a page. It replaces the
  // site's nav and footer with its own bar (see components/ChromeGate.tsx), so every check
  // that assumes the marketing chrome has to know to look elsewhere here. Without this
  // flag the sweeps do not fail loudly, they fail CONFUSINGLY: `assertOurSite` reports
  // "something else is probably on that port" for a page that is entirely correct.
  { path: "/dashboard", name: "dashboard", inNav: false, appShell: true },
];

const MARKER = "Scaler Open Source Club";

export async function assertOurSite(page) {
  const found = await page.evaluate(() => ({
    title: document.title,
    hasNav: !!document.querySelector('nav[aria-label="Main"]'),
    // THE APP SHELL COUNTS AS OUR CHROME TOO. /dashboard suppresses the marketing nav and
    // renders its own bar instead, so requiring nav[aria-label="Main"] everywhere made a
    // perfectly correct page report as "something else is probably on that port" — which
    // sends whoever sees it looking at ports rather than at the page.
    hasAppBar: !!document.querySelector('header[data-app-bar]'),
  }));
  const hasChrome = found.hasNav || found.hasAppBar;
  if (!found.title.includes(MARKER) || !hasChrome) {
    throw new Error(
      `${SITE} is not this site.\n` +
        `  expected a title containing "${MARKER}" and either nav[aria-label="Main"] or header[data-app-bar]\n` +
        `  got title: ${JSON.stringify(found.title)}, nav: ${found.hasNav}, appBar: ${found.hasAppBar}\n` +
        `  Something else is probably on that port. Set SITE_URL to the right one.`,
    );
  }
}
