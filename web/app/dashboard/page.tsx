import type { Metadata } from "next";
import Shell from "@/components/dashboard/Shell";
import MemberDashboard from "@/components/MemberDashboard";

// THE MEMBER'S DASHBOARD — the one route on this site that is an APP rather than a page.
//
// The frame comes from components/dashboard/Shell.tsx, which the organisers' page shares;
// everything specific to a member is in MemberDashboard. See the Shell's header for why
// the site's own nav and footer are suppressed here.
//
// NOT A PRIVILEGE GATE. The site is a static export, so this markup ships to anybody who
// asks for it. What refuses a stranger is firestore.rules — users/{uid} and
// contributions/{uid} are owner-or-admin, and the board and forms require a verified
// college address. See the header of lib/auth.tsx before assuming a hidden page is safe.
//
// `noindex`, because a page whose entire content is one member's own record has no
// business in a search index even though it renders nothing without a session.

export const metadata: Metadata = {
  title: "Your dashboard",
  description: "Your details, what you have merged, and what the club has pinned up.",
  robots: { index: false, follow: false },
};

export default function Dashboard() {
  return (
    <Shell>
      <MemberDashboard />
    </Shell>
  );
}
