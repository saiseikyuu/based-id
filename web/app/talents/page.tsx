import { createServerClient, HUNTER_SKILL_LABELS, type HunterSkill } from "@/lib/supabase";
import { Nav } from "@/app/components/Nav";
import { MobileNav } from "@/app/components/MobileNav";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Talents — Based ID",
  description: "Discover verified hunters by skill, rank, and reputation.",
};

const D    = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const BODY = { fontFamily: "var(--font-sans), system-ui, sans-serif" };

const RANK_LABELS = ["E","D","C","B","A","S","N"];
const RANK_COLORS = ["#94a3b8","#a3e635","#34d399","#60a5fa","#c084fc","#f97316","#fcd34d"];
const RANK_NAMES  = ["E-Rank","D-Rank","C-Rank","B-Rank","A-Rank","S-Rank","National"];

const AVAIL_LABELS: Record<string, string> = {
  available:      "Open to work",
  open_to_offers: "Open to offers",
};
const AVAIL_COLORS: Record<string, string> = {
  available:      "bg-green-50 text-green-700 border border-green-200",
  open_to_offers: "bg-yellow-50 text-yellow-700 border border-yellow-200",
};

function shortAddr(a: string) { return `${a.slice(0,6)}…${a.slice(-4)}`; }

interface TalentCard {
  wallet_address: string;
  skills: string[];
  availability: string;
  region: string | null;
  portfolio_links: string[];
  total_xp: number;
  rank_idx: number;
  reputation_score: number;
}

