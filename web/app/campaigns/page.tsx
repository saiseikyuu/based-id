import Link from "next/link";
import type { Metadata } from "next";
import { createServerClient, type Campaign } from "@/lib/supabase";
import { Nav } from "@/app/components/Nav";
import { MobileNav } from "@/app/components/MobileNav";
import { CampaignCard } from "./CampaignCard";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Campaigns — Based ID",
  description: "Complete quests, enter raffles, earn XP and rewards on Base.",
};

const D = { fontFamily: "var(--font-display), system-ui, sans-serif" };

const TYPE_FILTERS = [
  { key: "all",        label: "All"        },
  { key: "quest",      label: "Quest"      },
  { key: "raffle",     label: "Raffle"     },
  { key: "whitelist",  label: "Whitelist"  },
  { key: "nft_mint",   label: "NFT Mint"   },
  { key: "token_drop", label: "Token Drop" },
];

const SORT_OPTIONS = [
  { key: "ending_soon",  label: "Ending Soon"  },
  { key: "newest",       label: "Newest"       },
  { key: "most_entries", label: "Most Entries" },
];

type CampaignWithXp = Campaign & { xp_reward?: number };

function isRankGated(c: Campaign) {
  return (c.tasks ?? []).some(t => t.type === "min_hunter_rank");
}

async function getCampaigns(): Promise<CampaignWithXp[]> {
  try {
    const db = createServerClient();
    const { data: campaigns } = await db
      .from("campaigns").select("*, tasks(*)")
      .in("status", ["active", "ended", "completed"])
      .order("tier",       { ascending: false })
      .order("created_at", { ascending: false });
    if (!campaigns?.length) return [];
    const addresses = [...new Set(campaigns.map((c: Campaign) => c.partner_address))];
    const { data: projects } = await db.from("projects").select("*").in("address", addresses);
    const { data: counts } = await db
      .from("entries").select("campaign_id")
      .in("campaign_id", campaigns.map((c: Campaign) => c.id))
      .eq("status", "entered");
    const countMap: Record<string, number> = {};
    for (const row of counts ?? []) countMap[row.campaign_id] = (countMap[row.campaign_id] ?? 0) + 1;
    const pm = Object.fromEntries((projects ?? []).map(p => [p.address, p]));
    return campaigns.map((c: Campaign) => ({
      ...c,
      project: pm[c.partner_address] ?? null,
      entry_count: countMap[c.id] ?? 0,
    })) as CampaignWithXp[];
  } catch { return []; }
}

