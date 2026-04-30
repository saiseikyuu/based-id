"use client";

import Link from "next/link";
import type { Campaign } from "@/lib/supabase";

const D = { fontFamily: "var(--font-display), system-ui, sans-serif" };

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  quest:      { label: "Quest",      color: "#16a34a", bg: "#dcfce7" },
  raffle:     { label: "Raffle",     color: "#7c3aed", bg: "#ede9fe" },
  whitelist:  { label: "Whitelist",  color: "#2563eb", bg: "#dbeafe" },
  token_drop: { label: "Token Drop", color: "#d97706", bg: "#fef3c7" },
  nft_mint:   { label: "NFT Mint",   color: "#db2777", bg: "#fce7f3" },
};

function timeLeft(endsAt: string): { label: string; urgent: boolean; ended: boolean } {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return { label: "Ended", urgent: false, ended: true };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const d = Math.floor(h / 24);
  const s = Math.floor((diff % 60000) / 1000);
  if (d > 0) return { label: `${d}d ${h % 24}h ${m}m`, urgent: false, ended: false };
  if (h >= 1) return { label: `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`, urgent: h < 6, ended: false };
  return { label: `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`, urgent: true, ended: false };
}

export function CampaignCard({ campaign, featured = false }: { campaign: Campaign; featured?: boolean }) {
  const type    = TYPE_CONFIG[campaign.type] ?? { label: campaign.type, color: "#6b7280", bg: "#f3f4f6" };
  const time    = timeLeft(campaign.ends_at);
  const xp      = (campaign as Campaign & { xp_reward?: number }).xp_reward;
  const isQuest = campaign.type === "quest";
  const entries = campaign.entry_count ?? 0;

  return (
    <Link href={`/campaigns/${campaign.id}`} className="group block h-full">
      <div className="h-full flex flex-col bg-white rounded-2xl overflow-hidden transition-all duration-300"
        style={{
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)",
        }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.12)")}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)")}>

        {/* ── Top row: avatar + name + type badge ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.05]">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Project avatar circle */}
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white flex-shrink-0 bg-gray-100"
              style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.08)" }}>
              {campaign.project?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={campaign.project.logo_url} alt={campaign.project.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <span className="text-gray-600 font-black text-xs" style={D}>
                    {(campaign.project?.name ?? campaign.title).slice(0, 1).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <span className="text-gray-800 text-sm font-semibold truncate">
              {campaign.project?.name ?? "—"}
            </span>
          </div>

          {/* Type badge */}
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
            style={{ color: type.color, background: type.bg }}>
            {type.label}
          </span>
        </div>

        {/* ── Image ── */}
        <div className="relative aspect-square overflow-hidden bg-gray-50 flex-shrink-0">
          {campaign.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={campaign.image_url}
              alt={campaign.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${type.bg} 0%, #f9fafb 100%)` }}>
              <span className="font-black text-8xl select-none" style={{ ...D, color: type.color, opacity: 0.25 }}>
                {campaign.title.slice(0, 1).toUpperCase()}
              </span>
            </div>
          )}

          {/* Timer pill — top left (like reference) */}
          {!time.ended && (
            <span className="absolute top-3 left-3 text-white text-[11px] font-bold px-2.5 py-1 rounded-full font-mono"
              style={{
                background: time.urgent ? "rgba(220,38,38,0.85)" : "rgba(0,0,0,0.65)",
                backdropFilter: "blur(8px)",
              }}>
              {time.label}
            </span>
          )}

          {/* XP badge — top right */}
          {xp && xp > 0 && (
            <span className="absolute top-3 right-3 text-white text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: "#0052FF" }}>
              +{xp} XP
            </span>
          )}

          {/* Featured badge */}
          {featured && (
            <span className="absolute bottom-3 left-3 text-black text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-full"
              style={{ background: "#f59e0b" }}>
              Featured
            </span>
          )}
        </div>

        {/* ── Body ── */}
        <div className="p-4 flex flex-col gap-3 flex-1">
          {/* Title */}
          <div className="flex-1">
            <h3 className="text-gray-900 font-bold text-[15px] leading-snug line-clamp-2">
              {campaign.title}
            </h3>
            {time.ended && (
              <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">Ended</span>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-[12px] text-gray-400">
            {!isQuest && campaign.winner_count > 0 && (
              <span>{campaign.winner_count} winner{campaign.winner_count !== 1 ? "s" : ""}</span>
            )}
            {isQuest && <span>Quest — earn XP</span>}
            {entries > 0 && (
              <span className="ml-auto">{entries.toLocaleString()} {isQuest ? "completions" : "entries"}</span>
            )}
          </div>

          {/* CTA button — dark, like "Place Bid" in reference */}
          <button
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-200"
            style={
              time.ended
                ? { background: "#f3f4f6", color: "#9ca3af", cursor: "default" }
                : { background: "#111111", color: "#ffffff" }
            }>
            {time.ended ? "Ended" : isQuest ? "Start Quest →" : "Enter →"}
          </button>
        </div>
      </div>
    </Link>
  );
}
