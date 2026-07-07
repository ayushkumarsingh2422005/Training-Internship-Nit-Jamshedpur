"use client";

import Image from "next/image";
import { applicationFormMeta } from "@/lib/application-form";
import { siteLinks } from "@/lib/content";
import type { ExamSubmitResult } from "@/lib/exam-entry-types";

type ExamResultScreenProps = {
  result: ExamSubmitResult;
  testName: string;
  studentName: string;
  isPreview?: boolean;
  onBack: () => void;
};

export function ExamResultScreen({
  result,
  testName,
  studentName,
  isPreview = false,
  onBack,
}: ExamResultScreenProps) {
  const title = result.autoSubmitted ? "Time's up — test submitted" : "Test submitted successfully";

  return (
    <div className="exam-cbt exam-cbt--result">
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

      <main className="exam-cbt-result-main">
        <div className="exam-cbt-result-card">
          <p className="exam-cbt-result-thanks">Thank you for completing the examination.</p>
          <h2 className="exam-cbt-result-title">{title}</h2>

          {result.autoSubmitted ? (
            <p className="exam-cbt-result-note">
              Your exam time ended and your answers were submitted automatically.
            </p>
          ) : isPreview ? (
            <p className="exam-cbt-result-note">
              Preview sample score — no student submission was recorded.
            </p>
          ) : (
            <p className="exam-cbt-result-note">
              Your responses have been recorded. You may now leave the examination portal.
            </p>
          )}

          <div className="exam-cbt-result-summary">
            <p>
              <span>Candidate</span>
              <strong>{studentName}</strong>
            </p>
            <p>
              <span>Examination</span>
              <strong>{testName}</strong>
            </p>
          </div>

          <ul className="exam-cbt-result-stats">
            <li className="exam-cbt-result-stat exam-cbt-result-stat--score">
              <span>Total score</span>
              <strong>{result.totalScore}</strong>
            </li>
            <li className="exam-cbt-result-stat">
              <span>Correct</span>
              <strong>{result.correctQuestions}</strong>
            </li>
            <li className="exam-cbt-result-stat">
              <span>Incorrect</span>
              <strong>{result.incorrectQuestions}</strong>
            </li>
            <li className="exam-cbt-result-stat">
              <span>Unattempted</span>
              <strong>{result.unattemptedQuestions}</strong>
            </li>
            <li className="exam-cbt-result-stat">
              <span>Accuracy</span>
              <strong>{result.accuracyPercentage}%</strong>
            </li>
          </ul>
        </div>
      </main>

      <footer className="exam-cbt-result-footer">
        <button type="button" className="exam-cbt-start-btn" onClick={onBack}>
          {isPreview ? "Back to teacher portal" : "Back to student portal"}
        </button>
        <p className="exam-cbt-result-powered">
          Powered by{" "}
          <a
            href={siteLinks.digicraft}
            target="_blank"
            rel="noopener noreferrer"
            className="exam-cbt-result-digicraft"
          >
            <Image
              src={siteLinks.digicraftLogo}
              alt=""
              width={22}
              height={22}
              className="developer-credit-logo"
            />
            DigiCraft
          </a>
        </p>
      </footer>
    </div>
  );
}
