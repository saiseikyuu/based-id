import { ImageResponse } from "next/og";
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

const TYPE_LABELS: Record<string, string> = {
  quest:            "Quest",
  raffle:           "Raffle",
  whitelist:        "Whitelist",
  nft_mint:         "NFT Mint",
  token_drop:       "Token Drop",
  bounty:           "Bounty",
  creator_campaign: "Creator",
};

function timeLeft(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  return d > 0 ? `${d}d left` : `${h}h left`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = createServerClient();

  const [{ data: campaign }, { count: entryCount }] = await Promise.all([
    db.from("campaigns")
      .select("title, description, type, tier, xp_reward, winner_count, ends_at, status, image_url")
      .eq("id", id).single(),
    db.from("entries")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", id).eq("status", "entered"),
  ]);

  if (!campaign) {
    return new ImageResponse(
      <div style={{ width: "1200px", height: "630px", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "white", fontSize: "32px" }}>Campaign not found</div>
      </div>,
      { width: 1200, height: 630 }
    );
  }

  const isFeatured  = campaign.tier === "featured";
  const accentColor = isFeatured ? "#fbbf24" : "#0052FF";
  const typeLabel   = TYPE_LABELS[campaign.type] ?? campaign.type;

  return new ImageResponse(
    (
      <div style={{
        width: "1200px", height: "630px",
        background: "#080808",
        display: "flex",
        fontFamily: "system-ui, sans-serif",
        position: "relative",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: accentColor }} />

        <div style={{ flex: 1, padding: "60px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div style={{
                padding: "6px 16px", borderRadius: "20px",
                background: `${accentColor}20`, border: `1px solid ${accentColor}50`,
                fontSize: "13px", fontWeight: 700, color: accentColor,
                letterSpacing: "0.1em", textTransform: "uppercase",
              }}>
                {typeLabel}
              </div>
              {isFeatured && (
                <div style={{
                  padding: "6px 16px", borderRadius: "20px",
                  background: "#fbbf2420", border: "1px solid #fbbf2450",
                  fontSize: "13px", fontWeight: 700, color: "#fbbf24",
                }}>
                  ⭐ Featured
                </div>
              )}
            </div>

            <div style={{ fontSize: "52px", fontWeight: 900, color: "#ffffff", lineHeight: 1.1, maxWidth: "620px" }}>
              {campaign.title}
            </div>

            {campaign.description && (
              <div style={{ fontSize: "20px", color: "rgba(255,255,255,0.4)", maxWidth: "560px", lineHeight: 1.4 }}>
                {campaign.description.slice(0, 100)}{campaign.description.length > 100 ? "…" : ""}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "40px" }}>
            {[
              { label: "Entries",   value: (entryCount ?? 0).toLocaleString() },
              { label: "XP Reward", value: campaign.xp_reward > 0 ? `${campaign.xp_reward} XP` : "—" },
              { label: "Time",      value: campaign.status === "active" ? timeLeft(campaign.ends_at) : campaign.status },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: "32px", fontWeight: 900, color: accentColor }}>{value}</div>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.15em", marginTop: "4px" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {campaign.image_url && (
          <div style={{ width: "360px", display: "flex", alignItems: "stretch" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={campaign.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}

        <div style={{ position: "absolute", bottom: "20px", left: "60px", fontSize: "14px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
          BASEDID.SPACE
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
