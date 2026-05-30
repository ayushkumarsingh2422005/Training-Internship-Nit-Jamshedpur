export const applicationFormMeta = {
  title: "Application Form",
  session: "2026",
  letterheadTitle: "NIT Jamshedpur Internship 2026",
  letterheadSubtitle: "Industrial Training & Internship at NIT Jamshedpur",
  letterheadDepartment: "Department of Higher and Technical Education",
  photoLabel: "Affix recent passport-size photograph",
  declaration:
    "I hereby declare that the particulars furnished above are true and correct to the best of my knowledge. I understand that industrial training at NIT Jamshedpur is residential where hostel is opted, attendance is biometric, and a minimum of 80% attendance is required for certification. I agree to abide by the rules of NIT Jamshedpur and instructions issued by DHTE Jharkhand and my parent polytechnic.",
} as const;

export const applicationFormSignatures = [
  { label: "Signature of the Candidate", sub: "Name in block letters" },
  { label: "Recommendation of Principal / TPO", sub: "College seal & signature" },
] as const;

export function applicationFormFileName(fullName: string): string {
  const safe = fullName
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 48);
  return `NIT-JSR-Application-Form${safe ? `-${safe}` : ""}.pdf`;
}
