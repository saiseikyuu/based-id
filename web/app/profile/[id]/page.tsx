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

const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID === "8453" ? "8453" : "84532";
const BASESCAN_API = `https://api.etherscan.io/v2/api?chainid=${CHAIN_ID}`;

async function fetchActivity(address: string) {
  const apiKey = process.env.BASESCAN_API_KEY ?? "";
  try {
    const [txRes, tokenRes] = await Promise.all([
      fetch(`${BASESCAN_API}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey}`, { cache: "no-store" }),
      fetch(`${BASESCAN_API}&module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey}`, { cache: "no-store" }),
    ]);
    const [txData, tokenData] = await Promise.all([txRes.json(), tokenRes.json()]);
    const txList: { timeStamp: string; to: string | null }[] = txData.status === "1" ? txData.result : [];
    const tokenMoves: number = tokenData.status === "1" ? tokenData.result.length : 0;
    const txCount = txList.length;
    const ageDays = txCount > 0 ? Math.floor((Date.now() / 1000 - parseInt(txList[0].timeStamp)) / 86400) : 0;
    const uniqueContracts = new Set(txList.map((tx) => tx.to?.toLowerCase()).filter(Boolean)).size;
    const txScore       = Math.min(100, (txCount / 500) * 100);
    const ageScore      = Math.min(100, (ageDays / 365) * 100);
    const contractScore = Math.min(100, (uniqueContracts / 50) * 100);
    const tokenScore    = Math.min(100, (tokenMoves / 200) * 100);
    const score = Math.round(txScore * 0.35 + ageScore * 0.25 + contractScore * 0.25 + tokenScore * 0.15);
    const grade = score >= 80 ? "S" : score >= 60 ? "A" : score >= 40 ? "B" : "C";
    return { score, txCount, ageDays, uniqueContracts, tokenMoves, grade };
  } catch {
    return null;
  }
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

  let activity: { score: number; txCount: number; ageDays: number; uniqueContracts: number; tokenMoves: number; grade: string } | null = null;
  let ensName: string | null = null;
  let otherIds: number[] = [];

  if (holder) {
    const [activityRes, ensRes, otherIdsRes] = await Promise.allSettled([
      withTimeout(fetchActivity(holder), 5000),
      resolveEns(holder),
      withTimeout(fetchOtherIds(client, holder, tokenId), 4000),
    ]);
    if (activityRes.status === "fulfilled") activity = activityRes.value;
    if (ensRes.status === "fulfilled") ensName = ensRes.value;
    if (otherIdsRes.status === "fulfilled") otherIds = otherIdsRes.value ?? [];
  }


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
      <header className="sticky top-0 z-50 border-b border-white/[0.04] bg-black/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Based ID" className="w-7 h-7 rounded-lg" />
            <div className="flex items-center gap-1">
              <span style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }} className="font-bold text-sm text-white tracking-tight">Based</span>
              <span className="font-mono text-[11px] text-zinc-500 tracking-widest ml-0.5">ID</span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-7">
            <Link href="/leaderboard" className="text-[13px] text-zinc-400 hover:text-white transition-colors">Leaderboard</Link>
            <Link href="/activity"    className="text-[13px] text-zinc-400 hover:text-white transition-colors">Activity</Link>
            <Link href="/dashboard"   className="text-[13px] text-zinc-400 hover:text-white transition-colors">Dashboard</Link>
          </nav>
          <Link
            href="/"
            className="flex-shrink-0 text-[12px] text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.15]"
          >
            Mint →
          </Link>
        </div>
      </header>

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
                {activity && (() => {
                  const R = 30, C = 2 * Math.PI * R;
                  const gradeColor = activity.grade === "S" ? "#f59e0b" : activity.grade === "A" ? "#3b82f6" : activity.grade === "B" ? "#a1a1aa" : "#3f3f46";
                  const gradeText  = activity.grade === "S" ? "text-amber-400" : activity.grade === "A" ? "text-blue-400" : activity.grade === "B" ? "text-zinc-300" : "text-zinc-600";
                  const stats = [
                    { label: "Transactions", value: activity.txCount.toLocaleString(), sub: "on Base" },
                    { label: "Wallet Age",   value: activity.ageDays >= 365 ? `${Math.floor(activity.ageDays / 365)}y ${activity.ageDays % 365}d` : `${activity.ageDays}d`, sub: "since first tx" },
                    { label: "Protocols",    value: activity.uniqueContracts.toLocaleString(), sub: "unique contracts" },
                    { label: "Token Moves",  value: activity.tokenMoves.toLocaleString(), sub: "ERC-20 transfers" },
                  ];
                  return (
                  <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
                    <div className="px-6 py-5 flex items-center gap-6">

                      {/* Score ring */}
                      <div className="flex-shrink-0 flex flex-col items-center gap-1">
                        <svg width="80" height="80" viewBox="0 0 80 80">
                          <circle cx="40" cy="40" r={R} fill="none" stroke="#ffffff08" strokeWidth="5" />
                          <circle cx="40" cy="40" r={R} fill="none"
                            stroke={gradeColor} strokeWidth="5" strokeLinecap="round"
                            strokeDasharray={C}
                            strokeDashoffset={C * (1 - activity.score / 100)}
                            transform="rotate(-90 40 40)"
                            style={{ transition: "stroke-dashoffset 0.6s ease" }}
                          />
                          <text x="40" y="36" textAnchor="middle" fill="white" fontSize="17" fontWeight="800" fontFamily="monospace">{activity.grade}</text>
                          <text x="40" y="50" textAnchor="middle" fill="#52525b" fontSize="9" fontFamily="monospace">{activity.score} pts</text>
                        </svg>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${gradeText}`}>
                          {activity.grade === "S" ? "Elite" : activity.grade === "A" ? "Active" : activity.grade === "B" ? "Regular" : "New"}
                        </p>
                      </div>

                      {/* Stats grid */}
                      <div className="grid grid-cols-2 gap-2.5 flex-1 min-w-0">
                        {stats.map(({ label, value, sub }) => (
                          <div key={label} className="bg-white/[0.025] rounded-xl px-3.5 py-3 border border-white/[0.04]">
                            <p className="text-white font-bold text-base tabular-nums leading-none">{value}</p>
                            <p className="text-zinc-400 text-[11px] font-medium mt-1">{label}</p>
                            <p className="text-zinc-600 text-[10px]">{sub}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="px-6 pb-4 border-t border-white/[0.04] pt-3">
                      <p className="text-zinc-700 text-[10px]">Base Activity Score · txns 35% · age 25% · protocols 25% · token activity 15%</p>
                    </div>
                  </div>
                  );
                })()}

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

      <footer className="border-t border-white/[0.04] mt-12 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <svg width="16" height="16" viewBox="0 0 111 111" fill="none" className="opacity-40">
              <path d="M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6 85.359 0 54.921 0C26.0 0 2.0 22.0 0 50.354H72.943V59.68H0C2.0 88.0 26.0 110.034 54.921 110.034Z" fill="#0052FF"/>
            </svg>
            <span className="text-zinc-700 text-[11px]">Built on Base · 2026</span>
          </div>
          <div className="flex items-center gap-5 text-[11px] text-zinc-700">
            <Link href="/" className="hover:text-zinc-400 transition-colors">Home</Link>
            <Link href="/leaderboard" className="hover:text-zinc-400 transition-colors">Leaderboard</Link>
            <Link href="/dashboard" className="hover:text-zinc-400 transition-colors">Dashboard</Link>
            <a href="https://x.com/basedidofficial" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">@basedidofficial</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
