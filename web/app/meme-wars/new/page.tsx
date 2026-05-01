"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Nav } from "@/app/components/Nav";
import { MobileNav } from "@/app/components/MobileNav";
import Link from "next/link";
import toast from "react-hot-toast";
import { MEME_WAR_ADDRESS, MEME_WAR_ABI, USDC_ADDRESS, ERC20_ABI } from "@/lib/contracts";

const D    = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const BODY = { fontFamily: "var(--font-sans), system-ui, sans-serif" };

export default function NewMemeWarPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const [title,        setTitle]        = useState("");
  const [theme,        setTheme]        = useState("");
  const [prize,        setPrize]        = useState("100");
  const [voteCost,     setVoteCost]     = useState("0.10");
  const [durationDays, setDurationDays] = useState("7");
  const [phase,        setPhase]        = useState<"idle" | "approving" | "creating" | "saving">("idle");

  const { writeContract, data: txHash } = useWriteContract();
  const { data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  async function handleCreate() {
    if (!address || !title.trim()) return;

    const prizeWei    = BigInt(Math.round(parseFloat(prize) * 1_000_000));
    const voteCostWei = BigInt(Math.round(parseFloat(voteCost) * 1_000_000));
    const endTime     = BigInt(Math.floor(Date.now() / 1000) + parseInt(durationDays) * 86400);

    setPhase("approving");
    writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [MEME_WAR_ADDRESS, prizeWei],
    }, {
      onSuccess: () => {
        setPhase("creating");
        writeContract({
          address: MEME_WAR_ADDRESS,
          abi: MEME_WAR_ABI,
          functionName: "createWar",
          args: [prizeWei, voteCostWei, endTime],
        }, {
          onSuccess: async (hash) => {
            setPhase("saving");
            try {
              const endsAt  = new Date(Date.now() + parseInt(durationDays) * 86400 * 1000).toISOString();
              // Parse warId from WarCreated event log (topic[1])
              const warLog  = receipt?.logs?.find(l => l.topics.length >= 2);
              const warId   = warLog?.topics[1] ? Number(BigInt(warLog.topics[1])) : null;

              const res = await fetch("/api/meme-wars", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  creator_wallet:   address,
                  title:            title.trim(),
                  theme:            theme.trim() || undefined,
                  prize_pool_usdc:  parseFloat(prize),
                  vote_cost_usdc:   parseFloat(voteCost),
                  ends_at:          endsAt,
                  contract_war_id:  warId,
                  contract_address: MEME_WAR_ADDRESS,
                }),
              });
              const data = await res.json();
              if (res.ok) {
                toast.success("Meme War created!");
                router.push(`/meme-wars/${data.meme_war.id}`);
              } else {
                toast.error(data.error ?? "Save failed");
                setPhase("idle");
              }
            } catch {
              toast.error("War created on-chain but DB save failed — check /meme-wars");
              setPhase("idle");
            }
            void hash;
          },
          onError: (e) => { toast.error(e.message.split("\n")[0]); setPhase("idle"); },
        });
      },
      onError: (e) => { toast.error(e.message.split("\n")[0]); setPhase("idle"); },
    });
  }

  const loading = phase !== "idle";

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <MobileNav />
      <div className="max-w-lg mx-auto px-6 py-12 pb-28">
        <div className="mb-8">
          <Link href="/meme-wars" className="text-gray-400 text-xs hover:text-black transition-colors" style={BODY}>← Meme Wars</Link>
          <h1 className="font-black text-4xl text-black mt-3" style={D}>Start a War</h1>
          <p className="text-gray-400 text-sm mt-1" style={BODY}>Deposit USDC on-chain. Hunters submit. Supporters vote.</p>
        </div>

        {!isConnected ? (
          <div className="rounded-2xl border border-black/[0.07] p-10 text-center space-y-4">
            <p className="text-black font-semibold text-sm" style={BODY}>Connect wallet to start a war</p>
            <ConnectButton />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-black text-sm font-semibold" style={BODY}>Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Best Base Meme" maxLength={60}
                className="w-full border border-black/[0.1] rounded-xl px-4 py-3 text-sm placeholder-gray-300 outline-none focus:border-black/30 transition-all" style={BODY} />
            </div>
            <div className="space-y-2">
              <label className="text-black text-sm font-semibold" style={BODY}>Theme / prompt</label>
              <input value={theme} onChange={e => setTheme(e.target.value)} placeholder="e.g. Based frogs, builder vibes" maxLength={80}
                className="w-full border border-black/[0.1] rounded-xl px-4 py-3 text-sm placeholder-gray-300 outline-none focus:border-black/30 transition-all" style={BODY} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-black text-sm font-semibold" style={BODY}>Prize pool (USDC) *</label>
                <input type="number" value={prize} onChange={e => setPrize(e.target.value)} min="1"
                  className="w-full border border-black/[0.1] rounded-xl px-4 py-3 text-sm outline-none focus:border-black/30 transition-all" style={BODY} />
              </div>
              <div className="space-y-2">
                <label className="text-black text-sm font-semibold" style={BODY}>Vote cost (USDC)</label>
                <input type="number" value={voteCost} onChange={e => setVoteCost(e.target.value)} min="0.01" step="0.01"
                  className="w-full border border-black/[0.1] rounded-xl px-4 py-3 text-sm outline-none focus:border-black/30 transition-all" style={BODY} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-black text-sm font-semibold" style={BODY}>Duration</label>
              <div className="grid grid-cols-4 gap-2">
                {["1","3","7","14"].map(d => (
                  <button key={d} type="button" onClick={() => setDurationDays(d)}
                    className={`py-2.5 rounded-xl border text-sm font-bold transition-all ${
                      durationDays === d ? "border-black bg-black text-white" : "border-black/[0.1] hover:border-black/30"
                    }`} style={BODY}>
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 border border-black/[0.06] p-4 text-xs space-y-1" style={BODY}>
              <p className="font-bold text-black">Transaction flow</p>
              <p className="text-gray-500">1. Approve ${prize} USDC · 2. Call createWar on Base · 3. Save to DB</p>
            </div>
            <button onClick={handleCreate} disabled={loading || !title.trim() || parseFloat(prize) <= 0}
              className="w-full py-4 rounded-xl bg-black text-white font-black text-sm disabled:opacity-40 hover:bg-zinc-800 transition-colors" style={D}>
              {phase === "approving" ? "Approving USDC…" :
               phase === "creating"  ? "Creating on-chain…" :
               phase === "saving"    ? "Saving…" :
               `Start War · $${prize} USDC prize`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
