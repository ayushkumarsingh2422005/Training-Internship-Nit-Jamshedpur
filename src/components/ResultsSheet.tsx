import type {
  ResultsPdfExam,
  ResultsPdfStudent,
  ResultsPdfSummary,
} from "@/lib/student-results-meta";
import {
  examPercentage,
  formatResultsPdfDate,
  resultsPdfMeta,
} from "@/lib/student-results-meta";

type ResultsSheetProps = {
  student: ResultsPdfStudent;
  exams: ResultsPdfExam[];
  summary: ResultsPdfSummary;
  nitLogoUrl: string;
  govEmblemUrl: string;
  signatureUrl: string;
  issueDate: string;
};

export function ResultsSheet({
  student,
  exams,
  summary,
  nitLogoUrl,
  govEmblemUrl,
  signatureUrl,
  issueDate,
}: ResultsSheetProps) {
  const refId = (student.internId || "RESULT")
    .toString()
    .replace(/\s+/g, "")
    .toUpperCase();

  return (
    <div className="results-sheet">
      <div className="results-sheet-inner">
        <div className="results-sheet-watermark" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={nitLogoUrl} alt="" className="results-sheet-watermark-logo" />
          <span className="results-sheet-watermark-text">NIT JAMSHEDPUR</span>
        </div>

        <header className="results-sheet-letterhead">
          <div className="results-sheet-logo-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={nitLogoUrl} alt="" className="results-sheet-logo" width={88} height={88} />
          </div>
          <div className="results-sheet-letterhead-text">
            <p className="results-sheet-org">{resultsPdfMeta.organization}</p>
            <p className="results-sheet-tagline">{resultsPdfMeta.tagline}</p>
            <p className="results-sheet-dept">{resultsPdfMeta.department}</p>
            <h1 className="results-sheet-title">{resultsPdfMeta.title}</h1>
            <p className="results-sheet-ref">
              Result Ref: NITJSR/IT/{refId}/{new Date().getFullYear()}
            </p>
          </div>
          <div className="results-sheet-logo-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={govEmblemUrl} alt="" className="results-sheet-logo" width={88} height={88} />
          </div>
        </header>

        <div className="results-sheet-gold-line" />

        <p className="results-sheet-proclaim">
          This is to certify the consolidated assessment result of the trainee named below,
          based on Computer Based Tests (CBT) and Theory / Lab evaluations conducted during the
          Industrial Training &amp; Internship Programme.
        </p>

        <section className="results-sheet-student">
          <div className="results-sheet-field">
            <span>Student name</span>
            <strong>{student.fullName}</strong>
          </div>
          <div className="results-sheet-field">
            <span>Intern ID</span>
            <strong>{student.internId || "—"}</strong>
          </div>
          <div className="results-sheet-field">
            <span>College</span>
            <strong>{student.collegeName}</strong>
          </div>
          <div className="results-sheet-field">
            <span>Branch / Module</span>
            <strong>
              {student.subject}
              {student.subpart ? ` — ${student.subpart}` : ""}
            </strong>
          </div>
          <div className="results-sheet-field">
            <span>Email</span>
            <strong>{student.email}</strong>
          </div>
          <div className="results-sheet-field">
            <span>Mobile</span>
            <strong>{student.phoneNumber}</strong>
          </div>
        </section>

        <section className="results-sheet-summary">
          <div className="results-sheet-summary-item results-sheet-summary-item--primary">
            <span>Final overall %</span>
            <strong>{summary.overallPercentage}%</strong>
            <em>Normalized out of 100</em>
          </div>
          <div className="results-sheet-summary-item">
            <span>Marks obtained</span>
            <strong>
              {summary.totalGot}
              <small>/{summary.totalMax}</small>
            </strong>
          </div>
          <div className="results-sheet-summary-item">
            <span>Examinations</span>
            <strong>{summary.examCount}</strong>
          </div>
        </section>

        <h2 className="results-sheet-section-title">Statement of marks</h2>

        <table className="results-sheet-table">
          <thead>
            <tr>
              <th>S.No.</th>
              <th>Examination</th>
              <th>Type</th>
              <th>Date</th>
              <th>Marks</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {exams.map((exam, index) => {
              const pct = examPercentage(exam.score, exam.maxMarks);
              return (
                <tr key={`${exam.source}-${exam.id}`}>
                  <td>{index + 1}</td>
                  <td>
                    <strong>{exam.examName}</strong>
                    <div className="results-sheet-exam-meta">
                      {exam.subject}
                      {exam.subpart ? ` — ${exam.subpart}` : ""}
                      {exam.accuracyPercentage != null
                        ? ` · ${Math.round(exam.accuracyPercentage)}% accuracy`
                        : ""}
                      {exam.remarks ? ` · ${exam.remarks}` : ""}
                    </div>
                  </td>
                  <td>{exam.source === "cbt" ? "CBT" : exam.examType}</td>
                  <td>{formatResultsPdfDate(exam.examDate)}</td>
                  <td>
                    {exam.score}/{exam.maxMarks}
                  </td>
                  <td>{pct}%</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>
                <strong>Grand total</strong>
              </td>
              <td>
                <strong>
                  {summary.totalGot}/{summary.totalMax}
                </strong>
              </td>
              <td>
                <strong>{summary.overallPercentage}%</strong>
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="results-sheet-sign-row">
          <div className="results-sheet-sign-block">
            <div className="results-sheet-sign-image-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signatureUrl}
                alt=""
                className="results-sheet-signature"
              />
            </div>
            <div className="results-sheet-sign-line" />
            <span>Programme Coordinator</span>
          </div>
          <div className="results-sheet-sign-block results-sheet-sign-block--center">
            <div className="results-sheet-seal">OFFICIAL RESULT</div>
            <span>NIT Jamshedpur</span>
          </div>
          <div className="results-sheet-sign-block results-sheet-issue-date">
            <span>Result issuance date:</span>
            <strong>{issueDate}</strong>
          </div>
        </div>

        <footer className="results-sheet-footer">
          <p>{resultsPdfMeta.formulaNote}</p>
          <p>{resultsPdfMeta.componentsNote}</p>
          <p>{resultsPdfMeta.issuerLine}</p>
        </footer>
      </div>
    </div>
  );
}
