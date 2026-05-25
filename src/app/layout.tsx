import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import Script from "next/script";
import { PageShell } from "@/components/PageShell";
import { site } from "@/lib/content";
import "./globals.css";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: site.shortName,
    template: `%s | ${site.shortName}`,
  },
  description:
    "Official portal for notices, results, and programme information on industrial training and internships at NIT Jamshedpur under DHTE Jharkhand.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={notoSans.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Script id="font-size-init" strategy="beforeInteractive">
          {`(function(){try{var v=localStorage.getItem("font-size-level");if(v==="0"||v==="1"||v==="2"||v==="3")document.documentElement.setAttribute("data-font-size-level",v)}catch(e){}})();`}
        </Script>
        <PageShell>{children}</PageShell>
      </body>
    </html>
  );
}
