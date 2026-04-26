import Link from "next/link";
import type { Metadata } from "next";
import { createServerClient, type Drop } from "@/lib/supabase";
import { Nav } from "@/app/components/Nav";
import { MobileNav } from "@/app/components/MobileNav";
import { DropCard } from "./DropCard";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Drops — Based ID",
  description: "Airdrops, NFT mints, whitelists, raffles. Hold a Based ID to auto-qualify.",
};

const D = { fontFamily: "var(--font-display), system-ui, sans-serif" };

const TYPE_FILTERS = [
  { key: "all",        label: "All"        },
  { key: "raffle",     label: "Raffles"    },
  { key: "whitelist",  label: "Whitelist"  },
  { key: "nft_mint",   label: "NFT Mint"   },
  { key: "token_drop", label: "Token Drop" },
];

async function getDrops(): Promise<Drop[]> {
  try {
    const db = createServerClient();
    const { data: drops } = await db
      .from("drops").select("*, tasks(*)")
      .in("status", ["active", "ended"])
      .order("tier",       { ascending: false })
      .order("created_at", { ascending: false });
    if (!drops?.length) return [];
    const addresses = [...new Set(drops.map((d: Drop) => d.partner_address))];
    const { data: projects } = await db.from("projects").select("*").in("address", addresses);
    const { data: counts }   = await db.from("entries").select("drop_id").in("drop_id", drops.map((d: Drop) => d.id)).eq("status", "entered");
    const countMap: Record<string, number> = {};
    for (const row of counts ?? []) countMap[row.drop_id] = (countMap[row.drop_id] ?? 0) + 1;
    const pm = Object.fromEntries((projects ?? []).map((p) => [p.address, p]));
    return drops.map((d: Drop) => ({ ...d, project: pm[d.partner_address] ?? null, entry_count: countMap[d.id] ?? 0 })) as Drop[];
  } catch { return []; }
}

export default async function DropsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const activeType = TYPE_FILTERS.find(f => f.key === type)?.key ?? "all";
  const allDrops   = await getDrops();
  const drops      = activeType === "all" ? allDrops : allDrops.filter(d => d.type === activeType);
  const active     = drops.filter(d => d.status === "active");
  const ended      = drops.filter(d => d.status !== "active");
  const featured   = active.filter(d => d.tier === "featured");
  const standard   = active.filter(d => d.tier !== "featured");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav active="/drops" />
      <MobileNav />

      <div className="max-w-7xl mx-auto px-6 py-10 flex-1 w-full space-y-8 pb-24 md:pb-10">

        {/* Header */}
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {active.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
              <span className={`text-xs font-medium ${active.length > 0 ? "text-green-400" : "text-zinc-600"}`}>
                {active.length > 0 ? `${active.length} live` : "No active drops"}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight" style={D}>Drops</h1>
            <p className="text-zinc-500 text-sm">Hold a Based ID to qualify. Enter drops, win prizes.</p>
          </div>
          <Link href="/partner"
            className="px-4 py-2 rounded-xl border border-white/[0.08] text-zinc-400 text-xs font-semibold hover:text-white hover:border-white/[0.16] transition-all">
            + List your drop
          </Link>
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {TYPE_FILTERS.map(f => {
            const count = f.key === "all" ? allDrops.length : allDrops.filter(d => d.type === f.key).length;
            return (
              <Link key={f.key} href={f.key === "all" ? "/drops" : `/drops?type=${f.key}`}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeType === f.key
                    ? "bg-white text-black font-bold"
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] border border-transparent hover:border-white/[0.07]"
                }`}>
                {f.label}
                {count > 0 && (
                  <span className={`text-[10px] font-mono ${activeType === f.key ? "text-zinc-600" : "text-zinc-700"}`}>{count}</span>
                )}
              </Link>
            );
          })}
        </div>

        {drops.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] px-8 py-20 text-center space-y-5">
            <p className="text-zinc-400 font-bold text-lg">No drops match this filter</p>
            <p className="text-zinc-600 text-sm">Try &quot;All&quot; to see everything, or check back soon.</p>
            <Link href="/drops" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors">
              View all drops
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {featured.length > 0 && (
              <section className="space-y-4">
                <SectionLabel label="Featured" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {featured.map(drop => <DropCard key={drop.id} drop={drop} featured />)}
                </div>
              </section>
            )}
            {standard.length > 0 && (
              <section className="space-y-4">
                <SectionLabel label={featured.length > 0 ? "All drops" : "Live"} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {standard.map(drop => <DropCard key={drop.id} drop={drop} />)}
                </div>
              </section>
            )}
            {ended.length > 0 && (
              <section className="space-y-4 opacity-50">
                <SectionLabel label="Ended" dim />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {ended.map(drop => <DropCard key={drop.id} drop={drop} />)}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Partner strip */}
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.06] px-6 py-5">
          <div>
            <p className="text-white text-sm font-semibold">Running a drop on Base?</p>
            <p className="text-zinc-600 text-xs mt-0.5">Standard listings are free.</p>
          </div>
          <Link href="/partner" className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-zinc-100 transition-colors flex-shrink-0">
            Become a partner →
          </Link>
        </div>
      </div>

      <footer className="border-t border-white/[0.05] px-6 py-5 hidden md:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <span className="text-zinc-700 text-xs">Based ID · Built on Base · 2026</span>
          <div className="flex items-center gap-5 text-xs text-zinc-700">
            <Link href="/" className="hover:text-zinc-400 transition-colors">Home</Link>
            <Link href="/partner" className="hover:text-zinc-400 transition-colors">Partner</Link>
            <a href="https://x.com/basedidofficial" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">X</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionLabel({ label, dim }: { label: string; dim?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${dim ? "text-zinc-700" : "text-zinc-500"}`}>{label}</span>
      <div className={`flex-1 h-px ${dim ? "bg-white/[0.03]" : "bg-white/[0.05]"}`} />
    </div>
  );
}
