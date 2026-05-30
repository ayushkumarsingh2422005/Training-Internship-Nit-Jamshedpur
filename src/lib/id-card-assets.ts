import { ID_CARD_LOGO_RASTER_PX } from "@/lib/id-card-constants";

function assetUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
  return img;
}

function rasterizeToCanvas(
  img: HTMLImageElement,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const scale = Math.min(width / img.naturalWidth, height / img.naturalHeight);
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  const offsetX = (width - drawW) / 2;
  const offsetY = (height - drawH) / 2;
  ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

  return canvas;
}

async function toDataUrl(url: string, size: number): Promise<string> {
  const img = await loadImage(url);
  const canvas = rasterizeToCanvas(img, size, size);
  return canvas.toDataURL("image/png");
}

/** Remove black backdrop from signature scan for crisp overlay on white cards. */
export async function signatureDataUrl(sourceUrl: string): Promise<string> {
  const img = await loadImage(sourceUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return sourceUrl;

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 48 && data[i + 1] < 48 && data[i + 2] < 48) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

export type IdCardAssetUrls = {
  nitLogoUrl: string;
  govEmblemUrl: string;
  signatureUrl: string;
};

export async function loadIdCardAssets(): Promise<IdCardAssetUrls> {
  const size = ID_CARD_LOGO_RASTER_PX;
  const [nitLogoUrl, govEmblemUrl, signatureUrl] = await Promise.all([
    toDataUrl(assetUrl("/nitjsrlogo.png"), size),
    toDataUrl(assetUrl("/Jharkhand_Rajakiya_Chihna.svg"), size),
    signatureDataUrl(assetUrl("/signature.png")),
  ]);

  return { nitLogoUrl, govEmblemUrl, signatureUrl };
}
