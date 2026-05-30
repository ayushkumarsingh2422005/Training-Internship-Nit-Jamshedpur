import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import { IdCardSheet } from "@/components/IdCardSheet";
import type { AdminApplication } from "@/lib/admin-application";
import { loadIdCardAssets, type IdCardAssetUrls } from "@/lib/id-card-assets";
import { A4_PORTRAIT, ID_CARD_PDF_DPI, mmToPx } from "@/lib/id-card-constants";
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

async function renderSheetCanvas(
  application: AdminApplication,
  assets: IdCardAssetUrls,
): Promise<HTMLCanvasElement> {
  const host = document.createElement("div");
  host.className = "id-card-capture-host id-card-print-root";
  host.style.setProperty("--ic-mm", `${mmToPx(1)}px`);
  host.style.width = `${A4_PORTRAIT.widthPx}px`;
  host.style.height = `${A4_PORTRAIT.heightPx}px`;
  document.body.appendChild(host);

  let root: Root | null = null;

  try {
    root = createRoot(host);
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

    const sheet = host.querySelector(".id-card-page");
    if (!sheet) {
      throw new Error("ID card layout missing");
    }

    const { default: html2canvas } = await import("html2canvas");

    const canvas = await html2canvas(sheet as HTMLElement, {
      scale: 1,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: A4_PORTRAIT.widthPx,
      height: A4_PORTRAIT.heightPx,
      windowWidth: A4_PORTRAIT.widthPx,
      windowHeight: A4_PORTRAIT.heightPx,
      scrollX: 0,
      scrollY: 0,
      imageTimeout: 15000,
    });

    if (canvas.width < 10 || canvas.height < 10) {
      throw new Error("Empty ID card render");
    }

    return canvas;
  } finally {
    root?.unmount();
    document.body.removeChild(host);
  }
}

export async function downloadIdCardsPdf(applications: AdminApplication[]): Promise<void> {
  if (applications.length === 0) {
    throw new Error("No students to export");
  }

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

  for (let index = 0; index < applications.length; index += 1) {
    if (index > 0) {
      pdf.addPage();
    }

    const canvas = await renderSheetCanvas(applications[index], assets);
    const imgData = canvas.toDataURL("image/png", 1);
    pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
  }

  pdf.save(idCardsPdfFileName());

  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.info(`ID cards exported at ${ID_CARD_PDF_DPI} DPI (${A4_PORTRAIT.widthPx}×${A4_PORTRAIT.heightPx}px per page)`);
  }
}
