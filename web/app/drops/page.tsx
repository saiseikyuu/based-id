import Link from "next/link";
import type { Metadata } from "next";
import { createServerClient, type Drop } from "@/lib/supabase";
import { Nav } from "@/app/components/Nav";
import { MobileNav } from "@/app/components/MobileNav";
import { DropsCountdown } from "./DropsCountdown";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Drops — Based ID",
  description: "Airdrops, NFT drops, whitelists, raffles. Hold a Based ID, auto-qualify.",
};

const LAUNCH_DATE = new Date("2026-05-15T00:00:00Z");
const D = { fontFamily: "var(--font-display), system-ui, sans-serif" };

const TYPE_LABELS: Record<string, string> = {
  whitelist: "Whitelist", raffle: "Raffle", token_drop: "Token Drop", nft_mint: "NFT Mint",
};

const TYPE_FILTERS = [
  { key: "all",        label: "All" },
  { key: "raffle",     label: "Raffles" },
  { key: "whitelist",  label: "Whitelist" },
  { key: "nft_mint",   label: "NFT Mint" },
  { key: "token_drop", label: "Token Drop" },
];

async function getDrops(): Promise<Drop[]> {
  try {
    const db = createServerClient();
    const { data: drops } = await db
      .from("drops").select("*, tasks(*)")
      .eq("status", "active")
      .order("tier", { ascending: false })
      .order("created_at", { ascending: false });
    if (!drops?.length) return [];
    const addresses = [...new Set(drops.map((d: Drop) => d.partner_address))];
    const { data: projects } = await db.from("projects").select("*").in("address", addresses);
    const { data: counts } = await db.from("entries").select("drop_id").in("drop_id", drops.map((d: Drop) => d.id)).eq("status", "entered");
    const countMap: Record<string, number> = {};
    for (const row of counts ?? []) countMap[row.drop_id] = (countMap[row.drop_id] ?? 0) + 1;
    const pm = Object.fromEntries((projects ?? []).map((p) => [p.address, p]));
    return drops.map((d: Drop) => ({ ...d, project: pm[d.partner_address] ?? null, entry_count: countMap[d.id] ?? 0 })) as Drop[];
  } catch { return []; }
}

function timeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 48) return `${Math.floor(h / 24)}d`;
  if (h >= 1)  return `${h}h ${m}m`;
  return `${m}m`;
}

function DropRow({ drop }: { drop: Drop }) {
  const taskCount = drop.tasks?.length ?? 0;
  const isFeatured = drop.tier === "featured";
  const timeStr = timeLeft(drop.ends_at);
  const isEndingSoon = new Date(drop.ends_at).getTime() - Date.now() < 3600000 * 6;

  return (
    <Link href={`/drops/${drop.id}`}
      className={`group flex items-center gap-4 px-4 py-3.5 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${isFeatured ? "bg-amber-500/[0.03]" : ""}`}>

      {/* Logo */}
      <div className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden border border-white/[0.07] bg-zinc-900 flex items-center justify-center">
        {drop.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={drop.image_url} alt={drop.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-white font-black text-sm" style={D}>{drop.title.slice(0,1)}</span>
        )}
      </div>

      {/* Name + project */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-semibold group-hover:text-zinc-200 transition-colors truncate">{drop.title}</span>
          {isFeatured && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/25 flex-shrink-0">FEATURED</span>
          )}
        </div>
        {drop.project?.name && (
          <span className="text-zinc-600 text-xs truncate block">{drop.project.name}</span>
        )}
      </div>

      {/* Type */}
      <div className="hidden sm:block flex-shrink-0 w-24 text-center">
        <span className="text-zinc-500 text-xs font-mono">{TYPE_LABELS[drop.type] ?? drop.type}</span>
      </div>

      {/* Time */}
      <div className="flex-shrink-0 w-16 text-right">
        <span className={`text-xs font-mono tabular-nums ${isEndingSoon ? "text-amber-400" : "text-zinc-400"}`}>{timeStr}</span>
      </div>

      {/* Winners */}
      <div className="hidden md:block flex-shrink-0 w-16 text-center">
        <span className="text-zinc-400 text-xs font-mono tabular-nums">{drop.winner_count}</span>
      </div>

      {/* Entries */}
      <div className="hidden lg:block flex-shrink-0 w-16 text-center">
        <span className="text-zinc-500 text-xs font-mono tabular-nums">{(drop.entry_count ?? 0).toLocaleString()}</span>
      </div>

      {/* Tasks */}
      <div className="hidden md:block flex-shrink-0 w-16 text-center">
        <span className="text-zinc-500 text-xs font-mono">{taskCount > 0 ? `${taskCount} task${taskCount !== 1 ? "s" : ""}` : "—"}</span>
      </div>

      {/* Enter */}
      <div className="flex-shrink-0">
        <span className="text-blue-400 text-xs font-semibold group-hover:text-blue-300 transition-colors">Enter →</span>
      </div>
    </Link>
  );
}

