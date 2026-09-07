import type { Metadata } from "next";
import AdminGate from "@/components/admin/Gate";
import SectionHead from "@/components/dashboard/SectionHead";
import FormBuilder from "@/components/FormBuilder";

// One organiser concern, one route. /admin was six of these on one page — an organiser
// opening it to post a notice scrolled past the membership table and a form builder.
// NOT a privilege gate; see components/admin/Gate.tsx.
export const metadata: Metadata = {
  title: "Forms",
  description: "Ask the club something and read the answers.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <AdminGate>
      <SectionHead eyebrow="Organisers" title="Forms.">
        Ask the club something and read the answers — sign-ups, and the odd &ldquo;which Saturday suits everyone&rdquo;.
      </SectionHead>
      <FormBuilder />
    </AdminGate>
  );
}
