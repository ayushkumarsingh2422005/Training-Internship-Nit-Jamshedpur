"use client";

import type { RefObject } from "react";
import { applicationFormMeta } from "@/lib/application-form";
import {
  formatExamInstructions,
  type ExamEntryTestInfo,
  type ExamStudentProfile,
} from "@/lib/exam-entry-types";

type ExamEntryScreenProps = {
  testData: ExamEntryTestInfo;
  student: ExamStudentProfile;
  questionCount: number;
  guidelinesAccepted: boolean;
  onGuidelinesAcceptedChange: (accepted: boolean) => void;
  onStart: () => void;
  startButtonRef?: RefObject<HTMLButtonElement | null>;
};

function displayValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || "—";
}

export function ExamEntryScreen({
  testData,
  student,
  questionCount,
  guidelinesAccepted,
  onGuidelinesAcceptedChange,
  onStart,
  startButtonRef,
}: ExamEntryScreenProps) {
  const instructionsText = formatExamInstructions(testData.instructions);

  return (
    <div className="exam-cbt">
      <header className="exam-cbt-header">
        <div className="exam-cbt-header-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nitjsrlogo.png" alt="" className="exam-cbt-logo" width={56} height={56} />
          <div>
            <p className="exam-cbt-org">{applicationFormMeta.letterheadTitle}</p>
            <p className="exam-cbt-org-sub">{applicationFormMeta.letterheadDepartment}</p>
          </div>
        </div>
        <div className="exam-cbt-header-title">
          <h1>Computer Based Test</h1>
          <p>Secure Online Examination Portal</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Jharkhand_Rajakiya_Chihna.svg"
          alt=""
          className="exam-cbt-emblem"
          width={52}
          height={52}
        />
      </header>

      <main className="exam-cbt-main">
        <section className="exam-cbt-col" aria-labelledby="exam-candidate-heading">
          <h2 id="exam-candidate-heading" className="exam-cbt-section-title">
            Candidate details
          </h2>
          <dl className="exam-cbt-details">
            <div className="exam-cbt-detail-row">
              <dt>Candidate name</dt>
              <dd>{student.fullName}</dd>
            </div>
            <div className="exam-cbt-detail-row">
              <dt>Intern ID</dt>
              <dd>{displayValue(student.internId)}</dd>
            </div>
            <div className="exam-cbt-detail-row">
              <dt>Email</dt>
              <dd>{student.email}</dd>
            </div>
            <div className="exam-cbt-detail-row">
              <dt>Mobile</dt>
              <dd>{displayValue(student.phoneNumber)}</dd>
            </div>
            <div className="exam-cbt-detail-row">
              <dt>College</dt>
              <dd>{displayValue(student.collegeName)}</dd>
            </div>
            <div className="exam-cbt-detail-row">
              <dt>Training module</dt>
              <dd>
                {student.subject} — {student.subpart}
              </dd>
            </div>
          </dl>
        </section>

        <section className="exam-cbt-col exam-cbt-col--exam" aria-labelledby="exam-info-heading">
          <h2 id="exam-info-heading" className="exam-cbt-section-title">
            Examination details
          </h2>

          <div className="exam-cbt-exam-head">
            <h3>{testData.testName}</h3>
            <p>
              {testData.subject} — {testData.subpart}
            </p>
          </div>

          <ul className="exam-cbt-meta">
            <li>
              <span>Duration</span>
              <strong>{testData.durationMinutes} min</strong>
            </li>
            <li>
              <span>Questions</span>
              <strong>{questionCount}</strong>
            </li>
            <li>
              <span>Maximum marks</span>
              <strong>{testData.totalMarks}</strong>
            </li>
            <li>
              <span>Negative marking</span>
              <strong className={testData.isNegativeMarking ? "exam-cbt-meta--warn" : ""}>
                {testData.isNegativeMarking ? "Applicable" : "Not applicable"}
              </strong>
            </li>
            <li>
              <span>Question order</span>
              <strong>{testData.randomizeQuestions ? "Randomized" : "Fixed"}</strong>
            </li>
          </ul>

          <div className="exam-cbt-instructions">
            <h4>General instructions</h4>
            <div className="exam-cbt-instructions-scroll">{instructionsText}</div>
          </div>
        </section>
      </main>

      <footer className="exam-cbt-footer">
        <label className="exam-cbt-consent">
          <input
            type="checkbox"
            checked={guidelinesAccepted}
            onChange={(e) => onGuidelinesAcceptedChange(e.target.checked)}
          />
          <span>
            I have read and understood all the instructions above. I am ready to begin the examination
            in full-screen mode.
          </span>
        </label>
        <button
          ref={startButtonRef}
          type="button"
          className="exam-cbt-start-btn"
          disabled={!guidelinesAccepted}
          onClick={onStart}
        >
          Begin examination — enter full screen
        </button>
      </footer>
    </div>
  );
}
