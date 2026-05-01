import { ImageResponse } from "next/og";

export const runtime = "edge";

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
  req: Request,
  { params }: { params: Promise<{ wallet: string }> }
) {
  const { wallet } = await params;
  const short = `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;

  let totalXp = 0, streak = 0, repScore = 0;

  try {
    const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

    const res = await fetch(
      `${supabaseUrl}/rest/v1/hunter_xp?wallet_address=eq.${wallet.toLowerCase()}&select=total_xp,checkin_streak,reputation_score&limit=1`,
      { headers: { apikey: supabaseAnon, Authorization: `Bearer ${supabaseAnon}` } }
    );

    if (res.ok) {
      const rows = await res.json() as Array<{ total_xp: number; checkin_streak: number; reputation_score: number }>;
      if (rows?.[0]) {
        totalXp  = rows[0].total_xp ?? 0;
        streak   = rows[0].checkin_streak ?? 0;
        repScore = rows[0].reputation_score ?? 0;
      }
    }
  } catch (_e) {
    // fallback to defaults
  }

  const rankIdx   = getRankIdx(totalXp);
  const rankColor = RANK_COLORS[rankIdx];
  const rankLabel = RANK_LABELS[rankIdx];
  const rankName  = RANK_NAMES[rankIdx];
  const nextXp    = RANK_THRESHOLDS[rankIdx + 1] ?? null;
  const prevXp    = RANK_THRESHOLDS[rankIdx];
  const progress  = nextXp ? Math.max(2, Math.round(((totalXp - prevXp) / (nextXp - prevXp)) * 100)) : 100;

  return new ImageResponse(
    <div
      style={{
        width: "1200px",
        height: "630px",
        background: "#080808",
        display: "flex",
        flexDirection: "column",
        padding: "60px",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
      }}
    >
      {/* Top accent bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: rankColor }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "40px" }}>
        <div style={{ fontSize: "13px", fontWeight: 800, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>
          Based ID Hunters
        </div>
        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>{short}</div>
      </div>

      {/* Main content */}
      <div style={{ display: "flex", alignItems: "center", gap: "60px", flex: 1 }}>

        {/* Rank badge */}
        <div style={{
          width: "160px",
          height: "160px",
          borderRadius: "20px",
          background: `${rankColor}18`,
          border: `3px solid ${rankColor}40`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <div style={{ fontSize: "88px", fontWeight: 900, color: rankColor, lineHeight: "1" }}>{rankLabel}</div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1 }}>
          <div>
            <div style={{ fontSize: "48px", fontWeight: 900, color: "#ffffff", lineHeight: "1" }}>{rankName} Hunter</div>
            <div style={{ fontSize: "18px", color: "rgba(255,255,255,0.35)", marginTop: "8px" }}>
              {totalXp.toLocaleString()} XP total
            </div>
          </div>

          {nextXp && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>
                <div>{rankName}</div>
                <div>{(nextXp - totalXp).toLocaleString()} XP to {RANK_NAMES[rankIdx + 1]}</div>
              </div>
              <div style={{ height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.08)", display: "flex", overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, background: rankColor, borderRadius: "4px" }} />
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "32px" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "28px", fontWeight: 900, color: rankColor }}>{streak}d</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.15em" }}>Streak</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "28px", fontWeight: 900, color: rankColor }}>{repScore}</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.15em" }}>Rep Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "32px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.15)", letterSpacing: "0.1em" }}>BASEDID.SPACE</div>
        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.15)" }}>Base Network</div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
