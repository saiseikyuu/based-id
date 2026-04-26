"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useCallback, useEffect } from "react";
import { BASED_ID_ADDRESS, BASED_ID_ABI, USDC_ADDRESS, ERC20_ABI } from "@/lib/contracts";
import CountUp from "@/app/components/CountUp";

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
    <div className="space-y-4">
      {/* Treasury */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-5">
        <p className="text-zinc-500 text-xs uppercase tracking-[0.18em]">Treasury</p>
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
