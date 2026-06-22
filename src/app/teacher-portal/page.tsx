import type { Metadata } from "next";
import { TeacherDashboard } from "@/components/TeacherDashboard";

export const metadata: Metadata = {
  title: "Teacher Portal",
  description: "Teacher portal for managing tests and questions.",
};

export default function TeacherPortalPage() {
  return <TeacherDashboard />;
}
