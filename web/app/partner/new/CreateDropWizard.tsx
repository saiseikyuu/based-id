"use client";

import { useState } from "react";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseUnits, encodeFunctionData } from "viem";
import Link from "next/link";
import toast from "react-hot-toast";
import { USDC_ADDRESS } from "@/lib/contracts";
import type { DropType, DropTier, TaskType } from "@/lib/supabase";

const DISPLAY = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const TREASURY = process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? "0x0CC1984533619f37A82052af1f05997f9d44Ec02";

type TaskDraft = { type: TaskType; params: Record<string, string> };

const DROP_TYPES: { value: DropType; label: string; desc: string }[] = [
  { value: "whitelist",  label: "Whitelist",   desc: "Grant WL spots to winners" },
  { value: "raffle",     label: "Raffle",      desc: "Random draw from all entries" },
  { value: "token_drop", label: "Token Drop",  desc: "Distribute tokens to winners" },
  { value: "nft_mint",   label: "NFT Mint",    desc: "Reserve mint allocations" },
];

const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: "hold_based_id",   label: "Hold a Based ID (auto-required)" },
  { value: "follow_x",        label: "Follow on X" },
  { value: "join_discord",    label: "Join Discord" },
  { value: "hold_nft",        label: "Hold specific NFT" },
];

