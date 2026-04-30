"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const BODY = { fontFamily: "var(--font-sans), system-ui, sans-serif" };

export function SquadActions({
  squadId,
  ownerWallet,
  memberWallets,
}: {
  squadId: string;
  ownerWallet: string;
  memberWallets: string[];
}) {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!isConnected || !address) return null;

  const isOwner  = address.toLowerCase() === ownerWallet.toLowerCase();
  const isMember = memberWallets.includes(address.toLowerCase());

  if (isOwner) return (
    <span className="px-4 py-2 rounded-xl bg-black/[0.04] text-gray-400 text-xs font-medium" style={BODY}>
      You own this squad
    </span>
  );

  async function handleJoin() {
    setLoading(true);
    try {
      const res = await fetch(`/api/squads/${squadId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: address }),
      });
      const data = await res.json();
      if (res.ok) { toast.success("Joined squad!"); router.refresh(); }
      else toast.error(data.error ?? "Failed to join");
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  }

  async function handleLeave() {
    setLoading(true);
    try {
      const res = await fetch(`/api/squads/${squadId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: address }),
      });
      const data = await res.json();
      if (res.ok) { toast.success("Left squad"); router.refresh(); }
      else toast.error(data.error ?? "Failed to leave");
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  }

  return isMember ? (
    <button onClick={handleLeave} disabled={loading}
      className="px-5 py-2.5 rounded-xl border border-black/[0.1] text-gray-500 text-sm font-medium hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-40" style={BODY}>
      {loading ? "Leaving…" : "Leave Squad"}
    </button>
  ) : (
    <button onClick={handleJoin} disabled={loading}
      className="px-5 py-2.5 rounded-xl bg-black text-white text-sm font-bold hover:bg-zinc-800 transition-colors disabled:opacity-40" style={BODY}>
      {loading ? "Joining…" : "Join Squad"}
    </button>
  );
}
