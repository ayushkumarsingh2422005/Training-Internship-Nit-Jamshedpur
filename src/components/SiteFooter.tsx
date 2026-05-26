import Image from "next/image";
import { programOverview, site } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Image
            src="/Jharkhand_Rajakiya_Chihna.svg"
            alt="Government of Jharkhand emblem"
            width={72}
            height={72}
            className="footer-logo"
          />
          <div>
            <h3>{site.shortName}</h3>
            <p>{programOverview.summary.slice(0, 180)}…</p>
          </div>
        </div>
        <div>
          <h4>Programme</h4>
          <ul>
            <li>Duration: {programOverview.duration}</li>
            {/* <li>Capacity: {programOverview.capacity}</li> */}
            <li>Host: {programOverview.host}</li>
          </ul>
        </div>
        <div>
          <h4>Contact</h4>
          <ul>
            <li>
              <a href={`mailto:${site.nitContact}`}>{site.nitContact}</a>
            </li>
            <li>NIT Jamshedpur, Jharkhand – 831014</li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <p>© 2026 DHTE Jharkhand &amp; NIT Jamshedpur. {programOverview.approval}</p>
          <p className="footer-credit">
            Developed by{" "}
            <a href="https://digicraft.one" target="_blank" rel="noopener noreferrer">
              DigiCraft Innovation Pvt. Ltd.
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
