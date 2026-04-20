import { ImageResponse } from "next/og";
import { createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";
import { BASED_ID_ADDRESS, BASED_ID_ABI, isAuctionId } from "@/lib/contracts";

export const runtime = "nodejs";

const chain = process.env.NEXT_PUBLIC_CHAIN_ID === "8453" ? base : baseSepolia;

function getTier(id: number) {
  if (id <= 100) return "GENESIS";
  if (id <= 1000) return "FOUNDING";
  if (id <= 10000) return "PIONEER";
  return "BUILDER";
}

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

  const isAuction = tokenId ? isAuctionId(tokenId) : false;
  const accent = isAuction ? "#f59e0b" : "#3b82f6";
  const numColor = isAuction ? "#fde68a" : "#93c5fd";

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
        {/* Top accent line */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: accent, opacity: 0.7 }} />

        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
          }}
        />

        {/* Live badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" }}>
          <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#22c55e" }} />
          <span style={{ color: "#4ade80", fontSize: "13px", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Live on Base
          </span>
        </div>

        {tokenId ? (
          /* ── Specific ID view ── */
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "110px", fontWeight: "900", color: numColor, lineHeight: 1, marginBottom: "20px", letterSpacing: "-2px" }}>
              #{tokenId}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
              <span
                style={{
                  color: accent,
                  fontSize: "20px",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  padding: "6px 14px",
                  border: `1px solid ${accent}60`,
                  borderRadius: "20px",
                }}
              >
                {getTier(tokenId)}
              </span>
              <span style={{ color: "#64748b", fontSize: "18px" }}>
                weight: {(1 / Math.sqrt(tokenId)).toFixed(4)}×
              </span>
            </div>
            {holder && (
              <div style={{ color: "#334155", fontSize: "14px", fontFamily: "monospace", marginTop: "8px" }}>
                {holder.slice(0, 10)}…{holder.slice(-6)}
              </div>
            )}
          </div>
        ) : (
          /* ── Generic stats view ── */
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "72px", fontWeight: "900", color: "#f1f5f9", lineHeight: 1.05, marginBottom: "28px" }}>
              One ID.<br />Your entire Base.
            </div>
            <div style={{ color: "#64748b", fontSize: "20px", marginBottom: "48px", letterSpacing: "0.02em" }}>
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
        )}

        {/* Bottom watermark */}
        <div style={{ position: "absolute", bottom: "40px", right: "80px", color: "#1e3a5f", fontSize: "13px", letterSpacing: "0.1em" }}>
          basedid.space
        </div>

        {/* Bottom accent */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", background: accent, opacity: 0.15 }} />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
