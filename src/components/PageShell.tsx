import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div id="main-content">{children}</div>
      <SiteFooter />
      <a href="#main-content" className="scroll-top" aria-label="Back to top">
        ↑
      </a>
    </>
  );
}
