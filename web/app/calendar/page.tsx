import Link from "next/link";
import type { Metadata } from "next";
import { createServerClient, type Drop } from "@/lib/supabase";
import { Nav } from "@/app/components/Nav";
import { MobileNav } from "@/app/components/MobileNav";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Drop Calendar — Based ID",
  description: "Upcoming and active drops on Based ID. Never miss a Base opportunity.",
};

const DISPLAY = { fontFamily: "var(--font-display), system-ui, sans-serif" };

const TYPE_LABELS: Record<string, string> = {
  whitelist: "Whitelist", raffle: "Raffle", token_drop: "Token Drop", nft_mint: "NFT Mint",
};

const TYPE_COLORS: Record<string, string> = {
  whitelist:   "text-blue-400   border-blue-900/30   bg-blue-950/20",
  raffle:      "text-purple-400 border-purple-900/30 bg-purple-950/20",
  token_drop:  "text-green-400  border-green-900/30  bg-green-950/20",
  nft_mint:    "text-amber-400  border-amber-900/30  bg-amber-950/20",
};

async function getAllDrops(): Promise<Drop[]> {
  try {
    const db = createServerClient();
    const { data } = await db
      .from("drops")
      .select("*, tasks(*)")
      .in("status", ["active", "ended", "drawn"])
      .order("ends_at", { ascending: true });
    return (data ?? []) as Drop[];
  } catch { return []; }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  }) + " UTC";
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function CalendarRow({ drop }: { drop: Drop }) {
  const endsAt   = new Date(drop.ends_at);
  const isActive = drop.status === "active" && endsAt > new Date();
  const isDrawn  = drop.status === "drawn";
  const isEnded  = !isActive && !isDrawn;
  const days     = daysUntil(drop.ends_at);
  const typeColor = TYPE_COLORS[drop.type] ?? "text-zinc-400 border-zinc-800 bg-zinc-900/20";

  return (
    <Link href={`/drops/${drop.id}`} className="group flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.01] px-5 py-4 hover:border-white/[0.12] hover:bg-white/[0.02] transition-all">

      {/* Date block */}
      <div className="flex-shrink-0 w-14 text-center">
        <p className="text-white font-black text-xl tabular-nums leading-none">
          {endsAt.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" })}
        </p>
        <p className="text-zinc-600 text-[10px] uppercase tracking-[0.12em] mt-0.5">
          {endsAt.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}
        </p>
      </div>

      {/* Divider dot */}
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
        isDrawn ? "bg-blue-500" : isActive ? "bg-green-500 animate-pulse" : "bg-zinc-700"
      }`} />

      {/* Drop info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[9px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-full border ${typeColor}`}>
            {TYPE_LABELS[drop.type] ?? drop.type}
          </span>
          {drop.tier === "featured" && (
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
              Featured
            </span>
          )}
        </div>
        <p className="text-white font-bold text-sm group-hover:text-zinc-200 transition-colors truncate" style={DISPLAY}>
          {drop.title}
        </p>
        <p className="text-zinc-600 text-xs">{formatDate(drop.ends_at)}</p>
      </div>

      {/* Right side — status + winners */}
      <div className="flex-shrink-0 text-right space-y-1">
        <p className={`text-xs font-semibold ${
          isDrawn ? "text-blue-400" : isActive ? "text-green-400" : "text-zinc-600"
        }`}>
          {isDrawn ? "Drawn" : isActive ? (days <= 0 ? "Ending soon" : days === 1 ? "1 day left" : `${days}d left`) : "Ended"}
        </p>
        <p className="text-zinc-600 text-[11px]">{drop.winner_count} winner{drop.winner_count !== 1 ? "s" : ""}</p>
      </div>
    </Link>
  );
}

export default async function CalendarPage() {
  const drops = await getAllDrops();
  const now   = new Date();

  const live   = drops.filter((d) => d.status === "active" && new Date(d.ends_at) > now);
  const drawn  = drops.filter((d) => d.status === "drawn");
  const ended  = drops.filter((d) => d.status === "ended" || (d.status === "active" && new Date(d.ends_at) <= now));

  const sections = [
    { label: "Live now",      drops: live,   dot: "bg-green-500", empty: "No drops live right now." },
    { label: "Recently drawn", drops: drawn,  dot: "bg-blue-500",  empty: "No drops drawn yet." },
    { label: "Ended",         drops: ended,  dot: "bg-zinc-700",  empty: "No ended drops." },
  ].filter((s) => s.drops.length > 0 || s.label === "Live now");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav active="/calendar" />
      <MobileNav />

      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 35% at 50% 0%, rgba(37,99,235,0.06), transparent 70%)" }} />

        <div className="relative max-w-4xl mx-auto px-6 pt-12 pb-20 space-y-10">

          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400 text-[11px] font-medium uppercase tracking-[0.2em]">
                {live.length} live · {drops.length} total
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white" style={DISPLAY}>Drop calendar</h1>
            <p className="text-zinc-500 text-base">Every drop on Based ID — past, present, and upcoming.</p>
          </div>

          {/* Partner CTA */}
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.06] px-5 py-4 flex-wrap">
            <p className="text-zinc-500 text-sm">Running a drop on Base? <span className="text-zinc-600">Standard listings are free.</span></p>
            <Link href="/partner" className="px-4 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors flex-shrink-0">
              List your drop →
            </Link>
          </div>

          {/* Sections */}
          {sections.map(({ label, drops: sDrops, dot, empty }) => (
            <section key={label} className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-2 h-2 rounded-full ${dot}`} />
                <p className="text-zinc-500 text-xs font-semibold uppercase tracking-[0.18em]">
                  {label} {sDrops.length > 0 && <span className="text-zinc-700">({sDrops.length})</span>}
                </p>
              </div>

              {sDrops.length === 0 ? (
                <p className="text-zinc-700 text-sm px-2">{empty}</p>
              ) : (
                <div className="space-y-2">
                  {sDrops.map((drop) => <CalendarRow key={drop.id} drop={drop} />)}
                </div>
              )}
            </section>
          ))}

          {drops.length === 0 && (
            <div className="rounded-2xl border border-white/[0.06] px-8 py-16 text-center space-y-4">
              <p className="text-zinc-400 font-bold text-xl" style={DISPLAY}>No drops yet</p>
              <p className="text-zinc-600 text-sm">First drops launch soon. Be the first partner to list.</p>
              <Link href="/partner" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors">
                List a drop →
              </Link>
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-white/[0.06] px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <span className="text-zinc-700 text-xs">Built on Base · 2026</span>
          <Link href="/drops" className="text-zinc-600 text-xs hover:text-zinc-400 transition-colors">← All drops</Link>
        </div>
      </footer>
    </div>
  );
}
