import type { Metadata } from "next";
import DetailsSection from "@/components/dashboard/DetailsSection";

export const metadata: Metadata = {
  title: "Your details",
  description: "The record the club holds about you.",
  robots: { index: false, follow: false },
};

export default function DetailsPage() {
  return <DetailsSection />;
}
