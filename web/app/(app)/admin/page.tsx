import type { Metadata } from "next";
import AdminOverview from "@/components/admin/Overview";

// THE ORGANISERS' OVERVIEW. This route used to render everything: the membership table,
// the mentor list, the interest list, the notice composer, the session editor, the form
// builder and the roster — six components and about 3,800 lines, in one column.
//
// It is the numbers and a way in now. Each concern has its own route under /admin, and the
// sidebar switches to them while you are in here.
//
// NOT A PRIVILEGE GATE. The page ships to anybody who asks for it, because the site is a
// static export with no server to refuse them. What refuses them is the `list` rule on
// users/{uid} and the admin-only writes on every collection these pages touch. See
// components/admin/Gate.tsx.

export const metadata: Metadata = {
  title: "Organisers",
  description: "Club membership, mentorship, sessions, notices and forms.",
  robots: { index: false, follow: false },
};

export default function Admin() {
  return <AdminOverview />;
}
