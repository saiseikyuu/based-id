import { createServerClient } from "@/lib/supabase";
import { Nav } from "@/app/components/Nav";
import { MobileNav } from "@/app/components/MobileNav";
import Link from "next/link";
import type { Metadata } from "next";
import { ProfileSection } from "./ProfileSection";
import { BadgesSection } from "./BadgesSection";
import { SquadCard } from "./SquadCard";

export const revalidate = 60;

const D    = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const BODY = { fontFamily: "var(--font-sans), system-ui, sans-serif" };

const RANK_THRESHOLDS = [0, 300, 800, 2000, 5000, 12000, 30000];
const RANK_LABELS     = ["E", "D", "C", "B", "A", "S", "N"];
const RANK_COLORS     = ["#94a3b8","#a3e635","#34d399","#60a5fa","#c084fc","#f97316","#fcd34d"];
const RANK_NAMES      = ["E-Rank","D-Rank","C-Rank","B-Rank","A-Rank","S-Rank","National"];

function getRank(xp: number): number {
  let rank = 0;
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= RANK_THRESHOLDS[i]) { rank = i; break; }
  }
  return rank;
}

function shortAddress(a: string) { return `${a.slice(0, 6)}…${a.slice(-4)}`; }
function addressToHue(a: string)  { return parseInt(a.slice(2, 6), 16) % 360; }

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; style: React.CSSProperties }> = {
    entered:      { label: "Entered",      style: { background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" } },
    won:          { label: "Won",          style: { background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" } },
    lost:         { label: "Lost",         style: { background: "#f9fafb", color: "#9ca3af", border: "1px solid #e5e7eb" } },
    disqualified: { label: "Disqualified", style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" } },
  };
  const c = map[status] ?? map.lost;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide" style={{ ...BODY, ...c.style }}>
      {c.label}
    </span>
  );
}

function TypePill({ type }: { type: string }) {
  const map: Record<string, string> = { whitelist: "WL", raffle: "Raffle", token_drop: "Token", nft_mint: "NFT", quest: "Quest" };
  return <span className="text-gray-400 text-[10px] uppercase tracking-widest" style={BODY}>{map[type] ?? type}</span>;
}

function XpBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-xs" style={BODY}>{label}</span>
        <span className="text-black font-bold text-xs tabular-nums" style={BODY}>{value.toLocaleString()} XP</span>
      </div>
      <div className="bg-black/[0.06] rounded-full h-1.5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ address: string }> }): Promise<Metadata> {
  const { address } = await params;
  return {
    title: `${shortAddress(address)} — Based ID Hunter`,
    description: `Hunter profile for ${address} on Based ID.`,
  };
}

export default async function HunterProfilePage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const db = createServerClient();

  const [{ data: xpData }, { data: entries }, { data: hunterProfile }, { data: rawBadges }] = await Promise.all([
    db.from("hunter_xp").select("*").eq("wallet_address", address.toLowerCase()).single(),
    db.from("entries")
      .select("id, status, created_at, campaign_id, campaigns(title, type, status, ends_at)")
      .eq("wallet_address", address.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(10),
    db.from("hunter_profiles").select("*").eq("wallet_address", address.toLowerCase()).single(),
    db.from("hunter_badges").select("*, badge:badges(*)").eq("wallet_address", address.toLowerCase()).order("earned_at", { ascending: false }),
  ]);

  const xp        = xpData?.total_xp      ?? 0;
  const entriesXp = xpData?.entries_xp    ?? 0;
  const winsXp    = xpData?.wins_xp       ?? 0;
  const checkinXp = xpData?.checkin_xp    ?? 0;
  const questXp   = xpData?.quest_xp      ?? 0;
  const streak    = xpData?.checkin_streak ?? 0;

  const rank          = getRank(xp);
  const rankColor     = RANK_COLORS[rank];
  const rankLabel     = RANK_LABELS[rank];
  const rankName      = RANK_NAMES[rank];
  const nextRank      = rank < RANK_THRESHOLDS.length - 1 ? rank + 1 : rank;
  const nextThreshold = RANK_THRESHOLDS[nextRank];
  const prevThreshold = RANK_THRESHOLDS[rank];
  const xpProgress    = rank === RANK_THRESHOLDS.length - 1
    ? 100 : ((xp - prevThreshold) / (nextThreshold - prevThreshold)) * 100;

  const totalCampaigns = entries?.length ?? 0;
  const wins           = entries?.filter(e => e.status === "won").length ?? 0;
  const hue            = addressToHue(address);
  const hasActivity    = xp > 0 || totalCampaigns > 0;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Nav active="/profile" />
      <MobileNav />

      {/* ── Black hero (consistent with other pages) ── */}
      <div className="bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">

            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl flex-shrink-0 flex items-center justify-center font-black text-2xl"
              style={{ background: `hsl(${hue}, 55%, 18%)`, border: `2px solid hsl(${hue}, 55%, 30%)`, color: `hsl(${hue}, 70%, 70%)`, ...D }}>
              {address.slice(2, 4).toUpperCase()}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-white font-bold text-xl font-mono tracking-wide" style={BODY}>
                  {shortAddress(address)}
                </h1>
                <a href={`https://basescan.org/address/${address}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-gray-600 text-xs hover:text-gray-400 transition-colors" style={BODY}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                  Basescan
                </a>
              </div>
              <p className="text-gray-600 text-xs font-mono break-all" style={BODY}>{address.toLowerCase()}</p>

              {/* Share rank card */}
              <a
                href={`/api/frame/rank/${address}?xp=${xp}&s=${streak}&rep=${xpData?.reputation_score ?? 0}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors mt-1"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", ...BODY }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
                Share rank card
              </a>

              {/* XP bar */}
              <div className="mt-3 space-y-1.5 max-w-sm">
                <div className="flex items-center justify-between text-xs" style={BODY}>
                  <span className="text-gray-400">{xp.toLocaleString()} XP</span>
                  {rank < RANK_THRESHOLDS.length - 1
                    ? <span className="text-gray-600">{nextThreshold.toLocaleString()} XP to {RANK_NAMES[nextRank]}</span>
                    : <span className="font-bold" style={{ color: rankColor }}>Max Rank</span>}
                </div>
                <div className="bg-white/[0.08] rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(2, xpProgress)}%`, background: rankColor, boxShadow: `0 0 6px ${rankColor}60` }} />
                </div>
              </div>
            </div>

            {/* Rank badge */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-black"
                style={{ ...D, background: `${rankColor}18`, border: `2px solid ${rankColor}40`, color: rankColor }}>
                {rankLabel}
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ ...BODY, color: rankColor }}>
                {rankName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 pb-28 space-y-6">

        {/* Stats row — white cards with shadows (like reference 1 card style) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: xp,             label: "Total XP",    color: "#0052FF" },
            { value: totalCampaigns, label: "Campaigns",   color: "#111111" },
            { value: wins,           label: "Wins",        color: "#16a34a" },
            { value: streak,         label: "Day Streak",  color: "#ea580c" },
          ].map(({ value, label, color }) => (
            <div key={label} className="bg-white rounded-2xl p-5 text-center"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}>
              <p className="font-black text-3xl leading-none tabular-nums" style={{ ...D, color }}>
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>
              <p className="text-gray-400 text-[10px] uppercase tracking-widest mt-2" style={BODY}>{label}</p>
            </div>
          ))}
        </div>

        {/* XP Breakdown + Campaign History */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* XP Breakdown */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 space-y-5"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}>
            <div>
              <p className="text-black font-bold text-sm" style={D}>XP Breakdown</p>
              <p className="text-gray-400 text-xs mt-0.5" style={BODY}>Sources of your hunter XP</p>
            </div>
            {xp > 0 ? (
              <div className="space-y-4">
                <XpBar label="Campaign entries"  value={entriesXp} max={Math.max(xp,1)} color="#0052FF" />
                <XpBar label="Campaign wins"     value={winsXp}    max={Math.max(xp,1)} color="#16a34a" />
                <XpBar label="Daily check-ins"   value={checkinXp} max={Math.max(xp,1)} color="#ea580c" />
                <XpBar label="Quests"            value={questXp}   max={Math.max(xp,1)} color="#7c3aed" />
                <div className="pt-2 border-t border-black/[0.06] grid grid-cols-2 gap-2 text-[10px]" style={BODY}>
                  {[
                    { label: "Entries",   xp: entriesXp, color: "#0052FF" },
                    { label: "Wins",      xp: winsXp,    color: "#16a34a" },
                    { label: "Check-ins", xp: checkinXp, color: "#ea580c" },
                    { label: "Quests",    xp: questXp,   color: "#7c3aed" },
                  ].map(({ label, xp: v, color }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="text-gray-400">{label}</span>
                      <span className="text-black font-bold ml-auto tabular-nums">{v.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 space-y-2 text-center">
                <div className="w-10 h-10 rounded-full bg-gray-100 border border-black/[0.06] flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <p className="text-gray-400 text-xs" style={BODY}>No XP earned yet</p>
              </div>
            )}
          </div>

          {/* Campaign History */}
          <div className="lg:col-span-3 bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}>
            <div className="px-6 py-5 border-b border-black/[0.06]">
              <p className="text-black font-bold text-sm" style={D}>Campaign History</p>
              <p className="text-gray-400 text-xs mt-0.5" style={BODY}>Recent campaign activity</p>
            </div>
            {entries && entries.length > 0 ? (
              <div>
                {entries.map((entry, i) => {
                  const campaign = Array.isArray(entry.campaigns) ? entry.campaigns[0] : entry.campaigns;
                  const title    = campaign?.title ?? "Unknown Campaign";
                  const type     = campaign?.type  ?? "raffle";
                  const isLast   = i === entries.length - 1;
                  return (
                    <div key={entry.id}
                      className={`flex items-center justify-between px-6 py-4 hover:bg-black/[0.02] transition-colors ${!isLast ? "border-b border-black/[0.05]" : ""}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                          background: entry.status === "won" ? "#16a34a" : entry.status === "entered" ? "#0052FF" : entry.status === "disqualified" ? "#dc2626" : "#d1d5db",
                        }} />
                        <div className="min-w-0">
                          <p className="text-black text-sm font-medium truncate" style={BODY}>{title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <TypePill type={type} />
                            <span className="text-gray-300 text-[10px]" style={BODY}>
                              {new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-3">
                        <StatusBadge status={entry.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-black/[0.07] flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                </div>
                <div className="space-y-1">
                  <p className="text-black text-sm font-semibold" style={BODY}>No campaigns yet</p>
                  <p className="text-gray-400 text-xs" style={BODY}>Enter campaigns to earn XP and build your hunter record.</p>
                </div>
                <Link href="/campaigns" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
                  style={{ background: "#111", color: "#fff" }}>
                  Browse Campaigns →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Hunter Profile + Badges + Squad */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Hunter Profile (skills, availability, region) */}
          <div className="lg:col-span-1">
            <ProfileSection address={address} initialProfile={hunterProfile ?? null} />
          </div>

          {/* Badges */}
          <BadgesSection address={address} initialBadges={(rawBadges ?? []) as Parameters<typeof BadgesSection>[0]["initialBadges"]} />

          {/* Squad */}
          <SquadCard address={address} />
        </div>

        {/* Rank up CTA */}
        {rank < RANK_THRESHOLDS.length - 1 && (
          <div className="rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between bg-black text-white">
            <div className="space-y-1">
              <p className="font-bold text-base" style={D}>
                {nextThreshold - xp > 0
                  ? `${(nextThreshold - xp).toLocaleString()} XP to ${RANK_NAMES[nextRank]}`
                  : `Eligible for ${RANK_NAMES[nextRank]}`}
              </p>
              <p className="text-gray-400 text-xs" style={BODY}>
                Enter campaigns, complete daily check-ins, and finish quests to rank up.
              </p>
            </div>
            <Link href="/campaigns" className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-white text-black hover:bg-gray-100 transition-colors" style={BODY}>
              Find campaigns →
            </Link>
          </div>
        )}

        {/* Zero state */}
        {!hasActivity && (
          <div className="rounded-2xl px-8 py-14 text-center space-y-4 bg-gray-50 border border-black/[0.07]">
            <div className="w-14 h-14 rounded-2xl bg-white border border-black/[0.08] flex items-center justify-center mx-auto"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0052FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-black font-bold text-base" style={BODY}>No hunter activity yet</p>
              <p className="text-gray-500 text-sm" style={BODY}>This wallet hasn&apos;t participated in any campaigns or earned XP.</p>
            </div>
            <Link href="/campaigns" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-colors"
              style={{ background: "#111", color: "#fff" }}>
              Start Hunting →
            </Link>
          </div>
        )}
      </div>

      <footer className="border-t border-black/[0.07] px-6 py-5 bg-white">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 111 111" fill="none" className="opacity-40">
              <path d="M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6 85.359 0 54.921 0C26.0 0 2.0 22.0 0 50.354H72.943V59.68H0C2.0 88.0 26.0 110.034 54.921 110.034Z" fill="#0052FF"/>
            </svg>
            <span className="text-gray-400 text-[11px]" style={BODY}>Built on Base · 2026</span>
          </div>
          <div className="flex items-center gap-5 text-[11px] text-gray-400" style={BODY}>
            <Link href="/hunters" className="hover:text-black transition-colors">Hunters</Link>
            <Link href="/campaigns" className="hover:text-black transition-colors">Campaigns</Link>
            <Link href="/leaderboard" className="hover:text-black transition-colors">Leaderboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
