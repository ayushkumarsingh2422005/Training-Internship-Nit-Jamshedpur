import Image from "next/image";
import { siteLinks } from "@/lib/content";

type DeveloperCreditProps = {
  className?: string;
  logoSize?: number;
};

export function DeveloperCredit({ className = "", logoSize = 24 }: DeveloperCreditProps) {
  return (
    <span className={`developer-credit${className ? ` ${className}` : ""}`}>
      Developed by{" "}
      <a
        href={siteLinks.digicraft}
        target="_blank"
        rel="noopener noreferrer"
        className="developer-credit-brand"
      >
        <Image
          src={siteLinks.digicraftLogo}
          alt=""
          width={logoSize}
          height={logoSize}
          className="developer-credit-logo"
          style={{ width: logoSize, height: logoSize }}
        />
        DigiCraft
      </a>
    </span>
  );
}
