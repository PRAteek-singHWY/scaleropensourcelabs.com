import type { Metadata } from "next";
import AdminGate from "@/components/admin/Gate";
import SectionHead from "@/components/dashboard/SectionHead";
import Roster from "@/components/Roster";

// One organiser concern, one route. /admin was six of these on one page — an organiser
// opening it to post a notice scrolled past the membership table and a form builder.
// NOT a privilege gate; see components/admin/Gate.tsx.
export const metadata: Metadata = {
  title: "Team",
  description: "Who is an organiser, and what the public site says about them.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <AdminGate>
      <SectionHead eyebrow="Organisers" title="Team.">
        Who is an organiser, and what the public site says about them.
      </SectionHead>
      <Roster />
    </AdminGate>
  );
}