export default async function DropsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const activeType = TYPE_FILTERS.find(f => f.key === type)?.key ?? "all";
  const allDrops  = await getDrops();
  const drops     = activeType === "all" ? allDrops : allDrops.filter(d => d.type === activeType);
  const hasDrops  = allDrops.length > 0;
  const featured  = drops.filter(d => d.tier === "featured");
  const standard  = drops.filter(d => d.tier === "standard");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav active="/drops" />
      <MobileNav />

      <div className="max-w-5xl mx-auto px-6 py-12 flex-1 w-full space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${hasDrops ? "bg-green-500 animate-pulse" : "bg-zinc-600"}`} />
              <span className={`text-xs font-medium ${hasDrops ? "text-green-400" : "text-zinc-500"}`}>
                {hasDrops ? `${drops.length} drop${drops.length !== 1 ? "s" : ""} live` : "No active drops"}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white" style={D}>Drops</h1>
          </div>
          <Link href="/partner" className="px-4 py-2 rounded-xl border border-white/[0.08] text-zinc-400 text-xs font-semibold hover:text-white hover:border-white/[0.16] transition-colors">
            + List your drop
          </Link>
        </div>

        {/* Type filter tabs */}
        {hasDrops && (
          <div className="flex items-center gap-1 flex-wrap">
            {TYPE_FILTERS.map(f => {
              const count = f.key === "all" ? allDrops.length : allDrops.filter(d => d.type === f.key).length;
              return (
                <Link key={f.key} href={f.key === "all" ? "/drops" : `/drops?type=${f.key}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeType === f.key
                      ? "bg-white/[0.08] text-white"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
                  }`}>
                  {f.label}
                  {count > 0 && (
                    <span className={`text-[10px] font-mono ${activeType === f.key ? "text-zinc-400" : "text-zinc-700"}`}>{count}</span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {hasDrops ? (
          <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
            {/* Table header */}
            <div className="flex items-center gap-4 px-4 py-2.5 border-b border-white/[0.07] bg-white/[0.02]">
              <div className="w-10 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-zinc-600 text-[10px] font-semibold uppercase tracking-[0.15em]">Name</span>
              </div>
              <div className="hidden sm:block w-24 text-center">
                <span className="text-zinc-600 text-[10px] font-semibold uppercase tracking-[0.15em]">Type</span>
              </div>
              <div className="w-16 text-right">
                <span className="text-zinc-600 text-[10px] font-semibold uppercase tracking-[0.15em]">Time</span>
              </div>
              <div className="hidden md:block w-16 text-center">
                <span className="text-zinc-600 text-[10px] font-semibold uppercase tracking-[0.15em]">Winners</span>
              </div>
              <div className="hidden lg:block w-16 text-center">
                <span className="text-zinc-600 text-[10px] font-semibold uppercase tracking-[0.15em]">Entries</span>
              </div>
              <div className="hidden md:block w-16 text-center">
                <span className="text-zinc-600 text-[10px] font-semibold uppercase tracking-[0.15em]">Tasks</span>
              </div>
              <div className="w-12" />
            </div>

            {/* Featured section */}
            {featured.length > 0 && (
              <>
                <div className="px-4 py-2 bg-amber-500/[0.05] border-b border-amber-500/[0.1]">
                  <span className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.2em]">Featured</span>
                </div>
                {featured.map(drop => <DropRow key={drop.id} drop={drop} />)}
                {standard.length > 0 && (
                  <div className="px-4 py-2 bg-white/[0.02] border-b border-white/[0.05]">
                    <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.2em]">All drops</span>
                  </div>
                )}
              </>
            )}

            {/* Standard drops */}
            {standard.map(drop => <DropRow key={drop.id} drop={drop} />)}
          </div>
        ) : (
          <div className="space-y-12">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] px-8 py-16 text-center space-y-6">
              <div className="space-y-2">
                <p className="text-zinc-400 font-bold text-xl" style={D}>No drops yet</p>
                <p className="text-zinc-600 text-sm">First drops launch in</p>
              </div>
              <DropsCountdown target={LAUNCH_DATE.getTime()} />
              <Link href="/partner" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.1] text-zinc-300 text-sm font-medium hover:border-white/20 transition-colors">
                List your drop — it&apos;s free →
              </Link>
            </div>
          </div>
        )}

        {/* Partner strip */}
        <div className="flex items-center justify-between gap-4 flex-wrap rounded-2xl border border-white/[0.06] px-5 py-4">
          <p className="text-zinc-500 text-sm">Running a drop on Base? <span className="text-zinc-600">Standard listings are free.</span></p>
          <Link href="/partner" className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-zinc-100 transition-colors">
            Become a partner →
          </Link>
        </div>
      </div>

      <footer className="border-t border-white/[0.06] px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <span className="text-zinc-700 text-xs">Built on Base · 2026</span>
          <div className="flex items-center gap-5 text-xs text-zinc-700">
            <Link href="/" className="hover:text-zinc-400 transition-colors">Home</Link>
            <Link href="/partner" className="hover:text-zinc-400 transition-colors">Partners</Link>
            <a href="https://x.com/basedidofficial" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">@basedidofficial</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
