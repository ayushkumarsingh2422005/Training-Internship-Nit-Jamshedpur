import type { Metadata } from "next";
import { DeveloperCredit } from "@/components/DeveloperCredit";

export const metadata: Metadata = {
  title: "Teacher",
  robots: { index: false, follow: false },
};

export default function TeacherPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-root">
      {children}
      <footer className="admin-developer-footer">
        <DeveloperCredit className="admin-developer-credit" logoSize={28} />
      </footer>
    </div>
  );
}