function sortCampaigns(list: CampaignWithXp[], sort: string): CampaignWithXp[] {
  if (sort === "ending_soon") return [...list].sort((a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime());
  if (sort === "most_entries") return [...list].sort((a, b) => (b.entry_count ?? 0) - (a.entry_count ?? 0));
  return list;
}

function timeLeftStr(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h % 24}h left`;
  if (h >= 1) return `${h}h ${m}m left`;
  return `${m}m left`;
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; rank?: string; sort?: string }>;
}) {
  const { type, rank, sort } = await searchParams;
  const activeType = TYPE_FILTERS.find(f => f.key === type)?.key ?? "all";
  const activeRank = rank === "gated" ? "gated" : "all";
  const activeSort = SORT_OPTIONS.find(f => f.key === sort)?.key ?? "ending_soon";

  const allCampaigns = await getCampaigns();

  let filtered = activeType === "all" ? allCampaigns : allCampaigns.filter(c => c.type === activeType);
  if (activeRank === "gated") filtered = filtered.filter(isRankGated);

  const active = filtered.filter(c => c.status === "active");
  const ended  = filtered.filter(c => c.status !== "active");

  const heroCandidate = allCampaigns.find(c => c.tier === "featured" && c.status === "active");
  const featuredHero  = activeType === "all" && activeRank === "all" ? heroCandidate : undefined;

  const featuredCards = active.filter(c => c.tier === "featured" && c.id !== featuredHero?.id);
  const standard      = active.filter(c => c.tier !== "featured");

  const sortedFeatured = sortCampaigns(featuredCards, activeSort);
  const sortedStandard = sortCampaigns(standard, activeSort);
  const sortedEnded    = sortCampaigns(ended, activeSort);

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { type: activeType, rank: activeRank, sort: activeSort, ...overrides };
    if (merged.type && merged.type !== "all")  params.set("type", merged.type);
    if (merged.rank && merged.rank !== "all")  params.set("rank", merged.rank);
    if (merged.sort && merged.sort !== "ending_soon") params.set("sort", merged.sort);
    const qs = params.toString();
    return `/campaigns${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Nav active="/campaigns" />
      <MobileNav />

      {/* ── Featured Hero (black section — like "Live Auctions" reference) ── */}
      {featuredHero && (
        <section className="bg-black text-white">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <Link href={`/campaigns/${featuredHero.id}`} className="group block">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-8 items-center">
                {/* Left — text */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    {featuredHero.project?.logo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={featuredHero.project.logo_url} alt="" className="w-10 h-10 rounded-full border-2 border-white/20" />
                    )}
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-widest" style={D}>Featured Campaign</p>
                      <p className="text-white text-sm font-semibold">{featuredHero.project?.name ?? ""}</p>
                    </div>
                  </div>

                  <h2 className="text-white font-black text-3xl sm:text-4xl lg:text-5xl leading-tight" style={D}>
                    {featuredHero.title}
                  </h2>

                  <div className="flex items-center gap-3 flex-wrap">
                    {(featuredHero as CampaignWithXp).xp_reward && (featuredHero as CampaignWithXp).xp_reward! > 0 && (
                      <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: "#0052FF", color: "#fff" }}>
                        +{(featuredHero as CampaignWithXp).xp_reward} XP
                      </span>
                    )}
                    <span className="text-xs text-gray-400 font-mono">{timeLeftStr(featuredHero.ends_at)}</span>
                    {(featuredHero.entry_count ?? 0) > 0 && (
                      <span className="text-xs text-gray-500">{(featuredHero.entry_count ?? 0).toLocaleString()} entries</span>
                    )}
                  </div>

                  <div>
                    <span className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-black text-sm font-bold group-hover:bg-gray-100 transition-colors">
                      {featuredHero.type === "quest" ? "Start Quest →" : "Enter Campaign →"}
                    </span>
                  </div>
                </div>

                {/* Right — image */}
                {featuredHero.image_url && (
                  <div className="aspect-square rounded-2xl overflow-hidden relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={featuredHero.image_url} alt={featuredHero.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  </div>
                )}
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* ── Main content (white bg) ── */}
      <div className="flex-1 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-10 pb-24 md:pb-10 space-y-8">

          {/* Header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {active.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                <span className="text-gray-400 text-xs font-medium">
                  {active.length > 0 ? `${active.length} live` : "No active campaigns"}
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-black tracking-tight" style={D}>
                Explore Campaigns
              </h1>
            </div>
            <Link href="/projects"
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-black/[0.1] text-gray-600 hover:text-black hover:border-black/[0.25] transition-all">
              Create campaign
            </Link>
          </div>

          {/* Filters */}
          <div className="space-y-3">
            {/* Type pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {TYPE_FILTERS.map(f => {
                const count = f.key === "all" ? allCampaigns.length : allCampaigns.filter(c => c.type === f.key).length;
                const isActive = activeType === f.key;
                return (
                  <Link key={f.key} href={buildUrl({ type: f.key })}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all border"
                    style={isActive
                      ? { background: "#111", color: "#fff", borderColor: "#111" }
                      : { background: "#fff", color: "#6b7280", borderColor: "rgba(0,0,0,0.1)" }
                    }>
                    {f.label}
                    {count > 0 && (
                      <span className="text-[10px] font-mono" style={{ color: isActive ? "#9ca3af" : "#d1d5db" }}>
                        {count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Sort + rank */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Link href={buildUrl({ rank: activeRank === "gated" ? "all" : "gated" })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  activeRank === "gated"
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-500 border-black/[0.1] hover:text-black"
                }`}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Rank-gated
              </Link>
              <div className="flex items-center gap-1">
                <span className="text-gray-400 text-xs mr-2">Sort:</span>
                {SORT_OPTIONS.map(f => (
                  <Link key={f.key} href={buildUrl({ sort: f.key })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      activeSort === f.key
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-500 border-black/[0.1] hover:text-black"
                    }`}>
                    {f.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Campaign grids */}
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-black/[0.07] px-8 py-24 text-center space-y-4 bg-gray-50">
              <p className="text-5xl font-black text-gray-200" style={D}>NO RESULTS</p>
              <p className="text-gray-500 text-sm">No campaigns match this filter.</p>
              <Link href="/campaigns" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white text-sm font-bold hover:bg-zinc-800 transition-colors">
                View all
              </Link>
            </div>
          ) : (
            <div className="space-y-12">
              {sortedFeatured.length > 0 && (
                <section className="space-y-5">
                  <SectionHeader label="Featured" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {sortedFeatured.map(c => <CampaignCard key={c.id} campaign={c} featured />)}
                  </div>
                </section>
              )}
              {sortedStandard.length > 0 && (
                <section className="space-y-5">
                  <SectionHeader label={sortedFeatured.length > 0 ? "All campaigns" : "Live now"} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {sortedStandard.map(c => <CampaignCard key={c.id} campaign={c} />)}
                  </div>
                </section>
              )}
              {sortedEnded.length > 0 && (
                <section className="space-y-5 opacity-50">
                  <SectionHeader label="Ended" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {sortedEnded.map(c => <CampaignCard key={c.id} campaign={c} />)}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Partner strip */}
          <div className="rounded-2xl bg-black text-white px-6 py-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-bold text-base" style={D}>Running a campaign on Base?</p>
              <p className="text-gray-400 text-sm mt-0.5">Standard listings are free. Connect your wallet to get started.</p>
            </div>
            <Link href="/projects"
              className="px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-gray-100 transition-colors flex-shrink-0">
              List your project →
            </Link>
          </div>
        </div>
      </div>

      <footer className="border-t border-black/[0.07] px-6 py-5 bg-white hidden md:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <span className="text-gray-400 text-xs">Based ID · Built on Base · 2026</span>
          <div className="flex items-center gap-5 text-xs text-gray-400">
            <Link href="/" className="hover:text-black transition-colors">Home</Link>
            <Link href="/projects" className="hover:text-black transition-colors">Projects</Link>
            <a href="https://x.com/basedidofficial" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">X</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  const D = { fontFamily: "var(--font-display), system-ui, sans-serif" };
  return (
    <div className="flex items-center gap-4">
      <span className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-400 whitespace-nowrap" style={D}>{label}</span>
      <div className="flex-1 h-px bg-black/[0.07]" />
      <Link href="/campaigns" className="text-xs text-gray-400 hover:text-black transition-colors flex-shrink-0">See All</Link>
    </div>
  );
}
