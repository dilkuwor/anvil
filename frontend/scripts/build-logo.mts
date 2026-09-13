/**
 * Emit the logo assets from the geometry in `src/lib/brand.ts`.
 *
 *   node scripts/build-logo.mts
 *
 * Writes:
 *   public/anvil-logo.svg                 rounded tile (favicon, JSON-LD logo)
 *   public/anvil-logo-512.png             rounded tile, PNG fallback + PWA "any"
 *   public/anvil-logo-maskable-512.png    square, art inside the safe zone (PWA maskable)
 *   src/app/icon.png                      Next.js file-convention favicon
 *   src/app/apple-icon.png                square: iOS applies its own corner mask
 *
 * The outputs are committed; the Docker build never runs this.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { anvilMarkSvg, type MarkVariant } from "../src/lib/brand.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const outputs: { path: string; variant: MarkVariant; png: boolean }[] = [
  { path: "public/anvil-logo.svg", variant: "tile", png: false },
  { path: "public/anvil-logo-512.png", variant: "tile", png: true },
  { path: "public/anvil-logo-maskable-512.png", variant: "maskable", png: true },
  { path: "src/app/icon.png", variant: "tile", png: true },
  { path: "src/app/apple-icon.png", variant: "square", png: true },
];

for (const { path, variant, png } of outputs) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  const svg = anvilMarkSvg(variant);
  if (png) {
    await sharp(Buffer.from(svg)).resize(512, 512).png({ compressionLevel: 9 }).toFile(target);
  } else {
    await writeFile(target, `${svg}\n`);
  }
  console.log(`wrote ${path}`);
}
