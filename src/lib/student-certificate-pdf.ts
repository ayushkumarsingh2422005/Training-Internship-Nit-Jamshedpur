import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { CertificateSheet } from "@/components/CertificateSheet";
import {
  certificateFileName,
  formatCertificateDate,
  type CertificateStudent,
} from "@/lib/certificate-meta";
import { signatureDataUrl } from "@/lib/id-card-assets";

const CERTIFICATE_WIDTH = 1024;
const CAPTURE_SCALE = 4;

function assetUrl(path: string): string {
  return `${window.location.origin}${path}`;
}

async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error(`Certificate asset failed to load: ${img.src}`));
          }),
    ),
  );
}

function createCaptureHost(): HTMLElement {
  const host = document.createElement("div");
  host.className = "certificate-capture-host";
  host.style.cssText = [
    "position: fixed",
    "left: -12000px",
    "top: 0",
    `width: ${CERTIFICATE_WIDTH}px`,
    "background: #ffffff",
    "z-index: -1",
    "pointer-events: none",
  ].join(";");
  document.body.appendChild(host);
  return host;
}

async function renderCertificate(
  host: HTMLElement,
  root: Root,
  student: CertificateStudent,
): Promise<HTMLCanvasElement> {
  const signatureUrl = await signatureDataUrl(assetUrl("/signature.png"));

  root.render(
    createElement(CertificateSheet, {
      student,
      issueDate: formatCertificateDate(new Date()),
      backgroundUrl: assetUrl("/certificate_bg.png"),
      nitLogoUrl: assetUrl("/nitjsrlogo.png"),
      governmentLogoUrl: assetUrl("/Jharkhand_Rajakiya_Chihna.svg"),
      signatureUrl,
    }),
  );

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await waitForImages(host);
  await document.fonts.ready;

  const sheet = host.querySelector(".certificate-sheet") as HTMLElement | null;
  if (!sheet) throw new Error("Certificate layout is missing.");

  const { default: html2canvas } = await import("html2canvas");
  return html2canvas(sheet, {
    scale: CAPTURE_SCALE,
    backgroundColor: "#ffffff",
    useCORS: true,
    allowTaint: true,
    logging: false,
    width: CERTIFICATE_WIDTH,
    height: 724,
    windowWidth: CERTIFICATE_WIDTH,
    windowHeight: 724,
    scrollX: 0,
    scrollY: 0,
    imageTimeout: 15000,
  });
}

export async function downloadStudentCertificatePdf(student: CertificateStudent): Promise<void> {
  if (!student.internId?.trim()) {
    throw new Error("Your Intern ID must be assigned before generating the certificate.");
  }

  const host = createCaptureHost();
  const root = createRoot(host);

  try {
    const canvas = await renderCertificate(host, root, student);
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: false,
      precision: 16,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageRatio = canvas.width / canvas.height;
    const pageRatio = pageWidth / pageHeight;
    let width = pageWidth;
    let height = pageHeight;

    if (imageRatio > pageRatio) {
      height = pageWidth / imageRatio;
    } else {
      width = pageHeight * imageRatio;
    }

    const imageData = canvas.toDataURL("image/png", 1);
    pdf.addImage(
      imageData,
      "PNG",
      (pageWidth - width) / 2,
      (pageHeight - height) / 2,
      width,
      height,
      undefined,
      "NONE",
    );
    pdf.save(certificateFileName(student));
  } finally {
    root.unmount();
    host.remove();
  }
}
