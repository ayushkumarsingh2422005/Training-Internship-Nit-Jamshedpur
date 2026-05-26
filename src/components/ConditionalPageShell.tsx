"use client";

import { usePathname } from "next/navigation";
import { PageShell } from "./PageShell";

export function ConditionalPageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) {
    return <>{children}</>;
  }
  return <PageShell>{children}</PageShell>;
}
