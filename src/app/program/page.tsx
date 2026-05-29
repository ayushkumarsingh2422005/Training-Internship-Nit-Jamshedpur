import type { Metadata } from "next";
import { trainingCourses } from "@/lib/content";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Training Modules",
  description:
    "Explore industrial training and skill-development modules at NIT Jamshedpur — Computer Science, Mechanical, Electrical, and Civil Engineering courses for Jharkhand polytechnic students.",
  path: "/program",
});

export default function ProgramPage() {
  return (
    <main className="page-main">
      <div className="container">
        <header className="page-header">
          <h1>Training Modules</h1>
          <p className="page-lead">
            Skill-development modules offered under the MOU, grouped by engineering discipline. Final module
            assignment is based on batch allocation by NIT Jamshedpur and DHTE.
          </p>
        </header>

        <div className="course-grid">
          {Object.entries(trainingCourses).map(([branch, modules]) => (
            <section key={branch} className="content-card">
              <h2>{branch}</h2>
              <ul className="bullet-list">
                {modules.map((module) => (
                  <li key={module}>{module}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
