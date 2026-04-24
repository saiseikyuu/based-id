import { ImageResponse } from "next/og";

export const alt = "Based ID — The base of Airdrops on Base";
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
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 64 }}>
              <div style={{ width: 22, height: 22, background: "#2563eb", borderRadius: 5 }} />
              <span style={{ color: "#e2e8f0", fontSize: 20, fontWeight: 700, letterSpacing: "0.08em" }}>
                Based ID
              </span>
            </div>

            {/* Headline */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "#f1f5f9", fontSize: 82, fontWeight: 900, lineHeight: "1.0" }}>
                The base of
              </span>
              <span style={{ color: "#3b82f6", fontSize: 82, fontWeight: 900, lineHeight: "1.1" }}>
                Airdrops.
              </span>
            </div>

            {/* Subline */}
            <div style={{ marginTop: 24, color: "#94a3b8", fontSize: 24, lineHeight: 1.35, maxWidth: 600 }}>
              Every Base opportunity — airdrops, NFT drops, whitelists, raffles. One ID. $2.
            </div>

            {/* Bottom badges */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: "auto" }}>
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
              <div style={{
                background: "#172554",
                borderRadius: 20,
                padding: "8px 20px",
                color: "#60a5fa",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.08em",
              }}>
                LIVE
              </div>
              <span style={{ color: "#334155", fontSize: 14 }}>basedid.space</span>
            </div>
          </div>

          {/* Right — icon stack */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            justifyContent: "center",
            width: 340,
            gap: 16,
          }}>
            {[
              { label: "Airdrops", color: "#3b82f6" },
              { label: "NFT Drops", color: "#60a5fa" },
              { label: "Whitelists", color: "#93c5fd" },
              { label: "Raffles", color: "#bfdbfe" },
            ].map((x) => (
              <div key={x.label} style={{
                background: "#0a1330",
                border: "1px solid #1e3a8a",
                borderRadius: 14,
                padding: "14px 28px",
                color: x.color,
                fontSize: 28,
                fontWeight: 700,
              }}>
                {x.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
