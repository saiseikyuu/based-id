import { ImageResponse } from "next/og";
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

const TYPE_LABELS: Record<string, string> = {
  whitelist: "Whitelist", raffle: "Raffle", token_drop: "Token Drop", nft_mint: "NFT Mint",
};

function timeLeft(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Fetch drop + entry count
  const db = createServerClient();
  const [dropRes, countRes] = await Promise.all([
    db.from("drops").select("title, description, type, tier, winner_count, ends_at, status, image_url").eq("id", id).single(),
    db.from("entries").select("*", { count: "exact", head: true }).eq("drop_id", id).eq("status", "entered"),
  ]);

  const drop = dropRes.data;
  if (!drop) {
    return new ImageResponse(
      <div style={{ width: 1200, height: 630, background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#52525b", fontSize: 32, fontWeight: 700 }}>Drop not found</span>
      </div>,
      { width: 1200, height: 630 }
    );
  }

  const entryCount = countRes.count ?? 0;
  const typeLabel  = TYPE_LABELS[drop.type] ?? drop.type;
  const isDrawn    = drop.status === "drawn";
  const timeStr    = isDrawn ? "Drawn" : timeLeft(drop.ends_at);
  const featured   = drop.tier === "featured";

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, background: "#080808", display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif" }}>
        {/* Top bar */}
        <div style={{ width: "100%", height: 3, background: featured ? "#f59e0b" : "#2563eb" }} />

        <div style={{ display: "flex", flex: 1, padding: "56px 80px", gap: 64 }}>

          {/* Left — text */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 0 }}>

            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
              <div style={{ width: 20, height: 20, background: "#2563eb", borderRadius: 5 }} />
              <span style={{ color: "#71717a", fontSize: 16, fontWeight: 600, letterSpacing: "0.06em" }}>Based ID Drops</span>
            </div>

            {/* Type badge */}
            <div style={{ display: "flex", marginBottom: 20 }}>
              <div style={{
                background: "#1e3a8a22",
                border: "1px solid #1e40af44",
                borderRadius: 20,
                padding: "6px 16px",
                color: "#93c5fd",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}>
                {typeLabel}
              </div>
              {featured && (
                <div style={{
                  background: "#78350f22",
                  border: "1px solid #92400e44",
                  borderRadius: 20,
                  padding: "6px 16px",
                  color: "#fcd34d",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginLeft: 10,
                }}>
                  Featured
                </div>
              )}
            </div>

            {/* Title */}
            <span style={{
              color: "#fafafa",
              fontSize: drop.title.length > 30 ? 52 : 68,
              fontWeight: 900,
              lineHeight: 1.05,
              marginBottom: 20,
            }}>
              {drop.title}
            </span>

            {/* Description */}
            {drop.description && (
              <span style={{ color: "#71717a", fontSize: 22, lineHeight: 1.4, maxWidth: 580 }}>
                {drop.description.length > 100 ? drop.description.slice(0, 100) + "…" : drop.description}
              </span>
            )}

            {/* Stats row */}
            <div style={{ display: "flex", gap: 32, marginTop: "auto" }}>
              {[
                { label: "Entries",  value: entryCount.toLocaleString(), color: "#fafafa" },
                { label: "Winners",  value: drop.winner_count.toString(),  color: "#4ade80" },
                { label: isDrawn ? "Status" : "Time left", value: timeStr, color: isDrawn ? "#60a5fa" : "#fafafa" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ color, fontSize: 30, fontWeight: 800 }}>{value}</span>
                  <span style={{ color: "#52525b", fontSize: 13, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — drop image or placeholder */}
          <div style={{
            width: 380,
            aspectRatio: "1",
            borderRadius: 24,
            overflow: "hidden",
            flexShrink: 0,
            background: "#111",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid #1a1a1a",
          }}>
            {drop.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={drop.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ color: "#27272a", fontSize: 120, fontWeight: 900 }}>
                {drop.title.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 80px 24px" }}>
          <span style={{ color: "#27272a", fontSize: 14 }}>basedid.space</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
