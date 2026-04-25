"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  HUNTERS_ADDRESS,
  HUNTERS_ABI,
  BASED_ID_ADDRESS,
  BASED_ID_ABI,
  RANK_NAMES,
  RANK_COLORS,
  RANK_LABELS,
} from "@/lib/contracts";

const DISPLAY = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const DEPLOYED = HUNTERS_ADDRESS !== "0x0000000000000000000000000000000000000000";

const RANKS = RANK_NAMES.map((name, i) => ({
  label: RANK_LABELS[i],
  name,
  color: RANK_COLORS[i],
  threshold: [0, 20, 35, 50, 65, 80, 95][i],
}));

export function HuntersClaim() {
  const { address, isConnected } = useAccount();
  const [updatingRank, setUpdatingRank] = useState(false);

  // Read Based ID balance
  const { data: idBalance } = useReadContract({
    address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && DEPLOYED },
  });
  const holdsId = (idBalance as bigint | undefined) !== undefined ? (idBalance as bigint) > BigInt(0) : null;

  // Read Hunter token ID for wallet
  const { data: tokenId, refetch: refetchToken } = useReadContract({
    address: HUNTERS_ADDRESS, abi: HUNTERS_ABI, functionName: "tokenOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && DEPLOYED },
  });
  const hasClaimed = (tokenId as bigint | undefined) !== undefined && (tokenId as bigint) > BigInt(0);

  // Read current rank
  const { data: rankRaw, refetch: refetchRank } = useReadContract({
    address: HUNTERS_ADDRESS, abi: HUNTERS_ABI, functionName: "rankOf",
    args: tokenId ? [tokenId as bigint] : undefined,
    query: { enabled: !!tokenId && hasClaimed && DEPLOYED },
  });
  const currentRank = rankRaw !== undefined ? Number(rankRaw) : 0;

  // Total supply
  const { data: totalSupply } = useReadContract({
    address: HUNTERS_ADDRESS, abi: HUNTERS_ABI, functionName: "totalSupply",
    query: { enabled: DEPLOYED },
  });

  // Claim transaction
  const { writeContract, data: claimTxHash, isPending: claimPending } = useWriteContract();
  const { isLoading: claimConfirming, isSuccess: claimConfirmed } = useWaitForTransactionReceipt({ hash: claimTxHash });

  if (claimConfirmed && !hasClaimed) {
    refetchToken();
    toast.success("Based Hunter claimed!");
  }

  // Update rank transaction
  const { writeContract: writeRank, data: rankTxHash, isPending: rankPending } = useWriteContract();
  const { isLoading: rankConfirming, isSuccess: rankConfirmed } = useWaitForTransactionReceipt({ hash: rankTxHash });

  if (rankConfirmed) { refetchRank(); toast.success("Rank updated!"); }

  function handleClaim() {
    writeContract(
      { address: HUNTERS_ADDRESS, abi: HUNTERS_ABI, functionName: "claim" },
      { onError: (e) => toast.error(e.message.split("\n")[0]) }
    );
  }

  async function handleUpdateRank() {
    if (!address) return;
    setUpdatingRank(true);
    try {
      const res  = await fetch("/api/hunters/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to compute rank"); return; }
      if (data.newRank === currentRank) { toast("Already at current rank — keep entering drops to level up!"); return; }

      writeRank(
        {
          address: HUNTERS_ADDRESS, abi: HUNTERS_ABI, functionName: "updateRank",
          args: [address, data.newRank, BigInt(data.nonce), data.sig as `0x${string}`],
        },
        { onError: (e) => toast.error(e.message.split("\n")[0]) }
      );
    } catch { toast.error("Something went wrong"); }
    finally { setUpdatingRank(false); }
  }

  const rank = RANKS[currentRank] ?? RANKS[0];
  const nextRank = RANKS[currentRank + 1];

  return (
    <div className="flex-1 max-w-4xl mx-auto px-6 py-16 w-full space-y-12">

      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] text-[11px] uppercase tracking-[0.2em] text-zinc-500">
          Phase 2 — Coming soon
        </div>
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-white" style={DISPLAY}>
          Based Hunters
        </h1>
        <p className="text-zinc-400 text-base max-w-lg mx-auto leading-relaxed">
          Soulbound identity that levels up as you explore Base. Enter drops, win raffles, earn a higher rank.
          Free to claim — gas only.
        </p>
        {DEPLOYED && totalSupply !== undefined && (
          <p className="text-zinc-600 text-sm">{(totalSupply as bigint).toString()} hunters claimed</p>
        )}
      </div>

      {/* Rank ladder */}
      <div className="grid grid-cols-7 gap-1.5">
        {RANKS.map((r, i) => (
          <div key={r.label} className={`rounded-xl border p-3 text-center transition-all ${
            hasClaimed && i === currentRank
              ? "border-white/20 bg-white/[0.04]"
              : "border-white/[0.05] bg-white/[0.01]"
          }`}>
            <div className="text-2xl font-black" style={{ color: r.color }}>{r.label}</div>
            <div className="text-zinc-600 text-[9px] mt-1 hidden sm:block">{r.threshold}+</div>
          </div>
        ))}
      </div>

      {/* Main card */}
      {!isConnected ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.01] p-8 text-center space-y-5">
          <p className="text-white font-bold text-xl" style={DISPLAY}>Connect to claim</p>
          <p className="text-zinc-500 text-sm">You need a Based ID ($2) to claim your Hunter NFT.</p>
          <ConnectButton />
        </div>
      ) : !DEPLOYED ? (
        <div className="rounded-2xl border border-amber-900/30 bg-amber-950/[0.06] p-8 text-center space-y-4">
          <p className="text-amber-300 font-bold text-xl" style={DISPLAY}>Deploying soon</p>
          <p className="text-zinc-500 text-sm">The Based Hunters contract is being prepared. Check back after launch.</p>
          <Link href="/drops" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors">
            Enter drops to level up →
          </Link>
        </div>
      ) : holdsId === false ? (
        <div className="rounded-2xl border border-red-900/30 bg-red-950/10 p-8 text-center space-y-4">
          <p className="text-red-300 font-medium">No Based ID on this wallet</p>
          <p className="text-zinc-500 text-sm">You need a Based ID to claim a Hunter. Mint for $2.</p>
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors">
            Mint Based ID — $2 →
          </Link>
        </div>
      ) : hasClaimed ? (
        /* Hunter card — already claimed */
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: rank.color + "40" }}>
          {/* Rank header */}
          <div className="px-8 py-6 flex items-center gap-6 flex-wrap" style={{ background: rank.color + "08" }}>
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 border" style={{ borderColor: rank.color + "30", background: rank.color + "10" }}>
              <span className="font-black text-4xl" style={{ color: rank.color }}>{rank.label}</span>
            </div>
            <div className="space-y-1">
              <p className="text-zinc-500 text-xs">Your rank</p>
              <p className="text-white font-black text-2xl" style={DISPLAY}>{rank.name}</p>
              <p className="text-zinc-500 text-xs">Hunter #{(tokenId as bigint).toString()}</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <button
                onClick={handleUpdateRank}
                disabled={updatingRank || rankPending || rankConfirming}
                className="px-4 py-2 rounded-xl border border-white/[0.08] text-zinc-300 text-sm font-medium hover:bg-white/[0.04] hover:text-white transition-colors disabled:opacity-40"
              >
                {updatingRank || rankPending || rankConfirming ? "Updating…" : "Sync rank"}
              </button>
            </div>
          </div>

          {/* Progress to next rank */}
          {nextRank && (
            <div className="px-8 py-5 border-t border-white/[0.05] space-y-3">
              <p className="text-zinc-500 text-xs">Next rank: <span style={{ color: nextRank.color }}>{nextRank.name}</span></p>
              <p className="text-zinc-600 text-xs leading-relaxed">
                Keep entering drops and winning raffles. Click &quot;Sync rank&quot; to check your progress.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Claim card — not yet claimed */
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.01] p-8 space-y-6 text-center">
          <div className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto border border-zinc-800" style={{ background: "#71717a12" }}>
            <span className="font-black text-5xl text-zinc-600">E</span>
          </div>
          <div className="space-y-2">
            <p className="text-white font-bold text-xl" style={DISPLAY}>Claim your Hunter</p>
            <p className="text-zinc-500 text-sm">
              Free mint (gas only). Starts at E-Rank. Sync your rank anytime to level up based on your drop activity.
            </p>
          </div>
          <button
            onClick={handleClaim}
            disabled={claimPending || claimConfirming}
            className="px-8 py-4 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors disabled:opacity-30 shadow-[0_2px_40px_rgba(255,255,255,0.07)]"
          >
            {claimPending || claimConfirming ? "Claiming…" : "Claim free Hunter NFT"}
          </button>
          <p className="text-zinc-700 text-xs">Gas only · No USDC required · Soulbound (non-transferable)</p>
        </div>
      )}

      {/* How ranks work */}
      <div className="space-y-4">
        <p className="text-zinc-500 text-[11px] uppercase tracking-[0.2em]">How ranks work</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: "🎯", title: "Enter drops",  desc: "Each drop you enter adds to your activity score." },
            { icon: "🏆", title: "Win raffles",  desc: "Winning a drop gives bonus points toward a higher rank." },
            { icon: "⬆️", title: "Sync on-chain", desc: "Click 'Sync rank' whenever you want to push a new rank to your NFT." },
          ].map((x) => (
            <div key={x.title} className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-5 space-y-2">
              <span className="text-2xl">{x.icon}</span>
              <p className="text-white font-bold text-sm" style={DISPLAY}>{x.title}</p>
              <p className="text-zinc-500 text-xs leading-relaxed">{x.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
