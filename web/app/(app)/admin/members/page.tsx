import type { Metadata } from "next";
import AdminGate from "@/components/admin/Gate";
import SectionHead from "@/components/dashboard/SectionHead";
import AdminDashboard from "@/components/AdminDashboard";

export const metadata: Metadata = {
  title: "Members",
  description: "The roster, the breakdowns, and the export.",
  robots: { index: false, follow: false },
};

export default function MembersPage() {
  return (
    <AdminGate>
      <SectionHead eyebrow="Organisers" title="Members.">
        Everyone registered, and the breakdowns most often asked for. Batch, branch and year
        are read from each member&apos;s college address rather than asked for, so they
        cannot drift — and cannot be queried, which is why the breakdowns load on request.
      </SectionHead>
      <AdminDashboard />
    </AdminGate>
  );
}
