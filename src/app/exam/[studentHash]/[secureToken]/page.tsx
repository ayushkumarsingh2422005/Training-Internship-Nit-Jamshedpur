import type { Metadata } from "next";
import { ExamEngine } from "@/components/ExamEngine";

export const metadata: Metadata = {
  title: "Secure Exam Portal",
  description: "Secure examination environment",
  robots: { index: false, follow: false },
};

export default async function ExamPage({
  params,
}: {
  params: Promise<{ studentHash: string; secureToken: string }>;
}) {
  const { studentHash, secureToken } = await params;
  
  return <ExamEngine studentHash={studentHash} secureToken={secureToken} />;
}
