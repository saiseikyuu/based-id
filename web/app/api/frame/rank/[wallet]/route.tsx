import { ImageResponse } from "next/og";
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

const RANK_THRESHOLDS = [0, 300, 800, 2000, 5000, 12000, 30000];
const RANK_LABELS     = ["E", "D", "C", "B", "A", "S", "N"];
const RANK_NAMES      = ["E-Rank", "D-Rank", "C-Rank", "B-Rank", "A-Rank", "S-Rank", "National"];
const RANK_COLORS     = ["#94a3b8","#a3e635","#34d399","#60a5fa","#c084fc","#f97316","#fcd34d"];

function getRankIdx(xp: number): number {
  let r = 0;
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= RANK_THRESHOLDS[i]) { r = i; break; }
  }
  return r;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ wallet: string }> }
) {
  const { wallet } = await params;

  const db = createServerClient();
  const { data: xpRow } = await db
    .from("hunter_xp")
    .select("total_xp, checkin_streak, reputation_score")
    .eq("wallet_address", wallet.toLowerCase())
    .single();

  const totalXp   = xpRow?.total_xp ?? 0;
  const streak    = xpRow?.checkin_streak ?? 0;
  const repScore  = xpRow?.reputation_score ?? 0;
  const rankIdx   = getRankIdx(totalXp);
  const rankColor = RANK_COLORS[rankIdx];
  const rankLabel = RANK_LABELS[rankIdx];
  const rankName  = RANK_NAMES[rankIdx];
  const nextXp    = RANK_THRESHOLDS[rankIdx + 1] ?? null;
  const prevXp    = RANK_THRESHOLDS[rankIdx];
  const progress  = nextXp ? Math.round(((totalXp - prevXp) / (nextXp - prevXp)) * 100) : 100;
  const short     = `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;

  return new ImageResponse(
    (
      <div style={{
        width: "1200px", height: "630px",
        background: "#080808",
        display: "flex", flexDirection: "column",
        padding: "60px",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: rankColor }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "40px" }}>
          <div style={{ fontSize: "14px", fontWeight: 800, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>
            Based ID Hunters
          </div>
          <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>{short}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "60px", flex: 1 }}>
          <div style={{
            width: "180px", height: "180px", borderRadius: "24px",
            background: `${rankColor}18`,
            border: `3px solid ${rankColor}50`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <div style={{ fontSize: "96px", fontWeight: 900, color: rankColor }}>{rankLabel}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1 }}>
            <div>
              <div style={{ fontSize: "48px", fontWeight: 900, color: "#ffffff", lineHeight: 1 }}>{rankName} Hunter</div>
              <div style={{ fontSize: "18px", color: "rgba(255,255,255,0.4)", marginTop: "8px" }}>
                {totalXp.toLocaleString()} XP total
              </div>
            </div>

            {nextXp && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "rgba(255,255,255,0.4)" }}>
                  <span>{RANK_NAMES[rankIdx]}</span>
                  <span>{(nextXp - totalXp).toLocaleString()} XP to {RANK_NAMES[rankIdx + 1]}</span>
                </div>
                <div style={{ height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.1)", overflow: "hidden", display: "flex" }}>
                  <div style={{ width: `${Math.max(2, progress)}%`, background: rankColor, borderRadius: "4px" }} />
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "32px" }}>
              {[
                { label: "Streak",    value: `${streak}d`  },
                { label: "Rep Score", value: String(repScore) },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: "28px", fontWeight: 900, color: rankColor }}>{value}</div>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.15em" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "32px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>BASEDID.SPACE</div>
          <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.2)" }}>Base Network</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
