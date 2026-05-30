export const idCardMeta = {
  organization: "NIT Jamshedpur",
  tagline: "Industrial Training & Internship 2026",
  department: "DHTE Jharkhand Initiative",
  designation: "Industrial Trainee",
  cardType: "INTERN TRAINEE ID",
  issueDate: "01/06/26",
  expireDate: "13/07/26",
  session: "2026",
  photoLabel: "Affix passport-size photo",
  signatureLabel: "Authorized Signatory",
  returnNotice: "If found, return to NIT Jamshedpur Internship Office.",
  issuerLine: "Issued by Dept. of Higher & Technical Education, Jharkhand",
} as const;

export function idCardsPdfFileName(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `NIT-JSR-Intern-ID-Cards-${date}.pdf`;
}
