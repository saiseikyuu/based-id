"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useReadContract, usePublicClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { parseAbiItem } from "viem";
import { BASED_ID_ADDRESS, BASED_ID_ABI, DEPLOY_BLOCK } from "@/lib/contracts";
import { HuntersClaim } from "./HuntersClaim";
import { QuestsClient } from "@/app/quests/QuestsClient";
import { NftCard } from "@/app/NftCard";
import { AuctionsSection } from "./AuctionsSection";

type Tab = "hunter" | "quests" | "ids" | "auctions";

const D: React.CSSProperties = { fontFamily: "var(--font-display), system-ui, sans-serif" };

async function findAllTokens(client: ReturnType<typeof usePublicClient>, address: string): Promise<bigint[]> {
  if (!client) return [];
  let targetCount = 0;
  let total = 0;
  try {
    const [bal, minted] = await Promise.all([
      client.readContract({ address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "balanceOf", args: [address as `0x${string}`] }) as Promise<bigint>,
      client.readContract({ address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "totalMinted" }) as Promise<bigint>,
    ]);
    targetCount = Number(bal);
    total = Number(minted);
  } catch { return []; }
  if (targetCount === 0) return [];
  try {
    const [inLogs, outLogs] = await Promise.all([
      client.getLogs({ address: BASED_ID_ADDRESS, event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"), args: { to: address as `0x${string}` }, fromBlock: DEPLOY_BLOCK, toBlock: "latest" }),
      client.getLogs({ address: BASED_ID_ADDRESS, event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"), args: { from: address as `0x${string}` }, fromBlock: DEPLOY_BLOCK, toBlock: "latest" }),
    ]);
    const outIds = new Set(outLogs.map(l => l.args.tokenId?.toString()).filter(Boolean));
    const held = inLogs.map(l => l.args.tokenId?.toString()).filter((id): id is string => !!id && !outIds.has(id)).map(BigInt);
    if (held.length === targetCount) return held.sort((a, b) => (a < b ? -1 : 1));
  } catch { /* fall through */ }
  const range = Array.from({ length: Math.max(total, targetCount) }, (_, i) => BigInt(i + 1));
  const results = await client.multicall({ contracts: range.map(id => ({ address: BASED_ID_ADDRESS as `0x${string}`, abi: BASED_ID_ABI, functionName: "ownerOf" as const, args: [id] as [bigint] })), allowFailure: true });
  return range.filter((_, i) => results[i].status === "success" && (results[i].result as string).toLowerCase() === address.toLowerCase()).sort((a, b) => (a < b ? -1 : 1));
}

function MyIdsTab({ address }: { address: string }) {
  const publicClient = usePublicClient();
  const [ids, setIds] = useState<bigint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicClient || !address) return;
    setLoading(true);
    findAllTokens(publicClient, address).then(found => { setIds(found); setLoading(false); });
  }, [publicClient, address]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="aspect-[480/270] rounded-2xl bg-white/[0.03] animate-pulse border border-white/[0.05]" />
        ))}
      </div>
    );
  }

  if (ids.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] px-8 py-16 text-center space-y-4">
        <p className="text-zinc-400 font-bold text-lg">No Based IDs found</p>
        <p className="text-zinc-600 text-sm">Mint one for $2 to unlock drops, Hunter NFT, and more.</p>
        <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors">
          Mint Based ID — $2 →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <p className="text-zinc-500 text-sm"><span className="text-white font-semibold">{ids.length}</span> Based ID{ids.length !== 1 ? "s" : ""}</p>
        <div className="h-px flex-1 bg-white/[0.05]" />
        <span className="text-zinc-600 text-xs font-mono">
          Weight: {ids.reduce((s, id) => s + 1 / Math.sqrt(Number(id)), 0).toFixed(3)}×
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ids.map(id => (
          <div key={id.toString()} className="space-y-2">
            <NftCard id={`#${id.toString()}`} holder={address} />
            <div className="flex items-center justify-between px-1">
              <span className="text-zinc-400 font-bold text-sm">#{id.toString()}</span>
              <div className="flex items-center gap-3 text-[11px]">
                <Link href={`/profile/${id.toString()}`} className="text-blue-400 hover:text-blue-300 transition-colors">Profile →</Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuctionsTab() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] px-8 py-16 text-center space-y-4">
      <div className="w-12 h-12 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] flex items-center justify-center mx-auto">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <div className="space-y-2">
        <p className="text-amber-400 font-bold text-lg">Genesis Vault — IDs #1–#100</p>
        <p className="text-zinc-500 text-sm max-w-sm mx-auto">
          The 100 lowest IDs will be auctioned starting around the 1,000 mint mark.
          Auctions go live here when they open.
        </p>
      </div>
      <Link href="/dashboard" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.08] text-zinc-300 text-sm font-medium hover:border-white/[0.16] transition-colors">
        View auction dashboard →
      </Link>
    </div>
  );
}

export function HuntersHub() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<Tab>("hunter");

  const { data: idBalance } = useReadContract({
    address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const idCount = idBalance !== undefined ? Number(idBalance as bigint) : null;

  const tabs: { key: Tab; label: string; badge?: string }[] = [
    { key: "hunter",   label: "Hunter"   },
    { key: "quests",   label: "Quests"   },
    { key: "ids",      label: "My IDs",  badge: idCount !== null && idCount > 0 ? idCount.toString() : undefined },
    { key: "auctions", label: "Auctions" },
  ];

  return (
    <div className="flex-1">
      {/* Tab bar */}
      <div className="border-b border-white/[0.05] sticky top-14 z-40 bg-black/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-0 overflow-x-auto no-scrollbar">
            {tabs.map(({ key, label, badge }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                  activeTab === key
                    ? "border-white text-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}>
                {label}
                {badge && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded tabular-nums ${
                    activeTab === key ? "text-zinc-400 bg-white/[0.08]" : "text-zinc-600 bg-white/[0.04]"
                  }`}>{badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-6xl mx-auto px-6 py-10 pb-24 md:pb-10">
        {activeTab === "hunter" && <HuntersClaim />}
        {activeTab === "quests" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-black text-white" style={D}>Quests</h2>
              <p className="text-zinc-500 text-sm mt-1">Complete quests to earn bonus XP toward your Hunter rank.</p>
            </div>
            {!isConnected ? (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] px-8 py-16 text-center space-y-5">
                <p className="text-white font-bold text-lg">Connect wallet to see your quests</p>
                <ConnectButton />
              </div>
            ) : (
              <QuestsClient />
            )}
          </div>
        )}
        {activeTab === "ids" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-black text-white" style={D}>My IDs</h2>
              <p className="text-zinc-500 text-sm mt-1">Your Based ID NFTs and their weight.</p>
            </div>
            {!isConnected ? (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] px-8 py-16 text-center space-y-5">
                <p className="text-white font-bold text-lg">Connect wallet to view your IDs</p>
                <ConnectButton />
              </div>
            ) : (
              <MyIdsTab address={address!} />
            )}
          </div>
        )}
        {activeTab === "auctions" && (
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-2xl font-black text-white" style={D}>Auctions</h2>
                <p className="text-zinc-500 text-sm mt-1">Genesis IDs #1–#100 sold via English auction. Bid in USDC.</p>
              </div>
            </div>
            <AuctionsSection />
          </div>
        )}
      </div>
    </div>
  );
}
