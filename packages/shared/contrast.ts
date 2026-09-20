/**
 * WCAG 2.1 relative luminance and contrast ratio.
 * Author CKC. Version 1.0.
 *
 * docs/DESIGN.md section 2 states every pairing was computed with this
 * formula on 2026-09-18. This is that formula, so the numbers in the document
 * can be checked by arithmetic instead of by eye. CLAUDE.md section 7, the
 * light theme accent was never viable as text and was caught by ratio, not by
 * looking at it.
 *
 * Reference: WCAG 2.1 Understanding SC 1.4.3, relative luminance definition.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */

/** Body text threshold. */
export const RATIO_BODY = 4.5;

/** Large text and non-text UI threshold. */
export const RATIO_LARGE = 3;

/** Parses #RRGGBB into 0 to 255 channels. Throws on anything else. */
export function parseHex(hex: string): { r: number; g: number; b: number } {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (match === null || match[1] === undefined) {
    throw new Error(`Not a six digit hex color: ${hex}`);
  }
  const value = Number.parseInt(match[1], 16);
  return {
    r: (value >> 16) & 0xff,
    g: (value >> 8) & 0xff,
    b: value & 0xff,
  };
}

/** Linearises one 0 to 255 channel per the WCAG definition. */
function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Relative luminance, 0 for black and 1 for white. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** Contrast ratio between two colors, 1 to 21, order independent. */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Contrast ratio rounded the way docs/DESIGN.md records it, two decimals. */
export function contrastRatioRounded(foreground: string, background: string): number {
  return Math.round(contrastRatio(foreground, background) * 100) / 100;
}
