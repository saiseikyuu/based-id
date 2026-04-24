"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import toast from "react-hot-toast";
import { BASED_ID_ADDRESS, BASED_ID_ABI } from "@/lib/contracts";
import type { Drop, Task } from "@/lib/supabase";

type CompletedTask = { task_id: string; method: "self_attest" | "onchain" };

const TASK_LABELS: Record<string, string> = {
  follow_x:        "Follow on X",
  join_discord:    "Join Discord",
  hold_nft:        "Hold NFT",
  hold_based_id:   "Hold Based ID",
  min_hunter_rank: "Min Hunter rank",
};

export function DropEntry({
  drop,
  tasks,
  isActive,
  isEnded,
}: {
  drop: Drop;
  tasks: Task[];
  isActive: boolean;
  isEnded: boolean;
}) {
  const { address, isConnected } = useAccount();
  const [completed, setCompleted]   = useState<CompletedTask[]>([]);
  const [entering, setEntering]     = useState(false);
  const [entered, setEntered]       = useState(false);
  const [verifying, setVerifying]   = useState(false);

  // Read balanceOf directly onchain via wagmi — no API call, no auth needed
  const { data: balance, isLoading: checking } = useReadContract({
    address: BASED_ID_ADDRESS,
    abi: BASED_ID_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const holdsId = address
    ? balance !== undefined
      ? (balance as bigint) > BigInt(0)
      : null          // still loading
    : null;

  // Check if already entered
  useEffect(() => {
    if (!address || !drop?.id) return;
    fetch(`/api/drops/${drop.id}/status?wallet=${address}`)
      .then((r) => r.json())
      .then((d) => { if (d.entered) setEntered(true); })
      .catch(() => {});
  }, [address, drop?.id]);

  const isTaskCompleted = (taskId: string) =>
    completed.some((c) => c.task_id === taskId);

  const allTasksDone = tasks.every((t) => isTaskCompleted(t.id));

  async function handleOnchainTask(task: Task) {
    if (!address) return;
    setVerifying(true);
    try {
      const res  = await fetch("/api/tasks/verify-onchain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: task.id, task_type: task.type, params: task.params, wallet: address }),
      });
      const data = await res.json();
      if (data.verified) {
        setCompleted((prev) => [...prev, { task_id: task.id, method: "onchain" }]);
        toast.success("Task verified ✓");
      } else {
        toast.error(data.reason ?? "Requirement not met");
      }
    } catch {
      toast.error("Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  function handleSelfAttest(task: Task, externalUrl?: string) {
    if (externalUrl) window.open(externalUrl, "_blank");
    // After a short delay, allow attesting
    setTimeout(() => {
      setCompleted((prev) => {
        if (prev.some((c) => c.task_id === task.id)) return prev;
        return [...prev, { task_id: task.id, method: "self_attest" }];
      });
    }, 1500);
  }

  async function handleEnter() {
    if (!address || !allTasksDone) return;
    setEntering(true);
    try {
      const res = await fetch(`/api/drops/${drop.id}/enter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: address, completed_tasks: completed }),
      });
      const data = await res.json();
      if (res.ok) {
        setEntered(true);
        toast.success("You're entered! Good luck 🎉");
      } else {
        toast.error(data.error ?? "Failed to enter");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setEntering(false);
    }
  }

  function getTaskAction(task: Task): { label: string; url?: string; onchain: boolean } {
    switch (task.type) {
      case "follow_x":
        return { label: `Follow @${task.params.handle ?? ""}`, url: `https://x.com/intent/follow?screen_name=${task.params.handle}`, onchain: false };
      case "join_discord":
        return { label: "Join Discord", url: task.params.invite as string ?? "#", onchain: false };
      case "hold_nft":
      case "hold_based_id":
        return { label: task.type === "hold_based_id" ? "Verify Based ID" : `Hold ${task.params.minCount ?? 1} NFT(s)`, onchain: true };
      case "min_hunter_rank":
        return { label: `Min rank: ${task.params.rank ?? "E"}`, onchain: true };
      default:
        return { label: TASK_LABELS[task.type] ?? task.type, onchain: false };
    }
  }

  if (isEnded) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 space-y-4 text-center">
        <p className="text-zinc-500 text-sm font-medium">This drop has ended.</p>
        <Link href="/drops" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors">
          See active drops →
        </Link>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 space-y-5">
        <div className="space-y-2">
          <p className="text-white font-bold text-lg">Connect to enter</p>
          <p className="text-zinc-500 text-sm">You need a Based ID ($2) to enter any drop.</p>
        </div>
        <ConnectButton />
        <div className="pt-2 border-t border-white/[0.05]">
          <Link href="/#mint-card" className="text-blue-400 text-sm hover:text-blue-300 transition-colors">
            Don&apos;t have a Based ID? Mint for $2 →
          </Link>
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-center">
        <p className="text-zinc-500 text-sm">Checking eligibility…</p>
      </div>
    );
  }

  if (holdsId === false) {
    return (
      <div className="rounded-2xl border border-red-900/30 bg-red-950/10 p-6 space-y-4">
        <p className="text-red-300 font-medium text-sm">No Based ID found on this wallet.</p>
        <p className="text-zinc-500 text-xs leading-relaxed">
          Make sure you&apos;re connected with the wallet that holds your Based ID.
          If you minted from a different wallet, switch to it in your wallet app.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/#mint-card" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors">
            Mint Based ID — $2 →
          </Link>
          <ConnectButton showBalance={false} chainStatus="none" label="Switch wallet" />
        </div>
      </div>
    );
  }

  if (entered) {
    return (
      <div className="rounded-2xl border border-green-900/25 bg-green-950/[0.08] p-6 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <p className="text-green-300 font-bold text-lg">You&apos;re entered!</p>
        <p className="text-zinc-500 text-sm">Winners will be drawn after the drop ends. Check your wins in the dashboard.</p>
        <Link href="/dashboard" className="inline-block text-blue-400 text-sm hover:text-blue-300 transition-colors">
          View dashboard →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 space-y-6">
      <div className="space-y-1">
        <p className="text-white font-bold text-lg">Enter this drop</p>
        <p className="text-zinc-500 text-xs">Complete all tasks to enter. Self-attested tasks are on the honor system.</p>
      </div>

      {/* Task list */}
      {tasks.length > 0 && (
        <div className="space-y-2">
          {tasks.map((task) => {
            const done   = isTaskCompleted(task.id);
            const action = getTaskAction(task);
            return (
              <div
                key={task.id}
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${
                  done
                    ? "border-green-900/25 bg-green-950/[0.06]"
                    : "border-white/[0.06] bg-white/[0.01]"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${done ? "bg-green-500 border-green-500" : "border-zinc-600"}`}>
                    {done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span className={`text-sm font-medium ${done ? "text-green-300" : "text-zinc-300"}`}>
                    {TASK_LABELS[task.type] ?? task.type}
                    {task.params.handle ? ` @${task.params.handle}` : ""}
                  </span>
                </div>
                {!done && (
                  <button
                    onClick={() => action.onchain ? handleOnchainTask(task) : handleSelfAttest(task, action.url)}
                    disabled={verifying}
                    className="text-blue-400 text-[11px] font-medium hover:text-blue-300 transition-colors flex-shrink-0 disabled:opacity-50"
                  >
                    {verifying && action.onchain ? "Verifying…" : action.onchain ? "Verify" : "Complete"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Enter button */}
      <button
        onClick={handleEnter}
        disabled={!allTasksDone || entering || !isActive}
        className="w-full py-4 rounded-xl font-bold text-sm transition-all
          bg-white text-black hover:bg-zinc-100
          disabled:opacity-30 disabled:cursor-not-allowed
          shadow-[0_2px_40px_rgba(255,255,255,0.07)]"
      >
        {entering ? "Entering…" : !allTasksDone ? `Complete ${tasks.length - completed.length} more task${tasks.length - completed.length !== 1 ? "s" : ""}` : "Enter drop"}
      </button>

      <p className="text-zinc-700 text-[10px] text-center">
        Hold your Based ID until the draw. Transfers after entry may affect eligibility.
      </p>
    </div>
  );
}
