import type { Metadata } from "next";
import AdminDashboard from "@/components/AdminDashboard";
import Composer from "@/components/Composer";
import FormBuilder from "@/components/FormBuilder";
import Roster from "@/components/Roster";
import Sessions from "@/components/Sessions";
import Shell from "@/components/dashboard/Shell";

// THE ORGANISERS' PAGE, in the same app shell as the member dashboard — the Stitch
// designs are one frame with different content in the middle, so the frame is shared and
// only this file's contents differ. See components/dashboard/Shell.tsx.
//
// THIS ROUTE IS NOT A PRIVILEGE GATE. The page ships to anybody who asks for it, because
// the site is a static export with no server to refuse them. What refuses them is the
// `list` rule on users/{uid} and the admin-only writes on every collection below, none of
// which any client can talk its way past. A non-admin who loads this URL gets a page whose
// every panel renders its own "not for you" state.
//
// THE ORDER IS BY HOW OFTEN AN ORGANISER DOES THE THING:
//
//   membership   the question the page is opened with — "who is in the club"
//   notices      weekly
//   sessions     weekly, and the one thing the notice board could not express
//   forms        every few weeks
//   roster       once a term, and the only one with consequences worth a scroll
//
// `noindex`, because a page that lists members has no business in a search index even
// though it renders nothing without an authorised session.

export const metadata: Metadata = {
  title: "Organisers",
  description: "Club membership, sessions, notices and forms.",
  robots: { index: false, follow: false },
};

export default function Admin() {
  return (
    <Shell>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-display-lg font-bold tracking-tight">
            Admin dashboard
          </h1>
          <p className="measure mt-2 text-body text-haze">
            Who is in the club, what they have been told, and what you have asked them.
          </p>
        </div>

        <AdminDashboard />
        <Composer />
        <Sessions />
        <FormBuilder />

        {/* THE ROSTER LAST, and that ordering is the argument. Changing who runs the club
            is the rarest thing on this page and the one with the largest consequences, so
            it sits where nobody reaches it by accident. It renders for every admin but is
            only usable by owners — see the note in Roster.tsx for why it is shown rather
            than hidden. */}
        <Roster />
      </div>
    </Shell>
  );
}
