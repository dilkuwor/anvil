import { ImageResponse } from "next/og";

import { BRAND, MARK_LETTER, MARK_LOWER_CLIP, MARK_RADIUS, MARK_SIZE, MARK_UPPER_CLIP } from "@/lib/brand";

export const alt = "Anvil — Build Skills. Break Limits. Ace the Interview.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #1a1a21 0%, #0b0b0f 100%)",
          padding: "64px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* Satori rasterises inline <svg> subtrees, gradients included. */}
          <svg width={84} height={84} viewBox={`0 0 ${MARK_SIZE} ${MARK_SIZE}`}>
            <defs>
              <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={BRAND.tileTop} />
                <stop offset="1" stopColor={BRAND.tileBottom} />
              </linearGradient>
              <radialGradient id="glow" cx="0.5" cy="0.45" r="0.6">
                <stop offset="0" stopColor={BRAND.orange} stopOpacity="0.36" />
                <stop offset="0.5" stopColor={BRAND.orange} stopOpacity="0.08" />
                <stop offset="1" stopColor={BRAND.orange} stopOpacity="0" />
              </radialGradient>
              <linearGradient id="top" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={BRAND.cream} />
                <stop offset="0.45" stopColor={BRAND.orangePale} />
                <stop offset="1" stopColor={BRAND.orangeLight} />
              </linearGradient>
              <linearGradient id="bottom" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={BRAND.orangeLight} />
                <stop offset="0.6" stopColor={BRAND.orange} />
                <stop offset="1" stopColor={BRAND.orangeDark} />
              </linearGradient>
              <clipPath id="upper">
                <polygon points={MARK_UPPER_CLIP} />
              </clipPath>
              <clipPath id="lower">
                <polygon points={MARK_LOWER_CLIP} />
              </clipPath>
            </defs>
            <rect width={MARK_SIZE} height={MARK_SIZE} rx={MARK_RADIUS} fill="url(#bg)" stroke="#2c2c36" strokeWidth={6} />
            <rect width={MARK_SIZE} height={MARK_SIZE} rx={MARK_RADIUS} fill="url(#glow)" />
            <g clipPath="url(#upper)">
              <path fill="url(#top)" d={MARK_LETTER} />
            </g>
            <g clipPath="url(#lower)">
              <path fill="url(#bottom)" d={MARK_LETTER} />
            </g>
          </svg>
          <div style={{ color: "#f4f4f6", fontSize: 40, fontWeight: 700, letterSpacing: -0.5 }}>Anvil</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ color: "#f4f4f6", fontSize: 64, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5 }}>
            Build skills. Break limits.
          </div>
          <div style={{ color: BRAND.orange, fontSize: 48, fontWeight: 600, lineHeight: 1.15 }}>Ace the interview.</div>
        </div>
        <div style={{ color: "#a1a1aa", fontSize: 24, display: "flex" }}>
          Coding · System design · AI/ML · Mock interviews
        </div>
      </div>
    ),
    { ...size },
  );
}
