import Link from "next/link";
import type { Metadata } from "next";
import { MobileNav } from "@/app/components/MobileNav";
import { DropsCountdown } from "./DropsCountdown";
import { createServerClient, type Drop } from "@/lib/supabase";
import { DropCard } from "./DropCard";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Drops — Based ID",
  description: "Airdrops, NFT drops, whitelists, raffles. Hold a Based ID, auto-qualify for every Base opportunity.",
};

const LAUNCH_DATE = new Date("2026-05-15T00:00:00Z");
const DISPLAY = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const GRAD = {
  background: "linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
} as React.CSSProperties;

async function getDrops(): Promise<Drop[]> {
  try {
    const db = createServerClient();
    const { data } = await db
      .from("drops")
      .select("*, tasks(*)")
      .eq("status", "active")
      .order("tier",       { ascending: false })
      .order("created_at", { ascending: false });
    return (data ?? []) as Drop[];
  } catch {
    return [];
  }
}

export default async function DropsPage() {
  const drops   = await getDrops();
  const hasDrops = drops.length > 0;
  const featured = drops.filter((d) => d.tier === "featured");
  const standard = drops.filter((d) => d.tier === "standard");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/[0.04] bg-black/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Based ID" className="w-7 h-7 rounded-lg" />
            <div className="flex items-center gap-1">
              <span style={DISPLAY} className="font-bold text-sm text-white tracking-tight">Based</span>
              <span className="font-mono text-[11px] text-zinc-500 tracking-widest ml-0.5">ID</span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-7">
            <Link href="/drops"       className="text-[13px] text-white font-medium flex items-center gap-1.5">
              Drops
              {hasDrops
                ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">{drops.length}</span>
                : <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
            </Link>
            <Link href="/leaderboard" className="text-[13px] text-zinc-400 hover:text-white transition-colors">Leaderboard</Link>
            <Link href="/activity"    className="text-[13px] text-zinc-400 hover:text-white transition-colors">Activity</Link>
            <Link href="/dashboard"   className="text-[13px] text-zinc-400 hover:text-white transition-colors">Dashboard</Link>
          </nav>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${hasDrops ? "bg-green-500" : "bg-amber-400"}`} />
            <span className={`text-[11px] tracking-wide ${hasDrops ? "text-green-400/80" : "text-amber-400/80"}`}>
              {hasDrops ? "Live" : "Soon"}
            </span>
          </div>
        </div>
      </header>

      <MobileNav />

      <div className="relative flex-1 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(37,99,235,0.07), transparent 70%)" }}
        />

        <div className="relative max-w-7xl mx-auto px-6 pt-12 pb-20 space-y-12">

          {/* Page header */}
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div className="space-y-3">
              <p className="text-blue-400 text-[11px] uppercase tracking-[0.2em] flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${hasDrops ? "bg-green-500 animate-pulse" : "bg-amber-400 animate-pulse"}`} />
                {hasDrops ? "Live drops" : "Drops portal · coming soon"}
              </p>
              <h1 style={DISPLAY} className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-[1.02]">
                {hasDrops ? (
                  <>Every Base opportunity.<br /><span style={GRAD}>All in one place.</span></>
                ) : (
                  <>The base of<br /><span style={GRAD}>Airdrops.</span></>
                )}
              </h1>
              {!hasDrops && (
                <p className="text-zinc-400 text-base leading-relaxed max-w-lg">
                  Airdrops, NFT drops, whitelists, raffles. Hold a Based ID, auto-qualify. Launching May 15.
                </p>
              )}
            </div>
            {hasDrops && (
              <div className="flex items-center gap-3 text-sm text-zinc-500 flex-shrink-0">
                <span className="tabular-nums">{drops.length} drop{drops.length !== 1 ? "s" : ""} active</span>
                <Link href="/partner" className="text-blue-400 hover:text-blue-300 transition-colors text-[13px]">
                  + List your drop →
                </Link>
              </div>
            )}
          </div>

          {hasDrops ? (
            <>
              {/* Featured drops */}
              {featured.length > 0 && (
                <section className="space-y-4">
                  <p className="text-[10px] text-amber-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Featured
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {featured.map((drop) => (
                      <DropCard key={drop.id} drop={drop} featured />
                    ))}
                  </div>
                </section>
              )}

              {/* Standard drops */}
              {standard.length > 0 && (
                <section className="space-y-4">
                  {featured.length > 0 && (
                    <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em]">All drops</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {standard.map((drop) => (
                      <DropCard key={drop.id} drop={drop} />
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            /* Teaser state — no drops yet */
            <div className="space-y-10">
              {/* Countdown */}
              <div className="flex flex-col items-center gap-6 py-8">
                <p className="text-zinc-500 text-sm">First drops launch in</p>
                <DropsCountdown target={LAUNCH_DATE.getTime()} />
              </div>

              {/* What's coming */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { tag: "Airdrops",  title: "Token airdrops from Base projects",  desc: "New Base tokens drop to Based ID holders first.", color: "text-blue-400",   border: "border-blue-900/35",   bg: "bg-blue-950/[0.1]" },
                  { tag: "NFT Drops", title: "Curated NFT mints",                  desc: "Reserve allocations for Based ID holders. Lower IDs get better drops.", color: "text-purple-300", border: "border-purple-900/30", bg: "bg-purple-950/[0.1]" },
                  { tag: "Whitelists", title: "Auto-qualify for launches",          desc: "Hold a Based ID, skip the form. You already qualify.", color: "text-green-400",   border: "border-green-900/30",  bg: "bg-green-950/[0.08]" },
                  { tag: "Raffles",   title: "Provably fair, onchain",             desc: "Enter with one click. Chainlink VRF draws winners.", color: "text-amber-400",   border: "border-amber-900/35",  bg: "bg-amber-950/[0.08]" },
                ].map((x) => (
                  <div key={x.tag} className={`rounded-2xl border ${x.border} ${x.bg} p-6 space-y-2`}>
                    <p className={`${x.color} text-[10px] uppercase tracking-[0.2em] font-bold`}>{x.tag}</p>
                    <h3 className="text-white font-bold text-lg leading-tight" style={DISPLAY}>{x.title}</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">{x.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Partner CTA — always shown */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 flex-shrink-0">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <p className="text-zinc-300 text-sm">
                Launching a project on Base?
                <span className="text-zinc-600 ml-2">Drop to verified holders — no bots, no farmers.</span>
              </p>
            </div>
            <Link href="/partner" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors flex-shrink-0">
              Become a partner →
            </Link>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <svg width="16" height="16" viewBox="0 0 111 111" fill="none" className="opacity-40">
              <path d="M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6 85.359 0 54.921 0C26.0 0 2.0 22.0 0 50.354H72.943V59.68H0C2.0 88.0 26.0 110.034 54.921 110.034Z" fill="#0052FF"/>
            </svg>
            <span className="text-zinc-700 text-[11px]">Built on Base · 2026</span>
          </div>
          <div className="flex items-center gap-5 text-[11px] text-zinc-700">
            <Link href="/" className="hover:text-zinc-400 transition-colors">Home</Link>
            <Link href="/partner" className="hover:text-zinc-400 transition-colors">Partners</Link>
            <Link href="/dashboard" className="hover:text-zinc-400 transition-colors">Dashboard</Link>
            <a href="https://x.com/basedidofficial" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">@basedidofficial</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
