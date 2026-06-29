import type { Metadata } from "next";
import { TeacherDashboard } from "@/components/TeacherDashboard";

export const metadata: Metadata = {
  title: "Teacher Dashboard",
  robots: { index: false, follow: false },
};

export default function TeacherPortalPage() {
  return <TeacherDashboard />;
}
