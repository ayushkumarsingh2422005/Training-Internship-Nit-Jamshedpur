import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ResultsSheet } from "@/components/ResultsSheet";
import { loadIdCardAssets } from "@/lib/id-card-assets";
import {
  resultsPdfFileName,
  type ResultsPdfExam,
  type ResultsPdfStudent,
  type ResultsPdfSummary,
} from "@/lib/student-results-meta";

/** Capture multiplier on ~96 CSS-dpi layout → ~384 DPI equivalent for A4 print. */
const CAPTURE_SCALE = 4;

async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Results sheet image failed to load"));
          }),
    ),
  );
}

function createCaptureHost(): HTMLElement {
  const host = document.createElement("div");
  host.className = "results-sheet-capture-host";
  host.style.cssText = [
    "position: fixed",
    "left: -10000px",
    "top: 0",
    "width: 794px",
    "background: #ffffff",
    "z-index: -1",
    "pointer-events: none",
  ].join(";");
  document.body.appendChild(host);
  return host;
}

async function renderResultsCanvas(
  host: HTMLElement,
  root: Root,
  student: ResultsPdfStudent,
  exams: ResultsPdfExam[],
  summary: ResultsPdfSummary,
): Promise<HTMLCanvasElement> {
  const assets = await loadIdCardAssets();
  const generatedAt = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  root.render(
    createElement(ResultsSheet, {
      student,
      exams,
      summary,
      nitLogoUrl: assets.nitLogoUrl,
      govEmblemUrl: assets.govEmblemUrl,
      signatureUrl: assets.signatureUrl,
      generatedAt,
    }),
  );

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await waitForImages(host);

  const sheet = host.querySelector(".results-sheet") as HTMLElement | null;
  if (!sheet) {
    throw new Error("Results sheet layout missing");
  }

  const width = Math.ceil(sheet.scrollWidth);
  const height = Math.ceil(sheet.scrollHeight);

  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(sheet, {
    scale: CAPTURE_SCALE,
    backgroundColor: "#ffffff",
    useCORS: true,
    allowTaint: true,
    logging: false,
    width,
    height,
    windowWidth: width,
    windowHeight: height,
    scrollX: 0,
    scrollY: 0,
    imageTimeout: 15000,
  });

  if (canvas.width < 10 || canvas.height < 10) {
    throw new Error("Empty results sheet render");
  }

  return canvas;
}

/** Fit the whole sheet on a single A4 page (scale down if needed). */
async function canvasToSinglePagePdf(canvas: HTMLCanvasElement, fileName: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: false,
    precision: 16,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 6;
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;

  const imgData = canvas.toDataURL("image/png", 1);
  let imgWidth = printableWidth;
  let imgHeight = (canvas.height * imgWidth) / canvas.width;

  if (imgHeight > printableHeight) {
    imgHeight = printableHeight;
    imgWidth = (canvas.width * imgHeight) / canvas.height;
  }

  const x = margin + (printableWidth - imgWidth) / 2;
  const y = margin + (printableHeight - imgHeight) / 2;

  // NONE keeps full PNG fidelity (no JPEG recompression).
  pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight, undefined, "NONE");
  pdf.save(fileName);
}

export async function downloadOverallResultsPdf(
  student: ResultsPdfStudent,
  exams: ResultsPdfExam[],
  summary: ResultsPdfSummary,
): Promise<void> {
  if (!exams.length) {
    throw new Error("No results available to download.");
  }

  const host = createCaptureHost();
  const root = createRoot(host);

  try {
    const canvas = await renderResultsCanvas(host, root, student, exams, summary);
    await canvasToSinglePagePdf(canvas, resultsPdfFileName(student));
  } finally {
    root.unmount();
    host.remove();
  }
}
