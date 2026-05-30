import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import { IdCardSheet } from "@/components/IdCardSheet";
import type { AdminApplication } from "@/lib/admin-application";
import { loadIdCardAssets, type IdCardAssetUrls } from "@/lib/id-card-assets";
import { ID_CARD_PDF_DPI, mmToPx } from "@/lib/id-card-constants";
import { idCardsPdfFileName } from "@/lib/id-card-meta";

async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject(new Error("ID card image failed to load"));
            }),
    ),
  );
}

async function waitForBarcode(root: HTMLElement): Promise<void> {
  const svg = root.querySelector(".id-card-barcode-svg");
  if (!svg) return;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    if (svg.querySelector("rect, line, path")) {
      return;
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 40);
    });
  }
}

/** Capture multiplier on top of the 300 DPI base layout (→ ~600 DPI print). */
const CAPTURE_SCALE = 2;

type RenderedSheet = {
  canvas: HTMLCanvasElement;
  widthMm: number;
  heightMm: number;
};

async function renderSheetCanvas(
  host: HTMLElement,
  root: Root,
  application: AdminApplication,
  assets: IdCardAssetUrls,
): Promise<RenderedSheet> {
  root.render(
    createElement(IdCardSheet, {
      application,
      nitLogoUrl: assets.nitLogoUrl,
      govEmblemUrl: assets.govEmblemUrl,
      signatureUrl: assets.signatureUrl,
    }),
  );

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await waitForImages(host);
  await waitForBarcode(host);

  const sheet = host.querySelector(".id-card-page") as HTMLElement | null;
  if (!sheet) {
    throw new Error("ID card layout missing");
  }

  // Capture only the two-card strip (not the whole empty A4) for speed.
  const captureWidth = Math.ceil(sheet.scrollWidth);
  const captureHeight = Math.ceil(sheet.scrollHeight);
  const pxPerMm = mmToPx(1);

  const { default: html2canvas } = await import("html2canvas");

  const canvas = await html2canvas(sheet, {
    scale: CAPTURE_SCALE,
    backgroundColor: "#ffffff",
    useCORS: true,
    allowTaint: true,
    logging: false,
    width: captureWidth,
    height: captureHeight,
    windowWidth: captureWidth,
    windowHeight: captureHeight,
    scrollX: 0,
    scrollY: 0,
    imageTimeout: 15000,
  });

  if (canvas.width < 10 || canvas.height < 10) {
    throw new Error("Empty ID card render");
  }

  return {
    canvas,
    widthMm: captureWidth / pxPerMm,
    heightMm: captureHeight / pxPerMm,
  };
}

export type IdCardProgress = {
  completed: number;
  total: number;
};

export async function downloadIdCardsPdf(
  applications: AdminApplication[],
  onProgress?: (progress: IdCardProgress) => void,
): Promise<void> {
  if (applications.length === 0) {
    throw new Error("No students to export");
  }

  const total = applications.length;
  onProgress?.({ completed: 0, total });

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const assets = await loadIdCardAssets();

  // Stack multiple students per A4 page (front+back row each), top-aligned.
  const PAGE_MARGIN = 8;
  const ROW_GAP = 4;

  // Reuse a single off-screen host + React root across every card.
  const host = document.createElement("div");
  host.className = "id-card-capture-host id-card-print-root";
  host.style.setProperty("--ic-mm", `${mmToPx(1)}px`);
  host.style.display = "inline-block";
  document.body.appendChild(host);
  const root = createRoot(host);

  let cursorY = PAGE_MARGIN;
  let isFirstRowOnPage = true;

  try {
    for (let index = 0; index < applications.length; index += 1) {
      const { canvas, widthMm, heightMm } = await renderSheetCanvas(
        host,
        root,
        applications[index],
        assets,
      );

      // Move to a new page when the next row would overflow the sheet.
      if (!isFirstRowOnPage && cursorY + heightMm > pageHeight - PAGE_MARGIN) {
        pdf.addPage();
        cursorY = PAGE_MARGIN;
        isFirstRowOnPage = true;
      }

      const x = Math.min(PAGE_MARGIN, Math.max(0, pageWidth - widthMm));
      const imgData = canvas.toDataURL("image/png", 1);
      pdf.addImage(imgData, "PNG", x, cursorY, widthMm, heightMm, undefined, "FAST");

      cursorY += heightMm + ROW_GAP;
      isFirstRowOnPage = false;

      onProgress?.({ completed: index + 1, total });

      // Yield to the event loop so the progress UI can repaint between rows.
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      });
    }
  } finally {
    root.unmount();
    document.body.removeChild(host);
  }

  pdf.save(idCardsPdfFileName());

  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.info(`ID cards exported at ${ID_CARD_PDF_DPI * CAPTURE_SCALE} DPI (card strip only)`);
  }
}
