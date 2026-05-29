import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import Script from "next/script";
import { AppProviders } from "@/components/AppProviders";
import { ConditionalPageShell } from "@/components/ConditionalPageShell";
import { StructuredData } from "@/components/StructuredData";
import { organizationJsonLd, rootMetadata, websiteJsonLd } from "@/lib/seo";
import "./globals.css";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = rootMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={notoSans.variable} suppressHydrationWarning data-scroll-behavior="smooth">
      <body suppressHydrationWarning>
        <StructuredData data={[organizationJsonLd(), websiteJsonLd()]} />
        <Script id="font-size-init" strategy="beforeInteractive">
          {`(function(){try{var v=localStorage.getItem("font-size-level");if(v==="0"||v==="1"||v==="2"||v==="3")document.documentElement.setAttribute("data-font-size-level",v)}catch(e){}})();`}
        </Script>
        <AppProviders>
          <ConditionalPageShell>{children}</ConditionalPageShell>
        </AppProviders>
        <Analytics />
      </body>
    </html>
  );
}
