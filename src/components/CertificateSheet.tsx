import {
  certificateMeta,
  certificateNumber,
  type CertificateStudent,
} from "@/lib/certificate-meta";

type CertificateSheetProps = {
  student: CertificateStudent;
  issueDate: string;
  backgroundUrl: string;
  nitLogoUrl: string;
  governmentLogoUrl: string;
  signatureUrl: string;
};

export function CertificateSheet({
  student,
  issueDate,
  backgroundUrl,
  nitLogoUrl,
  governmentLogoUrl,
  signatureUrl,
}: CertificateSheetProps) {
  return (
    <article
      className="certificate-sheet"
      aria-label={`Certificate of completion for ${student.fullName}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="certificate-sheet-bg" src={backgroundUrl} alt="" />

      <div className="certificate-sheet-content">
        <header className="certificate-sheet-header">
          <h1>CERTIFICATE</h1>
          <p>OF COMPLETION</p>
        </header>

        <div className="certificate-sheet-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={nitLogoUrl} alt="NIT Jamshedpur" />
        </div>

        <div className="certificate-sheet-logo certificate-sheet-logo--government">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={governmentLogoUrl} alt="Government of Jharkhand" />
        </div>

        <section className="certificate-sheet-recipient">
          <p className="certificate-sheet-certify">This is to certify that</p>
          <p className="certificate-sheet-number">{certificateNumber(student)}</p>
          <div className="certificate-sheet-name-row">
            <span aria-hidden="true">●</span>
            <strong>{student.fullName}</strong>
            <span aria-hidden="true">●</span>
          </div>
          <p className="certificate-sheet-copy">
            has successfully completed the {certificateMeta.programmeDuration} conducted by
          </p>
          <p className="certificate-sheet-organization">{certificateMeta.organization}</p>
          <p className="certificate-sheet-collaboration">in collaboration with</p>
          <p className="certificate-sheet-department">{certificateMeta.collaborator}</p>
        </section>

        <footer className="certificate-sheet-footer">
          <div className="certificate-sheet-date">
            <span>Certificate issuance date:</span>
            <strong>{issueDate}</strong>
          </div>

          <div className="certificate-sheet-signatory">
            {signatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signatureUrl} alt="" />
            ) : (
              <div className="certificate-sheet-signature-placeholder" aria-hidden="true" />
            )}
            <div className="certificate-sheet-sign-line" />
            <span>{certificateMeta.signatoryTitle}</span>
            <strong>{certificateMeta.signatoryOrganization}</strong>
          </div>
        </footer>
      </div>
    </article>
  );
}
