import { useId } from "react";

import {
  ANVIL_BODY,
  ANVIL_FACE_SHADOW,
  ANVIL_SHEEN,
  BRAND,
  MARK_RADIUS,
  MARK_SIZE,
  SPARK,
  SPARK_DOTS,
} from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * The Anvil logo as inline SVG, so it stays crisp at any size and DPR and
 * costs no image request. Geometry lives in `@/lib/brand`.
 */
export function AnvilMark({
  variant = "tile",
  className,
  title = "Anvil",
}: {
  /** `tile` is the dark rounded app icon; `glyph` is the bare anvil on transparent. */
  variant?: "tile" | "glyph";
  className?: string;
  /** Accessible name; pass an empty string when the mark is purely decorative. */
  title?: string;
}) {
  // Gradient ids must be unique per instance: the header and footer both render one.
  const uid = useId();
  const id = (name: string) => `anvil-${name}-${uid}`;
  const tile = variant === "tile";

  return (
    <svg
      viewBox={`0 0 ${MARK_SIZE} ${MARK_SIZE}`}
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      className={cn("block", className)}
    >
      <defs>
        <linearGradient id={id("bg")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={BRAND.tileTop} />
          <stop offset="1" stopColor={BRAND.tileBottom} />
        </linearGradient>
        <radialGradient id={id("glow")} cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor={BRAND.orange} stopOpacity="0.36" />
          <stop offset="0.5" stopColor={BRAND.orange} stopOpacity="0.08" />
          <stop offset="1" stopColor={BRAND.orange} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("iron")} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor={BRAND.orangePale} />
          <stop offset="0.4" stopColor={BRAND.orangeLight} />
          <stop offset="1" stopColor={BRAND.orangeDeep} />
        </linearGradient>
        <linearGradient id={id("sheen")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {tile ? (
        <>
          <rect width={MARK_SIZE} height={MARK_SIZE} rx={MARK_RADIUS} fill={`url(#${id("bg")})`} />
          <rect width={MARK_SIZE} height={MARK_SIZE} rx={MARK_RADIUS} fill={`url(#${id("glow")})`} />
        </>
      ) : null}

      <path fill={`url(#${id("iron")})`} d={ANVIL_BODY} />
      <path fill="#000" opacity="0.16" d={ANVIL_FACE_SHADOW} />
      <path fill={`url(#${id("sheen")})`} d={ANVIL_SHEEN} />
      <path fill={tile ? BRAND.spark : BRAND.orange} d={SPARK} />
      {tile
        ? SPARK_DOTS.map((dot) => (
            <circle key={`${dot.cx}-${dot.cy}`} cx={dot.cx} cy={dot.cy} r={dot.r} fill={BRAND.sparkDim} opacity={dot.opacity} />
          ))
        : null}
    </svg>
  );
}
