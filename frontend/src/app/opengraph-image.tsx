import { ImageResponse } from "next/og";

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
          background: "#18181b",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: "#f97316",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          Anvil
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ color: "#f0f0f2", fontSize: 64, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5 }}>
            Build skills. Break limits.
          </div>
          <div style={{ color: "#f97316", fontSize: 48, fontWeight: 600, lineHeight: 1.15 }}>Ace the interview.</div>
        </div>
        <div style={{ color: "#a1a1aa", fontSize: 24, display: "flex" }}>
          Coding · System design · AI/ML · Mock interviews
        </div>
      </div>
    ),
    { ...size },
  );
}
