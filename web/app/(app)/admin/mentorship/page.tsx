import type { Metadata } from "next";
import MentorshipAdmin from "@/components/admin/MentorshipAdmin";

export const metadata: Metadata = {
  title: "Mentorship",
  description: "Publish mentors, and see who has asked for whom.",
  robots: { index: false, follow: false },
};

export default function AdminMentorshipPage() {
  return <MentorshipAdmin />;
}
