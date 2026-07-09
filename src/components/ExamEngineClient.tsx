"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const ExamEngineLazy = dynamic(
  () => import("@/components/ExamEngine").then((mod) => mod.ExamEngine),
  {
    ssr: false,
    loading: () => (
      <div className="exam-loading">
        <h2>Loading examination…</h2>
        <p style={{ color: "var(--muted)" }}>Please wait while we prepare your secure test environment.</p>
      </div>
    ),
  },
);

export function ExamEngineClient(props: ComponentProps<typeof ExamEngineLazy>) {
  return <ExamEngineLazy {...props} />;
}
