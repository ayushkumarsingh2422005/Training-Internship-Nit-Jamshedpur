import type { Metadata } from "next";
import { programOverview, site } from "@/lib/content";

export const metadata: Metadata = {
  title: "Contact",
};

export default function ContactPage() {
  return (
    <main className="page-main">
      <div className="container">
        <header className="page-header">
          <h1>Contact &amp; Support</h1>
          <p className="page-lead">
            For programme-related queries, contact NIT Jamshedpur training coordination or the Department of Higher and
            Technical Education, Jharkhand.
          </p>
        </header>

        <div className="content-grid">
          <section className="content-card">
            <h2>NIT Jamshedpur</h2>
            <dl className="detail-list">
              <div>
                <dt>Address</dt>
                <dd>National Institute of Technology, Jamshedpur, Jharkhand – 831014</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${site.nitContact}`}>{site.nitContact}</a>
                </dd>
              </div>
            </dl>
          </section>

          <section className="content-card">
            <h2>Department of Higher and Technical Education</h2>
            <dl className="detail-list">
              <div>
                <dt>Government</dt>
                <dd>Government of Jharkhand</dd>
              </div>
              <div>
                <dt>Toll-free</dt>
                <dd>
                  <a href={`tel:${site.tollFree.replace(/-/g, "")}`}>{site.tollFree}</a>
                </dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${site.dhteContact}`}>{site.dhteContact}</a>
                </dd>
              </div>
            </dl>
          </section>

          <section className="content-card full">
            <h2>For polytechnic principals &amp; students</h2>
            <p>{programOverview.notificationLead}</p>
            <p>
              Students should follow instructions issued by their parent polytechnic and refer to this portal for
              centralized notices and results.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
