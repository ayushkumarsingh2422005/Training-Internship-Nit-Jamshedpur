import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exam preview",
  robots: { index: false, follow: false },
};

export default function TeacherPreviewLayout({ children }: { children: React.ReactNode }) {
  return <div className="teacher-preview-shell">{children}</div>;
}
