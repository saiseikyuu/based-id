import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { MobileNav } from "@/app/components/MobileNav";
import { DropEntry } from "./DropEntry";
import { ShareBar } from "./ShareBar";

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

const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL ?? "https://basedid.space";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const drop = await getDrop(id);
  if (!drop) return { title: "Drop not found" };
  const title = `${drop.title} — Based ID Drops`;
  const description = drop.description || `${TYPE_LABELS[drop.type] ?? "Drop"} on Based ID. Hold a Based ID to enter.`;
  const dropUrl   = `${SITE_URL}/drops/${id}`;
  const frameImg  = `${SITE_URL}/api/frames/drops/${id}/image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: frameImg, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [frameImg],
    },
    other: {
      // Farcaster frame meta tags (v1 compatible)
      "fc:frame":                     "vNext",
      "fc:frame:image":               frameImg,
      "fc:frame:image:aspect_ratio":  "1.91:1",
      "fc:frame:button:1":            "Enter Drop →",
      "fc:frame:button:1:action":     "link",
      "fc:frame:button:1:target":     dropUrl,
      "fc:frame:button:2":            `${drop.winner_count} winner${drop.winner_count !== 1 ? "s" : ""} · ${TYPE_LABELS[drop.type] ?? drop.type}`,
      "fc:frame:button:2:action":     "link",
      "fc:frame:button:2:target":     dropUrl,
    },
  };
}

function StatPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02]">
      <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-[0.15em]">{label}</span>
      <span className={`text-[11px] font-bold tabular-nums ${color ?? "text-zinc-200"}`}>{value}</span>
    </div>
  );
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
  const endsAtFmt = new Date(drop.ends_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";

  const endsAt = new Date(drop.ends_at);
  const timeStr = endsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/[0.05] bg-black/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
          <Link href="/drops" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm">
            ← Drops
          </Link>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500 animate-pulse" : "bg-zinc-600"}`} />
            <span className={`text-[11px] font-medium ${isActive ? "text-green-400" : "text-zinc-500"}`}>
              {isDrawn ? "Drawn" : isEnded ? "Ended" : "Live"}
            </span>
          </div>
        </div>
      </header>
      <MobileNav />

      <div className="flex-1">

        {/* ── Banner — 16:9 capped, not full bleed tall ── */}
        <div className="w-full overflow-hidden" style={{ maxHeight: "320px" }}>
          <div className="relative w-full aspect-[16/6] max-h-80 bg-zinc-950">
            {drop.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={drop.image_url} alt={drop.title}
                className="absolute inset-0 w-full h-full object-cover object-center" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #0f1729 0%, #0a0d1a 100%)" }}>
                <span className="text-zinc-800 font-black text-[100px] leading-none select-none" style={DISPLAY}>
                  {drop.title.slice(0,1).toUpperCase()}
                </span>
              </div>
            )}
            {/* Bottom fade */}
            <div className="absolute inset-x-0 bottom-0 h-20"
              style={{ background: "linear-gradient(to bottom, transparent, #000)" }} />
          </div>
        </div>

        {/* ── Centered content ── */}
        <div className="max-w-2xl mx-auto px-6 pb-20 -mt-10 space-y-6">

          {/* Logo + title block */}
          <div className="flex flex-col items-center text-center space-y-3">
            {/* Logo — overlaps banner */}
            <div className="w-16 h-16 rounded-xl border-[3px] border-black overflow-hidden bg-zinc-900 flex items-center justify-center flex-shrink-0 shadow-xl">
              {drop.project?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={drop.project.logo_url} alt={drop.project.name} className="w-full h-full object-cover" />
              ) : drop.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={drop.image_url} alt={drop.title} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-black text-xl" style={DISPLAY}>{drop.title.slice(0,1)}</span>
              )}
            </div>

            {/* Title + badges */}
            <div className="space-y-2">
              <h1 className="text-white font-black text-2xl sm:text-3xl leading-tight" style={DISPLAY}>{drop.title}</h1>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-full bg-blue-900/25 text-blue-300 border border-blue-900/30">
                  {typeLabel}
                </span>
                {drop.tier === "featured" && (
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">
                    Featured
                  </span>
                )}
              </div>
              {drop.project && (
                <Link href={`/projects/${drop.partner_address}`}
                  className="inline-flex items-center gap-1.5 text-zinc-600 text-xs hover:text-zinc-400 transition-colors">
                  by {drop.project.name}
                  <span className="text-zinc-700">↗</span>
                </Link>
              )}
            </div>

            {/* Stat pills */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <StatPill label="Entries"  value={entryCount.toLocaleString()} />
              <StatPill label="Winners"  value={drop.winner_count.toString()} color="text-green-400" />
              <StatPill label={isDrawn ? "Status" : "Ends"} value={isDrawn ? "Complete" : endsAtFmt} />
              <StatPill label="Type"     value={typeLabel} />
            </div>

            {/* Share bar */}
            <ShareBar title={drop.title} dropUrl={`${SITE_URL}/drops/${drop.id}`} />
          </div>

          {/* ── Entry panel ── */}
          <DropEntry drop={drop} tasks={tasks} isActive={isActive} isEnded={isEnded || isDrawn} />

          {/* ── Description ── */}
          {drop.description && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-5 space-y-2">
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.18em]">About</p>
              <p className="text-zinc-300 text-sm leading-relaxed">{drop.description}</p>
            </div>
          )}

          {/* ── Prize details ── */}
          {Object.keys(drop.prize_details ?? {}).length > 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-5 space-y-2">
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.18em]">Prize details</p>
              <pre className="text-zinc-300 text-sm font-mono whitespace-pre-wrap">
                {JSON.stringify(drop.prize_details, null, 2)}
              </pre>
            </div>
          )}

          {/* ── Winners ── */}
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
                    <a href={`https://basescan.org/address/${w}`} target="_blank" rel="noopener noreferrer"
                      className="text-zinc-600 text-[10px] hover:text-zinc-400 transition-colors">
                      Basescan ↗
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-white/[0.05] px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <span className="text-zinc-700 text-[11px]">Built on Base · 2026</span>
          <Link href="/drops" className="text-zinc-600 text-[11px] hover:text-zinc-400 transition-colors">← All drops</Link>
        </div>
      </footer>
    </div>
  );
}
