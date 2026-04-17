import { ImageResponse } from "next/og";

export const alt = "Based ID — Your Permanent Number on Base";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#060818",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top accent */}
        <div style={{ width: "100%", height: 4, background: "#2563eb" }} />

        {/* Main content */}
        <div style={{ display: "flex", flex: 1, padding: "80px 100px" }}>

          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>

            {/* Logo row */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 72 }}>
              <div style={{ width: 22, height: 22, background: "#2563eb", borderRadius: 5 }} />
              <span style={{ color: "#e2e8f0", fontSize: 20, fontWeight: 700, letterSpacing: "0.08em" }}>
                Based ID
              </span>
            </div>

            {/* Headline */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "#f1f5f9", fontSize: 74, fontWeight: 900, lineHeight: "1.0" }}>
                Your permanent
              </span>
              <span style={{ color: "#3b82f6", fontSize: 74, fontWeight: 900, lineHeight: "1.1" }}>
                number on Base.
              </span>
            </div>

            {/* Subline */}
            <div style={{ marginTop: 28, color: "#475569", fontSize: 22 }}>
              The lower your ID, the earlier you were. $2 USDC flat.
            </div>

            {/* Bottom badges */}
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: "auto" }}>
              <div style={{
                background: "#0f1f4a",
                borderRadius: 20,
                padding: "8px 20px",
                color: "#93c5fd",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.12em",
              }}>
                BASE
              </div>
              <span style={{ color: "#334155", fontSize: 14 }}>basedid.xyz</span>
            </div>
          </div>

          {/* Right — large number */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 380,
            color: "#1d4ed8",
            fontSize: 220,
            fontWeight: 900,
          }}>
            #1
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
