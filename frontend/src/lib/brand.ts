/**
 * Anvil brand mark: a single source of truth for the logo geometry and palette.
 *
 * Everything is drawn on a 512×512 canvas. The React `AnvilMark` component, the
 * Open Graph image and `scripts/build-logo.mts` (which emits the SVG/PNG files in
 * `public/` and `src/app/`) all read from here, so a tweak to the shape lands
 * everywhere at once. After editing, run `node scripts/build-logo.mts`.
 */

export const MARK_SIZE = 512;

/** Corner radius of the app-icon tile (≈22%, matching iOS/Android squircles). */
export const MARK_RADIUS = 114;

export const BRAND = {
  orange: "#f97316",
  orangeLight: "#fb923c",
  orangeDeep: "#ea580c",
  orangePale: "#fdba74",
  spark: "#fef3c7",
  sparkDim: "#fde68a",
  tileTop: "#22222b",
  tileBottom: "#0b0b0f",
} as const;

/** The anvil silhouette: horn on the left, polished face, waist, flared foot. */
export const ANVIL_BODY =
  "M176 172 L444 172 Q454 172 454 182 L454 236 Q454 246 444 246 L384 246 L370 318 " +
  "L428 336 Q440 340 440 352 L440 390 Q440 400 430 400 L106 400 Q96 400 96 390 " +
  "L96 352 Q96 340 108 336 L166 318 L152 246 Q96 246 40 224 Q100 190 176 172 Z";

/** A thin shadow under the face so the waist reads as set back from it. */
export const ANVIL_FACE_SHADOW = "M152 246 L384 246 L380 262 L156 262 Z";

/** Highlight across the top face and down the horn: the "polished steel" sheen. */
export const ANVIL_SHEEN =
  "M176 172 L444 172 Q454 172 454 182 L454 202 L158 202 Q118 196 76 214 Q110 186 176 172 Z";

/** Four-point spark thrown off the face by the hammer strike. */
export const SPARK = "M404 62 Q409 100 446 104 Q409 108 404 146 Q399 108 362 104 Q399 100 404 62 Z";

export const SPARK_DOTS = [
  { cx: 350, cy: 78, r: 6, opacity: 1 },
  { cx: 458, cy: 60, r: 4, opacity: 0.8 },
] as const;

export type MarkVariant =
  /** Rounded dark tile with the anvil: favicon, nav, JSON-LD logo. */
  | "tile"
  /** Same artwork on a square tile; iOS and Android apply their own mask. */
  | "square"
  /** Square tile with the artwork shrunk into the maskable-icon safe zone. */
  | "maskable"
  /** Just the anvil on a transparent background. */
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
  const dots = SPARK_DOTS.map(
    (d) => `<circle cx="${d.cx}" cy="${d.cy}" r="${d.r}" fill="${BRAND.sparkDim}" opacity="${d.opacity}"/>`,
  ).join("");
  const sparkFill = variant === "glyph" ? BRAND.orange : BRAND.spark;

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
    `<linearGradient id="iron" x1="0.1" y1="0" x2="0.9" y2="1">` +
    `<stop offset="0" stop-color="${BRAND.orangePale}"/>` +
    `<stop offset="0.4" stop-color="${BRAND.orangeLight}"/>` +
    `<stop offset="1" stop-color="${BRAND.orangeDeep}"/>` +
    `</linearGradient>` +
    `<linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#ffffff" stop-opacity="0.6"/>` +
    `<stop offset="1" stop-color="#ffffff" stop-opacity="0"/>` +
    `</linearGradient>` +
    `</defs>` +
    tile +
    `<g transform="translate(${offset} ${offset}) scale(${scale})">` +
    `<path fill="url(#iron)" d="${ANVIL_BODY}"/>` +
    `<path fill="#000" opacity="0.16" d="${ANVIL_FACE_SHADOW}"/>` +
    `<path fill="url(#sheen)" d="${ANVIL_SHEEN}"/>` +
    `<path fill="${sparkFill}" d="${SPARK}"/>` +
    (variant === "glyph" ? "" : dots) +
    `</g>` +
    `</svg>`
  );
}
