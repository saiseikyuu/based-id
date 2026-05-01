import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div style={{
        width: "1200px", height: "630px",
        background: "#080808",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
        gap: "24px",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "#0052FF" }} />

        <div style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>
          Based ID Hunters
        </div>

        <div style={{ fontSize: "72px", lineHeight: 1 }}>🔥</div>

        <div style={{ fontSize: "56px", fontWeight: 900, color: "#ffffff", textAlign: "center", lineHeight: 1.1 }}>
          Daily Check-In
        </div>

        <div style={{ fontSize: "22px", color: "rgba(255,255,255,0.4)", textAlign: "center", maxWidth: "700px" }}>
          Check in every day to build your streak and earn XP. +5 XP base, +20 XP on 7-day streaks.
        </div>

        <div style={{
          marginTop: "16px",
          padding: "16px 40px",
          borderRadius: "48px",
          background: "#0052FF",
          fontSize: "22px",
          fontWeight: 700,
          color: "#ffffff",
        }}>
          Check In on Based ID →
        </div>

        <div style={{ position: "absolute", bottom: "24px", fontSize: "14px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
          BASEDID.SPACE
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