export function CreateDropWizard() {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState(1);

  // Form state
  const [title,        setTitle]       = useState("");
  const [description,  setDesc]        = useState("");
  const [imageUrl,     setImageUrl]    = useState("");
  const [dropType,     setDropType]    = useState<DropType>("raffle");
  const [tier,         setTier]        = useState<DropTier>("standard");
  const [winnerCount,  setWinnerCount] = useState(1);
  const [endsAt,       setEndsAt]      = useState("");
  const [prizeDetails, setPrize]       = useState("");
  const [tasks,        setTasks]       = useState<TaskDraft[]>([]);
  const [createdDrop,  setCreatedDrop] = useState<{ id: string; fee: number } | null>(null);
  const [txHash,       setTxHash]      = useState<`0x${string}` | undefined>();
  const [activating,   setActivating]  = useState(false);
  const [done,         setDone]        = useState(false);

  const { sendTransaction, isPending: sendPending } = useSendTransaction();
  const { isLoading: txLoading, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const feeAmount = tier === "featured" ? 200 : 50;

  function addTask(type: TaskType) {
    if (type === "hold_based_id") return; // always required, not manually added
    setTasks((prev) => [...prev, { type, params: {} }]);
  }

  function removeTask(idx: number) {
    setTasks((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateTaskParam(idx: number, key: string, val: string) {
    setTasks((prev) => prev.map((t, i) => i === idx ? { ...t, params: { ...t.params, [key]: val } } : t));
  }

  async function handleCreate() {
    if (!address) return;
    try {
      const allTasks = [
        { type: "hold_based_id" as TaskType, params: {} },
        ...tasks,
      ];
      const res = await fetch("/api/drops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_address: address,
          title, description, image_url: imageUrl || undefined,
          type: dropType, tier,
          prize_details: prizeDetails ? JSON.parse(prizeDetails) : {},
          winner_count: winnerCount,
          starts_at: new Date().toISOString(),
          ends_at: new Date(endsAt).toISOString(),
          tasks: allTasks,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to create drop"); return; }
      setCreatedDrop({ id: data.drop.id, fee: data.payment.amount_usdc });
      setStep(3);
    } catch {
      toast.error("Something went wrong");
    }
  }

  function handlePayFee() {
    if (!createdDrop || !address) return;
    const amount = parseUnits(String(createdDrop.fee), 6);
    const data   = encodeFunctionData({
      abi: [{ type: "function", name: "transfer", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" }],
      functionName: "transfer",
      args: [TREASURY as `0x${string}`, amount],
    });
    sendTransaction(
      { to: USDC_ADDRESS, data },
      {
        onSuccess: (hash) => { setTxHash(hash); toast.success("Payment sent! Confirming…"); },
        onError:   (e)    => toast.error(e.message.split("\n")[0]),
      }
    );
  }

  async function handleActivate() {
    if (!txHash || !createdDrop || !address) return;
    setActivating(true);
    try {
      const res = await fetch(`/api/drops/${createdDrop.id}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx_hash: txHash, partner_address: address }),
      });
      const data = await res.json();
      if (res.ok) { setDone(true); toast.success("Drop is live! 🎉"); }
      else toast.error(data.error ?? "Activation failed");
    } catch {
      toast.error("Activation failed");
    } finally {
      setActivating(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center space-y-5 max-w-sm">
          <h1 className="text-white font-bold text-2xl" style={DISPLAY}>Connect to create a drop</h1>
          <p className="text-zinc-500 text-sm">Connect your wallet to get started. Your wallet address becomes the partner address.</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (done && createdDrop) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h1 className="text-white font-black text-3xl" style={DISPLAY}>Drop is live!</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Your drop is now visible in /drops and accepting entries.
            Monitor it from your partner dashboard.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href={`/drops/${createdDrop.id}`} className="px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors">
              View drop →
            </Link>
            <Link href="/partner" className="px-5 py-2.5 rounded-xl border border-white/[0.1] text-zinc-300 text-sm font-medium hover:bg-white/[0.04] transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal nav */}
      <header className="sticky top-0 z-50 border-b border-white/[0.04] bg-black/70 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/partner" className="text-zinc-500 text-sm hover:text-white transition-colors flex items-center gap-1.5">
            ← Partner dashboard
          </Link>
          <div className="flex items-center gap-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= s ? "bg-white text-black" : "bg-white/[0.08] text-zinc-500"}`}>{s}</div>
                {s < 3 && <div className={`w-8 h-px ${step > s ? "bg-white" : "bg-white/[0.08]"}`} />}
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">

        {/* Step 1 — Drop details */}
        {step === 1 && (
          <div className="space-y-7">
            <div>
              <p className="text-zinc-500 text-[11px] uppercase tracking-[0.2em] mb-2">Step 1 of 3</p>
              <h1 className="text-white font-black text-3xl" style={DISPLAY}>Drop details</h1>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <label className="text-zinc-400 text-sm font-medium">Drop type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DROP_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setDropType(t.value)}
                    className={`rounded-xl border p-3 text-left transition-colors ${dropType === t.value ? "border-blue-500/50 bg-blue-950/30 text-white" : "border-white/[0.07] bg-white/[0.02] text-zinc-400 hover:border-white/[0.14]"}`}
                  >
                    <p className="font-bold text-sm">{t.label}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Tier */}
            <div className="space-y-2">
              <label className="text-zinc-400 text-sm font-medium">Listing tier</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "standard" as DropTier, label: "Standard", price: "50 USDC", desc: "Listed in /drops grid" },
                  { value: "featured" as DropTier, label: "Featured", price: "200 USDC", desc: "Top placement + landing page + X announcement" },
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTier(t.value)}
                    className={`rounded-xl border p-4 text-left transition-colors ${tier === t.value ? "border-amber-500/40 bg-amber-950/20 text-white" : "border-white/[0.07] bg-white/[0.02] text-zinc-400 hover:border-white/[0.14]"}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-sm">{t.label}</p>
                      <p className={`font-bold text-sm ${tier === t.value ? "text-amber-300" : "text-zinc-500"}`}>{t.price}</p>
                    </div>
                    <p className="text-[11px] text-zinc-500">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Basic fields */}
            {[
              { label: "Title *", value: title,       onChange: setTitle,    placeholder: "e.g. Early Holder Whitelist" },
              { label: "Image URL", value: imageUrl,  onChange: setImageUrl, placeholder: "https://…" },
            ].map((f) => (
              <div key={f.label} className="space-y-1.5">
                <label className="text-zinc-400 text-sm font-medium">{f.label}</label>
                <input value={f.value} onChange={(e) => f.onChange(e.target.value)} placeholder={f.placeholder}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 outline-none focus:border-blue-500/50 transition-colors" />
              </div>
            ))}

            <div className="space-y-1.5">
              <label className="text-zinc-400 text-sm font-medium">Description</label>
              <textarea value={description} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="What are you offering? Who is this for?"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 outline-none focus:border-blue-500/50 transition-colors resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-zinc-400 text-sm font-medium">Winner count</label>
                <input type="number" min={1} value={winnerCount} onChange={(e) => setWinnerCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500/50 transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label className="text-zinc-400 text-sm font-medium">Ends at (UTC) *</label>
                <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500/50 transition-colors" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-400 text-sm font-medium">Prize details (JSON, optional)</label>
              <textarea value={prizeDetails} onChange={(e) => setPrize(e.target.value)} rows={2} placeholder='{"tokens":"1000 XYZ","mint_date":"2026-06-01"}'
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 font-mono outline-none focus:border-blue-500/50 transition-colors resize-none" />
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!title.trim() || !endsAt}
              className="w-full py-4 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next: Set tasks →
            </button>
          </div>
        )}

        {/* Step 2 — Tasks */}
        {step === 2 && (
          <div className="space-y-7">
            <div>
              <p className="text-zinc-500 text-[11px] uppercase tracking-[0.2em] mb-2">Step 2 of 3</p>
              <h1 className="text-white font-black text-3xl" style={DISPLAY}>Entry requirements</h1>
              <p className="text-zinc-500 text-sm mt-2">Holding a Based ID is required. Add optional tasks below.</p>
            </div>

            {/* Always-required task */}
            <div className="flex items-center gap-3 rounded-xl border border-green-900/25 bg-green-950/[0.06] px-4 py-3">
              <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <span className="text-green-300 text-sm font-medium">Hold a Based ID</span>
              <span className="ml-auto text-zinc-600 text-[10px]">Always required</span>
            </div>

            {/* Added tasks */}
            {tasks.map((t, idx) => (
              <div key={idx} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium">{TASK_TYPES.find((tt) => tt.value === t.type)?.label ?? t.type}</span>
                  <button onClick={() => removeTask(idx)} className="text-zinc-600 hover:text-red-400 transition-colors text-[11px]">Remove</button>
                </div>
                {t.type === "follow_x" && (
                  <input value={t.params.handle ?? ""} onChange={(e) => updateTaskParam(idx, "handle", e.target.value)} placeholder="X handle (without @)"
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-600 outline-none focus:border-blue-500/50" />
                )}
                {t.type === "join_discord" && (
                  <input value={t.params.invite ?? ""} onChange={(e) => updateTaskParam(idx, "invite", e.target.value)} placeholder="Discord invite URL"
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-600 outline-none focus:border-blue-500/50" />
                )}
                {t.type === "hold_nft" && (
                  <div className="grid grid-cols-2 gap-2">
                    <input value={t.params.contract ?? ""} onChange={(e) => updateTaskParam(idx, "contract", e.target.value)} placeholder="NFT contract (0x…)"
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-600 outline-none focus:border-blue-500/50" />
                    <input type="number" min={1} value={t.params.minCount ?? "1"} onChange={(e) => updateTaskParam(idx, "minCount", e.target.value)} placeholder="Min count"
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-600 outline-none focus:border-blue-500/50" />
                  </div>
                )}
              </div>
            ))}

            {/* Add task */}
            <div className="space-y-2">
              <p className="text-zinc-600 text-[11px] uppercase tracking-[0.15em]">Add a task</p>
              <div className="flex flex-wrap gap-2">
                {TASK_TYPES.filter((t) => t.value !== "hold_based_id" && !tasks.some((added) => added.type === t.value)).map((t) => (
                  <button key={t.value} onClick={() => addTask(t.value)}
                    className="px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-zinc-400 text-[11px] font-medium hover:border-white/[0.2] hover:text-white transition-colors">
                    + {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-xl border border-white/[0.08] text-zinc-400 text-sm font-medium hover:bg-white/[0.04] transition-colors">← Back</button>
              <button onClick={handleCreate} className="flex-1 py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-100 transition-colors">
                Review & pay →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Pay + activate */}
        {step === 3 && createdDrop && (
          <div className="space-y-7">
            <div>
              <p className="text-zinc-500 text-[11px] uppercase tracking-[0.2em] mb-2">Step 3 of 3</p>
              <h1 className="text-white font-black text-3xl" style={DISPLAY}>Pay & go live</h1>
            </div>

            {/* Summary */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.01] divide-y divide-white/[0.05]">
              {[
                { label: "Title",    value: title },
                { label: "Type",     value: dropType },
                { label: "Tier",     value: tier },
                { label: "Winners",  value: winnerCount.toString() },
                { label: "Fee",      value: `${feeAmount} USDC` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3">
                  <span className="text-zinc-500 text-sm">{label}</span>
                  <span className="text-white text-sm font-medium capitalize">{value}</span>
                </div>
              ))}
            </div>

            {!txHash ? (
              <button
                onClick={handlePayFee}
                disabled={sendPending}
                className="w-full py-4 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {sendPending ? "Confirm in wallet…" : `Pay ${feeAmount} USDC & activate drop`}
              </button>
            ) : txLoading ? (
              <div className="text-center py-4 space-y-2">
                <p className="text-zinc-400 text-sm">Confirming payment…</p>
                <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 animate-pulse rounded-full w-2/3" />
                </div>
              </div>
            ) : txSuccess ? (
              <button
                onClick={handleActivate}
                disabled={activating}
                className="w-full py-4 rounded-xl bg-green-500 text-black font-bold text-sm hover:bg-green-400 transition-colors disabled:opacity-30"
              >
                {activating ? "Activating…" : "Confirm & make drop live →"}
              </button>
            ) : null}

            <p className="text-zinc-700 text-xs text-center">
              Funds go directly to the Based ID treasury. Non-refundable once the drop activates.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
