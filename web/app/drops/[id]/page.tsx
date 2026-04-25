import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { MobileNav } from "@/app/components/MobileNav";
import { DropEntry } from "./DropEntry";

export const revalidate = 30;

const DISPLAY = { fontFamily: "var(--font-display), system-ui, sans-serif" };

const TYPE_LABELS: Record<string, string> = {
  whitelist: "Whitelist", raffle: "Raffle", token_drop: "Token Drop", nft_mint: "NFT Mint",
};

async function getDrop(id: string) {
  try {
    const db = createServerClient();
    const { data } = await db
      .from("drops")
      .select("*, tasks(*)")
      .eq("id", id)
      .in("status", ["active", "ended", "drawn"])
      .single();
    if (!data) return null;
    const { data: project } = await db
      .from("projects").select("*").eq("address", data.partner_address).single();
    return { ...data, project: project ?? null };
  } catch { return null; }
}

async function getEntryCount(id: string) {
  try {
    const db = createServerClient();
    const { count } = await db
      .from("entries")
      .select("*", { count: "exact", head: true })
      .eq("drop_id", id)
      .eq("status", "entered");
    return count ?? 0;
  } catch { return 0; }
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const drop = await getDrop(id);
  if (!drop) return { title: "Drop not found" };
  return {
    title: `${drop.title} — Based ID Drops`,
    description: drop.description || `${TYPE_LABELS[drop.type] ?? "Drop"} on Based ID. Hold a Based ID to enter.`,
  };
}

export default async function DropPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [drop, entryCount] = await Promise.all([getDrop(id), getEntryCount(id)]);

  if (!drop) notFound();

  const isActive  = drop.status === "active" && new Date(drop.ends_at) > new Date();
  const isEnded   = drop.status === "ended"  || (drop.status === "active" && new Date(drop.ends_at) <= new Date());
  const isDrawn   = drop.status === "drawn";
  const typeLabel = TYPE_LABELS[drop.type] ?? drop.type;
  const tasks     = drop.tasks ?? [];
  const winners   = drop.winners ?? [];

  const endsAt = new Date(drop.ends_at);
  const timeStr = endsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";

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
            <Link href="/drops"       className="text-[13px] text-white font-medium flex items-center gap-1.5">Drops<span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /></Link>
            <Link href="/leaderboard" className="text-[13px] text-zinc-400 hover:text-white transition-colors">Leaderboard</Link>
            <Link href="/activity"    className="text-[13px] text-zinc-400 hover:text-white transition-colors">Activity</Link>
            <Link href="/dashboard"   className="text-[13px] text-zinc-400 hover:text-white transition-colors">Dashboard</Link>
          </nav>
          <div className={`flex items-center gap-2 flex-shrink-0 ${isActive ? "text-green-400" : "text-zinc-500"}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500 animate-pulse" : "bg-zinc-600"}`} />
            <span className="text-[11px] tracking-wide">{isDrawn ? "Drawn" : isEnded ? "Ended" : "Live"}</span>
          </div>
        </div>
      </header>

      <MobileNav />

      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 40% at 50% 0%, rgba(37,99,235,0.07), transparent 70%)" }} />

        <div className="relative max-w-5xl mx-auto px-6 pt-10 pb-20">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[11px] text-zinc-600 mb-8">
            <Link href="/drops" className="hover:text-zinc-400 transition-colors">Drops</Link>
            <span>/</span>
            <span className="text-zinc-400 truncate max-w-[200px]">{drop.title}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">

            {/* Left — drop info */}
            <div className="space-y-7">
              {/* Image — fixed aspect ratio */}
              <div className="rounded-2xl overflow-hidden relative aspect-[16/9]">
                {drop.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={drop.image_url} alt={drop.title} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-zinc-950 flex items-center justify-center">
                    <span className="text-zinc-700 text-8xl font-black" style={DISPLAY}>
                      {drop.title.slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Title + meta */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-1 rounded-full bg-blue-900/25 text-blue-300 border border-blue-900/30">
                    {typeLabel}
                  </span>
                  {drop.tier === "featured" && (
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Featured
                    </span>
                  )}
                </div>
                <h1 className="text-white font-black text-3xl sm:text-4xl leading-tight" style={DISPLAY}>
                  {drop.title}
                </h1>
                {drop.description && (
                  <p className="text-zinc-400 text-base leading-relaxed">{drop.description}</p>
                )}
                {/* Project attribution */}
                {drop.project && (
                  <Link href={`/projects/${drop.partner_address}`} className="inline-flex items-center gap-2 group mt-1">
                    {drop.project.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={drop.project.logo_url} alt={drop.project.name} className="w-5 h-5 rounded-md object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-md bg-zinc-800 flex items-center justify-center">
                        <span className="text-zinc-400 text-[9px] font-bold">{drop.project.name.slice(0, 1).toUpperCase()}</span>
                      </div>
                    )}
                    <span className="text-zinc-500 text-xs group-hover:text-zinc-300 transition-colors">{drop.project.name}</span>
                    <span className="text-zinc-700 text-[10px] group-hover:text-zinc-500 transition-colors">↗</span>
                  </Link>
                )}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Entries",  value: entryCount.toLocaleString(), color: "text-white" },
                  { label: "Winners",  value: drop.winner_count.toString(), color: "text-green-400" },
                  { label: isDrawn ? "Drawn" : "Ends",  value: isDrawn ? "Complete" : timeStr, color: "text-zinc-300", small: true },
                ].map(({ label, value, color, small }) => (
                  <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.01] px-4 py-3.5">
                    <p className={`${color} font-bold ${small ? "text-sm" : "text-2xl"} tabular-nums leading-none`}>{value}</p>
                    <p className="text-zinc-600 text-[10px] uppercase tracking-[0.12em] mt-2">{label}</p>
                  </div>
                ))}
              </div>

              {/* Prize details */}
              {Object.keys(drop.prize_details ?? {}).length > 0 && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-5 space-y-3">
                  <p className="text-zinc-500 text-[10px] uppercase tracking-[0.18em]">Prize details</p>
                  <pre className="text-zinc-300 text-sm font-mono whitespace-pre-wrap">
                    {JSON.stringify(drop.prize_details, null, 2)}
                  </pre>
                </div>
              )}

              {/* Winners (if drawn) */}
              {isDrawn && winners.length > 0 && (
                <div className="space-y-3">
                  <p className="text-green-400 text-[11px] uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    Winners
                  </p>
                  <div className="rounded-2xl border border-green-900/25 bg-green-950/[0.06] divide-y divide-white/[0.04] overflow-hidden">
                    {winners.map((w: string) => (
                      <div key={w} className="px-5 py-3 flex items-center justify-between">
                        <span className="font-mono text-green-300 text-sm">{w.slice(0,6)}…{w.slice(-4)}</span>
                        <a
                          href={`https://basescan.org/address/${w}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-600 text-[10px] hover:text-zinc-400 transition-colors"
                        >
                          Basescan ↗
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right — sticky entry panel */}
            <div className="lg:sticky lg:top-20">
              <DropEntry drop={drop} tasks={tasks} isActive={isActive} isEnded={isEnded || isDrawn} />
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-white/[0.04] px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <span className="text-zinc-700 text-[11px]">Built on Base · 2026</span>
          <Link href="/drops" className="text-zinc-600 text-[11px] hover:text-zinc-400 transition-colors">← All drops</Link>
        </div>
      </footer>
    </div>
  );
}
