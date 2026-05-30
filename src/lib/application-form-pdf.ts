import { applicationFormFileName } from "@/lib/application-form";

async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject(new Error("Form image failed to load"));
            }),
    ),
  );
}

async function renderFormCanvas(source: HTMLElement): Promise<HTMLCanvasElement> {
  const captureRoot = source.querySelector(".application-form-print") ?? source;
  const clone = captureRoot.cloneNode(true) as HTMLElement;

  clone.style.cssText = [
    "position: fixed",
    "left: 0",
    "top: 0",
    "width: 794px",
    "max-width: 794px",
    "opacity: 1",
    "visibility: visible",
    "z-index: 2147483646",
    "background: #ffffff",
    "color: #111111",
    "pointer-events: none",
    "margin: 0",
    "padding: 16px 18px 20px",
    "box-sizing: border-box",
    "font-family: Arial, Helvetica, sans-serif",
  ].join(";");

  document.body.appendChild(clone);

  try {
    await waitForImages(clone);

    const { default: html2canvas } = await import("html2canvas");

    const canvas = await html2canvas(clone, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: 794,
      windowWidth: 794,
      scrollX: 0,
      scrollY: 0,
    });

    if (canvas.width < 10 || canvas.height < 10) {
      throw new Error("Empty form render");
    }

    return canvas;
  } finally {
    document.body.removeChild(clone);
  }
}

/** Render at full A4 width; add pages only if the form is taller than one sheet. */
async function canvasToPdf(canvas: HTMLCanvasElement, fileName: string): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;

  const imgData = canvas.toDataURL("image/png");
  const imgWidth = printableWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let offsetY = 0;
  let pageIndex = 0;

  while (offsetY < imgHeight - 0.5) {
    if (pageIndex > 0) {
      pdf.addPage();
    }

    pdf.addImage(imgData, "PNG", margin, margin - offsetY, imgWidth, imgHeight);
    offsetY += printableHeight;
    pageIndex += 1;

    if (pageIndex > 6) {
      break;
    }
  }

  pdf.save(fileName);
}

export async function downloadApplicationFormPdf(
  source: HTMLElement,
  fullName: string,
): Promise<void> {
  const canvas = await renderFormCanvas(source);
  await canvasToPdf(canvas, applicationFormFileName(fullName));
}
