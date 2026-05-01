import { ImageResponse } from "next/og";

export const runtime = "edge";

const RANK_THRESHOLDS = [0, 300, 800, 2000, 5000, 12000, 30000];
const RANK_LABELS     = ["E", "D", "C", "B", "A", "S", "N"];
const RANK_NAMES      = ["E-Rank", "D-Rank", "C-Rank", "B-Rank", "A-Rank", "S-Rank", "National"];
const RANK_COLORS     = ["#94a3b8","#a3e635","#34d399","#60a5fa","#c084fc","#f97316","#fcd34d"];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ wallet: string }> }
) {
  const { wallet } = await params;
  const url = new URL(req.url);
  const short = wallet.slice(0, 6) + "..." + wallet.slice(-4);

  const totalXp  = Number(url.searchParams.get("xp")  || "0");
  const streak   = Number(url.searchParams.get("s")    || "0");
  const repScore = Number(url.searchParams.get("rep")  || "0");

  // Pre-compute everything — avoid method calls and template literals inside JSX
  let rankIdx = 0;
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= RANK_THRESHOLDS[i]) { rankIdx = i; break; }
  }

  const rankColor    = RANK_COLORS[rankIdx];
  const rankLabel    = RANK_LABELS[rankIdx];
  const rankName     = RANK_NAMES[rankIdx];
  const nextXp       = rankIdx < RANK_THRESHOLDS.length - 1 ? RANK_THRESHOLDS[rankIdx + 1] : 0;
  const nextRankName = rankIdx < RANK_NAMES.length - 1 ? RANK_NAMES[rankIdx + 1] : "";
  const prevXp       = RANK_THRESHOLDS[rankIdx];
  const hasNext      = nextXp > 0;
  const xpToNext     = hasNext ? nextXp - totalXp : 0;
  const progressPct  = hasNext ? Math.max(2, Math.round(((totalXp - prevXp) / (nextXp - prevXp)) * 100)) : 100;
  const progressW    = progressPct + "%";

  const xpStr    = totalXp.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const toNextStr = xpToNext.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const streakStr = streak + "d";
  const repStr    = repScore.toString();

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
      {/* Top bar */}
      <div style={{ position: "absolute", top: "0px", left: "0px", right: "0px", height: "4px", background: rankColor }} />

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "40px" }}>
        <div style={{ fontSize: "13px", fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>
          Based ID Hunters
        </div>
        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>
          {short}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", alignItems: "center", gap: "60px" }}>

        {/* Rank badge */}
        <div style={{
          width: "160px",
          height: "160px",
          borderRadius: "20px",
          background: rankColor + "22",
          border: "3px solid " + rankColor + "44",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <div style={{ fontSize: "88px", fontWeight: 900, color: rankColor, lineHeight: "1" }}>
            {rankLabel}
          </div>
        </div>

        {/* Stats column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "760px" }}>

          {/* Title */}
          <div>
            <div style={{ fontSize: "52px", fontWeight: 900, color: "#ffffff", lineHeight: "1" }}>
              {rankName} Hunter
            </div>
            <div style={{ fontSize: "20px", color: "rgba(255,255,255,0.35)", marginTop: "10px" }}>
              {xpStr} XP total
            </div>
          </div>

          {/* Progress bar */}
          {hasNext && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>
                <div>{rankName}</div>
                <div>{toNextStr} XP to {nextRankName}</div>
              </div>
              <div style={{ height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.08)", display: "flex", overflow: "hidden" }}>
                <div style={{ width: progressW, height: "8px", background: rankColor, borderRadius: "4px" }} />
              </div>
            </div>
          )}

          {/* Mini stats */}
          <div style={{ display: "flex", gap: "32px" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "28px", fontWeight: 900, color: rankColor }}>{streakStr}</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.15em" }}>Streak</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "28px", fontWeight: 900, color: rankColor }}>{repStr}</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.15em" }}>Rep Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: "absolute",
        bottom: "24px",
        left: "60px",
        right: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: "20px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.15)", letterSpacing: "0.1em" }}>BASEDID.SPACE</div>
        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.15)" }}>Base Network</div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
