import Link from "next/link";
import type { Metadata } from "next";
import { createServerClient, type Drop } from "@/lib/supabase";
import { Nav } from "@/app/components/Nav";
import { MobileNav } from "@/app/components/MobileNav";
import { DropCard } from "./DropCard";
import { DropsCountdown } from "./DropsCountdown";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Drops — Based ID",
  description: "Airdrops, NFT drops, whitelists, raffles. Hold a Based ID, auto-qualify.",
};

const LAUNCH_DATE = new Date("2026-05-15T00:00:00Z");
const DISPLAY = { fontFamily: "var(--font-display), system-ui, sans-serif" };

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
    const pm = Object.fromEntries((projects ?? []).map((p) => [p.address, p]));
    return drops.map((d: Drop) => ({ ...d, project: pm[d.partner_address] ?? null })) as Drop[];
  } catch { return []; }
}

export default async function DropsPage() {
  const drops    = await getDrops();
  const hasDrops = drops.length > 0;
  const featured = drops.filter(d => d.tier === "featured");
  const standard = drops.filter(d => d.tier === "standard");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav active="/drops" />
      <MobileNav />

      <div className="max-w-7xl mx-auto px-6 py-16 flex-1 w-full space-y-12">

        {/* Header */}
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${hasDrops ? "bg-green-500 animate-pulse" : "bg-amber-400 animate-pulse"}`} />
              <span className={`text-xs font-medium ${hasDrops ? "text-green-400" : "text-amber-400"}`}>
                {hasDrops ? `${drops.length} drop${drops.length !== 1 ? "s" : ""} live` : "Launching soon"}
              </span>
            </div>
            <h1 style={DISPLAY} className="text-4xl sm:text-5xl font-black tracking-tight text-white">
              {hasDrops ? "Live drops" : "The base of Airdrops."}
            </h1>
            {!hasDrops && <p className="text-zinc-500 text-base max-w-md">Every Base opportunity — airdrops, NFTs, whitelists, raffles. Hold a Based ID, auto-qualify. Launching May 15.</p>}
          </div>
          <Link href="/partner" className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0">
            + List your drop →
          </Link>
        </div>

        {hasDrops ? (
          <>
            {featured.length > 0 && (
              <section className="space-y-4">
                <p className="text-xs text-amber-400 font-medium">Featured</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featured.map(drop => <DropCard key={drop.id} drop={drop} featured />)}
                </div>
              </section>
            )}
            {standard.length > 0 && (
              <section className="space-y-4">
                {featured.length > 0 && <p className="text-xs text-zinc-600 font-medium">All drops</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {standard.map(drop => <DropCard key={drop.id} drop={drop} />)}
                </div>
              </section>
            )}
          </>
        ) : (
          /* Teaser */
          <div className="space-y-12">
            <div className="flex flex-col items-center gap-6 py-8 text-center">
              <p className="text-zinc-600 text-sm">First drops launch in</p>
              <DropsCountdown target={LAUNCH_DATE.getTime()} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { tag: "Airdrops",  title: "Token airdrops first",    desc: "New Base tokens drop to Based ID holders before anyone else." },
                { tag: "NFT Drops", title: "Curated NFT mints",       desc: "Partners reserve allocations for Based ID holders. Lower IDs get priority." },
                { tag: "Whitelist", title: "Auto-qualify",            desc: "Hold a Based ID and skip the form. You already qualify." },
                { tag: "Raffles",   title: "Provably fair draws",     desc: "Enter with one click. Chainlink VRF draws winners onchain." },
              ].map(x => (
                <div key={x.tag} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-2">
                  <p className="text-xs text-zinc-600 font-medium">{x.tag}</p>
                  <p className="text-white font-bold text-lg" style={DISPLAY}>{x.title}</p>
                  <p className="text-zinc-500 text-sm leading-relaxed">{x.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Partner CTA */}
        <div className="flex items-center justify-between gap-4 flex-wrap rounded-2xl border border-white/[0.06] px-6 py-5">
          <p className="text-zinc-400 text-sm">Launching on Base? <span className="text-zinc-600">Drops are free to list.</span></p>
          <Link href="/partner" className="px-5 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors flex-shrink-0">
            Become a partner →
          </Link>
        </div>
      </div>

      <footer className="border-t border-white/[0.06] px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
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
