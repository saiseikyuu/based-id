"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import toast from "react-hot-toast";
import { MEME_WAR_ADDRESS, MEME_WAR_ABI, USDC_ADDRESS, ERC20_ABI } from "@/lib/contracts";

const BODY = { fontFamily: "var(--font-sans), system-ui, sans-serif" };

export function VoteButton({
  warId,
  entryId,
  onChainWarId,
  onChainEntryId,
  voteCostUsdc,
  warEnded,
}: {
  warId: string;
  entryId: string;
  onChainWarId: number;
  onChainEntryId: number;
  voteCostUsdc: number;
  warEnded: boolean;
}) {
  const { address, isConnected } = useAccount();
  const [votes, setVotes] = useState(1);
  const [phase, setPhase] = useState<"idle" | "approving" | "voting" | "recording">("idle");

  const { writeContract } = useWriteContract();
  const costWei    = BigInt(Math.round(voteCostUsdc * votes * 1_000_000));
  const displayCost = (voteCostUsdc * votes).toFixed(2);

  if (!isConnected) return (
    <div className="flex justify-center pt-1">
      <ConnectButton label="Connect to vote" />
    </div>
  );

  if (warEnded) return (
    <p className="text-center text-gray-400 text-xs py-2" style={BODY}>War ended — voting closed</p>
  );

  if (!onChainWarId) return (
    <p className="text-center text-gray-400 text-xs py-2" style={BODY}>On-chain voting not yet live</p>
  );

  function handleVote() {
    if (!address) return;
    setPhase("approving");

    writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [MEME_WAR_ADDRESS, costWei],
    }, {
      onSuccess: () => {
        setPhase("voting");
        writeContract({
          address: MEME_WAR_ADDRESS,
          abi: MEME_WAR_ABI,
          functionName: "vote",
          args: [BigInt(onChainWarId), BigInt(onChainEntryId), BigInt(votes)],
        }, {
          onSuccess: async (hash) => {
            setPhase("recording");
            try {
              await fetch(`/api/meme-wars/${warId}/vote`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  voter_wallet: address,
                  entry_id:     entryId,
                  on_chain_id:  onChainEntryId,
                  vote_count:   votes,
                  amount_paid:  voteCostUsdc * votes,
                  tx_hash:      hash,
                }),
              });
              toast.success(`Voted ${votes}× · $${displayCost} USDC`);
            } catch {
              toast.error("Vote confirmed on-chain — DB sync pending");
            } finally {
              setPhase("idle");
            }
          },
          onError: (e) => { toast.error(e.message.split("\n")[0]); setPhase("idle"); },
        });
      },
      onError: (e) => { toast.error(e.message.split("\n")[0]); setPhase("idle"); },
    });
  }

  const loading = phase !== "idle";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button onClick={() => setVotes(v => Math.max(1, v - 1))} disabled={loading || votes <= 1}
          className="w-8 h-8 rounded-lg border border-black/[0.1] text-black font-bold disabled:opacity-30 hover:bg-black/[0.04] transition-colors">
          −
        </button>
        <span className="flex-1 text-center font-black text-sm tabular-nums" style={{ fontFamily: "var(--font-display)", color: "#0052FF" }}>
          {votes}× · ${displayCost}
        </span>
        <button onClick={() => setVotes(v => Math.min(100, v + 1))} disabled={loading}
          className="w-8 h-8 rounded-lg border border-black/[0.1] text-black font-bold disabled:opacity-30 hover:bg-black/[0.04] transition-colors">
          +
        </button>
      </div>
      <button onClick={handleVote} disabled={loading}
        className="w-full py-2.5 rounded-xl bg-black text-white font-bold text-xs disabled:opacity-50 hover:bg-zinc-800 transition-colors" style={BODY}>
        {phase === "approving" ? "Approving…" :
         phase === "voting"    ? "Confirm vote…" :
         phase === "recording" ? "Recording…" :
         `Vote · $${displayCost} USDC`}
      </button>
    </div>
  );
}
