"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount, useReadContract, useWriteContract,
  useWaitForTransactionReceipt, usePublicClient,
} from "wagmi";
import { parseAbiItem } from "viem";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "motion/react";
import {
  BASED_ID_ADDRESS, BASED_ID_ABI, USDC_ADDRESS, ERC20_ABI, BASESCAN_URL,
  AUCTION_HOUSE_ADDRESS, AUCTION_HOUSE_ABI,
} from "@/lib/contracts";
import { useCountdown, pad } from "@/lib/countdown";
import { NftCard } from "../NftCard";
import CountUp from "../components/CountUp";
import SpotlightCard from "../components/SpotlightCard";
import AnimatedBackground from "../components/AnimatedBackground";
import { MobileNav } from "../components/MobileNav";

const SNAPSHOT_DATE   = new Date("2026-09-30T00:00:00Z");
const SNAPSHOT_2_DATE = new Date("2026-12-31T23:59:59Z");
const SCAN_BATCH = 30;

const D: React.CSSProperties = {
  fontFamily: "var(--font-display), system-ui, sans-serif",
};
const GRAD: React.CSSProperties = {
  background: "linear-gradient(180deg,#93c5fd 0%,#1d4ed8 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};
const AMBER: React.CSSProperties = {
  background: "linear-gradient(180deg,#fde68a,#d97706)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

// ─── Token discovery ─────────────────────────────────────────────────────────

async function findAllTokens(
  client: ReturnType<typeof usePublicClient>,
  address: string,
): Promise<bigint[]> {
  if (!client) return [];

  // Read balance and total supply fresh — don't rely on stale props
  let targetCount = 0;
  let total = 0;
  try {
    const [bal, minted] = await Promise.all([
      client.readContract({ address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "balanceOf", args: [address as `0x${string}`] }) as Promise<bigint>,
      client.readContract({ address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "totalMinted" }) as Promise<bigint>,
    ]);
    targetCount = Number(bal);
    total = Number(minted);
  } catch { /* fall through */ }

  if (targetCount === 0) return [];

  // Fast path: use Transfer events (captures both minted + received)
  try {
    const [inLogs, outLogs] = await Promise.all([
      client.getLogs({
        address: BASED_ID_ADDRESS,
        event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"),
        args: { to: address as `0x${string}` },
        fromBlock: BigInt(0), toBlock: "latest",
      }),
      client.getLogs({
        address: BASED_ID_ADDRESS,
        event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"),
        args: { from: address as `0x${string}` },
        fromBlock: BigInt(0), toBlock: "latest",
      }),
    ]);
    const inIds  = new Set(inLogs.map((l) => l.args.tokenId?.toString()).filter(Boolean));
    const outIds = new Set(outLogs.map((l) => l.args.tokenId?.toString()).filter(Boolean));
    const held = [...inIds].filter((id): id is string => !!id && !outIds.has(id)).map(BigInt);
    if (held.length === targetCount) return held.sort((a, b) => (a < b ? -1 : 1));
  } catch { /* RPC rejected large block range — fall through to ownerOf scan */ }

  // Fallback: ownerOf scan over all minted IDs
  const scanMax = Math.max(total, targetCount);
  const ids: bigint[] = [];
  for (
    let start = 1;
    start <= scanMax && ids.length < targetCount;
    start += SCAN_BATCH
  ) {
    const end = Math.min(start + SCAN_BATCH - 1, scanMax);
    const tokenRange = Array.from({ length: end - start + 1 }, (_, i) => BigInt(start + i));
    const owners = await Promise.all(
      tokenRange.map((id) =>
        client.readContract({
          address: BASED_ID_ADDRESS, abi: BASED_ID_ABI,
          functionName: "ownerOf", args: [id],
        }).then((o) => o as string).catch(() => null)
      )
    );
    owners.forEach((owner, i) => {
      if (owner && owner.toLowerCase() === address.toLowerCase()) ids.push(tokenRange[i]);
    });
  }
  return ids.sort((a, b) => (a < b ? -1 : 1));
}

type Tab = "ids" | "rewards" | "auctions" | "owner";

// ─── Tier system ─────────────────────────────────────────────────────────────

type Tier = { label: string; range: string; color: string; bg: string; gradient: React.CSSProperties };

function getTier(id: bigint): Tier {
  const n = Number(id);
  if (n <= 100)   return {
    label: "Genesis", range: "#1–#100", color: "#f59e0b", bg: "rgba(245,158,11,0.08)",
    gradient: { background: "linear-gradient(135deg,#fde68a,#d97706)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  };
  if (n <= 1000)  return {
    label: "Founding", range: "#101–#1,000", color: "#a78bfa", bg: "rgba(167,139,250,0.08)",
    gradient: { background: "linear-gradient(135deg,#c4b5fd,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  };
  if (n <= 10000) return {
    label: "Pioneer", range: "#1,001–#10,000", color: "#60a5fa", bg: "rgba(96,165,250,0.08)",
    gradient: { background: "linear-gradient(135deg,#93c5fd,#2563eb)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  };
  return {
    label: "Builder", range: "#10,001+", color: "#6b7280", bg: "rgba(107,114,128,0.08)",
    gradient: { background: "linear-gradient(135deg,#9ca3af,#4b5563)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const { data: totalMinted } = useReadContract({
    address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "totalMinted",
    query: { refetchInterval: 10000 },
  });
  const { data: contractOwner } = useReadContract({
    address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "owner",
  });
  const { data: mintingPaused, refetch: refetchPaused } = useReadContract({
    address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "mintingPaused",
    query: { refetchInterval: 10000 },
  });
  const { data: treasuryBalance, refetch: refetchTreasury } = useReadContract({
    address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf",
    args: [BASED_ID_ADDRESS],
    query: { refetchInterval: 15000 },
  });

  const isOwner = !!(address && contractOwner &&
    address.toLowerCase() === (contractOwner as string).toLowerCase());

  const { writeContract: writeWithdraw, data: withdrawTxHash, isPending: withdrawPending } = useWriteContract();
  const { isLoading: withdrawConfirming, isSuccess: withdrawSuccess } =
    useWaitForTransactionReceipt({ hash: withdrawTxHash });

  const { writeContract: writePause, data: pauseTxHash, isPending: pausePending } = useWriteContract();
  const { isLoading: pauseConfirming, isSuccess: pauseSuccess } =
    useWaitForTransactionReceipt({ hash: pauseTxHash });

  const { writeContract: writeRecoverETH, data: recoverETHTxHash, isPending: recoverETHPending } = useWriteContract();
  const { isLoading: recoverETHConfirming, isSuccess: recoverETHSuccess } =
    useWaitForTransactionReceipt({ hash: recoverETHTxHash });

  useEffect(() => { if (withdrawSuccess) refetchTreasury(); }, [withdrawSuccess, refetchTreasury]);
  useEffect(() => { if (pauseSuccess) refetchPaused(); }, [pauseSuccess, refetchPaused]);

  const handleWithdraw  = useCallback(() => writeWithdraw({ address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "withdraw" }), [writeWithdraw]);
  const handleTogglePause = useCallback(() => writePause({ address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "setPaused", args: [!mintingPaused] }), [writePause, mintingPaused]);
  const handleRecoverETH  = useCallback(() => writeRecoverETH({ address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "recoverETH" }), [writeRecoverETH]);

  const [tokenIds, setTokenIds] = useState<bigint[]>([]);
  const [loading, setLoading]   = useState(false);
  const [resolved, setResolved] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("ids");
  const [page, setPage] = useState(0);
  const [previewId, setPreviewId] = useState<bigint | null>(null);
  const PAGE_SIZE = 12;

  const snapshot  = useCountdown(SNAPSHOT_DATE);
  const mintClose = useCountdown(SNAPSHOT_2_DATE);

  useEffect(() => {
    if (!isConnected || !address || !publicClient) {
      setTokenIds([]); setResolved(false); return;
    }
    let cancelled = false;
    setLoading(true); setResolved(false);
    findAllTokens(publicClient, address).then((ids) => {
      if (cancelled) return;
      setTokenIds(ids); setLoading(false); setResolved(true);
    });
    return () => { cancelled = true; };
  }, [address, isConnected, publicClient]);

  const primaryId  = tokenIds.length > 0 ? tokenIds[0] : null;
  const totalPages = Math.ceil(tokenIds.length / PAGE_SIZE);
  const visibleIds = tokenIds.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // ── Not connected ────────────────────────────────────────────────────────
  if (!isConnected) {
    const nextId = totalMinted !== undefined ? Number(totalMinted) + 1 : 1;
    return (
      <Shell>
        <div className="relative overflow-hidden">
          {/* Ambient tier glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 50% 40% at 50% 0%, rgba(37,99,235,0.08), transparent 70%)",
            }}
          />

          <motion.div
            className="relative max-w-5xl mx-auto px-6 pt-14 pb-20"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Eyebrow */}
            <div className="flex items-center gap-2.5 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <p className="text-zinc-500 text-[11px] uppercase tracking-[0.2em]">Dashboard · Locked</p>
            </div>

            {/* Two-column hero */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
              {/* Left — copy + CTA */}
              <div className="space-y-8">
                <h1
                  style={D}
                  className="text-white font-black text-5xl lg:text-6xl leading-[0.95] tracking-tight"
                >
                  Connect to<br />
                  <span style={GRAD}>unlock your ID.</span>
                </h1>

                <p className="text-zinc-400 text-[15px] leading-relaxed max-w-md">
                  Your Based ID dashboard is your permanent Base credential — airdrop weight,
                  partner drops, whitelist access, and $BASED rewards live here.
                </p>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <ConnectButton label="Connect Wallet" />
                  <Link
                    href="/#mint-card"
                    className="text-zinc-500 text-sm hover:text-white transition-colors"
                  >
                    Don&apos;t have an ID yet? Mint for $2 →
                  </Link>
                </div>

                {/* Live stat strip */}
                {totalMinted !== undefined && (
                  <div className="grid grid-cols-3 border border-white/[0.06] rounded-2xl overflow-hidden divide-x divide-white/[0.06] max-w-md">
                    <div className="px-5 py-4">
                      <div className="flex items-center gap-1.5 mb-1">
                        <CountUp
                          to={Number(totalMinted)}
                          duration={1.6}
                          className="text-xl font-black tabular-nums leading-none"
                        />
                        <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                      </div>
                      <p className="text-zinc-600 text-[10px] uppercase tracking-[0.15em]">Minted</p>
                    </div>
                    <div className="px-5 py-4">
                      <p className="text-xl font-black leading-none mb-1 tabular-nums">
                        #{nextId.toLocaleString()}
                      </p>
                      <p className="text-zinc-600 text-[10px] uppercase tracking-[0.15em]">Next ID</p>
                    </div>
                    <div className="px-5 py-4">
                      <p className="text-xl font-black leading-none mb-1" style={GRAD}>1B</p>
                      <p className="text-zinc-600 text-[10px] uppercase tracking-[0.15em]">$BASED</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right — locked card preview */}
              <div className="relative">
                <div className="absolute -inset-10 rounded-[2rem] bg-blue-600/[0.07] blur-3xl pointer-events-none" />
                <div className="relative rounded-3xl border border-white/[0.09] bg-white/[0.025] overflow-hidden">
                  {/* Top bar */}
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.01]">
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-[0.15em]">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                      Preview · Your ID
                    </div>
                    <span className="text-[10px] text-zinc-600 tabular-nums">
                      {totalMinted !== undefined ? `#${nextId.toLocaleString()} next` : "—"}
                    </span>
                  </div>

                  {/* Blurred card + lock overlay */}
                  <div className="relative p-5 pb-4">
                    <div className="relative">
                      <div className="blur-[6px] opacity-40 pointer-events-none select-none">
                        <NftCard id={`#${nextId}`} holder="connect wallet to claim" />
                      </div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <div className="w-11 h-11 rounded-full border border-white/[0.1] bg-black/40 backdrop-blur-sm flex items-center justify-center">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                            <rect x="3" y="11" width="18" height="11" rx="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                        </div>
                        <p className="text-zinc-300 text-[11px] uppercase tracking-[0.2em] font-medium">
                          Connect to reveal
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Unlock list */}
                  <div className="px-5 pb-5 space-y-2.5">
                    <p className="text-zinc-600 text-[10px] uppercase tracking-[0.18em] pb-1">
                      What unlocks
                    </p>
                    {[
                      { label: "View all your Based IDs + airdrop weight", dot: "bg-blue-400" },
                      { label: "Track snapshot countdowns live", dot: "bg-green-500" },
                      { label: "Bid and manage Genesis auctions", dot: "bg-amber-400" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2.5">
                        <span className={`w-1 h-1 rounded-full ${item.dot} flex-shrink-0`} />
                        <span className="text-zinc-400 text-xs">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Shell>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading || !resolved) {
    return (
      <Shell>
        <div className="relative max-w-7xl mx-auto px-6 py-10 overflow-hidden">
          {/* Ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 40% at 30% 0%, rgba(37,99,235,0.06), transparent 70%)",
            }}
          />

          <div className="relative space-y-8">
            {/* Header skeleton */}
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <p className="text-zinc-600 text-[11px] uppercase tracking-[0.2em]">Dashboard</p>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-56 rounded-md bg-white/[0.04] relative overflow-hidden">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                  <div className="h-5 w-16 rounded-full bg-white/[0.04]" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-blue-400 pt-1">
                <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                <span className="uppercase tracking-[0.15em]">Loading</span>
              </div>
            </div>

            {/* Tab bar skeleton */}
            <div className="flex items-center gap-5 border-b border-white/[0.05] pb-3 pt-1">
              {["w-14","w-16","w-20","w-14"].map((w, i) => (
                <div key={i} className={`h-3 ${w} rounded bg-white/[0.04]`} />
              ))}
            </div>

            {/* Content skeleton — mirrors single-ID hero */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 pt-2">
              {/* NFT card skeleton */}
              <div className="lg:col-span-2">
                <div className="relative aspect-[480/270] rounded-2xl border border-white/[0.06] bg-white/[0.015] overflow-hidden">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/[0.04] to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                  />
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50 animate-pulse" />
                    <span className="text-[10px] text-zinc-600 uppercase tracking-[0.18em]">Based ID</span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-zinc-800 text-7xl font-black leading-none tabular-nums" style={D}>#—</span>
                  </div>
                  <div className="absolute bottom-4 right-4 h-4 w-20 rounded-full bg-white/[0.03]" />
                </div>
              </div>

              {/* Right column skeleton */}
              <div className="lg:col-span-3 flex flex-col justify-center space-y-6 lg:py-4">
                <div className="space-y-3">
                  <div className="h-3 w-24 rounded bg-white/[0.04]" />
                  <div className="h-16 w-48 rounded-md bg-white/[0.04] relative overflow-hidden">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "linear", delay: 0.15 }}
                    />
                  </div>
                  <div className="h-5 w-28 rounded-full bg-white/[0.04]" />
                </div>

                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-white/[0.03]" />
                  <div className="h-3 w-3/4 rounded bg-white/[0.03]" />
                </div>

                <div className="pt-4 border-t border-white/[0.05] space-y-3">
                  <div className="h-2.5 w-16 rounded bg-white/[0.04]" />
                  <div className="h-3 w-64 rounded bg-white/[0.03]" />
                </div>
              </div>
            </div>

            {/* Status line */}
            <div className="flex items-center justify-center gap-3 pt-6">
              <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-zinc-600 text-[11px] uppercase tracking-[0.18em]">
                Scanning onchain for your Based IDs
              </span>
              <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: "0.3s" }} />
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  // ── No Based ID ──────────────────────────────────────────────────────────
  if (resolved && tokenIds.length === 0) {
    return (
      <Shell>
        <motion.div
          className="flex flex-col items-center justify-center min-h-[70vh] gap-10 text-center px-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="space-y-3 max-w-sm">
            <p className="text-zinc-600 text-[11px] uppercase tracking-[0.2em]">Dashboard</p>
            <h1 style={D} className="text-4xl font-bold tracking-tight">No Based ID found</h1>
            <p className="text-zinc-500 text-sm leading-relaxed">
              This wallet doesn&apos;t hold a Based ID yet. Mint one for $2 to unlock your dashboard,
              $BASED airdrops, whitelist access, and partner drops.
            </p>
          </div>

          {/* Tier scarcity callout */}
          {totalMinted !== undefined && (
            <div className="rounded-2xl border border-white/[0.05] p-5 max-w-sm w-full space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-zinc-500 text-xs uppercase tracking-[0.15em]">IDs minted</p>
                <p className="text-white font-bold tabular-nums">{totalMinted.toString()}</p>
              </div>
              {(() => {
                const n = Number(totalMinted);
                let tierMsg = "";
                if (n < 100) tierMsg = `${100 - n} Genesis IDs (#1–#100) still available — highest airdrop weight.`;
                else if (n < 1000) tierMsg = `${1000 - n} Founding IDs (#101–#1,000) remaining before Pioneer tier begins.`;
                else if (n < 10000) tierMsg = `${10000 - n} Pioneer IDs (#1,001–#10,000) remaining.`;
                else tierMsg = "Builder tier — any number, any time.";
                return <p className="text-zinc-500 text-xs leading-relaxed">{tierMsg}</p>;
              })()}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/#mint-card"
              className="px-8 py-3.5 rounded-lg bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors"
            >
              Mint your Based ID →
            </Link>
            <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors">
              Back to home
            </Link>
          </div>

          {/* What you unlock */}
          <div className="grid grid-cols-2 gap-px bg-white/[0.05] rounded-2xl overflow-hidden max-w-xs w-full">
            {[
              "Permanent sequential ID",
              "$BASED token airdrops",
              "Partner NFT drops",
              "Whitelist access",
            ].map((item) => (
              <SpotlightCard
                key={item}
                className="bg-background p-4 text-left"
                spotlightColor="rgba(37,99,235,0.07)"
              >
                <div className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-blue-600 flex-shrink-0" />
                  <span className="text-zinc-500 text-xs">{item}</span>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </motion.div>
      </Shell>
    );
  }

  // ── Full dashboard ───────────────────────────────────────────────────────
  const tabs: { key: Tab; label: string; badge?: string; ownerOnly?: boolean }[] = [
    { key: "ids",       label: "My IDs",    badge: tokenIds.length.toString() },
    { key: "rewards",   label: "Rewards" },
    { key: "auctions",  label: "Auctions",  badge: "Live" },
    { key: "owner",     label: "Owner",     ownerOnly: true },
  ];

  return (
    <Shell>
      <motion.div
        className="max-w-7xl mx-auto px-6 py-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header row */}
        {(() => {
          const tier = primaryId ? getTier(primaryId) : null;
          return (
            <div className="flex items-start justify-between gap-3 mb-8">
              <div className="min-w-0">
                <p className="text-zinc-600 text-[11px] uppercase tracking-[0.2em] mb-2">Dashboard</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 style={D} className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {tokenIds.length === 1
                      ? `Based ID #${primaryId!.toString()}`
                      : `${tokenIds.length} Based IDs`}
                  </h1>
                  {tier && (
                    <span
                      className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-[0.12em] flex-shrink-0"
                      style={{ color: tier.color, backgroundColor: tier.bg, border: `1px solid ${tier.color}22` }}
                    >
                      {tier.label}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-green-500 pt-1 flex-shrink-0">
                <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                <span className="uppercase tracking-[0.15em]">Live</span>
              </div>
            </div>
          );
        })()}

        {/* Tab bar */}
        <div className="flex items-center border-b border-white/[0.05] mb-8 overflow-x-auto no-scrollbar">
          {tabs.filter((t) => !t.ownerOnly || isOwner).map(({ key, label, badge, ownerOnly }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-[11px] uppercase tracking-[0.12em] font-medium border-b-2 transition-colors -mb-px whitespace-nowrap
                ${activeTab === key
                  ? ownerOnly
                    ? "border-amber-500/50 text-amber-400"
                    : "border-blue-500/50 text-white"
                  : "border-transparent text-zinc-600 hover:text-zinc-400"}`}
            >
              {label}
              {badge && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded tabular-nums font-bold
                  ${activeTab === key && !ownerOnly
                    ? "text-blue-400"
                    : ownerOnly ? "text-amber-700" : "text-zinc-700"}`}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Overview strip ── */}
        {(() => {
          const tier = primaryId ? getTier(primaryId) : null;
          return tier ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.04] rounded-2xl overflow-hidden mb-8">
              <div className="bg-background px-4 py-3.5">
                <p className="text-zinc-700 text-[9px] uppercase tracking-[0.18em] mb-1.5">Tier</p>
                <p className="font-bold text-sm" style={{ color: tier.color }}>{tier.label}</p>
                <p className="text-zinc-700 text-[10px] mt-0.5">{tier.range}</p>
              </div>
              <div className="bg-background px-4 py-3.5">
                <p className="text-zinc-700 text-[9px] uppercase tracking-[0.18em] mb-1.5">IDs held</p>
                <p className="font-bold text-sm text-white">{tokenIds.length}</p>
                <p className="text-zinc-700 text-[10px] mt-0.5">
                  {tokenIds.length === 1 ? "Each earns separately" : `${tokenIds.length} earning slots`}
                </p>
              </div>
              <div className="bg-background px-4 py-3.5">
                <p className="text-zinc-700 text-[9px] uppercase tracking-[0.18em] mb-1.5">Snapshot #1</p>
                <p className="font-bold text-sm text-white tabular-nums">
                  {pad(snapshot.d)}d {pad(snapshot.h)}h {pad(snapshot.m)}m
                </p>
                <p className="text-zinc-700 text-[10px] mt-0.5">Sep 30, 2026</p>
              </div>
              <div className="bg-background px-4 py-3.5">
                <p className="text-zinc-700 text-[9px] uppercase tracking-[0.18em] mb-1.5">Lowest ID</p>
                <p className="font-bold text-sm" style={GRAD}>#{primaryId!.toString()}</p>
                <p className="text-zinc-700 text-[10px] mt-0.5">Highest weight slot</p>
              </div>
            </div>
          ) : null;
        })()}

        {/* ── Tab: My IDs ── */}
        {activeTab === "ids" && (
          <div>
            {tokenIds.length === 1 ? (
              /* Single ID — hero layout */
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-2">
                  <button
                    className="w-full group relative"
                    onClick={() => setPreviewId(primaryId!)}
                    aria-label={`Preview Based ID #${primaryId!.toString()}`}
                  >
                    <NftCard id={`#${primaryId!.toString()}`} holder={address ?? ""} />
                    <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] uppercase tracking-[0.2em] text-white font-medium bg-black/60 px-3 py-1.5 rounded-full">
                        Preview
                      </span>
                    </div>
                  </button>
                </div>
                <div className="lg:col-span-3 flex flex-col justify-center space-y-6 lg:py-4">
                  <div>
                    <p className="text-zinc-600 text-[10px] uppercase tracking-[0.2em] mb-3">Your number</p>
                    <span style={{ ...D, ...GRAD }} className="text-7xl font-bold leading-none block">
                      #{primaryId!.toString()}
                    </span>
                    {(() => {
                      const t = getTier(primaryId!);
                      return (
                        <span
                          className="inline-block mt-3 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-[0.12em]"
                          style={{ color: t.color, backgroundColor: t.bg, border: `1px solid ${t.color}22` }}
                        >
                          {t.label} · {t.range}
                        </span>
                      );
                    })()}
                  </div>

                  <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
                    Lower number = larger $BASED share. #{primaryId!.toString()} earns
                    allocation in both the Sep 30 and Dec 31 snapshots.
                  </p>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-green-500 font-medium uppercase tracking-[0.15em]">Permanent</span>
                    <span className="w-px h-3 bg-white/[0.08]" />
                    <span className="text-zinc-600">
                      {totalMinted !== undefined ? `${totalMinted.toString()} IDs minted` : "—"}
                    </span>
                  </div>

                  <div className="pt-5 border-t border-white/[0.05] space-y-3">
                    <div>
                      <p className="text-zinc-700 text-[10px] uppercase tracking-[0.18em] mb-1">Holder</p>
                      <p className="text-zinc-500 text-xs font-mono break-all">{address}</p>
                    </div>
                    <a
                      href={`${BASESCAN_URL}/nft/${BASED_ID_ADDRESS}/${primaryId!.toString()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-[0.12em]"
                    >
                      View on Basescan ↗
                    </a>
                    <Link
                      href={`/profile/${primaryId!.toString()}`}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-400 transition-colors uppercase tracking-[0.12em]"
                    >
                      View Profile →
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              /* Multiple IDs — paginated gallery */
              <div>
                {/* Primary ID banner */}
                <div className="mb-6 p-4 rounded-xl border border-white/[0.05] flex items-center gap-4">
                  <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
                  <p className="text-zinc-500 text-sm flex-1">
                    <span className="text-white font-semibold">#{primaryId!.toString()}</span>
                    {" "}is your lowest ID — it earns the largest $BASED share in both snapshots.
                  </p>
                  <span className="text-zinc-600 text-xs flex-shrink-0 tabular-nums">
                    {tokenIds.length} total
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {visibleIds.map((id) => (
                    <div key={id.toString()} className="space-y-2.5">
                      <button
                        className="w-full group relative"
                        onClick={() => setPreviewId(id)}
                        aria-label={`Preview Based ID #${id.toString()}`}
                      >
                        <NftCard id={`#${id.toString()}`} holder={address ?? ""} />
                        <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] uppercase tracking-[0.2em] text-white font-medium bg-black/60 px-3 py-1.5 rounded-full">
                            Preview
                          </span>
                        </div>
                      </button>
                      {(() => {
                        const t = getTier(id);
                        return (
                          <div className="px-0.5 space-y-1">
                            <div className="flex items-center justify-between">
                              <span style={GRAD} className="text-base font-black">#{id.toString()}</span>
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-[0.1em]"
                                  style={{ color: t.color, backgroundColor: t.bg }}
                                >
                                  {t.label}
                                </span>
                                {id === primaryId && (
                                  <span className="text-[9px] text-blue-500 font-medium uppercase tracking-[0.1em]">Primary</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <a
                                href={`${BASESCAN_URL}/nft/${BASED_ID_ADDRESS}/${id.toString()}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-zinc-700 hover:text-zinc-400 transition-colors"
                              >
                                Basescan ↗
                              </a>
                              <Link
                                href={`/profile/${id.toString()}`}
                                className="text-[10px] text-blue-600 hover:text-blue-400 transition-colors"
                              >
                                Profile →
                              </Link>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/[0.05]">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-4 py-2 rounded-lg border border-white/[0.06] text-xs text-zinc-500 hover:text-white hover:border-white/[0.12] transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                    >
                      ← Previous
                    </button>
                    <span className="text-zinc-600 text-xs tabular-nums">
                      {page + 1} / {totalPages} · {tokenIds.length} IDs
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page === totalPages - 1}
                      className="px-4 py-2 rounded-lg border border-white/[0.06] text-xs text-zinc-500 hover:text-white hover:border-white/[0.12] transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Rewards ── */}
        {activeTab === "rewards" && (
          <div className="space-y-4 max-w-2xl">

            {/* Countdown grid */}
            <div className="grid grid-cols-2 gap-px bg-white/[0.05] rounded-2xl overflow-hidden">
              <SpotlightCard className="bg-background p-6" spotlightColor="rgba(37,99,235,0.07)">
                <p className="text-[10px] text-zinc-700 uppercase tracking-[0.2em] mb-5">Snapshot #1</p>
                <div className="flex items-baseline gap-1 flex-wrap">
                  <span className="text-3xl font-black tabular-nums">{pad(snapshot.d)}</span>
                  <span className="text-zinc-600 text-xs mr-1.5">d</span>
                  <span className="text-3xl font-black tabular-nums">{pad(snapshot.h)}</span>
                  <span className="text-zinc-600 text-xs mr-1.5">h</span>
                  <span className="text-3xl font-black tabular-nums">{pad(snapshot.m)}</span>
                  <span className="text-zinc-600 text-xs mr-1.5">m</span>
                  <span className="text-3xl font-black tabular-nums">{pad(snapshot.s)}</span>
                  <span className="text-zinc-600 text-xs">s</span>
                </div>
                <p className="text-zinc-600 text-xs mt-4">Sep 30, 2026 00:00 UTC · 40% of 1B $BASED</p>
              </SpotlightCard>
              <SpotlightCard className="bg-background p-6" spotlightColor="rgba(37,99,235,0.07)">
                <p className="text-[10px] text-zinc-700 uppercase tracking-[0.2em] mb-5">Snapshot #2</p>
                <div className="flex items-baseline gap-1 flex-wrap">
                  <span className="text-3xl font-black tabular-nums">{pad(mintClose.d)}</span>
                  <span className="text-zinc-600 text-xs mr-1.5">d</span>
                  <span className="text-3xl font-black tabular-nums">{pad(mintClose.h)}</span>
                  <span className="text-zinc-600 text-xs mr-1.5">h</span>
                  <span className="text-3xl font-black tabular-nums">{pad(mintClose.m)}</span>
                  <span className="text-zinc-600 text-xs mr-1.5">m</span>
                  <span className="text-3xl font-black tabular-nums">{pad(mintClose.s)}</span>
                  <span className="text-zinc-600 text-xs">s</span>
                </div>
                <p className="text-zinc-600 text-xs mt-4">Dec 31, 2026 23:59 UTC · 40% of 1B $BASED</p>
              </SpotlightCard>
            </div>

            {/* Tier + earning breakdown */}
            <SpotlightCard
              className="bg-background rounded-2xl border border-white/[0.05] p-6 space-y-5"
              spotlightColor="rgba(37,99,235,0.05)"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-white font-semibold text-sm">How your $BASED is calculated</p>
                  <p className="text-zinc-500 text-xs leading-relaxed mt-1">
                    Each snapshot distributes tokens proportionally. Lower ID = higher weight.
                    Multiple IDs each earn separately.
                  </p>
                </div>
                {primaryId && (() => {
                  const t = getTier(primaryId);
                  return (
                    <span
                      className="flex-shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-xl uppercase tracking-[0.12em]"
                      style={{ color: t.color, backgroundColor: t.bg, border: `1px solid ${t.color}22` }}
                    >
                      {t.label}
                    </span>
                  );
                })()}
              </div>

              {/* Per-ID earning slots */}
              {tokenIds.length > 0 && (() => {
                // Mirror contract formula: weight = 1e18 / sqrt(tokenId)
                // We normalise relative to #1 (weight=1.0) for display
                const weightOf = (id: bigint) => 1 / Math.sqrt(Number(id));
                const totalWeight = tokenIds.reduce((sum, id) => sum + weightOf(id), 0);

                return (
                  <div className="space-y-2">
                    {/* Column headers */}
                    <div className="flex items-center justify-between px-3.5 pb-1">
                      <span className="text-zinc-700 text-[9px] uppercase tracking-[0.15em]">ID</span>
                      <div className="flex items-center gap-8">
                        <span className="text-zinc-700 text-[9px] uppercase tracking-[0.15em]">Relative weight</span>
                        <span className="text-zinc-700 text-[9px] uppercase tracking-[0.15em] w-16 text-right">Share</span>
                      </div>
                    </div>

                    {tokenIds.slice(0, 8).map((id) => {
                      const t = getTier(id);
                      const w = weightOf(id);
                      const pct = ((w / totalWeight) * 100).toFixed(1);
                      const relW = (w / weightOf(BigInt(1))).toFixed(3);
                      const barW = Math.max(4, (w / weightOf(BigInt(1))) * 100);

                      return (
                        <div key={id.toString()} className="rounded-xl border border-white/[0.05] px-3.5 py-2.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span style={GRAD} className="font-black text-sm tabular-nums">#{id.toString()}</span>
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-[0.1em]"
                                style={{ color: t.color, backgroundColor: t.bg }}
                              >
                                {t.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-right">
                              <span className="text-zinc-500 text-[11px] tabular-nums font-mono">{relW}×</span>
                              <span className="text-zinc-400 text-[11px] tabular-nums font-semibold w-16 text-right">
                                {tokenIds.length === 1 ? "100%" : `${pct}%`}
                              </span>
                            </div>
                          </div>
                          {/* Weight bar */}
                          <div className="h-0.5 rounded-full bg-white/[0.04] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${Math.min(barW, 100)}%`, backgroundColor: t.color, opacity: 0.6 }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {tokenIds.length > 8 && (
                      <p className="text-zinc-700 text-[11px] pl-1">+{tokenIds.length - 8} more IDs also earning</p>
                    )}

                    {/* Total weight summary */}
                    <div className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/[0.04] px-3.5 py-2.5 mt-1">
                      <span className="text-zinc-600 text-xs">Your combined weight</span>
                      <span className="text-white font-bold text-sm tabular-nums font-mono">
                        {totalWeight.toFixed(3)}×
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Tier context */}
              {primaryId && (() => {
                const t = getTier(primaryId);
                const msgs: Record<string, string> = {
                  Genesis:  "Genesis IDs (#1–#100) earn the highest per-ID weight in the airdrop. Your lowest ID puts you in the top tier.",
                  Founding: "Founding IDs (#101–#1,000) are among the earliest 1,000 — significantly higher weight than later minters.",
                  Pioneer:  "Pioneer IDs (#1,001–#10,000) locked in well ahead of the crowd. Higher weight than the majority of holders.",
                  Builder:  "Builder IDs (#10,001+) participate in both snapshots. Mint more low-number IDs to boost your weight.",
                };
                return (
                  <p className="text-zinc-600 text-xs leading-relaxed border-t border-white/[0.05] pt-4">
                    {msgs[t.label]}
                  </p>
                );
              })()}
            </SpotlightCard>

            {/* Hold & wait CTA */}
            <div className="p-5 rounded-xl border border-white/[0.05] flex items-start gap-4">
              <div className="w-9 h-9 rounded-lg border border-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-white font-semibold text-sm">Hold through both snapshots</p>
                <p className="text-zinc-600 text-xs leading-relaxed">
                  Selling or transferring your ID before a snapshot removes it from that round.
                  The claim window opens January 2027 — no action needed until then.
                </p>
              </div>
            </div>

            {/* Claim reminder */}
            <div className="p-5 rounded-xl border border-white/[0.05] flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                <span style={GRAD} className="text-xs font-black">$B</span>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Claim opens January 2027</p>
                <p className="text-zinc-600 text-xs mt-0.5">
                  After the Dec 31 snapshot closes, claim your $BASED here. No action needed before then.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Auctions ── */}
        {activeTab === "auctions" && (
          <AuctionTab address={address ?? ""} isOwner={isOwner} />
        )}

        {/* ── Tab: Owner ── */}
        {activeTab === "owner" && isOwner && (
          <div className="max-w-lg space-y-3">

            {/* Owner notice */}
            <div className="p-4 rounded-xl border border-amber-500/10 flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
              <div>
                <p className="text-amber-400 font-medium text-sm">Owner panel</p>
                <p className="text-zinc-600 text-xs mt-0.5">Only visible to the contract owner wallet.</p>
              </div>
            </div>

            {/* Treasury */}
            <SpotlightCard
              className="bg-background rounded-2xl border border-white/[0.05] p-6 space-y-5"
              spotlightColor="rgba(251,191,36,0.04)"
            >
              <div className="flex items-center justify-between">
                <p className="text-zinc-600 text-[10px] uppercase tracking-[0.2em]">Treasury</p>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                  <span className="w-1 h-1 rounded-full bg-green-500" />
                  Live
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-zinc-600 text-xl font-light">$</span>
                {treasuryBalance !== undefined ? (
                  <CountUp
                    to={Number(treasuryBalance) / 1_000_000}
                    duration={1.5}
                    className="text-5xl font-black"
                    style={AMBER}
                  />
                ) : (
                  <span className="text-5xl font-black text-zinc-700">—</span>
                )}
                <span className="text-zinc-500 text-sm pb-1">USDC</span>
              </div>

              <div className="grid grid-cols-2 gap-px bg-white/[0.04] rounded-xl overflow-hidden text-xs">
                <div className="bg-background p-3">
                  <p className="text-zinc-700 mb-1 text-[10px] uppercase tracking-[0.1em]">Mints collected</p>
                  <p className="text-white font-semibold">
                    {totalMinted !== undefined ? totalMinted.toString() : "—"} × $2
                  </p>
                </div>
                <div className="bg-background p-3">
                  <p className="text-zinc-700 mb-1 text-[10px] uppercase tracking-[0.1em]">Contract</p>
                  <p className="text-zinc-400 font-mono text-[10px] break-all">{BASED_ID_ADDRESS}</p>
                </div>
              </div>

              {withdrawSuccess ? (
                <div className="rounded-lg border border-green-900/30 p-4 text-center">
                  <p className="text-green-400 font-semibold text-sm">Withdrawn successfully</p>
                  <p className="text-zinc-600 text-xs mt-0.5">USDC sent to your owner wallet.</p>
                </div>
              ) : (
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawPending || withdrawConfirming || !treasuryBalance || treasuryBalance === BigInt(0)}
                  className="w-full py-3.5 rounded-lg font-bold text-sm tracking-wide transition-all bg-white text-black hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {withdrawConfirming ? "Confirming…"
                    : withdrawPending ? "Confirm in wallet…"
                    : treasuryBalance === BigInt(0) ? "Nothing to withdraw"
                    : `Withdraw $${(Number(treasuryBalance ?? 0) / 1_000_000).toFixed(2)} USDC`}
                </button>
              )}
            </SpotlightCard>

            {/* Pause toggle */}
            <SpotlightCard
              className="bg-background rounded-2xl border border-white/[0.05] p-5 space-y-4"
              spotlightColor="rgba(251,191,36,0.03)"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold text-sm">Minting</p>
                  <p className="text-zinc-600 text-xs mt-0.5">
                    {mintingPaused ? "Currently paused — no one can mint" : "Currently open — anyone can mint"}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-[0.1em]
                  ${mintingPaused ? "text-red-400 bg-red-900/20" : "text-green-400 bg-green-900/20"}`}>
                  {mintingPaused ? "Paused" : "Live"}
                </span>
              </div>
              <button
                onClick={handleTogglePause}
                disabled={pausePending || pauseConfirming}
                className={`w-full py-3 rounded-lg font-semibold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed
                  ${mintingPaused
                    ? "bg-white text-black hover:bg-zinc-100"
                    : "border border-red-900/40 text-red-400 hover:bg-red-900/10"}`}
              >
                {pauseConfirming ? "Confirming…"
                  : pausePending ? "Confirm in wallet…"
                  : mintingPaused ? "Resume Minting"
                  : "Pause Minting"}
              </button>
            </SpotlightCard>

            {/* ETH recovery */}
            <SpotlightCard
              className="bg-background rounded-2xl border border-white/[0.05] p-5 space-y-3"
              spotlightColor="rgba(251,191,36,0.03)"
            >
              <div>
                <p className="text-white font-semibold text-sm">Recover ETH</p>
                <p className="text-zinc-600 text-xs mt-0.5">Rescue ETH accidentally sent to the contract.</p>
              </div>
              {recoverETHSuccess ? (
                <p className="text-green-400 text-xs">ETH recovered to your wallet.</p>
              ) : (
                <button
                  onClick={handleRecoverETH}
                  disabled={recoverETHPending || recoverETHConfirming}
                  className="w-full py-3 rounded-lg font-semibold text-sm border border-white/[0.06] text-zinc-400 hover:text-white hover:border-white/[0.12] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {recoverETHConfirming ? "Confirming…" : recoverETHPending ? "Confirm in wallet…" : "Recover ETH"}
                </button>
              )}
            </SpotlightCard>

            {/* Approve AuctionHouse */}
            <ApproveAuctionHouseCard ownerAddress={address ?? ""} />

            {/* Owner wallet */}
            <div className="p-4 rounded-xl border border-white/[0.04]">
              <p className="text-zinc-700 text-[10px] uppercase tracking-[0.18em] mb-1.5">Funds go to</p>
              <p className="text-zinc-500 text-xs font-mono break-all">{address}</p>
            </div>

          </div>
        )}

      </motion.div>

      {/* ── ID Preview Modal ── */}
      {previewId !== null && (
        <IdPreviewModal
          id={previewId}
          holder={address ?? ""}
          onClose={() => setPreviewId(null)}
        />
      )}

    </Shell>
  );
}

// ─── IdPreviewModal ───────────────────────────────────────────────────────────

function IdPreviewModal({
  id,
  holder,
  onClose,
}: {
  id: bigint;
  holder: string;
  onClose: () => void;
}) {
  const idStr = id.toString();

  function shareOnX() {
    const text = `Based ID #${idStr} is mine — permanently onchain.\n\nLower number = bigger $BASED airdrop.\n$2 USDC flat. No phases. No price changes. Ever.\n\nMint yours → basedid.space\n\n@basedidofficial`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  }

  // Close on backdrop click or Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        className="relative z-10 w-full max-w-sm space-y-4"
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 12 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Card */}
        <NftCard id={`#${idStr}`} holder={holder} />

        {/* ID label */}
        <div className="flex items-center justify-between px-1">
          <span style={{ ...D, ...GRAD }} className="text-2xl font-black leading-none">
            #{idStr}
          </span>
          <a
            href={`${BASESCAN_URL}/nft/${BASED_ID_ADDRESS}/${idStr}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-[0.12em]"
          >
            Basescan ↗
          </a>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={shareOnX}
            className="py-3 rounded-xl bg-zinc-900 border border-white/[0.07] hover:bg-zinc-800 text-white text-xs font-medium transition-colors"
          >
            Share on X
          </button>
          <button
            onClick={onClose}
            className="py-3 rounded-xl bg-white text-black text-xs font-bold transition-colors hover:bg-zinc-100"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Auction Tab ─────────────────────────────────────────────────────────────

type AuctionData = {
  tokenId:      bigint;
  seller:       string;
  topBidder:    string;
  topBid:       bigint;
  reservePrice: bigint;
  startTime:    bigint;
  endTime:      bigint;
  settled:      boolean;
};

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
type AuctionSubTab = "live" | "manage";

// ─── useAuctionTimer ─────────────────────────────────────────────────────────

function useAuctionTimer(endTime: bigint) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  const remaining = Math.max(0, Number(endTime) - now);
  return {
    remaining,
    d: Math.floor(remaining / 86400),
    h: Math.floor((remaining % 86400) / 3600),
    m: Math.floor((remaining % 3600) / 60),
    s: remaining % 60,
  };
}

// ─── useAuctions ─────────────────────────────────────────────────────────────

function useAuctions(refreshKey: number) {
  const publicClient = usePublicClient();
  const [auctions, setAuctions] = useState<AuctionData[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!publicClient) return;
    setLoading(true);
    const client = publicClient;
    async function fetch() {
      try {
        const ids = Array.from({ length: 100 }, (_, i) => BigInt(i + 1));
        const results = await Promise.all(
          ids.map((id) =>
            (client.readContract({
              address: AUCTION_HOUSE_ADDRESS,
              abi:     AUCTION_HOUSE_ABI,
              functionName: "auctions",
              args: [id],
            }) as Promise<[string, string, bigint, bigint, bigint, bigint, boolean]>)
              .then(([seller, topBidder, topBid, reservePrice, startTime, endTime, settled]) => ({
                tokenId: id, seller, topBidder, topBid, reservePrice, startTime, endTime, settled,
              } as AuctionData))
              .catch(() => null)
          )
        );
        setAuctions(
          results
            .filter((a): a is AuctionData => a !== null && a.endTime > BigInt(0))
            .sort((a, b) => (a.tokenId < b.tokenId ? -1 : 1))
        );
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [publicClient, refreshKey]);

  return { auctions, loading };
}

// ─── SettleButton ─────────────────────────────────────────────────────────────

function SettleButton({ tokenId, onSettled }: { tokenId: bigint; onSettled: () => void }) {
  const [err, setErr] = useState("");
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting local error when external tx confirms
  useEffect(() => { if (confirmed) { setErr(""); onSettled(); } }, [confirmed, onSettled]);

  return (
    <div className="space-y-1.5">
      <button
        onClick={() =>
          writeContract(
            { address: AUCTION_HOUSE_ADDRESS, abi: AUCTION_HOUSE_ABI,
              functionName: "settle", args: [tokenId] },
            { onError: (e) => setErr(e.message.split("\n")[0]) }
          )
        }
        disabled={isPending || confirming}
        className="w-full py-3 rounded-xl font-bold text-sm border border-amber-600/30 text-amber-400 hover:bg-amber-900/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {confirming ? "Confirming…" : isPending ? "Confirm in wallet…" : "Settle Auction"}
      </button>
      {err && <p className="text-red-400 text-[11px]">{err}</p>}
    </div>
  );
}

// ─── AuctionCard ──────────────────────────────────────────────────────────────

function AuctionCard({
  auction,
  address,
  onBidSuccess,
}: {
  auction:      AuctionData;
  address:      string;
  onBidSuccess: () => void;
}) {
  const { remaining, d, h, m, s } = useAuctionTimer(auction.endTime);
  const ended     = remaining === 0;
  const hasBid    = auction.topBidder !== ZERO_ADDR;
  const isWinning = !!address && auction.topBidder.toLowerCase() === address.toLowerCase();

  const [bidInput, setBidInput] = useState("");
  const [step,     setStep]     = useState<"idle" | "approving" | "bidding">("idle");
  const [err,      setErr]      = useState("");

  // Carry the bid amount across the approve → bid transition
  const pendingAmount = useRef<bigint>(BigInt(0));

  const minBid    = hasBid
    ? auction.topBid + (auction.topBid * BigInt(500)) / BigInt(10_000)
    : auction.reservePrice;
  const minBidUsd = (Number(minBid) / 1_000_000).toFixed(2);

  const { data: allowance } = useReadContract({
    address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "allowance",
    args:    [address as `0x${string}`, AUCTION_HOUSE_ADDRESS],
    query:   { enabled: !!address, refetchInterval: 4000 },
  });

  // Separate hooks so approve-confirmed never bleeds into bid-confirmed
  const { writeContract: writeApprove, data: approveTxHash, isPending: approvePending } = useWriteContract();
  const { isLoading: approveConfirming, isSuccess: approveConfirmed } =
    useWaitForTransactionReceipt({ hash: approveTxHash });

  const { writeContract: writeBid, data: bidTxHash, isPending: bidPending } = useWriteContract();
  const { isLoading: bidConfirming, isSuccess: bidConfirmed } =
    useWaitForTransactionReceipt({ hash: bidTxHash });

  const loading = approvePending || approveConfirming || bidPending || bidConfirming;

  // Step 1 confirmed → auto-send bid
  useEffect(() => {
    if (!approveConfirmed || step !== "approving") return;
    setStep("bidding");
    writeBid(
      { address: AUCTION_HOUSE_ADDRESS, abi: AUCTION_HOUSE_ABI,
        functionName: "bid", args: [auction.tokenId, pendingAmount.current] },
      { onError: (e) => { setErr(e.message.split("\n")[0]); setStep("idle"); } }
    );
  // writeBid and auction.tokenId are stable refs — omitting avoids infinite loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveConfirmed]);

  // Step 2 confirmed → success
  useEffect(() => {
    if (!bidConfirmed || step !== "bidding") return;
    setStep("idle"); setBidInput(""); setErr(""); onBidSuccess();
  }, [bidConfirmed, step, onBidSuccess]);

  function handleBid() {
    setErr("");
    const usdc6 = Math.round(parseFloat(bidInput) * 1_000_000);
    if (isNaN(usdc6) || usdc6 < Number(minBid)) { setErr(`Min bid: $${minBidUsd} USDC`); return; }
    const amount = BigInt(usdc6);
    pendingAmount.current = amount;

    if (!allowance || allowance < amount) {
      setStep("approving");
      writeApprove(
        { address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "approve",
          args: [AUCTION_HOUSE_ADDRESS, amount] },
        { onError: (e) => { setErr(e.message.split("\n")[0]); setStep("idle"); } }
      );
    } else {
      setStep("bidding");
      writeBid(
        { address: AUCTION_HOUSE_ADDRESS, abi: AUCTION_HOUSE_ABI, functionName: "bid",
          args: [auction.tokenId, amount] },
        { onError: (e) => { setErr(e.message.split("\n")[0]); setStep("idle"); } }
      );
    }
  }

  const bidNum          = parseFloat(bidInput || "0") * 1_000_000;
  const alreadyApproved = !!allowance && allowance >= BigInt(Math.round(bidNum));
  // Real-time validation — show inline feedback as the user types
  const belowMin        = bidInput !== "" && bidNum < Number(minBid);
  const timeLabel       = d > 0
    ? `${d}d ${String(h).padStart(2, "0")}h`
    : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  return (
    <SpotlightCard
      className="bg-background rounded-2xl border border-white/[0.05] overflow-hidden flex flex-col"
      spotlightColor="rgba(217,119,6,0.06)"
    >
      {/* NFT visual */}
      <NftCard id={`#${auction.tokenId.toString()}`} holder={auction.seller} />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Title + status */}
        <div className="flex items-center justify-between">
          <p className="font-bold text-sm text-white">
            Based ID <span style={AMBER}>#{auction.tokenId.toString()}</span>
          </p>
          {ended ? (
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-zinc-900 border border-white/[0.05] text-zinc-500 font-semibold uppercase tracking-[0.1em]">
              Ended
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full bg-green-900/20 border border-green-900/30 text-green-400 font-semibold uppercase tracking-[0.1em]">
              <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          )}
        </div>

        {/* Price + time */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3.5">
            <p className="text-zinc-600 text-[10px] uppercase tracking-[0.15em] mb-2">
              {hasBid ? "Current bid" : "Reserve"}
            </p>
            <p className="font-black text-2xl tabular-nums leading-none" style={AMBER}>
              ${hasBid
                ? (Number(auction.topBid) / 1_000_000).toFixed(2)
                : (Number(auction.reservePrice) / 1_000_000).toFixed(2)}
            </p>
            <p className="text-zinc-700 text-[9px] mt-1.5 uppercase tracking-[0.12em]">USDC</p>
          </div>
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3.5">
            <p className="text-zinc-600 text-[10px] uppercase tracking-[0.15em] mb-2">
              {ended ? "Result" : "Time left"}
            </p>
            {ended ? (
              <p className="font-black text-2xl leading-none text-zinc-400">
                {hasBid ? "Sold" : "Unsold"}
              </p>
            ) : (
              <>
                <p className="font-black text-2xl tabular-nums leading-none text-white">{timeLabel}</p>
                {d === 0 && (
                  <p className="text-amber-600/60 text-[9px] mt-1.5 uppercase tracking-[0.12em]">Ending soon</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Top bidder indicator */}
        {hasBid && !ended && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
            isWinning
              ? "border-green-900/30 bg-green-900/10 text-green-400"
              : "border-white/[0.04] bg-white/[0.01] text-zinc-500"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isWinning ? "bg-green-400 animate-pulse" : "bg-zinc-700"}`} />
            {isWinning
              ? <span className="font-medium">You&apos;re winning</span>
              : <span>Top: <span className="font-mono">{auction.topBidder.slice(0, 6)}…{auction.topBidder.slice(-4)}</span></span>
            }
          </div>
        )}

        {/* Ended result */}
        {ended && hasBid && (
          <div className="px-3 py-2.5 rounded-lg border border-white/[0.05] bg-white/[0.01] text-center">
            <p className="text-zinc-400 text-xs">
              Won by{" "}
              <span className="font-mono">{auction.topBidder.slice(0, 6)}…{auction.topBidder.slice(-4)}</span>
              {" "}for{" "}
              <span className="text-white font-bold">${(Number(auction.topBid) / 1_000_000).toFixed(2)}</span>
            </p>
          </div>
        )}
        {ended && !hasBid && (
          <div className="px-3 py-2.5 rounded-lg border border-dashed border-white/[0.05] text-center">
            <p className="text-zinc-700 text-xs">No bids — ended unsold</p>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bid input */}
        {!ended && address && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none font-medium">$</span>
                <input
                  type="number"
                  min={minBidUsd}
                  step="0.01"
                  placeholder={minBidUsd}
                  value={bidInput}
                  onChange={(e) => { setBidInput(e.target.value); setErr(""); }}
                  className={`w-full pl-8 pr-3 py-3 rounded-xl bg-white/[0.03] text-white text-sm placeholder:text-zinc-700 focus:outline-none transition-colors border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    belowMin
                      ? "border-red-900/60 focus:border-red-600/50"
                      : "border-white/[0.08] focus:border-amber-600/40"
                  }`}
                />
              </div>
              <button
                onClick={handleBid}
                disabled={loading || !bidInput || belowMin}
                className="px-5 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                style={!loading && bidInput && !belowMin
                  ? { background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#000", boxShadow: "0 0 20px rgba(217,119,6,0.2)" }
                  : { background: "rgba(255,255,255,0.04)", color: "#52525b", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {step === "approving" ? (approveConfirming ? "Confirming…" : "Approving…")
                  : step === "bidding" ? (bidConfirming ? "Confirming…" : "Bidding…")
                  : alreadyApproved ? "Place Bid"
                  : "Approve & Bid"}
              </button>
            </div>
            {belowMin ? (
              <p className="text-red-400 text-[11px] font-medium">
                Minimum bid is ${minBidUsd} USDC
              </p>
            ) : (
              <p className="text-zinc-700 text-[10px]">
                Min ${minBidUsd} · 5% increment · 15-min anti-snipe
              </p>
            )}
          </div>
        )}

        {!ended && !address && (
          <p className="text-zinc-700 text-xs text-center py-1">Connect wallet to bid</p>
        )}

        {ended && hasBid && !auction.settled && (
          <SettleButton tokenId={auction.tokenId} onSettled={onBidSuccess} />
        )}

        {err && <p className="text-red-400 text-[11px]">{err}</p>}
      </div>
    </SpotlightCard>
  );
}

// ─── ManageAuctionRow ─────────────────────────────────────────────────────────

function ManageAuctionRow({ auction, onAction }: { auction: AuctionData; onAction: () => void }) {
  const { remaining, d, h, m } = useAuctionTimer(auction.endTime);
  const ended  = remaining === 0;
  const hasBid = auction.topBidder !== ZERO_ADDR;

  const [err, setErr] = useState("");
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } =
    useWaitForTransactionReceipt({ hash: txHash });
  const loading = isPending || confirming;

  // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting local error when external tx confirms
  useEffect(() => { if (confirmed) { setErr(""); onAction(); } }, [confirmed, onAction]);

  function cancel() {
    writeContract(
      { address: AUCTION_HOUSE_ADDRESS, abi: AUCTION_HOUSE_ABI,
        functionName: "cancelAuction", args: [auction.tokenId] },
      { onError: (e) => setErr(e.message.split("\n")[0]) }
    );
  }
  function settle() {
    writeContract(
      { address: AUCTION_HOUSE_ADDRESS, abi: AUCTION_HOUSE_ABI,
        functionName: "settle", args: [auction.tokenId] },
      { onError: (e) => setErr(e.message.split("\n")[0]) }
    );
  }

  const timeStr = remaining > 0
    ? d > 0 ? `${d}d ${String(h).padStart(2, "0")}h` : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    : "Ended";

  let statusNode: React.ReactNode;
  if (auction.settled)       statusNode = <span className="text-[10px] text-zinc-600 font-medium">Settled</span>;
  else if (ended && hasBid)  statusNode = <span className="text-[10px] text-amber-400 font-semibold">Needs settle</span>;
  else if (ended && !hasBid) statusNode = <span className="text-[10px] text-zinc-600">No bids</span>;
  else if (hasBid)           statusNode = <span className="text-[10px] text-green-400 font-semibold">Active bid</span>;
  else                       statusNode = <span className="text-[10px] text-blue-400 font-semibold">Live</span>;

  return (
    <div className={`rounded-xl border p-4 transition-colors ${auction.settled ? "border-white/[0.03] opacity-50" : "border-white/[0.05]"}`}>
      <div className="flex items-center gap-3">
        {/* ID badge */}
        <div className="w-11 h-11 flex-shrink-0 rounded-xl border border-amber-900/20 bg-amber-950/10 flex items-center justify-center">
          <span className="font-black text-sm" style={AMBER}>#{auction.tokenId.toString()}</span>
        </div>

        {/* Info grid */}
        <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-0.5">
          <div>
            <p className="text-zinc-700 text-[9px] uppercase tracking-[0.1em]">Reserve</p>
            <p className="text-zinc-300 text-xs font-semibold tabular-nums">
              ${(Number(auction.reservePrice) / 1_000_000).toFixed(0)}
            </p>
          </div>
          <div>
            <p className="text-zinc-700 text-[9px] uppercase tracking-[0.1em]">Top bid</p>
            <p className={`text-xs font-semibold tabular-nums ${hasBid ? "text-amber-400" : "text-zinc-700"}`}>
              {hasBid ? `$${(Number(auction.topBid) / 1_000_000).toFixed(2)}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-zinc-700 text-[9px] uppercase tracking-[0.1em]">{ended ? "Ended" : "Remaining"}</p>
            <p className="text-zinc-300 text-xs font-semibold tabular-nums">{timeStr}</p>
          </div>
          <div>
            <p className="text-zinc-700 text-[9px] uppercase tracking-[0.1em]">Status</p>
            {statusNode}
          </div>
        </div>

        {/* Action */}
        <div className="flex-shrink-0 ml-2">
          {!ended && !hasBid && !auction.settled && (
            <button onClick={cancel} disabled={loading}
              className="px-3.5 py-1.5 rounded-lg text-[11px] font-semibold border border-red-900/30 text-red-400 hover:bg-red-900/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              {loading ? "…" : "Cancel"}
            </button>
          )}
          {ended && hasBid && !auction.settled && (
            <button onClick={settle} disabled={loading}
              className="px-3.5 py-1.5 rounded-lg text-[11px] font-semibold border border-amber-600/30 text-amber-400 hover:bg-amber-900/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              {loading ? "…" : "Settle"}
            </button>
          )}
        </div>
      </div>
      {err && <p className="text-red-400 text-[11px] mt-2 pl-14">{err}</p>}
    </div>
  );
}

// ─── CreateAuctionForm ────────────────────────────────────────────────────────

function CreateAuctionForm({ onCreated }: { onCreated: () => void }) {
  const [tokenId, setTokenId] = useState("");
  const [reserve, setReserve] = useState("");
  const [hours,   setHours]   = useState("48");
  const [err,     setErr]     = useState("");
  const [step,    setStep]    = useState<"idle" | "creating">("idle");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } =
    useWaitForTransactionReceipt({ hash: txHash });
  const loading = isPending || confirming;

  /* eslint-disable react-hooks/set-state-in-effect -- resetting form state when external tx confirms */
  useEffect(() => {
    if (confirmed && step === "creating") {
      setStep("idle"); setTokenId(""); setReserve(""); setHours("48"); setErr("");
      onCreated();
    }
  }, [confirmed, step, onCreated]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleCreate() {
    setErr("");
    const id  = parseInt(tokenId);
    const res = Math.round(parseFloat(reserve) * 1_000_000);
    const dur = parseInt(hours) * 3600;
    if (isNaN(id) || id < 1 || id > 100) { setErr("Token ID must be 1–100"); return; }
    if (isNaN(res) || res <= 0)           { setErr("Reserve price must be > 0"); return; }
    if (dur < 3600)                       { setErr("Minimum 1 hour"); return; }
    if (dur > 7 * 24 * 3600)             { setErr("Maximum 7 days (168 hrs)"); return; }
    setStep("creating");
    writeContract(
      { address: AUCTION_HOUSE_ADDRESS, abi: AUCTION_HOUSE_ABI, functionName: "createAuction",
        args: [BigInt(id), BigInt(res), BigInt(dur)] },
      { onError: (e) => { setErr(e.message.split("\n")[0]); setStep("idle"); } }
    );
  }

  const durH       = parseInt(hours) || 0;
  const durDisplay = durH >= 24 ? `${(durH / 24).toFixed(durH % 24 === 0 ? 0 : 1)}d` : durH > 0 ? `${durH}h` : "";
  const canCreate  = !!tokenId && !!reserve && !!hours && !loading;

  return (
    <SpotlightCard
      className="bg-background rounded-2xl border border-amber-500/10 p-6 space-y-5"
      spotlightColor="rgba(217,119,6,0.05)"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-900/20 border border-amber-900/30 flex items-center justify-center flex-shrink-0">
          <span style={AMBER} className="text-sm font-black">+</span>
        </div>
        <div>
          <p className="text-amber-400 font-bold text-sm">New Auction</p>
          <p className="text-zinc-600 text-[11px]">IDs #1–#100 · AuctionHouse must be approved</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-zinc-600 text-[10px] uppercase tracking-[0.15em]">Token ID</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm pointer-events-none">#</span>
            <input type="number" min="1" max="100" placeholder="1"
              value={tokenId} onChange={(e) => setTokenId(e.target.value)}
              className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-amber-600/40 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-zinc-600 text-[10px] uppercase tracking-[0.15em]">Reserve ($)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm pointer-events-none">$</span>
            <input type="number" min="1" step="1" placeholder="100"
              value={reserve} onChange={(e) => setReserve(e.target.value)}
              className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-amber-600/40 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-zinc-600 text-[10px] uppercase tracking-[0.15em]">
            Duration{durDisplay && <span className="text-zinc-500 normal-case font-normal ml-1">({durDisplay})</span>}
          </label>
          <div className="relative">
            <input type="number" min="1" max="168" placeholder="48"
              value={hours} onChange={(e) => setHours(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-amber-600/40 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs pointer-events-none">h</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleCreate}
        disabled={!canCreate}
        className="w-full py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        style={canCreate ? { background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#000" } : {}}
      >
        {loading
          ? (confirming ? "Confirming transaction…" : "Confirm in wallet…")
          : `Auction #${tokenId || "?"} · $${reserve || "?"} reserve · ${durDisplay || `${hours}h`}`}
      </button>

      {err && <p className="text-red-400 text-[11px]">{err}</p>}
    </SpotlightCard>
  );
}

function AuctionTab({ address, isOwner }: { address: string; isOwner: boolean }) {
  const [subTab,     setSubTab]     = useState<AuctionSubTab>("live");
  const [refreshKey, setRefreshKey] = useState(0);
  const [now,        setNow]        = useState(() => Math.floor(Date.now() / 1000));

  const reload = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Keep `now` fresh so live/ended lists update as auctions expire
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 5000);
    return () => clearInterval(t);
  }, []);

  const { auctions, loading } = useAuctions(refreshKey);

  const live  = auctions.filter((a) => !a.settled && Number(a.endTime) > now);
  const ended = auctions.filter((a) => !a.settled && Number(a.endTime) <= now);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 style={D} className="text-2xl font-bold tracking-tight">Auctions</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Based IDs #1–#100 sold via English auction. Bid in USDC.
          </p>
        </div>
        {live.length > 0 && (
          <span className="flex-shrink-0 flex items-center gap-1.5 mt-1 text-[10px] px-2.5 py-1 rounded-full bg-green-900/20 border border-green-900/30 text-green-400 font-semibold uppercase tracking-[0.1em]">
            <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
            {live.length} Live
          </span>
        )}
      </div>

      {/* Sub-tab pill — owner sees both, bidder only sees live */}
      {isOwner && (
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/[0.05] w-fit">
          {(["live", "manage"] as AuctionSubTab[]).map((key) => (
            <button
              key={key}
              onClick={() => setSubTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-[0.1em] transition-all ${
                subTab === key
                  ? "bg-white/[0.07] text-white border border-white/[0.08] shadow-inner"
                  : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {key === "live" ? "Live Auctions" : "Manage"}
              {key === "live" && live.length > 0 && (
                <span className={`text-[9px] font-bold tabular-nums ${subTab === "live" ? "text-green-400" : "text-zinc-700"}`}>
                  {live.length}
                </span>
              )}
              {key === "manage" && ended.length > 0 && (
                <span className={`text-[9px] font-bold tabular-nums ${subTab === "manage" ? "text-amber-400" : "text-zinc-700"}`}>
                  {ended.length} pending
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Live tab ── */}
      {subTab === "live" && (
        <div className="space-y-6">
          {/* How it works */}
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.01] p-4 flex items-start gap-3">
            <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse mt-1.5 flex-shrink-0" />
            <p className="text-zinc-500 text-xs leading-relaxed">
              <span className="text-white font-semibold">How it works: </span>
              Each bid must be 5% above the last. Bids in the last 15 min extend the timer by 15 min.
              Outbid amounts are refunded instantly. Anyone can settle after an auction ends.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2.5 py-12 text-zinc-600 text-xs uppercase tracking-[0.15em]">
              <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
              Loading auctions…
            </div>
          ) : live.length === 0 && ended.length === 0 ? (
            <div className="max-w-lg space-y-4">
              {/* Genesis vault card */}
              <SpotlightCard
                className="bg-background rounded-2xl border border-amber-500/10 p-7 space-y-5"
                spotlightColor="rgba(245,158,11,0.05)"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-900/20 border border-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <div>
                    <p style={AMBER} className="font-bold text-sm">Genesis Vault — IDs #1–#100</p>
                    <p className="text-zinc-600 text-[11px] mt-0.5">Sealed. Not yet auctioned.</p>
                  </div>
                </div>

                <p className="text-zinc-500 text-sm leading-relaxed">
                  The 100 lowest IDs are held back deliberately. Around the 1,000 mint mark,
                  they will be auctioned one-by-one — starting at <span className="text-white font-semibold">#100</span> and
                  ending with the grand finale: <span className="text-white font-semibold">#1</span>.
                  Winners earn $BASED at the highest weight in both snapshots.
                </p>

                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: 100 }, (_, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-md flex items-center justify-center"
                      style={{ backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}
                    >
                      <span className="text-[6px] tabular-nums" style={{ color: "rgba(217,119,6,0.5)" }}>
                        {i + 1}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-zinc-700 text-[11px] leading-relaxed">
                  Each auction will be a community event — announced in advance, open for competitive bidding.
                  Watch this space.
                </p>
              </SpotlightCard>
            </div>
          ) : (
            <>
              {live.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                  {live.map((a) => (
                    <AuctionCard key={a.tokenId.toString()} auction={a} address={address} onBidSuccess={reload} />
                  ))}
                </div>
              )}

              {ended.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-white/[0.04]" />
                    <span className="text-zinc-700 text-[10px] uppercase tracking-[0.15em] px-2">Needs Settlement</span>
                    <div className="h-px flex-1 bg-white/[0.04]" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                    {ended.map((a) => (
                      <AuctionCard key={a.tokenId.toString()} auction={a} address={address} onBidSuccess={reload} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Manage tab (owner only) ── */}
      {subTab === "manage" && isOwner && (
        <div className="space-y-5 max-w-3xl">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Live",      value: live.length,     color: "text-green-400" },
              { label: "Unsettled", value: ended.length,    color: "text-amber-400" },
              { label: "Total",     value: auctions.length, color: "text-white"     },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-white/[0.05] bg-white/[0.01] p-4 text-center">
                <p className={`text-3xl font-black tabular-nums ${color}`}>{value}</p>
                <p className="text-zinc-700 text-[10px] uppercase tracking-[0.15em] mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Create form */}
          <CreateAuctionForm onCreated={reload} />

          {/* Auction list */}
          {!loading && auctions.length > 0 && (
            <div className="space-y-3">
              <p className="text-zinc-600 text-[11px] uppercase tracking-[0.15em]">All Auctions</p>
              <div className="space-y-2">
                {auctions.map((a) => (
                  <ManageAuctionRow key={a.tokenId.toString()} auction={a} onAction={reload} />
                ))}
              </div>
            </div>
          )}

          {!loading && auctions.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/[0.06] py-10 text-center">
              <p className="text-zinc-700 text-xs">No auctions created yet.</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}


// ─── ApproveAuctionHouseCard ──────────────────────────────────────────────────

function ApproveAuctionHouseCard({ ownerAddress }: { ownerAddress: string }) {
  const { data: isApproved, refetch } = useReadContract({
    address: BASED_ID_ADDRESS,
    abi: BASED_ID_ABI,
    functionName: "isApprovedForAll",
    args: [ownerAddress as `0x${string}`, AUCTION_HOUSE_ADDRESS],
    query: { enabled: !!ownerAddress },
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => { if (confirmed) refetch(); }, [confirmed, refetch]);

  function handleApprove() {
    writeContract({
      address: BASED_ID_ADDRESS,
      abi: BASED_ID_ABI,
      functionName: "setApprovalForAll",
      args: [AUCTION_HOUSE_ADDRESS, true],
    });
  }

  return (
    <SpotlightCard
      className="bg-background rounded-2xl border border-white/[0.05] p-5 space-y-4"
      spotlightColor="rgba(251,191,36,0.03)"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-semibold text-sm">Auction House Approval</p>
          <p className="text-zinc-600 text-xs mt-0.5">
            Required before you can create Genesis auctions.
          </p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-[0.1em]
          ${isApproved ? "text-green-400 bg-green-900/20" : "text-zinc-500 bg-white/[0.04]"}`}>
          {isApproved === undefined ? "—" : isApproved ? "Approved" : "Not set"}
        </span>
      </div>
      {!isApproved && (
        <button
          onClick={handleApprove}
          disabled={isPending || confirming}
          className="w-full py-3 rounded-lg font-semibold text-sm transition-all bg-white text-black hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {confirming ? "Confirming…" : isPending ? "Confirm in wallet…" : "Approve AuctionHouse"}
        </button>
      )}
      {isApproved && (
        <p className="text-zinc-600 text-xs">
          AuctionHouse can transfer Genesis IDs on your behalf. You can now create auctions.
        </p>
      )}
    </SpotlightCard>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

const DISPLAY: React.CSSProperties = {
  fontFamily: "var(--font-display), system-ui, sans-serif",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <AnimatedBackground />
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
            <Link href="/leaderboard" className="text-[13px] text-zinc-400 hover:text-white transition-colors">Leaderboard</Link>
            <Link href="/activity"    className="text-[13px] text-zinc-400 hover:text-white transition-colors">Activity</Link>
            <Link href="/dashboard"   className="text-[13px] text-white transition-colors">Dashboard</Link>
          </nav>
          <div className="flex-shrink-0">
            <ConnectButton showBalance={false} chainStatus="icon" />
          </div>
        </div>
      </header>
      <MobileNav />
      {children}
      <footer className="border-t border-white/[0.04] px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <svg width="16" height="16" viewBox="0 0 111 111" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-40">
            <path d="M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6 85.359 0 54.921 0C26.0 0 2.0 22.0 0 50.354H72.943V59.68H0C2.0 88.0 26.0 110.034 54.921 110.034Z" fill="#0052FF"/>
          </svg>
          <span className="text-zinc-700 text-[11px]">Built on Base · 2026</span>
        </div>
        <div className="flex items-center gap-5 text-[11px] text-zinc-700">
          <Link href="/" className="hover:text-zinc-400 transition-colors">Home</Link>
          <a href="https://x.com/basedidofficial" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">@basedidofficial</a>
        </div>
      </footer>
    </div>
  );
}

