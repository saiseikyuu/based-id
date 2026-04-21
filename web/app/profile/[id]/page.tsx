import { createPublicClient, http, parseAbiItem } from "viem";
import { base, baseSepolia, mainnet } from "viem/chains";
import { BASED_ID_ADDRESS, BASED_ID_ABI, BASESCAN_URL } from "@/lib/contracts";
import { NftCard } from "../../NftCard";
import { TipButton } from "../TipButton";
import Link from "next/link";
import type { Metadata } from "next";

const chain = process.env.NEXT_PUBLIC_CHAIN_ID === "8453" ? base : baseSepolia;

function getClient() {
  return createPublicClient({ chain, transport: http() });
}

function getTier(id: number) {
  if (id <= 100) return "GENESIS";
  if (id <= 1000) return "FOUNDING";
  if (id <= 10000) return "PIONEER";
  return "BUILDER";
}

function addressToHue(address: string): number {
  return parseInt(address.slice(2, 6), 16) % 360;
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

async function resolveEns(address: string): Promise<string | null> {
  try {
    const ensClient = createPublicClient({ chain: mainnet, transport: http() });
    return await withTimeout(
      ensClient.getEnsName({ address: address as `0x${string}` }),
      3000
    );
  } catch {
    return null;
  }
}

async function fetchOtherIds(
  client: ReturnType<typeof getClient>,
  holder: string,
  currentId: number
): Promise<number[]> {
  try {
    const logs = await client.getLogs({
      address: BASED_ID_ADDRESS,
      event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"),
      args: { to: holder as `0x${string}` },
      fromBlock: BigInt(0),
      toBlock: "latest",
    });
    const candidates = [...new Set(
      logs.map((l) => Number(l.args.tokenId)).filter((id) => id !== currentId),
    )].sort((a, b) => a - b).slice(0, 10);
    if (candidates.length === 0) return [];
    const results = await Promise.allSettled(
      candidates.map((id) =>
        client.readContract({ address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "ownerOf", args: [BigInt(id)] })
      )
    );
    return candidates.filter((_, i) => {
      const r = results[i];
      return r.status === "fulfilled" && (r.value as string).toLowerCase() === holder.toLowerCase();
    }).slice(0, 6);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const n = parseInt(id);
  if (isNaN(n) || n < 1) return { title: "Based ID" };
  const tier = getTier(n);
  const weight = (1 / Math.sqrt(n)).toFixed(4);
  return {
    title: `Based ID #${n} — basedid.space`,
    description: `${tier} tier · $BASED weight: ${weight}× · View and share onchain.`,
    openGraph: {
      title: `Based ID #${n}`,
      description: `${tier} · weight ${weight}× · basedid.space`,
      images: [{ url: `https://basedid.space/api/frame/image?id=${n}`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: `Based ID #${n}`, images: [`https://basedid.space/api/frame/image?id=${n}`] },
    other: {
      "fc:frame": "vNext",
      "fc:frame:image": `https://basedid.space/api/frame/image?id=${n}`,
      "fc:frame:image:aspect_ratio": "1.91:1",
      "fc:frame:button:1": "Mint your Based ID →",
      "fc:frame:button:1:action": "link",
      "fc:frame:button:1:target": "https://basedid.space",
    },
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tokenId = parseInt(id);

  if (isNaN(tokenId) || tokenId < 1) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-zinc-500 text-sm">Invalid ID.</p>
          <Link href="/" className="text-blue-400 text-sm hover:underline">← Back to home</Link>
        </div>
      </div>
    );
  }

  const client = getClient();
  let holder: string | null = null;
  try {
    holder = (await client.readContract({
      address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "ownerOf", args: [BigInt(tokenId)],
    })) as string;
  } catch { /* not minted yet */ }

  const tier = getTier(tokenId);
  const weight = (1 / Math.sqrt(tokenId)).toFixed(6);

  let activity: { score: number; txCount: number; ageDays: number; uniqueContracts: number; grade: string } | null = null;
  let ensName: string | null = null;
  let otherIds: number[] = [];

  if (holder) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
    const [activityRes, ensRes, otherIdsRes] = await Promise.allSettled([
      withTimeout(
        fetch(`${baseUrl}/api/activity/${holder}`, { next: { revalidate: 3600 } }).then((r) => r.ok ? r.json() : null),
        4000
      ),
      resolveEns(holder),
      withTimeout(fetchOtherIds(client, holder, tokenId), 4000),
    ]);
    if (activityRes.status === "fulfilled") activity = activityRes.value;
    if (ensRes.status === "fulfilled") ensName = ensRes.value;
    if (otherIdsRes.status === "fulfilled") otherIds = otherIdsRes.value ?? [];
  }

  const bars = activity ? [
    { label: "Transactions", value: activity.txCount, max: 500, display: `${activity.txCount}`, unit: "txs" },
    { label: "Wallet Age", value: activity.ageDays, max: 365, display: `${activity.ageDays}`, unit: "days" },
    { label: "Protocols", value: activity.uniqueContracts, max: 50, display: `${activity.uniqueContracts}`, unit: "used" },
  ] : [];

  const shareText = holder
    ? `Based ID #${tokenId} — ${tier} tier · weight ${(1 / Math.sqrt(tokenId)).toFixed(4)}×\n\nMint yours for $2 → basedid.space\n\n@basedidofficial`
    : `Based ID #${tokenId} is still unclaimed.\n\nMint it for $2 → basedid.space\n\n@basedidofficial`;

  const tierGlow =
    tier === "GENESIS" ? "rgba(251,191,36,0.12)" :
    tier === "FOUNDING" ? "rgba(59,130,246,0.10)" :
    tier === "PIONEER" ? "rgba(161,161,170,0.07)" :
    "rgba(82,82,91,0.06)";

  const tierBorder =
    tier === "GENESIS" ? "border-amber-400/20" :
    tier === "FOUNDING" ? "border-blue-400/20" :
    "border-white/[0.06]";

  const tierText =
    tier === "GENESIS" ? "text-amber-400" :
    tier === "FOUNDING" ? "text-blue-400" :
    tier === "PIONEER" ? "text-zinc-300" :
    "text-zinc-500";

  const tierBg =
    tier === "GENESIS" ? "bg-amber-400/10 border-amber-400/20 text-amber-400" :
    tier === "FOUNDING" ? "bg-blue-400/10 border-blue-400/20 text-blue-400" :
    "bg-zinc-800 border-zinc-700 text-zinc-400";

  const rarityNote =
    tier === "GENESIS" ? "1 of 100 Genesis IDs — maximum $BASED weight" :
    tier === "FOUNDING" ? "1 of 900 Founding IDs — top 1% of supply" :
    tier === "PIONEER" ? "Top 1,000–10,000 — Pioneer tier" :
    null;

  return (
    <div className="min-h-screen bg-background">

      {/* Nav */}
      <div className="border-b border-white/[0.05] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-zinc-500 text-[11px] uppercase tracking-[0.2em] hover:text-white transition-colors">
            ← Based ID
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/leaderboard" className="text-zinc-600 text-[11px] uppercase tracking-[0.15em] hover:text-white transition-colors">
              Leaderboard
            </Link>
            <Link href="/dashboard" className="text-zinc-600 text-[11px] uppercase tracking-[0.15em] hover:text-white transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/[0.04]">
        {/* Ambient tier glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 50% at 55% -10%, ${tierGlow}, transparent 70%)`,
          }}
        />
        <div className="relative max-w-5xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* NFT Card */}
            <div className="w-full max-w-[360px] mx-auto lg:mx-0">
              <NftCard id={`#${tokenId}`} holder={holder ?? "not minted yet"} />
            </div>

            {/* Identity block */}
            <div className="space-y-7">
              {/* Tier pill */}
              <div>
                <span className={`inline-flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-[0.15em] border ${tierBg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    tier === "GENESIS" ? "bg-amber-400" :
                    tier === "FOUNDING" ? "bg-blue-400" : "bg-zinc-500"
                  }`} />
                  {tier} Tier
                </span>
              </div>

              {/* Big ID */}
              <div>
                <p className="text-zinc-600 text-[11px] uppercase tracking-[0.25em] mb-3">Based ID</p>
                <h1
                  className={`font-black leading-none ${tokenId < 100 ? "text-8xl" : tokenId < 10000 ? "text-7xl" : "text-6xl"} ${tierText}`}
                  style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
                >
                  #{tokenId}
                </h1>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-6 pt-2">
                <div>
                  <p className="text-white font-bold text-xl tabular-nums">{parseFloat(weight).toFixed(4)}×</p>
                  <p className="text-zinc-600 text-[10px] uppercase tracking-[0.12em] mt-1.5">$BASED Weight</p>
                </div>
                <div>
                  <p className="text-white font-bold text-xl">2</p>
                  <p className="text-zinc-600 text-[10px] uppercase tracking-[0.12em] mt-1.5">Snapshots</p>
                </div>
                <div>
                  <p className={`font-bold text-xl ${tierText}`}>1B</p>
                  <p className="text-zinc-600 text-[10px] uppercase tracking-[0.12em] mt-1.5">$BASED Pool</p>
                </div>
              </div>

              {/* Rarity note */}
              {rarityNote && (
                <div className={`flex items-center gap-2 text-xs ${tierText} opacity-70`}>
                  <span className={`w-1 h-1 rounded-full flex-shrink-0 ${
                    tier === "GENESIS" ? "bg-amber-400" :
                    tier === "FOUNDING" ? "bg-blue-400" : "bg-zinc-500"
                  }`} />
                  {rarityNote}
                </div>
              )}

              {/* Share + Basescan links */}
              <div className="flex items-center gap-3 pt-1">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.07] text-zinc-400 text-xs font-medium hover:text-white hover:border-white/[0.15] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Share on X
                </a>
                {holder && (
                  <a
                    href={`${BASESCAN_URL}/nft/${BASED_ID_ADDRESS}/${tokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/[0.07] text-zinc-500 text-xs hover:text-zinc-300 transition-colors"
                  >
                    Basescan ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left column — holder + activity */}
          <div className="lg:col-span-3 space-y-5">

            {holder ? (
              <>
                {/* Holder card */}
                <div className={`rounded-2xl border ${tierBorder} overflow-hidden`} style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 100%)` }}>
                  <div className="px-6 pt-6 pb-5 flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                      style={{
                        background: `hsl(${addressToHue(holder)}, 45%, 13%)`,
                        border: `1.5px solid hsl(${addressToHue(holder)}, 50%, 22%)`,
                        color: `hsl(${addressToHue(holder)}, 70%, 62%)`,
                      }}
                    >
                      {holder.slice(2, 4).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      {ensName ? (
                        <>
                          <p className="text-white font-semibold text-base truncate">{ensName}</p>
                          <a
                            href={`${BASESCAN_URL}/address/${holder}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-zinc-500 font-mono text-xs hover:text-zinc-300 transition-colors"
                          >
                            {shortAddress(holder)}
                          </a>
                        </>
                      ) : (
                        <a
                          href={`${BASESCAN_URL}/address/${holder}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-blue-400 font-mono text-sm hover:text-blue-300 transition-colors break-all block"
                        >
                          {holder}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-white/[0.05] px-6 py-3.5 flex items-center justify-between bg-white/[0.01]">
                    <div className="flex items-center gap-4">
                      <span className={`text-[10px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full border ${tierBg}`}>
                        {tier}
                      </span>
                      <span className="text-zinc-500 text-[11px] font-mono">{parseFloat(weight).toFixed(4)}× weight</span>
                    </div>
                    <TipButton holder={holder} />
                  </div>
                </div>

                {/* Activity breakdown */}
                {activity && (
                  <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold text-sm">Base Activity Score</p>
                        <p className="text-zinc-600 text-[11px] mt-0.5">Onchain reputation for this wallet</p>
                      </div>
                      <div className={`text-center px-4 py-2 rounded-xl border font-mono ${
                        activity.grade === "S" ? "bg-amber-400/10 border-amber-400/20 text-amber-400" :
                        activity.grade === "A" ? "bg-blue-400/10 border-blue-400/20 text-blue-400" :
                        activity.grade === "B" ? "bg-zinc-400/10 border-zinc-400/20 text-zinc-300" :
                        "bg-zinc-800/60 border-zinc-700 text-zinc-500"
                      }`}>
                        <p className="text-2xl font-black leading-none">{activity.grade}</p>
                        <p className="text-[10px] mt-0.5 opacity-70">{activity.score} pts</p>
                      </div>
                    </div>

                    {/* Bars */}
                    <div className="px-6 py-5 space-y-4">
                      {bars.map(({ label, value, max, display, unit }) => {
                        const pct = Math.min(100, (value / max) * 100);
                        const barColor = pct >= 80 ? "#f59e0b" : pct >= 50 ? "#3b82f6" : pct >= 20 ? "#71717a" : "#3f3f46";
                        return (
                          <div key={label}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-zinc-400 text-xs font-medium">{label}</span>
                              <span className="text-zinc-400 text-xs font-mono tabular-nums">
                                <span className="text-white font-semibold">{display}</span>
                                <span className="text-zinc-600 ml-1">/ {max} {unit}</span>
                              </span>
                            </div>
                            <div className="w-full bg-white/[0.04] rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-1.5 rounded-full transition-all"
                                style={{ width: `${pct}%`, background: barColor }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="px-6 pb-4">
                      <p className="text-zinc-700 text-[10px] leading-relaxed">
                        Weighted composite: transactions (40%) · wallet age (30%) · protocol diversity (30%)
                      </p>
                    </div>
                  </div>
                )}

                {/* Other IDs */}
                {otherIds.length > 0 && (
                  <div className="rounded-2xl border border-white/[0.06] px-6 py-5 space-y-4">
                    <div>
                      <p className="text-white font-semibold text-sm">Also Holds</p>
                      <p className="text-zinc-600 text-[11px] mt-0.5">Other Based IDs in this wallet</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {otherIds.map((oid) => {
                        const t = getTier(oid);
                        return (
                          <Link
                            key={oid}
                            href={`/profile/${oid}`}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all hover:scale-[1.02] ${
                              t === "GENESIS" ? "border-amber-400/20 text-amber-400 bg-amber-400/5 hover:bg-amber-400/10" :
                              t === "FOUNDING" ? "border-blue-400/20 text-blue-400 bg-blue-400/5 hover:bg-blue-400/10" :
                              "border-white/[0.07] text-zinc-400 bg-white/[0.02] hover:bg-white/[0.04]"
                            }`}
                          >
                            <span className="font-bold">#{oid}</span>
                            <span className="opacity-50 text-[10px] uppercase tracking-[0.1em]">{t.slice(0, 3)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.01] p-8 space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mx-auto">
                  <span className="text-zinc-600 text-lg">?</span>
                </div>
                <div className="space-y-1">
                  <p className="text-white font-semibold">This ID hasn&apos;t been minted yet</p>
                  <p className="text-zinc-500 text-sm">Claim it for $2 USDC — permanently yours on Base.</p>
                </div>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-100 transition-colors"
                >
                  Mint Now — $2 USDC
                </Link>
              </div>
            )}
          </div>

          {/* Right column — weight + actions */}
          <div className="lg:col-span-2 space-y-5">

            {/* Weight card */}
            <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <p className="text-white font-semibold text-sm">Airdrop Weight</p>
                <p className="text-zinc-600 text-[11px] mt-0.5">$BASED allocation formula</p>
              </div>
              <div className="px-5 py-5 space-y-4">
                <div className="bg-white/[0.02] rounded-xl px-4 py-3 font-mono text-sm text-zinc-400 border border-white/[0.04]">
                  1 ÷ √{tokenId} = <span className="text-white font-bold">{parseFloat(weight).toFixed(4)}</span>×
                </div>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600">Snapshot 1</span>
                    <span className="text-zinc-400 font-mono">Sep 30, 2026</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600">Snapshot 2</span>
                    <span className="text-zinc-400 font-mono">Dec 31, 2026</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/[0.05] pt-3">
                    <span className="text-zinc-600">Total pool</span>
                    <span className={`font-bold font-mono ${tierText}`}>1,000,000,000 $BASED</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mint CTA (if not already minted — or always show) */}
            {holder && (
              <div className="rounded-2xl border border-white/[0.06] px-5 py-5 space-y-3">
                <p className="text-white font-semibold text-sm">Mint Your Own</p>
                <p className="text-zinc-600 text-xs leading-relaxed">Lower IDs earn proportionally more. Get yours for $2 USDC.</p>
                <Link
                  href="/"
                  className="block w-full text-center px-4 py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-100 transition-colors"
                >
                  Get Based ID →
                </Link>
              </div>
            )}

            {/* Leaderboard CTA */}
            <Link
              href="/leaderboard"
              className="flex items-center justify-between px-5 py-4 rounded-2xl border border-white/[0.06] hover:border-white/[0.12] transition-colors group"
            >
              <div>
                <p className="text-white text-sm font-medium">View Leaderboard</p>
                <p className="text-zinc-600 text-[11px] mt-0.5">Top 100 IDs by weight</p>
              </div>
              <span className="text-zinc-600 group-hover:text-white transition-colors text-lg">→</span>
            </Link>

          </div>
        </div>
      </div>
    </div>
  );
}
