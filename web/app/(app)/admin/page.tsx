import type { Metadata } from "next";
import AdminDashboard from "@/components/AdminDashboard";
import Composer from "@/components/Composer";
import FormBuilder from "@/components/FormBuilder";
import Roster from "@/components/Roster";
import Sessions from "@/components/Sessions";

// THE ORGANISERS' PAGE. Same shell as the member dashboard — it comes from
// (app)/layout.tsx, so this file is only the content.
//
// NOT A PRIVILEGE GATE. The page ships to anybody who asks for it, because the site is a
// static export with no server to refuse them. What refuses them is the `list` rule on
// users/{uid} and the admin-only writes on every collection below, none of which any
// client can talk its way past. A non-admin who loads this URL gets a page whose every
// panel renders its own "not for you" state.
//
// THE ORDER IS BY HOW OFTEN AN ORGANISER DOES THE THING: membership is the question the
// page is opened with, notices and sessions are weekly, forms every few weeks, and the
// roster once a term — which is why it is last, where nobody reaches it by accident.

export const metadata: Metadata = {
  title: "Organisers",
  description: "Club membership, sessions, notices and forms.",
  robots: { index: false, follow: false },
};

export default function Admin() {
  return (
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
      <Roster />
    </div>
  );
}
