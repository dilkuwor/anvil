/**
 * Anvil brand mark: a single source of truth for the logo geometry and palette.
 *
 * The mark is a stylised letter "A": a flat-topped A with a triangular counter,
 * cut by a rising diagonal slice. The slice sits where the crossbar would be and
 * reads as one, while splitting the letter into a pale upper and a deep lower
 * half like a bar of hot steel. Everything is drawn on a 512×512 canvas. The
 * React `AnvilMark` component, the Open Graph image and `scripts/build-logo.mts`
 * (which emits the SVG/PNG files in `public/` and `src/app/`) all read from
 * here, so a tweak lands everywhere at once. After editing, run
 * `node scripts/build-logo.mts`.
 */

export const MARK_SIZE = 512;

/** Corner radius of the app-icon tile (≈22%, matching iOS/Android squircles). */
export const MARK_RADIUS = 114;

export const BRAND = {
  orange: "#f97316",
  orangeLight: "#fb923c",
  orangeDeep: "#ea580c",
  orangeDark: "#c2410c",
  orangePale: "#fdba74",
  cream: "#ffedd5",
  tileTop: "#22222b",
  tileBottom: "#0b0b0f",
} as const;

/** The whole letter: flat apex, two legs, open triangular counter. */
export const MARK_LETTER = "M230 80 L282 80 L452 432 L344 432 L256 236 L168 432 L60 432 Z";

/**
 * Clip regions either side of the slice. The slice rises ~13° left to right
 * and is 24px wide; each polygon is the half-plane inset by half that gap.
 */
export const MARK_UPPER_CLIP = "0,0 512,0 512,203 0,325";
export const MARK_LOWER_CLIP = "0,349 512,227 512,512 0,512";

export type MarkVariant =
  /** Rounded dark tile with the A: favicon, nav, JSON-LD logo. */
  | "tile"
  /** Same artwork on a square tile; iOS and Android apply their own mask. */
  | "square"
  /** Square tile with the artwork shrunk into the maskable-icon safe zone. */
  | "maskable"
  /** Just the A on a transparent background. */
  | "glyph";

/**
 * Build the standalone SVG document for a variant. Used by the asset build
 * script; the React component renders the same geometry as JSX.
 */
export function anvilMarkSvg(variant: MarkVariant = "tile"): string {
  const s = MARK_SIZE;
  const rx = variant === "tile" ? MARK_RADIUS : 0;
  // Maskable icons are cropped to a circle of 80% diameter; keep the art inside it.
  const scale = variant === "maskable" ? 0.74 : 1;
  const offset = (s - s * scale) / 2;
  const tile =
    variant === "glyph"
      ? ""
      : `<rect width="${s}" height="${s}" rx="${rx}" fill="url(#bg)"/>` +
        `<rect width="${s}" height="${s}" rx="${rx}" fill="url(#glow)"/>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" width="${s}" height="${s}">` +
    `<defs>` +
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${BRAND.tileTop}"/><stop offset="1" stop-color="${BRAND.tileBottom}"/>` +
    `</linearGradient>` +
    `<radialGradient id="glow" cx="0.5" cy="0.45" r="0.6">` +
    `<stop offset="0" stop-color="${BRAND.orange}" stop-opacity="0.36"/>` +
    `<stop offset="0.5" stop-color="${BRAND.orange}" stop-opacity="0.08"/>` +
    `<stop offset="1" stop-color="${BRAND.orange}" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<linearGradient id="top" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${BRAND.cream}"/>` +
    `<stop offset="0.45" stop-color="${BRAND.orangePale}"/>` +
    `<stop offset="1" stop-color="${BRAND.orangeLight}"/>` +
    `</linearGradient>` +
    `<linearGradient id="bottom" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${BRAND.orangeLight}"/>` +
    `<stop offset="0.6" stop-color="${BRAND.orange}"/>` +
    `<stop offset="1" stop-color="${BRAND.orangeDark}"/>` +
    `</linearGradient>` +
    `<clipPath id="upper"><polygon points="${MARK_UPPER_CLIP}"/></clipPath>` +
    `<clipPath id="lower"><polygon points="${MARK_LOWER_CLIP}"/></clipPath>` +
    `</defs>` +
    tile +
    `<g transform="translate(${offset} ${offset}) scale(${scale})">` +
    `<g clip-path="url(#upper)"><path fill="url(#top)" d="${MARK_LETTER}"/></g>` +
    `<g clip-path="url(#lower)"><path fill="url(#bottom)" d="${MARK_LETTER}"/></g>` +
    `</g>` +
    `</svg>`
  );
}
