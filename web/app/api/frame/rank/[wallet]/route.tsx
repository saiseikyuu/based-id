import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ wallet: string }> }
) {
  const { wallet } = await params;
  const short = `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;

  return new ImageResponse(
    <div
      style={{
        width: "1200px",
        height: "630px",
        background: "#0052FF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "24px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ fontSize: "80px", fontWeight: 900, color: "#ffffff" }}>E-Rank Hunter</div>
      <div style={{ fontSize: "28px", color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>{short}</div>
      <div style={{ fontSize: "20px", color: "rgba(255,255,255,0.5)" }}>basedid.space</div>
    </div>,
    { width: 1200, height: 630 }
  );
}
