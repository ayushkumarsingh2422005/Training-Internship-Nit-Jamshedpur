"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ExamEngine } from "@/components/ExamEngine";

function PreviewContent() {
  const searchParams = useSearchParams();
  const testId = searchParams.get("testId");
  const draft = searchParams.get("draft") === "1";

  if (!testId && !draft) {
    return (
      <div className="exam-error">
        <h2>Preview unavailable</h2>
        <p>Open preview from the teacher dashboard using the Preview button.</p>
      </div>
    );
  }

  return (
    <ExamEngine
      previewMode
      previewTestId={testId}
      previewDraft={draft}
    />
  );
}

export default function TeacherPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="exam-loading">
          <h2>Loading preview…</h2>
        </div>
      }
    >
      <PreviewContent />
    </Suspense>
  );
}
