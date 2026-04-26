"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { BASED_ID_ADDRESS, BASED_ID_ABI, USDC_ADDRESS, ERC20_ABI } from "@/lib/contracts";
import CountUp from "@/app/components/CountUp";

const TYPE_LABELS: Record<string, string> = {
  whitelist: "Whitelist", raffle: "Raffle", token_drop: "Token Drop", nft_mint: "NFT Mint",
};

type PendingDrop = {
  id: string;
  title: string;
  type: string;
  tier: string;
  winner_count: number;
  ends_at: string;
  partner_address: string;
  image_url: string | null;
  description: string;
  created_at: string;
};

function DropReviewQueue({ address }: { address: string }) {
  const [drops, setDrops]   = useState<PendingDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/drops?status=pending_review");
      const data = await res.json();
      setDrops(Array.isArray(data) ? data : []);
    } catch { setDrops([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(dropId: string, action: "approve" | "reject") {
    setActing(dropId + action);
    try {
      const res = await fetch(`/api/drops/${dropId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner_address: address }),
      });
      if (res.ok) {
        toast.success(action === "approve" ? "Drop approved and live!" : "Drop rejected.");
        load();
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Failed");
      }
    } catch { toast.error("Something went wrong"); }
    finally { setActing(null); }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-semibold text-sm">Drop Review Queue</p>
          <p className="text-zinc-500 text-xs mt-0.5">Approve or reject submitted drops before they go live.</p>
        </div>
        {drops.length > 0 && (
          <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-900/20 text-amber-400 border border-amber-900/30">
            {drops.length} pending
          </span>
        )}
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/[0.05] px-4 py-6 text-center">
          <p className="text-zinc-600 text-sm">Loading…</p>
        </div>
      ) : drops.length === 0 ? (
        <div className="rounded-xl border border-white/[0.05] px-4 py-6 text-center">
          <p className="text-zinc-600 text-sm">No drops pending review</p>
        </div>
      ) : (
        <div className="space-y-3">
          {drops.map(drop => (
            <div key={drop.id} className="rounded-xl border border-amber-500/15 bg-amber-950/[0.03] p-4 space-y-3">
              <div className="flex items-start gap-3">
                {/* Image */}
                <div className="w-14 h-14 rounded-lg overflow-hidden border border-white/[0.08] bg-zinc-900 flex-shrink-0">
                  {drop.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={drop.image_url} alt={drop.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 font-bold text-xl">
                      {drop.title.slice(0, 1)}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-white font-semibold text-sm">{drop.title}</p>
                  {drop.description && (
                    <p className="text-zinc-500 text-xs line-clamp-2">{drop.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-medium text-zinc-500 font-mono">{TYPE_LABELS[drop.type] ?? drop.type}</span>
                    <span className="text-zinc-700">·</span>
                    <span className="text-[10px] text-zinc-500">{drop.winner_count} winner{drop.winner_count !== 1 ? "s" : ""}</span>
                    <span className="text-zinc-700">·</span>
                    <span className="text-[10px] text-zinc-500">Ends {new Date(drop.ends_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    {drop.tier === "featured" && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/25">FEATURED</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-700 text-[10px]">By</span>
                    <a href={`https://basescan.org/address/${drop.partner_address}`} target="_blank" rel="noopener noreferrer"
                      className="text-zinc-500 text-[10px] font-mono hover:text-zinc-300 transition-colors">
                      {drop.partner_address.slice(0, 6)}…{drop.partner_address.slice(-4)} ↗
                    </a>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 border-t border-white/[0.05]">
                <Link href={`/drops/${drop.id}`} target="_blank"
                  className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-zinc-400 text-[11px] font-medium hover:text-white transition-colors">
                  Preview ↗
                </Link>
                <div className="flex-1" />
                <button
                  onClick={() => act(drop.id, "reject")}
                  disabled={!!acting}
                  className="px-4 py-1.5 rounded-lg border border-red-900/30 text-red-400 text-[11px] font-semibold hover:bg-red-900/10 transition-colors disabled:opacity-40">
                  {acting === drop.id + "reject" ? "…" : "Reject"}
                </button>
                <button
                  onClick={() => act(drop.id, "approve")}
                  disabled={!!acting}
                  className="px-4 py-1.5 rounded-lg bg-green-600 text-white text-[11px] font-bold hover:bg-green-500 transition-colors disabled:opacity-40">
                  {acting === drop.id + "approve" ? "…" : "Approve"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function OwnerPanel() {
  const { address, isConnected } = useAccount();

  const { data: contractOwner } = useReadContract({ address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "owner" });
  const { data: mintingPaused, refetch: refetchPaused } = useReadContract({ address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "mintingPaused", query: { refetchInterval: 10000 } });
  const { data: treasuryBalance, refetch: refetchTreasury } = useReadContract({ address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: [BASED_ID_ADDRESS], query: { refetchInterval: 15000 } });

  const isOwner = !!(address && contractOwner && address.toLowerCase() === (contractOwner as string).toLowerCase());

  const { writeContract: writeWithdraw, data: withdrawTxHash, isPending: withdrawPending } = useWriteContract();
  const { isLoading: withdrawConfirming, isSuccess: withdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawTxHash });

  const { writeContract: writePause, data: pauseTxHash, isPending: pausePending } = useWriteContract();
  const { isLoading: pauseConfirming, isSuccess: pauseSuccess } = useWaitForTransactionReceipt({ hash: pauseTxHash });

  const { writeContract: writeRecoverETH, data: recoverETHTxHash, isPending: recoverETHPending } = useWriteContract();
  const { isLoading: recoverETHConfirming, isSuccess: recoverETHSuccess } = useWaitForTransactionReceipt({ hash: recoverETHTxHash });

  useEffect(() => { if (withdrawSuccess) refetchTreasury(); }, [withdrawSuccess, refetchTreasury]);
  useEffect(() => { if (pauseSuccess) refetchPaused(); }, [pauseSuccess, refetchPaused]);

  const handleWithdraw    = useCallback(() => writeWithdraw({ address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "withdraw" }), [writeWithdraw]);
  const handleTogglePause = useCallback(() => writePause({ address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "setPaused", args: [!mintingPaused] }), [writePause, mintingPaused]);
  const handleRecoverETH  = useCallback(() => writeRecoverETH({ address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "recoverETH" }), [writeRecoverETH]);

  if (!isConnected) return (
    <div className="space-y-4">
      <p className="text-zinc-500 text-sm">Connect the owner wallet to access controls.</p>
      <ConnectButton />
    </div>
  );

  if (!isOwner) return (
    <div className="rounded-2xl border border-red-900/30 bg-red-950/10 px-6 py-5">
      <p className="text-red-400 font-semibold text-sm">Not the owner wallet</p>
      <p className="text-zinc-600 text-xs mt-1">Connected: {address?.slice(0, 6)}…{address?.slice(-4)}</p>
    </div>
  );

  const balanceUsdc = treasuryBalance !== undefined ? Number(treasuryBalance as bigint) / 1_000_000 : null;

  return (
    <div className="space-y-6">

      {/* Drop review queue — most important, top */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
        <DropReviewQueue address={address!} />
      </div>

      {/* Treasury */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-5">
        <p className="text-zinc-500 text-xs uppercase tracking-[0.18em]">Treasury (Based ID mints)</p>
        <div className="flex items-baseline gap-2">
          <span className="text-zinc-500 text-xl">$</span>
          {balanceUsdc !== null ? (
            <CountUp to={balanceUsdc} duration={1.4} className="text-5xl font-black text-white" />
          ) : (
            <span className="text-5xl font-black text-zinc-700">—</span>
          )}
          <span className="text-zinc-500 text-sm">USDC</span>
        </div>
        <button onClick={handleWithdraw}
          disabled={withdrawPending || withdrawConfirming || !balanceUsdc || balanceUsdc === 0}
          className="w-full py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
          {withdrawConfirming ? "Confirming…" : withdrawPending ? "Confirm in wallet…" : balanceUsdc === 0 ? "Nothing to withdraw" : `Withdraw $${balanceUsdc?.toFixed(2)} USDC`}
        </button>
      </div>

      {/* Pause toggle */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-sm">Minting</p>
            <p className="text-zinc-500 text-xs mt-0.5">{mintingPaused ? "Currently paused" : "Currently open"}</p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-[0.1em] ${mintingPaused ? "text-red-400 bg-red-900/20" : "text-green-400 bg-green-900/20"}`}>
            {mintingPaused ? "Paused" : "Live"}
          </span>
        </div>
        <button onClick={handleTogglePause} disabled={pausePending || pauseConfirming}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-30 ${mintingPaused ? "bg-white text-black hover:bg-zinc-100" : "border border-red-900/40 text-red-400 hover:bg-red-900/10"}`}>
          {pauseConfirming ? "Confirming…" : pausePending ? "Confirm in wallet…" : mintingPaused ? "Resume Minting" : "Pause Minting"}
        </button>
      </div>

      {/* ETH recovery */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-3">
        <div>
          <p className="text-white font-semibold text-sm">Recover ETH</p>
          <p className="text-zinc-500 text-xs mt-0.5">Rescue ETH accidentally sent to the contract.</p>
        </div>
        {recoverETHSuccess ? (
          <p className="text-green-400 text-xs">ETH recovered.</p>
        ) : (
          <button onClick={handleRecoverETH} disabled={recoverETHPending || recoverETHConfirming}
            className="w-full py-3 rounded-xl border border-white/[0.08] text-zinc-400 font-semibold text-sm hover:text-white hover:border-white/[0.16] transition-all disabled:opacity-30">
            {recoverETHConfirming ? "Confirming…" : recoverETHPending ? "Confirm in wallet…" : "Recover ETH"}
          </button>
        )}
      </div>

      {/* Contract info */}
      <div className="rounded-xl border border-white/[0.05] px-4 py-3">
        <p className="text-zinc-700 text-[10px] uppercase tracking-[0.18em] mb-1">Contract</p>
        <p className="text-zinc-500 text-xs font-mono break-all">{BASED_ID_ADDRESS}</p>
      </div>
    </div>
  );
}
