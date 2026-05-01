import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div style={{
        width: "1200px", height: "630px",
        background: "linear-gradient(135deg, #060608 0%, #0d0d14 50%, #060608 100%)",
        display: "flex", flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Subtle grid overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(0,82,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,82,255,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />

        {/* Blue glow top-left */}
        <div style={{
          position: "absolute", top: "-100px", left: "-100px",
          width: "500px", height: "500px",
          background: "radial-gradient(circle, rgba(0,82,255,0.15) 0%, transparent 70%)",
          borderRadius: "50%",
        }} />

        {/* Blue accent bar top */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #0052FF, #60a5fa, #0052FF)" }} />

        {/* Main content — centered */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: "32px", position: "relative" }}>

          {/* Icon ring */}
          <div style={{
            width: "100px", height: "100px", borderRadius: "50%",
            background: "rgba(0,82,255,0.12)",
            border: "2px solid rgba(0,82,255,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "52px",
          }}>
            🔥
          </div>

          {/* Title */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <div style={{ fontSize: "64px", fontWeight: 900, color: "#ffffff", lineHeight: 1, letterSpacing: "-1px" }}>
              Daily Check-In
            </div>
            <div style={{ fontSize: "22px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.05em" }}>
              Based ID Hunters
            </div>
          </div>

          {/* Reward pills */}
          <div style={{ display: "flex", gap: "16px" }}>
            {[
              { label: "+5 XP",   sub: "base reward"      },
              { label: "+20 XP",  sub: "7-day streak"     },
              { label: "+75 XP",  sub: "30-day streak"    },
            ].map(({ label, sub }) => (
              <div key={label} style={{
                padding: "14px 28px", borderRadius: "16px",
                background: "rgba(0,82,255,0.12)",
                border: "1px solid rgba(0,82,255,0.25)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
              }}>
                <div style={{ fontSize: "24px", fontWeight: 900, color: "#60a5fa" }}>{label}</div>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* CTA button look */}
          <div style={{
            padding: "18px 48px", borderRadius: "48px",
            background: "#0052FF",
            boxShadow: "0 0 40px rgba(0,82,255,0.4)",
            fontSize: "20px", fontWeight: 700, color: "#ffffff",
            letterSpacing: "0.02em",
          }}>
            Check In on Based ID →
          </div>
        </div>

        {/* Footer */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "20px 48px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            basedid.space
          </div>
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.2)" }}>
            Built on Base ⬡
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
