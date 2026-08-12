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
];

const MARKER = "Scaler Open Source Club";

export async function assertOurSite(page) {
  const found = await page.evaluate(() => ({
    title: document.title,
    hasNav: !!document.querySelector('nav[aria-label="Main"]'),
  }));
  if (!found.title.includes(MARKER) || !found.hasNav) {
    throw new Error(
      `${SITE} is not this site.\n` +
        `  expected a title containing "${MARKER}" and nav[aria-label="Main"]\n` +
        `  got title: ${JSON.stringify(found.title)}, nav: ${found.hasNav}\n` +
        `  Something else is probably on that port. Set SITE_URL to the right one.`,
    );
  }
}