function HunterCard({ hunter }: { hunter: TalentCard }) {
  const rankColor = RANK_COLORS[hunter.rank_idx];
  const hue = parseInt(hunter.wallet_address.slice(2, 6), 16) % 360;
  return (
    <Link href={`/profile/${hunter.wallet_address}`}
      className="block rounded-2xl border border-black/[0.07] bg-white p-5 hover:shadow-md transition-all hover:-translate-y-0.5"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-base"
          style={{ background: `hsl(${hue},50%,94%)`, color: `hsl(${hue},55%,40%)`, border: `1px solid hsl(${hue},50%,86%)`, ...D }}>
          {hunter.wallet_address.slice(2, 4).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-black font-bold text-sm font-mono" style={BODY}>{shortAddr(hunter.wallet_address)}</p>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
              style={{ background: `${rankColor}18`, border: `1px solid ${rankColor}40`, color: rankColor, ...D }}>
              {RANK_LABELS[hunter.rank_idx]}
            </div>
          </div>
          {AVAIL_LABELS[hunter.availability] && (
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${AVAIL_COLORS[hunter.availability]}`} style={BODY}>
              {AVAIL_LABELS[hunter.availability]}
            </span>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-black text-sm tabular-nums" style={{ ...D, color: "#0052FF" }}>{hunter.reputation_score}</p>
          <p className="text-gray-400 text-[10px]" style={BODY}>rep score</p>
        </div>
      </div>
      {hunter.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {hunter.skills.slice(0, 4).map(s => (
            <span key={s} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-medium" style={BODY}>
              {HUNTER_SKILL_LABELS[s as HunterSkill] ?? s}
            </span>
          ))}
          {hunter.skills.length > 4 && (
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 text-[10px]" style={BODY}>
              +{hunter.skills.length - 4}
            </span>
          )}
        </div>
      )}
      {hunter.region && (
        <p className="text-gray-400 text-xs mt-2" style={BODY}>📍 {hunter.region}</p>
      )}
    </Link>
  );
}

async function getTalents(params: {
  skills?: string; rank?: string; reputation?: string; region?: string; availability?: string;
}): Promise<TalentCard[]> {
  try {
    const RANK_THRESHOLDS = [0, 300, 800, 2000, 5000, 12000, 30000];
    const minRank = parseInt(params.rank ?? "0");
    const minRep  = parseInt(params.reputation ?? "0");
    const db = createServerClient();

    let q = db.from("hunter_profiles").select("*").neq("availability", "not_looking");
    if (params.availability && params.availability !== "all") q = q.eq("availability", params.availability);
    if (params.region) q = q.ilike("region", `%${params.region}%`);
    if (params.skills) {
      const skills = params.skills.split(",").map(s => s.trim()).filter(Boolean);
      if (skills.length) q = q.overlaps("skills", skills);
    }

    const { data: profiles } = await q.order("updated_at", { ascending: false }).limit(100);
    if (!profiles?.length) return [];

    const wallets = profiles.map((p: { wallet_address: string }) => p.wallet_address);
    const { data: xpRows } = await db
      .from("hunter_xp").select("wallet_address, total_xp, reputation_score")
      .in("wallet_address", wallets);

    const xpMap = Object.fromEntries((xpRows ?? []).map((r: { wallet_address: string; total_xp: number; reputation_score: number }) => [r.wallet_address, r]));

    return profiles
      .map((p: { wallet_address: string; skills: string[]; availability: string; region: string | null; portfolio_links: string[] }) => {
        const xp = xpMap[p.wallet_address];
        let rankIdx = 0;
        if (xp) for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) { if (xp.total_xp >= RANK_THRESHOLDS[i]) { rankIdx = i; break; } }
        return { ...p, total_xp: xp?.total_xp ?? 0, rank_idx: rankIdx, reputation_score: xp?.reputation_score ?? 0 };
      })
      .filter((p: TalentCard) => p.rank_idx >= minRank && p.reputation_score >= minRep)
      .sort((a: TalentCard, b: TalentCard) => b.reputation_score - a.reputation_score);
  } catch { return []; }
}

export default async function TalentsPage({
  searchParams,
}: {
  searchParams: Promise<{ skills?: string; rank?: string; reputation?: string; region?: string; availability?: string }>;
}) {
  const params  = await searchParams;
  const talents = await getTalents(params);
  const activeFilters = Object.values(params).filter(Boolean).length;
  const SKILL_OPTIONS = Object.entries(HUNTER_SKILL_LABELS);
  const RANK_OPTIONS  = RANK_NAMES.map((name, i) => ({ value: String(i), label: `${RANK_LABELS[i]} — ${name}` }));
  const activeSkills  = params.skills ? params.skills.split(",").filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <MobileNav />

      <div className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="space-y-3 max-w-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/30" style={D}>Phase 3</p>
            <h1 className="font-black text-6xl sm:text-7xl uppercase tracking-tight leading-none" style={D}>Talents</h1>
            <p className="text-white/50 text-base" style={BODY}>
              Discover verified Base hunters by skill, rank, and reputation score.
            </p>
          </div>
          <div className="mt-4">
            <div className="inline-flex bg-white/[0.06] rounded-xl px-4 py-2">
              <p className="font-bold text-white text-sm" style={D}>{talents.length} hunters available</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">

          {/* Filters */}
          <aside className="space-y-6">
            <form method="GET" className="space-y-5">

              <div className="space-y-2">
                <label className="text-black text-xs font-bold uppercase tracking-wider" style={D}>Availability</label>
                <div className="space-y-1.5">
                  {[
                    { value: "all",            label: "All open hunters"  },
                    { value: "available",      label: "Open to work"      },
                    { value: "open_to_offers", label: "Open to offers"    },
                  ].map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="availability" value={value}
                        defaultChecked={params.availability === value || (!params.availability && value === "all")}
                        className="accent-black" />
                      <span className="text-gray-600 text-sm" style={BODY}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-black text-xs font-bold uppercase tracking-wider" style={D}>Skills</label>
                <div className="flex flex-wrap gap-1.5">
                  {SKILL_OPTIONS.map(([value, label]) => {
                    const active = activeSkills.includes(value);
                    const newSkills = active
                      ? activeSkills.filter(s => s !== value).join(",")
                      : [...activeSkills, value].join(",");
                    const href = `/talents?${new URLSearchParams({ ...params, skills: newSkills })}`;
                    return (
                      <Link key={value} href={href}
                        className={`px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all ${
                          active ? "border-black bg-black text-white" : "border-black/[0.1] text-gray-500 hover:border-black/30"
                        }`} style={BODY}>
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-black text-xs font-bold uppercase tracking-wider" style={D}>Min Rank</label>
                <select name="rank" defaultValue={params.rank ?? "0"}
                  className="w-full border border-black/[0.1] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black/30 bg-white" style={BODY}>
                  {RANK_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-black text-xs font-bold uppercase tracking-wider" style={D}>Min Rep Score</label>
                <input type="number" name="reputation" defaultValue={params.reputation ?? "0"}
                  min="0" max="1000" step="50"
                  className="w-full border border-black/[0.1] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black/30" style={BODY} />
              </div>

              <div className="space-y-2">
                <label className="text-black text-xs font-bold uppercase tracking-wider" style={D}>Region</label>
                <input type="text" name="region" defaultValue={params.region ?? ""}
                  placeholder="e.g. Philippines"
                  className="w-full border border-black/[0.1] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-black/30 placeholder-gray-300" style={BODY} />
              </div>

              <div className="flex gap-2">
                <button type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-black text-white text-sm font-bold hover:bg-zinc-800 transition-colors" style={BODY}>
                  Apply
                </button>
                {activeFilters > 0 && (
                  <Link href="/talents"
                    className="px-4 py-2.5 rounded-xl border border-black/[0.1] text-gray-400 text-sm hover:text-black hover:border-black/20 transition-colors" style={BODY}>
                    Clear
                  </Link>
                )}
              </div>
            </form>
          </aside>

          {/* Results */}
          <main className="space-y-4">
            <h2 className="font-black text-xl text-black" style={D}>
              {talents.length > 0 ? `${talents.length} hunter${talents.length !== 1 ? "s" : ""}` : "No hunters found"}
              {activeFilters > 0 && <span className="text-gray-300 font-medium text-base ml-2">with filters</span>}
            </h2>

            {talents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {talents.map(hunter => <HunterCard key={hunter.wallet_address} hunter={hunter} />)}
              </div>
            ) : (
              <div className="rounded-2xl border border-black/[0.07] bg-gray-50 px-8 py-16 text-center space-y-3">
                <p className="font-black text-xl text-black" style={D}>No hunters match these filters</p>
                <p className="text-gray-400 text-sm" style={BODY}>Try widening your search or clearing filters.</p>
                <Link href="/talents"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white text-sm font-bold hover:bg-zinc-800 transition-colors" style={BODY}>
                  Clear all filters
                </Link>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
