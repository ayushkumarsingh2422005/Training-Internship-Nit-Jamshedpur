"use client";

import NextTopLoader from "nextjs-toploader";
import { TopLoadingProvider } from "@/components/TopLoadingProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <TopLoadingProvider>
      <NextTopLoader
        color="#2e7d32"
        height={3}
        showSpinner={false}
        crawlSpeed={200}
        speed={200}
        easing="ease"
        shadow="0 0 10px #2e7d32,0 0 5px #66bb6a"
      />
      {children}
    </TopLoadingProvider>
  );
}
