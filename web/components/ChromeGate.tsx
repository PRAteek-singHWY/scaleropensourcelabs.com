"use client";

// Hides the marketing chrome on the routes that are an APP rather than a page.
//
// WHY THIS EXISTS. /dashboard shipped with the site's own nav and footer around it — the
// six-link strip (Essence, Projects, Programmes, Hall of Fame, Team, How to Join), the
// yellow Join button, the whole footer. That is correct for every page whose job is to
// persuade somebody to join, and wrong for the one page whose reader has already joined:
// a member checking what is waiting on them does not need six links back into the
// brochure, and surrounding their own data with the marketing frame made the dashboard
// read as another page of the website rather than as their own place. Opening it in a new
// tab did not help, because the new tab looked identical to the old one.
//
// A CLIENT WRAPPER RATHER THAN ROUTE GROUPS. Next's route groups are the textbook answer
// — move the marketing pages under (site)/ with their own layout and leave /dashboard
// outside it. That is also a rename of every marketing route's folder, which would touch
// every import, every test that names a path, and the redirects. This is one component
// and one condition, and it can be replaced by route groups later without any of the
// pages knowing.
//
// Nav does the same check inline, because it is already a client component and already
// reads the pathname for its current-page marks. Footer is a SERVER component, which is
// why it needs this wrapper at all: it cannot read the pathname itself, so it is passed
// through as children and simply not rendered.

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Routes that get the app shell instead of the site chrome.
 *
 *  /admin JOINED THIS LIST once it gained the same shell. It was excluded while it had no
 *  chrome of its own — dropping the nav there would have stranded an organiser with no way
 *  back to anything. The shell carries a wordmark home and a sidebar, so that no longer
 *  applies, and leaving it out would have put the marketing nav on one of the two screens
 *  the designs treat as one app. */
export const APP_ROUTES = ["/dashboard", "/admin"];

export function isAppRoute(pathname: string | null): boolean {
  return APP_ROUTES.some((r) => (pathname ?? "").startsWith(r));
}

export default function ChromeGate({ children }: { children: ReactNode }) {
  return isAppRoute(usePathname()) ? null : <>{children}</>;
}
