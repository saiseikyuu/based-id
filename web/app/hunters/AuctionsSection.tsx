"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { motion } from "motion/react";
import {
  BASED_ID_ADDRESS, BASED_ID_ABI,
  USDC_ADDRESS, ERC20_ABI,
  AUCTION_HOUSE_ADDRESS, AUCTION_HOUSE_ABI,
} from "@/lib/contracts";
import { NftCard } from "@/app/NftCard";
import SpotlightCard from "@/app/components/SpotlightCard";

const D: React.CSSProperties     = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const AMBER: React.CSSProperties = { background: "linear-gradient(180deg,#fde68a,#d97706)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" };
const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

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

type AuctionSubTab = "live" | "manage";

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

function useAuctions(refreshKey: number) {
  const publicClient = usePublicClient();
  const [auctions, setAuctions] = useState<AuctionData[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!publicClient) return;
    setLoading(true);
    const client = publicClient;
    async function load() {
      try {
        const ids = Array.from({ length: 100 }, (_, i) => BigInt(i + 1));
        const results = await Promise.all(
          ids.map((id) =>
            (client.readContract({
              address: AUCTION_HOUSE_ADDRESS, abi: AUCTION_HOUSE_ABI,
              functionName: "auctions", args: [id],
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
      } finally { setLoading(false); }
    }
    load();
  }, [publicClient, refreshKey]);

  return { auctions, loading };
}

function SettleButton({ tokenId, onSettled }: { tokenId: bigint; onSettled: () => void }) {
  const [err, setErr] = useState("");
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });
  useEffect(() => { if (confirmed) { setErr(""); onSettled(); } }, [confirmed, onSettled]);
  return (
    <div className="space-y-1.5">
      <button
        onClick={() => writeContract({ address: AUCTION_HOUSE_ADDRESS, abi: AUCTION_HOUSE_ABI, functionName: "settle", args: [tokenId] }, { onError: (e) => setErr(e.message.split("\n")[0]) })}
        disabled={isPending || confirming}
        className="w-full py-3 rounded-xl font-bold text-sm border border-amber-600/30 text-amber-400 hover:bg-amber-900/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
        {confirming ? "Confirming…" : isPending ? "Confirm in wallet…" : "Settle Auction"}
      </button>
      {err && <p className="text-red-400 text-[11px]">{err}</p>}
    </div>
  );
}

function AuctionCard({ auction, address, onBidSuccess }: { auction: AuctionData; address: string; onBidSuccess: () => void }) {
  const { remaining, d, h, m, s } = useAuctionTimer(auction.endTime);
  const ended     = remaining === 0;
  const hasBid    = auction.topBidder !== ZERO_ADDR;
  const isWinning = !!address && auction.topBidder.toLowerCase() === address.toLowerCase();

  const [bidInput, setBidInput] = useState("");
  const [step,     setStep]     = useState<"idle" | "approving" | "bidding">("idle");
  const [err,      setErr]      = useState("");
  const pendingAmount = useRef<bigint>(BigInt(0));

  const minBid    = hasBid ? auction.topBid + (auction.topBid * BigInt(500)) / BigInt(10_000) : auction.reservePrice;
  const minBidUsd = (Number(minBid) / 1_000_000).toFixed(2);

  const { data: allowance } = useReadContract({
    address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "allowance",
    args: [address as `0x${string}`, AUCTION_HOUSE_ADDRESS],
    query: { enabled: !!address, refetchInterval: 4000 },
  });

  const { writeContract: writeApprove, data: approveTxHash, isPending: approvePending } = useWriteContract();
  const { isLoading: approveConfirming, isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash });

  const { writeContract: writeBid, data: bidTxHash, isPending: bidPending } = useWriteContract();
  const { isLoading: bidConfirming, isSuccess: bidConfirmed } = useWaitForTransactionReceipt({ hash: bidTxHash });

  const loading = approvePending || approveConfirming || bidPending || bidConfirming;

  useEffect(() => {
    if (!approveConfirmed || step !== "approving") return;
    setStep("bidding");
    writeBid(
      { address: AUCTION_HOUSE_ADDRESS, abi: AUCTION_HOUSE_ABI, functionName: "bid", args: [auction.tokenId, pendingAmount.current] },
      { onError: (e) => { setErr(e.message.split("\n")[0]); setStep("idle"); } }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveConfirmed]);

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
      writeApprove({ address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "approve", args: [AUCTION_HOUSE_ADDRESS, amount] }, { onError: (e) => { setErr(e.message.split("\n")[0]); setStep("idle"); } });
    } else {
      setStep("bidding");
      writeBid({ address: AUCTION_HOUSE_ADDRESS, abi: AUCTION_HOUSE_ABI, functionName: "bid", args: [auction.tokenId, amount] }, { onError: (e) => { setErr(e.message.split("\n")[0]); setStep("idle"); } });
    }
  }

  const bidNum          = parseFloat(bidInput || "0") * 1_000_000;
  const alreadyApproved = !!allowance && allowance >= BigInt(Math.round(bidNum));
  const belowMin        = bidInput !== "" && bidNum < Number(minBid);
  const timeLabel       = d > 0 ? `${d}d ${String(h).padStart(2, "0")}h` : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  return (
    <SpotlightCard className="bg-background rounded-2xl border border-white/[0.05] overflow-hidden flex flex-col" spotlightColor="rgba(217,119,6,0.06)">
      <NftCard id={`#${auction.tokenId.toString()}`} holder={auction.seller} />
      <div className="p-5 flex flex-col gap-4 flex-1">
        <div className="flex items-center justify-between">
          <p className="font-bold text-sm text-white">Based ID <span style={AMBER}>#{auction.tokenId.toString()}</span></p>
          {ended ? (
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-zinc-900 border border-white/[0.05] text-zinc-500 font-semibold uppercase tracking-[0.1em]">Ended</span>
          ) : (
            <span className="flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full bg-green-900/20 border border-green-900/30 text-green-400 font-semibold uppercase tracking-[0.1em]">
              <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />Live
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3.5">
            <p className="text-zinc-600 text-[10px] uppercase tracking-[0.15em] mb-2">{hasBid ? "Current bid" : "Reserve"}</p>
            <p className="font-black text-2xl tabular-nums leading-none" style={AMBER}>
              ${hasBid ? (Number(auction.topBid) / 1_000_000).toFixed(2) : (Number(auction.reservePrice) / 1_000_000).toFixed(2)}
            </p>
            <p className="text-zinc-700 text-[9px] mt-1.5 uppercase tracking-[0.12em]">USDC</p>
          </div>
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3.5">
            <p className="text-zinc-600 text-[10px] uppercase tracking-[0.15em] mb-2">{ended ? "Result" : "Time left"}</p>
            {ended ? (
              <p className="font-black text-2xl leading-none text-zinc-400">{hasBid ? "Sold" : "Unsold"}</p>
            ) : (
              <p className="font-black text-2xl tabular-nums leading-none text-white">{timeLabel}</p>
            )}
          </div>
        </div>
        {hasBid && !ended && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${isWinning ? "border-green-900/30 bg-green-900/10 text-green-400" : "border-white/[0.04] bg-white/[0.01] text-zinc-500"}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isWinning ? "bg-green-400 animate-pulse" : "bg-zinc-700"}`} />
            {isWinning ? <span className="font-medium">You&apos;re winning</span> : <span>Top: <span className="font-mono">{auction.topBidder.slice(0, 6)}…{auction.topBidder.slice(-4)}</span></span>}
          </div>
        )}
        {ended && hasBid && (
          <div className="px-3 py-2.5 rounded-lg border border-white/[0.05] bg-white/[0.01] text-center">
            <p className="text-zinc-400 text-xs">Won by <span className="font-mono">{auction.topBidder.slice(0, 6)}…{auction.topBidder.slice(-4)}</span> for <span className="text-white font-bold">${(Number(auction.topBid) / 1_000_000).toFixed(2)}</span></p>
          </div>
        )}
        {ended && !hasBid && <div className="px-3 py-2.5 rounded-lg border border-dashed border-white/[0.05] text-center"><p className="text-zinc-700 text-xs">No bids — ended unsold</p></div>}
        <div className="flex-1" />
        {!ended && address && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none font-medium">$</span>
                <input type="number" min={minBidUsd} step="0.01" placeholder={minBidUsd} value={bidInput}
                  onChange={(e) => { setBidInput(e.target.value); setErr(""); }}
                  className={`w-full pl-8 pr-3 py-3 rounded-xl bg-white/[0.03] text-white text-sm placeholder:text-zinc-700 focus:outline-none transition-colors border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${belowMin ? "border-red-900/60 focus:border-red-600/50" : "border-white/[0.08] focus:border-amber-600/40"}`}
                />
              </div>
              <button onClick={handleBid} disabled={loading || !bidInput || belowMin}
                className="px-5 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                style={!loading && bidInput && !belowMin ? { background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#000" } : { background: "rgba(255,255,255,0.04)", color: "#52525b", border: "1px solid rgba(255,255,255,0.06)" }}>
                {step === "approving" ? (approveConfirming ? "Confirming…" : "Approving…") : step === "bidding" ? (bidConfirming ? "Confirming…" : "Bidding…") : alreadyApproved ? "Place Bid" : "Approve & Bid"}
              </button>
            </div>
            {belowMin ? <p className="text-red-400 text-[11px] font-medium">Minimum bid is ${minBidUsd} USDC</p> : <p className="text-zinc-700 text-[10px]">Min ${minBidUsd} · 5% increment · 15-min anti-snipe</p>}
          </div>
        )}
        {!ended && !address && <p className="text-zinc-700 text-xs text-center py-1">Connect wallet to bid</p>}
        {ended && hasBid && !auction.settled && <SettleButton tokenId={auction.tokenId} onSettled={onBidSuccess} />}
        {err && <p className="text-red-400 text-[11px]">{err}</p>}
      </div>
    </SpotlightCard>
  );
}

function ManageAuctionRow({ auction, onAction }: { auction: AuctionData; onAction: () => void }) {
  const { remaining, d, h, m } = useAuctionTimer(auction.endTime);
  const ended  = remaining === 0;
  const hasBid = auction.topBidder !== ZERO_ADDR;
  const [err, setErr] = useState("");
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });
  const loading = isPending || confirming;
  useEffect(() => { if (confirmed) { setErr(""); onAction(); } }, [confirmed, onAction]);

  const cancel = () => writeContract({ address: AUCTION_HOUSE_ADDRESS, abi: AUCTION_HOUSE_ABI, functionName: "cancelAuction", args: [auction.tokenId] }, { onError: (e) => setErr(e.message.split("\n")[0]) });
  const settle = () => writeContract({ address: AUCTION_HOUSE_ADDRESS, abi: AUCTION_HOUSE_ABI, functionName: "settle", args: [auction.tokenId] }, { onError: (e) => setErr(e.message.split("\n")[0]) });

  const timeStr = remaining > 0 ? (d > 0 ? `${d}d ${String(h).padStart(2, "0")}h` : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`) : "Ended";

  return (
    <div className={`rounded-xl border p-4 ${auction.settled ? "border-white/[0.03] opacity-50" : "border-white/[0.05]"}`}>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 flex-shrink-0 rounded-xl border border-amber-900/20 bg-amber-950/10 flex items-center justify-center">
          <span className="font-black text-sm" style={AMBER}>#{auction.tokenId.toString()}</span>
        </div>
        <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-0.5">
          {[
            { label: "Reserve", val: `$${(Number(auction.reservePrice) / 1_000_000).toFixed(0)}`, cls: "text-zinc-300" },
            { label: "Top bid",  val: hasBid ? `$${(Number(auction.topBid) / 1_000_000).toFixed(2)}` : "—", cls: hasBid ? "text-amber-400" : "text-zinc-700" },
            { label: ended ? "Ended" : "Remaining", val: timeStr, cls: "text-zinc-300" },
            { label: "Status", val: auction.settled ? "Settled" : ended && hasBid ? "Needs settle" : ended ? "No bids" : hasBid ? "Active bid" : "Live",
              cls: auction.settled ? "text-zinc-600" : ended && hasBid ? "text-amber-400" : ended ? "text-zinc-600" : hasBid ? "text-green-400" : "text-blue-400" },
          ].map(({ label, val, cls }) => (
            <div key={label}>
              <p className="text-zinc-700 text-[9px] uppercase tracking-[0.1em]">{label}</p>
              <p className={`text-xs font-semibold tabular-nums ${cls}`}>{val}</p>
            </div>
          ))}
        </div>
        <div className="flex-shrink-0 ml-2">
          {!ended && !hasBid && !auction.settled && (
            <button onClick={cancel} disabled={loading} className="px-3.5 py-1.5 rounded-lg text-[11px] font-semibold border border-red-900/30 text-red-400 hover:bg-red-900/10 transition-all disabled:opacity-30">
              {loading ? "…" : "Cancel"}
            </button>
          )}
          {ended && hasBid && !auction.settled && (
            <button onClick={settle} disabled={loading} className="px-3.5 py-1.5 rounded-lg text-[11px] font-semibold border border-amber-600/30 text-amber-400 hover:bg-amber-900/10 transition-all disabled:opacity-30">
              {loading ? "…" : "Settle"}
            </button>
          )}
        </div>
      </div>
      {err && <p className="text-red-400 text-[11px] mt-2 pl-14">{err}</p>}
    </div>
  );
}

function CreateAuctionForm({ onCreated }: { onCreated: () => void }) {
  const [tokenId, setTokenId] = useState("");
  const [reserve, setReserve] = useState("");
  const [hours,   setHours]   = useState("48");
  const [err,     setErr]     = useState("");
  const [step,    setStep]    = useState<"idle" | "creating">("idle");
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });
  const loading = isPending || confirming;

  useEffect(() => {
    if (confirmed && step === "creating") { setStep("idle"); setTokenId(""); setReserve(""); setHours("48"); setErr(""); onCreated(); }
  }, [confirmed, step, onCreated]);

  function handleCreate() {
    setErr("");
    const id  = parseInt(tokenId);
    const res = Math.round(parseFloat(reserve) * 1_000_000);
    const dur = parseInt(hours) * 3600;
    if (isNaN(id) || id < 1 || id > 100) { setErr("Token ID must be 1–100"); return; }
    if (isNaN(res) || res <= 0)           { setErr("Reserve price must be > 0"); return; }
    if (dur < 3600)                       { setErr("Minimum 1 hour"); return; }
    setStep("creating");
    writeContract({ address: AUCTION_HOUSE_ADDRESS, abi: AUCTION_HOUSE_ABI, functionName: "createAuction", args: [BigInt(id), BigInt(res), BigInt(dur)] }, { onError: (e) => { setErr(e.message.split("\n")[0]); setStep("idle"); } });
  }

  const durH       = parseInt(hours) || 0;
  const durDisplay = durH >= 24 ? `${(durH / 24).toFixed(durH % 24 === 0 ? 0 : 1)}d` : durH > 0 ? `${durH}h` : "";
  const canCreate  = !!tokenId && !!reserve && !!hours && !loading;

  return (
    <div className="rounded-2xl border border-amber-500/15 bg-amber-950/[0.04] p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-900/20 border border-amber-900/30 flex items-center justify-center flex-shrink-0">
          <span style={AMBER} className="text-sm font-black">+</span>
        </div>
        <div>
          <p className="text-amber-400 font-bold text-sm">Create Auction</p>
          <p className="text-zinc-600 text-[11px]">IDs #1–#100 · AuctionHouse must be approved first</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Token ID", prefix: "#", value: tokenId, setter: setTokenId, placeholder: "1", min: "1", max: "100" },
          { label: "Reserve ($)", prefix: "$", value: reserve, setter: setReserve, placeholder: "100", min: "1" },
          { label: `Duration${durDisplay ? ` (${durDisplay})` : ""}`, suffix: "h", value: hours, setter: setHours, placeholder: "48", min: "1", max: "168" },
        ].map(({ label, prefix, suffix, value, setter, placeholder, min, max }) => (
          <div key={label} className="space-y-1.5">
            <label className="text-zinc-600 text-[10px] uppercase tracking-[0.15em]">{label}</label>
            <div className="relative">
              {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm pointer-events-none">{prefix}</span>}
              <input type="number" min={min} max={max} placeholder={placeholder} value={value}
                onChange={(e) => setter(e.target.value)}
                className={`w-full ${prefix ? "pl-7" : "pl-3"} ${suffix ? "pr-8" : "pr-3"} py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-amber-600/40 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
              />
              {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs pointer-events-none">{suffix}</span>}
            </div>
          </div>
        ))}
      </div>
      <button onClick={handleCreate} disabled={!canCreate}
        className="w-full py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        style={canCreate ? { background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#000" } : {}}>
        {loading ? (confirming ? "Confirming…" : "Confirm in wallet…") : `Auction #${tokenId || "?"} · $${reserve || "?"} reserve · ${durDisplay || `${hours}h`}`}
      </button>
      {err && <p className="text-red-400 text-[11px]">{err}</p>}
    </div>
  );
}

function ApproveAuctionHouseCard({ ownerAddress }: { ownerAddress: string }) {
  const { data: isApproved, refetch } = useReadContract({
    address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "isApprovedForAll",
    args: [ownerAddress as `0x${string}`, AUCTION_HOUSE_ADDRESS],
    query: { enabled: !!ownerAddress },
  });
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });
  useEffect(() => { if (confirmed) refetch(); }, [confirmed, refetch]);

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-semibold text-sm">Auction House Approval</p>
          <p className="text-zinc-600 text-xs mt-0.5">Required before creating Genesis auctions.</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-[0.1em] ${isApproved ? "text-green-400 bg-green-900/20" : "text-zinc-500 bg-white/[0.04]"}`}>
          {isApproved === undefined ? "—" : isApproved ? "Approved ✓" : "Not set"}
        </span>
      </div>
      {!isApproved && (
        <button onClick={() => writeContract({ address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "setApprovalForAll", args: [AUCTION_HOUSE_ADDRESS, true] })}
          disabled={isPending || confirming}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-white text-black hover:bg-zinc-100 transition-colors disabled:opacity-30">
          {confirming ? "Confirming…" : isPending ? "Confirm in wallet…" : "Approve AuctionHouse"}
        </button>
      )}
      {isApproved && <p className="text-zinc-600 text-xs">AuctionHouse can transfer Genesis IDs. You can now create auctions.</p>}
    </div>
  );
}

export function AuctionsSection() {
  const { address } = useAccount();
  const [subTab,     setSubTab]     = useState<AuctionSubTab>("live");
  const [refreshKey, setRefreshKey] = useState(0);
  const [now,        setNow]        = useState(() => Math.floor(Date.now() / 1000));
  const reload = useCallback(() => setRefreshKey((k) => k + 1), []);

  const { data: contractOwner } = useReadContract({ address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "owner" });
  const isOwner = !!(address && contractOwner && address.toLowerCase() === (contractOwner as string).toLowerCase());

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 5000);
    return () => clearInterval(t);
  }, []);

  const { auctions, loading } = useAuctions(refreshKey);
  const live  = auctions.filter(a => !a.settled && Number(a.endTime) > now);
  const ended = auctions.filter(a => !a.settled && Number(a.endTime) <= now);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="space-y-6">

      {/* Owner sub-tabs */}
      {isOwner && (
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/[0.05] w-fit">
          {(["live", "manage"] as AuctionSubTab[]).map(key => (
            <button key={key} onClick={() => setSubTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-[0.1em] transition-all ${subTab === key ? "bg-white/[0.07] text-white border border-white/[0.08]" : "text-zinc-600 hover:text-zinc-400"}`}>
              {key === "live" ? "Live Auctions" : "Manage"}
              {key === "live" && live.length > 0 && <span className={`text-[9px] font-bold tabular-nums ${subTab === "live" ? "text-green-400" : "text-zinc-700"}`}>{live.length}</span>}
              {key === "manage" && ended.length > 0 && <span className={`text-[9px] font-bold tabular-nums ${subTab === "manage" ? "text-amber-400" : "text-zinc-700"}`}>{ended.length} pending</span>}
            </button>
          ))}
        </div>
      )}

      {/* Live auctions view */}
      {subTab === "live" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.01] p-4 flex items-start gap-3">
            <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse mt-1.5 flex-shrink-0" />
            <p className="text-zinc-500 text-xs leading-relaxed">
              <span className="text-white font-semibold">How it works: </span>
              Each bid must be 5% above the last. Bids in the last 15 min extend the timer. Outbid amounts are refunded instantly.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2.5 py-12 text-zinc-600 text-xs uppercase tracking-[0.15em]">
              <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />Loading auctions…
            </div>
          ) : live.length === 0 && ended.length === 0 ? (
            <div className="max-w-lg">
              <SpotlightCard className="bg-background rounded-2xl border border-amber-500/10 p-7 space-y-5" spotlightColor="rgba(245,158,11,0.05)">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-900/20 border border-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <div>
                    <p style={AMBER} className="font-bold text-sm">Genesis Vault — IDs #1–#100</p>
                    <p className="text-zinc-600 text-[11px] mt-0.5">Sealed. Not yet auctioned.</p>
                  </div>
                </div>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  The 100 lowest IDs will be auctioned one-by-one — starting at <span className="text-white font-semibold">#100</span> and ending with the grand finale: <span className="text-white font-semibold">#1</span>.
                </p>
                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: 100 }, (_, i) => (
                    <div key={i} className="aspect-square rounded-md flex items-center justify-center" style={{ backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
                      <span className="text-[6px] tabular-nums" style={{ color: "rgba(217,119,6,0.5)" }}>{i + 1}</span>
                    </div>
                  ))}
                </div>
              </SpotlightCard>
            </div>
          ) : (
            <>
              {live.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                  {live.map(a => <AuctionCard key={a.tokenId.toString()} auction={a} address={address ?? ""} onBidSuccess={reload} />)}
                </div>
              )}
              {ended.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2"><div className="h-px flex-1 bg-white/[0.04]" /><span className="text-zinc-700 text-[10px] uppercase tracking-[0.15em] px-2">Needs Settlement</span><div className="h-px flex-1 bg-white/[0.04]" /></div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                    {ended.map(a => <AuctionCard key={a.tokenId.toString()} auction={a} address={address ?? ""} onBidSuccess={reload} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Owner manage tab */}
      {subTab === "manage" && isOwner && (
        <div className="space-y-5 max-w-3xl">
          <div className="grid grid-cols-3 gap-2">
            {[{ label: "Live", value: live.length, color: "text-green-400" }, { label: "Unsettled", value: ended.length, color: "text-amber-400" }, { label: "Total", value: auctions.length, color: "text-white" }].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-white/[0.05] bg-white/[0.01] p-4 text-center">
                <p className={`text-3xl font-black tabular-nums ${color}`}>{value}</p>
                <p className="text-zinc-700 text-[10px] uppercase tracking-[0.15em] mt-1">{label}</p>
              </div>
            ))}
          </div>
          <ApproveAuctionHouseCard ownerAddress={address ?? ""} />
          <CreateAuctionForm onCreated={reload} />
          {!loading && auctions.length > 0 && (
            <div className="space-y-3">
              <p className="text-zinc-600 text-[11px] uppercase tracking-[0.15em]">All Auctions</p>
              <div className="space-y-2">{auctions.map(a => <ManageAuctionRow key={a.tokenId.toString()} auction={a} onAction={reload} />)}</div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
