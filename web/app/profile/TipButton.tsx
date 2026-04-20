"use client";

import { useSendTransaction, useAccount } from "wagmi";
import { parseEther } from "viem";
import toast from "react-hot-toast";

const TIP_AMOUNT = parseEther("0.0001");

export function TipButton({ holder }: { holder: string }) {
  const { address, isConnected } = useAccount();
  const { sendTransaction, isPending } = useSendTransaction();

  // Don't show if not connected or viewing own profile
  if (!isConnected || !address) return null;
  if (address.toLowerCase() === holder.toLowerCase()) return null;

  function handleTip() {
    sendTransaction(
      { to: holder as `0x${string}`, value: TIP_AMOUNT },
      {
        onSuccess: () => toast.success("Tip sent! 0.0001 ETH"),
        onError: (e) => toast.error(e.message.slice(0, 60)),
      }
    );
  }

  return (
    <button
      onClick={handleTip}
      disabled={isPending}
      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.07] text-zinc-400 text-xs font-medium hover:text-white hover:border-white/[0.15] transition-colors disabled:opacity-40 disabled:cursor-not-allowed w-fit"
    >
      {isPending ? (
        <>
          <span className="w-3 h-3 rounded-full border border-zinc-500 border-t-white animate-spin" />
          Sending…
        </>
      ) : (
        <>
          <span>⚡</span>
          Tip 0.0001 ETH
        </>
      )}
    </button>
  );
}
