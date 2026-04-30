"use client";

import { useEffect, useState } from "react";
import type { HunterBadge, Badge } from "@/lib/supabase";

const D    = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const BODY = { fontFamily: "var(--font-sans), system-ui, sans-serif" };

const BADGE_ICONS: Record<string, string> = {
  campaign_count: "⚡",
  streak_days:    "🔥",
  rank_reached:   "⭐",
  squad_role:     "🛡️",
  bounty_count:   "🏆",
};

type BadgeWithDetail = HunterBadge & { badge: Badge };

export function BadgesSection({
  address,
  initialBadges,
}: {
  address: string;
  initialBadges: BadgeWithDetail[];
}) {
  const [badges, setBadges] = useState<BadgeWithDetail[]>(initialBadges);

  useEffect(() => {
    fetch("/api/hunters/badges/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet_address: address }),
    })
      .then(r => r.json())
      .then(async (data: { earned?: string[] }) => {
        if (data.earned?.length) {
          const res = await fetch(`/api/hunters/badges?wallet=${address}`);
          if (res.ok) setBadges(await res.json());
        }
      })
      .catch(() => {});
  }, [address]);

  if (!badges.length) {
    return (
      <div className="bg-white rounded-2xl p-6 space-y-4"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}>
        <p className="text-black font-bold text-sm" style={D}>Badges</p>
        <div className="flex flex-col items-center justify-center py-8 space-y-2 text-center">
          <div className="w-10 h-10 rounded-full bg-gray-100 border border-black/[0.06] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
            </svg>
          </div>
          <p className="text-gray-400 text-xs" style={BODY}>No badges yet</p>
          <p className="text-gray-300 text-xs" style={BODY}>Complete campaigns and streaks to earn badges</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 space-y-4"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}>
      <p className="text-black font-bold text-sm" style={D}>
        Badges <span className="text-gray-400 font-medium">{badges.length}</span>
      </p>
      <div className="grid grid-cols-2 gap-2">
        {badges.map(hb => (
          <div key={hb.id} className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-black/[0.05]">
            <span className="text-xl flex-shrink-0">{BADGE_ICONS[hb.badge.criteria_type] ?? "🎖️"}</span>
            <div className="min-w-0">
              <p className="text-black text-xs font-bold truncate" style={BODY}>{hb.badge.name}</p>
              <p className="text-gray-400 text-[10px] truncate" style={BODY}>
                {new Date(hb.earned_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
