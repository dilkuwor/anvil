import { useId } from "react";

import { BRAND, MARK_LETTER, MARK_LOWER_CLIP, MARK_RADIUS, MARK_SIZE, MARK_UPPER_CLIP } from "@/lib/brand";
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
  /** `tile` is the dark rounded app icon; `glyph` is the bare A on transparent. */
  variant?: "tile" | "glyph";
  className?: string;
  /** Accessible name; pass an empty string when the mark is purely decorative. */
  title?: string;
}) {
  // Gradient and clip ids must be unique per instance: the header and footer both render one.
  const uid = useId();
  const id = (name: string) => `anvil-${name}-${uid}`;

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
        <linearGradient id={id("top")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={BRAND.cream} />
          <stop offset="0.45" stopColor={BRAND.orangePale} />
          <stop offset="1" stopColor={BRAND.orangeLight} />
        </linearGradient>
        <linearGradient id={id("bottom")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={BRAND.orangeLight} />
          <stop offset="0.6" stopColor={BRAND.orange} />
          <stop offset="1" stopColor={BRAND.orangeDark} />
        </linearGradient>
        <clipPath id={id("upper")}>
          <polygon points={MARK_UPPER_CLIP} />
        </clipPath>
        <clipPath id={id("lower")}>
          <polygon points={MARK_LOWER_CLIP} />
        </clipPath>
      </defs>

      {variant === "tile" ? (
        <>
          <rect width={MARK_SIZE} height={MARK_SIZE} rx={MARK_RADIUS} fill={`url(#${id("bg")})`} />
          <rect width={MARK_SIZE} height={MARK_SIZE} rx={MARK_RADIUS} fill={`url(#${id("glow")})`} />
        </>
      ) : null}

      <g clipPath={`url(#${id("upper")})`}>
        <path fill={`url(#${id("top")})`} d={MARK_LETTER} />
      </g>
      <g clipPath={`url(#${id("lower")})`}>
        <path fill={`url(#${id("bottom")})`} d={MARK_LETTER} />
      </g>
    </svg>
  );
}
