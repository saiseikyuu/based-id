import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { MobileNav } from "@/app/components/MobileNav";
import { CampaignEntry } from "./CampaignEntry";
import { ShareBar } from "./ShareBar";

export const revalidate = 30;

const DISPLAY = { fontFamily: "var(--font-display), system-ui, sans-serif" };

const TYPE_LABELS: Record<string, string> = {
  quest: "Quest", whitelist: "Whitelist", raffle: "Raffle", token_drop: "Token Drop", nft_mint: "NFT Mint",
};

async function getCampaign(id: string) {
  try {
    const db = createServerClient();
    const { data } = await db
      .from("campaigns")
      .select("*, tasks(*)")
      .eq("id", id)
      .in("status", ["active", "ended", "drawn", "completed"])
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
      .eq("campaign_id", id)
      .eq("status", "entered");
    return count ?? 0;
  } catch { return 0; }
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://basedid.space";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) return { title: "Campaign not found" };
  const title = `${campaign.title} — Based ID`;
  const description = campaign.description || `${TYPE_LABELS[campaign.type] ?? "Campaign"} on Based ID.`;
  const campaignUrl = `${SITE_URL}/campaigns/${id}`;
  const frameImg    = `${SITE_URL}/api/frames/campaigns/${id}/image`;

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
      "fc:frame":                    "vNext",
      "fc:frame:image":              frameImg,
      "fc:frame:image:aspect_ratio": "1.91:1",
      "fc:frame:button:1":           "Enter Campaign →",
      "fc:frame:button:1:action":    "link",
      "fc:frame:button:1:target":    campaignUrl,
      "fc:frame:button:2":           `${TYPE_LABELS[campaign.type] ?? campaign.type}`,
      "fc:frame:button:2:action":    "link",
      "fc:frame:button:2:target":    campaignUrl,
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

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaign, entryCount] = await Promise.all([getCampaign(id), getEntryCount(id)]);

  if (!campaign) notFound();

  const isActive    = campaign.status === "active" && new Date(campaign.ends_at) > new Date();
  const isEnded     = campaign.status === "ended"  || campaign.status === "completed" || (campaign.status === "active" && new Date(campaign.ends_at) <= new Date());
  const isDrawn     = campaign.status === "drawn";
  const isCompleted = campaign.status === "completed";
  const typeLabel   = TYPE_LABELS[campaign.type] ?? campaign.type;
  const isQuest     = campaign.type === "quest";
  const tasks       = (campaign.tasks ?? []).filter((t: { type: string }) => t.type !== "join_discord");
  const winners     = campaign.winners ?? [];
  const xpReward    = campaign.xp_reward as number | undefined;
  const minRankTask = tasks.find((t: { type: string; params: Record<string, unknown> }) => t.type === "min_hunter_rank");
  const minRank     = minRankTask ? String(minRankTask.params.rank ?? "E") : null;

  const endsAtFmt = new Date(campaign.ends_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  }) + " UTC";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b border-white/[0.05] bg-black/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
          <Link href="/campaigns" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm">
            ← Campaigns
          </Link>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500 animate-pulse" : "bg-zinc-600"}`} />
            <span className={`text-[11px] font-medium ${isActive ? "text-green-400" : "text-zinc-500"}`}>
              {isDrawn ? "Drawn" : isCompleted ? "Completed" : isEnded ? "Ended" : "Live"}
            </span>
          </div>
        </div>
      </header>
      <MobileNav />

      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-10 pb-20">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[11px] text-zinc-600 mb-8">
            <Link href="/campaigns" className="hover:text-zinc-400 transition-colors">Campaigns</Link>
            <span>/</span>
            <span className="text-zinc-400 truncate">{campaign.title}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 items-start">

            {/* Left — image + share */}
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden border border-white/[0.07] bg-zinc-950 aspect-square relative">
                {campaign.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={campaign.image_url} alt={campaign.title}
                    className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #0d1117 0%, #060608 100%)" }}>
                    <span className="text-zinc-800 font-black text-[100px] leading-none" style={DISPLAY}>
                      {campaign.title.slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <ShareBar title={campaign.title} dropUrl={`${SITE_URL}/campaigns/${campaign.id}`} />
            </div>

            {/* Right — info + entry */}
            <div className="space-y-5 lg:sticky lg:top-20">

              {/* Project attribution */}
              {campaign.project && (
                <Link href={`/projects/${campaign.partner_address}`}
                  className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
                  {campaign.project.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={campaign.project.logo_url} alt={campaign.project.name}
                      className="w-5 h-5 rounded-md object-cover border border-white/[0.1]" />
                  ) : (
                    <div className="w-5 h-5 rounded-md bg-zinc-800 flex items-center justify-center">
                      <span className="text-zinc-400 text-[9px] font-bold">{campaign.project.name.slice(0, 1)}</span>
                    </div>
                  )}
                  <span className="text-zinc-500 text-xs">{campaign.project.name}</span>
                  <span className="text-zinc-700 text-[10px]">↗</span>
                </Link>
              )}

              {/* Title + badges */}
              <div className="space-y-2">
                <h1 className="text-white font-black text-2xl sm:text-3xl leading-tight" style={DISPLAY}>{campaign.title}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-full border ${
                    isQuest
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "bg-blue-900/25 text-blue-300 border-blue-900/30"
                  }`}>
                    {typeLabel}
                  </span>
                  {campaign.tier === "featured" && (
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">
                      Featured
                    </span>
                  )}
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                    isActive
                      ? "text-green-400 border-green-900/40 bg-green-950/20"
                      : isDrawn
                      ? "text-blue-400 border-blue-900/40 bg-blue-950/20"
                      : isCompleted
                      ? "text-purple-400 border-purple-900/40 bg-purple-950/20"
                      : "text-zinc-500 border-zinc-800"
                  }`}>
                    {isDrawn ? "Drawn" : isCompleted ? "Completed" : isEnded ? "Ended" : "Live"}
                  </span>
                </div>
              </div>

              {/* XP reward — quest only */}
              {isQuest && xpReward && xpReward > 0 && (
                <div className="flex items-center gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/[0.05]">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-blue-300 font-bold text-lg leading-none">+{xpReward} XP</p>
                    <p className="text-zinc-500 text-xs mt-0.5">Your Hunter rank gives a bonus multiplier</p>
                  </div>
                </div>
              )}

              {/* Rank gate notice */}
              {minRank && (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <p className="text-amber-300 text-xs font-medium">
                    Requires <span className="font-bold">{minRank}</span> Hunter rank or above
                  </p>
                </div>
              )}

              {/* Stat pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <StatPill label="Entries" value={entryCount.toLocaleString()} />
                {!isQuest && (
                  <StatPill label="Winners" value={campaign.winner_count.toString()} color="text-green-400" />
                )}
                <StatPill label={isDrawn || isCompleted ? "Status" : "Ends"} value={isDrawn ? "Complete" : isCompleted ? "Completed" : endsAtFmt} />
              </div>

              {/* Entry / claim panel */}
              <CampaignEntry campaign={campaign} tasks={tasks} isActive={isActive} isEnded={isEnded || isDrawn || isCompleted} />

              {/* Description */}
              {campaign.description && (
                <div className="space-y-1.5">
                  <p className="text-zinc-600 text-[10px] uppercase tracking-[0.18em]">About</p>
                  <p className="text-zinc-400 text-sm leading-relaxed">{campaign.description}</p>
                </div>
              )}

              {/* Prize details — non-quest only */}
              {!isQuest && Object.keys(campaign.prize_details ?? {}).length > 0 && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4 space-y-3">
                  <p className="text-zinc-600 text-[10px] uppercase tracking-[0.18em]">Prize details</p>
                  <div className="space-y-2">
                    {Object.entries(campaign.prize_details as Record<string, unknown>).map(([key, val]) => (
                      <div key={key} className="flex items-start gap-3">
                        <span className="text-zinc-600 text-xs capitalize min-w-[90px] flex-shrink-0">
                          {key.replace(/_/g, " ")}
                        </span>
                        <span className="text-zinc-200 text-xs font-medium">
                          {typeof val === "object" ? JSON.stringify(val) : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Winners */}
              {isDrawn && winners.length > 0 && (
                <div className="space-y-3">
                  <p className="text-green-400 text-[11px] uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    Winners
                  </p>
                  <div className="rounded-xl border border-green-900/25 bg-green-950/[0.06] divide-y divide-white/[0.04] overflow-hidden">
                    {winners.map((w: string) => (
                      <div key={w} className="px-4 py-3 flex items-center justify-between">
                        <span className="font-mono text-green-300 text-sm">{w.slice(0, 6)}…{w.slice(-4)}</span>
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
        </div>
      </div>

      <footer className="border-t border-white/[0.05] px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <span className="text-zinc-700 text-[11px]">Built on Base · 2026</span>
          <Link href="/campaigns" className="text-zinc-600 text-[11px] hover:text-zinc-400 transition-colors">← All campaigns</Link>
        </div>
      </footer>
    </div>
  );
}
