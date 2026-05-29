import type { Metadata } from "next";
import { DeveloperCredit } from "@/components/DeveloperCredit";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-root">
      {children}
      <footer className="admin-developer-footer">
        <DeveloperCredit className="admin-developer-credit" logoSize={28} />
      </footer>
    </div>
  );
}
