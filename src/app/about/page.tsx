import type { Metadata } from "next";
import {
  attendancePolicy,
  certification,
  feeStructure,
  programOverview,
  trainingMethodology,
} from "@/lib/content";

export const metadata: Metadata = {
  title: "About the Programme",
};

export default function AboutPage() {
  return (
    <main className="page-main">
      <div className="container">
        <header className="page-header">
          <h1>About the Programme</h1>
          <p className="page-lead">{programOverview.summary}</p>
        </header>

        <div className="content-grid">
          <section className="content-card">
            <h2>Partners</h2>
            <dl className="detail-list">
              <div>
                <dt>Host institution</dt>
                <dd>{programOverview.host}</dd>
              </div>
              <div>
                <dt>State partner</dt>
                <dd>{programOverview.partner}</dd>
              </div>
              <div>
                <dt>Eligible students</dt>
                <dd>{programOverview.audience}</dd>
              </div>
              <div>
                <dt>Annual capacity</dt>
                <dd>{programOverview.capacity}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{programOverview.duration}</dd>
              </div>
            </dl>
          </section>

          <section className="content-card">
            <h2>About NIT Jamshedpur</h2>
            <p>{programOverview.aboutNit}</p>
            <p className="note-box">{programOverview.jutNote}</p>
          </section>

          <section className="content-card full">
            <h2>Training methodology</h2>
            <ul className="bullet-list">
              {trainingMethodology.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="content-card">
            <h2>Attendance policy</h2>
            <ul className="bullet-list">
              <li>{attendancePolicy.recording}</li>
              <li>{attendancePolicy.minimum}</li>
              <li>{attendancePolicy.medical}</li>
            </ul>
          </section>

          <section className="content-card">
            <h2>Fee structure (per student)</h2>
            <dl className="detail-list">
              <div>
                <dt>Training fee</dt>
                <dd>{feeStructure.trainingFee}</dd>
              </div>
              <div>
                <dt>Hostel &amp; mess</dt>
                <dd>{feeStructure.hostelMess}</dd>
              </div>
              <div>
                <dt>Total (programme)</dt>
                <dd>
                  <strong>{feeStructure.total}</strong>
                </dd>
              </div>
            </dl>
            <p className="muted">{feeStructure.discountNote}</p>
            <p className="muted">{feeStructure.hostelNote}</p>
          </section>

          <section className="content-card full">
            <h2>Certification &amp; governance</h2>
            <p>
              <strong>{certification.title}</strong> — {certification.details}
            </p>
            <p>{programOverview.notificationLead}</p>
            <p className="muted">{programOverview.approval}</p>
          </section>
        </div>
      </div>
    </main>
  );
}
