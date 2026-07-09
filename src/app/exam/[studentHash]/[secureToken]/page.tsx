import { Suspense } from "react";
import type { Metadata } from "next";
import { ExamEngineClient } from "@/components/ExamEngineClient";

export const metadata: Metadata = {
  title: "Secure Exam Portal",
  description: "Secure examination environment",
  robots: { index: false, follow: false },
};

function ExamLoading() {
  return (
    <div className="exam-loading">
      <h2>Loading examination…</h2>
    </div>
  );
}

export default async function ExamPage({
  params,
}: {
  params: Promise<{ studentHash: string; secureToken: string }>;
}) {
  const { studentHash, secureToken } = await params;

  return (
    <Suspense fallback={<ExamLoading />}>
      <ExamEngineClient studentHash={studentHash} secureToken={secureToken} />
    </Suspense>
  );
}
