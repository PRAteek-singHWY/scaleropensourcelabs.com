import type { Metadata } from "next";
import MentorshipSection from "@/components/dashboard/MentorshipSection";

// `noindex`, like every signed-in route: a page that means nothing without a session has
// no business in a search result. NOT a privilege gate — see RequireProfile.tsx.
export const metadata: Metadata = {
  title: "Mentorship",
  description: "The club's GSoC cohort, and the mentors you can ask for.",
  robots: { index: false, follow: false },
};

export default function MentorshipPage() {
  return <MentorshipSection />;
}
