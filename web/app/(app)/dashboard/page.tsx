import type { Metadata } from "next";
import MemberDashboard from "@/components/MemberDashboard";

// THE MEMBER'S DASHBOARD. The shell around it comes from (app)/layout.tsx, so this file is
// only ever the content — see that layout for why the chrome lives there.
//
// NOT A PRIVILEGE GATE. The site is a static export, so this markup ships to anybody who
// asks for it. What refuses a stranger is firestore.rules: users/{uid} and
// contributions/{uid} are owner-or-admin, and the board, forms and sessions all require a
// verified college address.
//
// `noindex`, because a page whose entire content is one member's own record has no
// business in a search index even though it renders nothing without a session.

export const metadata: Metadata = {
  title: "Your dashboard",
  description: "Your details, what you have merged, and what the club has pinned up.",
  robots: { index: false, follow: false },
};

export default function Dashboard() {
  return <MemberDashboard />;
}
