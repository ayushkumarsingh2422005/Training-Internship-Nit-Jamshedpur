/** ISO/IEC 7810 ID-1 (CR80) — portrait orientation for vertical cards. */
export const ID_CARD_WIDTH_MM = 53.98;
export const ID_CARD_HEIGHT_MM = 85.6;

export const ID_CARD_PDF_DPI = 300;

export function mmToPx(mm: number, dpi = ID_CARD_PDF_DPI): number {
  return Math.round((mm * dpi) / 25.4);
}

export const A4_PORTRAIT = {
  widthMm: 210,
  heightMm: 297,
  widthPx: mmToPx(210),
  heightPx: mmToPx(297),
} as const;

export const ID_CARD_PX = {
  width: mmToPx(ID_CARD_WIDTH_MM),
  height: mmToPx(ID_CARD_HEIGHT_MM),
} as const;

/** High-res raster size for logos embedded in the card. */
export const ID_CARD_LOGO_RASTER_PX = 512;
