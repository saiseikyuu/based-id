"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, usePublicClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { parseAbiItem } from "viem";
import { BASED_ID_ADDRESS, BASED_ID_ABI, DEPLOY_BLOCK } from "@/lib/contracts";
import { HuntersClaim } from "./HuntersClaim";
import { NftCard } from "@/app/NftCard";
import { AuctionsSection } from "./AuctionsSection";

type Tab = "hunter" | "quests" | "ids" | "auctions";

const D: React.CSSProperties = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const BODY: React.CSSProperties = { fontFamily: "var(--font-sans), system-ui, sans-serif" };

const RANK_BADGES = [
  { label: "E", color: "#94a3b8", name: "E-Rank"    },
  { label: "D", color: "#a3e635", name: "D-Rank"    },
  { label: "C", color: "#34d399", name: "C-Rank"    },
  { label: "B", color: "#60a5fa", name: "B-Rank"    },
  { label: "A", color: "#c084fc", name: "A-Rank"    },
  { label: "S", color: "#f97316", name: "S-Rank"    },
  { label: "N", color: "#fcd34d", name: "National"  },
];

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
          <div key={i} className="aspect-[480/270] rounded-2xl bg-gray-100 animate-pulse border border-black/[0.06]" />
        ))}
      </div>
    );
  }

  if (ids.length === 0) {
    return (
      <div className="rounded-2xl px-8 py-16 text-center space-y-4 bg-gray-50 border border-black/[0.07]">
        <p className="text-black font-black text-xl uppercase" style={D}>No Based IDs found</p>
        <p className="text-gray-500 text-sm max-w-xs mx-auto" style={BODY}>Mint one for $2 to unlock drops, your Hunter NFT, and more.</p>
        <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-colors"
          style={{ background: "#0052FF", color: "#fff" }}>
          Mint Based ID — $2 →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <p className="text-gray-500 text-sm" style={BODY}>
          <span className="text-black font-semibold">{ids.length}</span> Based ID{ids.length !== 1 ? "s" : ""}
        </p>
        <div className="h-px flex-1 bg-black/[0.06]" />
        <span className="text-gray-400 text-xs font-mono">
          Weight: {ids.reduce((s, id) => s + 1 / Math.sqrt(Number(id)), 0).toFixed(3)}×
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ids.map(id => (
          <div key={id.toString()} className="space-y-2">
            <NftCard id={`#${id.toString()}`} holder={address} />
            <div className="flex items-center justify-between px-1">
              <span className="text-black font-bold text-sm">#{id.toString()}</span>
              <Link href={`/nft/${id.toString()}`} style={{ color: "#0052FF" }}
                className="text-xs font-semibold hover:opacity-80 transition-opacity">
                View details →
              </Link>
            </div>
          </div>
        ))}
      </div>
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
    <div className="flex-1 bg-white">

      {/* ── HERO — pure black section like "Live Auctions" reference ── */}
      <div className="bg-black text-white">
        <div className="max-w-6xl mx-auto px-6 py-16 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 items-end">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-400 text-xs font-semibold uppercase tracking-[0.2em]" style={D}>Live on Base</span>
              </div>
              <h1 className="font-black text-6xl sm:text-7xl uppercase tracking-tight leading-none" style={D}>
                Based<br />Hunters
              </h1>
              <p className="text-gray-400 text-lg leading-relaxed max-w-md" style={BODY}>
                Claim your Hunter License. Earn XP. Rise through the ranks from E to National.
              </p>
            </div>

            {/* Rank tier row — right side */}
            <div className="space-y-3 lg:text-right">
              <p className="text-gray-600 text-[10px] uppercase tracking-[0.25em]" style={D}>Rank tiers</p>
              <div className="flex items-center gap-2 flex-wrap lg:justify-end">
                {RANK_BADGES.map((r, i) => (
                  <div key={r.label} className="flex items-center gap-2">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ border: `1px solid ${r.color}40`, background: `${r.color}10` }}>
                        <span className="font-black text-base" style={{ color: r.color, ...D }}>{r.label}</span>
                      </div>
                      <span className="text-[9px] text-gray-600 hidden sm:block" style={D}>{r.name}</span>
                    </div>
                    {i < RANK_BADGES.length - 1 && (
                      <span className="text-gray-700 text-xs mb-4">›</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TAB BAR — white bg, black text, blue active underline ── */}
      <div className="sticky top-16 z-40 bg-white border-b border-black/[0.07]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-0 overflow-x-auto no-scrollbar">
            {tabs.map(({ key, label, badge }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className="flex items-center gap-2 px-5 py-4 -mb-px whitespace-nowrap transition-colors"
                style={{
                  borderBottom: activeTab === key ? "2px solid #0052FF" : "2px solid transparent",
                  color: activeTab === key ? "#000000" : "#9ca3af",
                  fontFamily: "var(--font-sans), system-ui, sans-serif",
                  fontWeight: activeTab === key ? 700 : 500,
                  fontSize: "0.875rem",
                }}>
                {label}
                {badge && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded tabular-nums"
                    style={{
                      color: activeTab === key ? "#0052FF" : "#9ca3af",
                      background: activeTab === key ? "rgba(0,82,255,0.08)" : "rgba(0,0,0,0.04)",
                    }}>
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="max-w-6xl mx-auto px-6 py-10 pb-24 md:pb-10">

        {/* HUNTER TAB */}
        {activeTab === "hunter" && (
          !isConnected ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-6 text-center">
              <div className="w-20 h-20 rounded-2xl bg-black flex items-center justify-center mx-auto">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className="font-black text-4xl sm:text-5xl uppercase tracking-tight text-black" style={D}>
                  Connect to Hunt
                </h2>
                <p className="text-gray-500 text-base max-w-sm" style={BODY}>
                  Connect your wallet to claim your Hunter License and start earning XP on Base.
                </p>
              </div>
              <ConnectButton />
            </div>
          ) : (
            <HuntersClaim />
          )
        )}

        {/* QUESTS TAB */}
        {activeTab === "quests" && (
          <div className="space-y-8">
            <div>
              <h2 className="font-black text-3xl uppercase text-black" style={D}>Quests</h2>
              <p className="text-gray-500 text-sm mt-1" style={BODY}>
                Quests are now part of Campaigns. Complete quest campaigns to earn XP.
              </p>
            </div>
            <div className="rounded-2xl px-8 py-16 text-center space-y-6 bg-black">
              <div>
                <p className="font-black text-3xl uppercase text-white mb-3" style={D}>
                  Quests Moved to Campaigns
                </p>
                <p className="text-gray-400 text-sm max-w-sm mx-auto" style={BODY}>
                  All quests are now campaign drops. Filter by &ldquo;Quest&rdquo; to find them.
                </p>
              </div>
              <Link href="/campaigns"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-colors bg-white text-black hover:bg-gray-100">
                Browse Quest Campaigns →
              </Link>
            </div>
          </div>
        )}

        {/* MY IDs TAB */}
        {activeTab === "ids" && (
          <div className="space-y-8">
            <div>
              <h2 className="font-black text-3xl uppercase text-black" style={D}>My IDs</h2>
              <p className="text-gray-500 text-sm mt-1" style={BODY}>Your Based ID NFTs and their $BASED airdrop weight.</p>
            </div>
            {!isConnected ? (
              <div className="rounded-2xl px-8 py-16 text-center space-y-5 bg-gray-50 border border-black/[0.07]">
                <p className="font-black text-xl uppercase text-black" style={D}>Connect wallet to view your IDs</p>
                <ConnectButton />
              </div>
            ) : (
              <MyIdsTab address={address!} />
            )}
          </div>
        )}

        {/* AUCTIONS TAB */}
        {activeTab === "auctions" && (
          <div className="space-y-8">
            <div>
              <h2 className="font-black text-3xl uppercase text-black" style={D}>Auctions</h2>
              <p className="text-gray-500 text-sm mt-1" style={BODY}>Genesis IDs #1–#100 sold via English auction. Bid in USDC.</p>
            </div>
            <AuctionsSection />
          </div>
        )}

      </div>
    </div>
  );
}
