import { ImageResponse } from "next/og";
import { createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";
import { BASED_ID_ADDRESS, BASED_ID_ABI } from "@/lib/contracts";
import { renderNftCardSvg } from "@/lib/nftCardSvg";

export const runtime = "nodejs";

const chain = process.env.NEXT_PUBLIC_CHAIN_ID === "8453" ? base : baseSepolia;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const idParam = searchParams.get("id");
  const tokenId = idParam ? parseInt(idParam) : null;

  const client = createPublicClient({ chain, transport: http() });

  let totalMinted = 0;
  let holder = "";

  try {
    totalMinted = Number(
      await client.readContract({
        address: BASED_ID_ADDRESS,
        abi: BASED_ID_ABI,
        functionName: "totalMinted",
      })
    );
    if (tokenId) {
      holder = (await client.readContract({
        address: BASED_ID_ADDRESS,
        abi: BASED_ID_ABI,
        functionName: "ownerOf",
        args: [BigInt(tokenId)],
      })) as string;
    }
  } catch {}

  // ── Specific ID: embed the real NftCard SVG ──
  if (tokenId) {
    const svgMarkup = renderNftCardSvg(`#${tokenId}`, holder || "not minted yet");
    const svgDataUri = `data:image/svg+xml;base64,${Buffer.from(svgMarkup).toString("base64")}`;

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "1200px",
            height: "630px",
            background: "#060818",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={svgDataUri}
            alt=""
            style={{ height: "580px", borderRadius: "16px" }}
          />
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  // ── Generic stats view ──
  const accent = "#3b82f6";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "linear-gradient(135deg,#060818 0%,#080d22 60%,#0a1030 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "60px 80px",
          fontFamily: "monospace",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: accent, opacity: 0.7 }} />
        <div style={{
          position: "absolute", top: "-80px", right: "-80px",
          width: "500px", height: "500px", borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
        }} />

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" }}>
          <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#22c55e" }} />
          <span style={{ color: "#4ade80", fontSize: "13px", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Live on Base
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: "72px", fontWeight: "900", color: "#f1f5f9", lineHeight: 1.05, marginBottom: "28px" }}>
            <span>One ID.</span>
            <span>Your entire Base.</span>
          </div>
          <div style={{ display: "flex", color: "#64748b", fontSize: "20px", marginBottom: "48px", letterSpacing: "0.02em" }}>
            $2 USDC flat · Permanent · Onchain
          </div>
          <div style={{ display: "flex", gap: "48px" }}>
            {[
              { val: totalMinted.toLocaleString(), label: "Minted", color: accent },
              { val: "$2", label: "USDC flat", color: "#f1f5f9" },
              { val: "1B", label: "$BASED supply", color: accent },
            ].map(({ val, label, color }) => (
              <div key={label} style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "42px", fontWeight: "900", color }}>{val}</span>
                <span style={{ fontSize: "11px", color: "#1e3a5f", letterSpacing: "0.18em", textTransform: "uppercase", marginTop: "6px" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", position: "absolute", bottom: "40px", right: "80px", color: "#1e3a5f", fontSize: "13px", letterSpacing: "0.1em" }}>
          basedid.space
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", background: accent, opacity: 0.15 }} />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
