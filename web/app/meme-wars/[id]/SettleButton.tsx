"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import toast from "react-hot-toast";
import { MEME_WAR_ADDRESS, MEME_WAR_ABI } from "@/lib/contracts";
import type { MemeEntry } from "@/lib/supabase";

const BODY = { fontFamily: "var(--font-sans), system-ui, sans-serif" };

export function SettleButton({
  warId,
  onChainWarId,
  entries,
  creatorWallet,
}: {
  warId: string;
  onChainWarId: number | null;
  entries: MemeEntry[];
  creatorWallet: string;
}) {
  const { address } = useAccount();
  const [phase, setPhase] = useState<"idle" | "onchain" | "db">("idle");

  const { writeContract } = useWriteContract();
  const { data: receipt } = useWaitForTransactionReceipt();

  // Only show to the war creator
  if (!address || address.toLowerCase() !== creatorWallet.toLowerCase()) return null;

  const top3 = entries.slice(0, 3);
  if (!top3.length) return null;

  const [first, second, third] = top3;

  async function handleSettle() {
    if (!onChainWarId || !address) {
      // No on-chain war — just settle in DB
      setPhase("db");
      try {
        const res = await fetch(`/api/meme-wars/${warId}/settle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ admin_wallet: address }),
        });
        const data = await res.json();
        if (res.ok) toast.success("War settled! Winners recorded.");
        else toast.error(data.error ?? "Settle failed");
      } catch { toast.error("Something went wrong"); }
      finally { setPhase("idle"); }
      return;
    }

    // Settle on-chain first
    setPhase("onchain");
    writeContract({
      address: MEME_WAR_ADDRESS,
      abi: MEME_WAR_ABI,
      functionName: "settleWar" as never,
      args: [
        BigInt(onChainWarId),
        BigInt(first.on_chain_id),
        BigInt(second?.on_chain_id ?? 0),
        BigInt(third?.on_chain_id ?? 0),
        first.hunter_wallet as `0x${string}`,
        (second?.hunter_wallet ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
        (third?.hunter_wallet ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
      ],
    } as never, {
      onSuccess: async () => {
        setPhase("db");
        try {
          const res = await fetch(`/api/meme-wars/${warId}/settle`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ admin_wallet: address }),
          });
          const data = await res.json();
          if (res.ok) toast.success("War settled! USDC distributed on-chain.");
          else toast.error(data.error ?? "DB settle failed");
        } catch { toast.error("On-chain settled but DB sync failed"); }
        finally { setPhase("idle"); }
      },
      onError: (e) => { toast.error(e.message.split("\n")[0]); setPhase("idle"); },
    });
  }

  void receipt;

  const loading = phase !== "idle";

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3">
      <div>
        <p className="text-black font-black text-base" style={{ fontFamily: "var(--font-display)" }}>Settle War</p>
        <p className="text-amber-700 text-xs mt-1" style={BODY}>War has ended. Distribute prizes to top 3.</p>
      </div>
      <div className="space-y-1 text-xs" style={BODY}>
        {top3.map((e, i) => (
          <div key={e.id} className="flex items-center justify-between">
            <span className="text-gray-500">{["1st","2nd","3rd"][i]}</span>
            <span className="font-mono text-gray-700">{e.hunter_wallet.slice(0,6)}…{e.hunter_wallet.slice(-4)}</span>
            <span className="font-bold text-black">{e.vote_count} votes</span>
          </div>
        ))}
      </div>
      <button onClick={handleSettle} disabled={loading}
        className="w-full py-2.5 rounded-xl bg-amber-500 text-white font-bold text-sm disabled:opacity-50 hover:bg-amber-600 transition-colors" style={BODY}>
        {phase === "onchain" ? "Distributing on-chain…" :
         phase === "db"      ? "Recording results…" :
         "Settle War & Pay Winners"}
      </button>
    </div>
  );
}
