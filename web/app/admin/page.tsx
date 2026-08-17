import type { Metadata } from "next";
import AdminDashboard from "@/components/AdminDashboard";

// THE ORGANISERS' DASHBOARD. Counts first, list second — see the header of
// AdminDashboard.tsx for what it is for and, more importantly, for what it is not:
// this route is not a privilege gate. The page ships to anybody who asks for it,
// because the site is a static export with no server to refuse them. What refuses
// them is the `list` rule on users/{uid} in firestore.rules, which only an address
// in the `admins` collection satisfies. A non-admin who loads this URL gets a page
// that cannot fetch anything.
//
// NOT IN PAGES, so it appears in neither the nav strip nor the footer's route list.
// It is reached from the finished profile on /join, and only when the signed-in
// address is an admin. That is a convenience rather than concealment — the URL is
// guessable and that is fine.
//
// `noindex`, because a page that lists members has no business in a search index
// even though it renders nothing without an authorised session.

export const metadata: Metadata = {
  title: "Organisers",
  description: "Club membership, by hostel, year, branch and programme.",
  robots: { index: false, follow: false },
};

export default function Admin() {
  return (
    <main id="main">
      <section className="section page-top pb-8">
        <p className="label">Organisers only</p>
        <h1 className="mt-4 max-w-3xl font-display text-display-lg font-bold tracking-tight">
          Who is in the club.
        </h1>
        <p className="measure mt-4 text-body-lg text-haze">
          Every registered member, and the breakdowns most often asked for — by hostel, by
          year, by branch, by programme. Counts are over the whole membership; the search
          and filter below narrow only the list.
        </p>

        <div className="mt-10">
          <AdminDashboard />
        </div>
      </section>
    </main>
  );
}
