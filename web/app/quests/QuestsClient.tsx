"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import toast from "react-hot-toast";
import type { QuestWithStatus, QuestCategory } from "@/app/api/quests/route";

const CATEGORY_LABELS: Record<QuestCategory, string> = {
  onchain: "On-chain",
  hunters: "Hunters",
  drops:   "Drops",
};

const CATEGORY_COLORS: Record<QuestCategory, string> = {
  onchain: "text-amber-400",
  hunters: "text-purple-400",
  drops:   "text-blue-400",
};

const CATEGORY_DOT: Record<QuestCategory, string> = {
  onchain: "bg-amber-400",
  hunters: "bg-purple-400",
  drops:   "bg-blue-400",
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  claimable:   { label: "Claim XP",    cls: "bg-green-500/15 text-green-300 border-green-500/30 cursor-pointer hover:bg-green-500/25" },
  claimed:     { label: "Claimed ✓",   cls: "bg-white/[0.04] text-zinc-600 border-white/[0.06] cursor-default" },
  in_progress: { label: "In progress", cls: "bg-white/[0.03] text-zinc-500 border-white/[0.05] cursor-default" },
  locked:      { label: "Locked",      cls: "bg-white/[0.03] text-zinc-700 border-white/[0.05] cursor-default" },
};

type Stats = {
  holdsBasedId: boolean;
  hasClaimed: boolean;
  entryCount: number;
  winCount: number;
  baseXp: number;
  enteredToday: boolean;
};

type QuestData = { quests: QuestWithStatus[]; stats: Stats } | null;

const TYPE_FILTERS = [
  { key: "all",       label: "All" },
  { key: "milestone", label: "Milestones" },
  { key: "daily",     label: "Daily" },
];

const CAT_FILTERS = [
  { key: "all",     label: "All" },
  { key: "drops",   label: "Drops" },
  { key: "hunters", label: "Hunters" },
  { key: "onchain", label: "On-chain" },
];

export function QuestsClient() {
  const { address, isConnected } = useAccount();
  const [data,         setData]         = useState<QuestData>(null);
  const [loading,      setLoading]      = useState(false);
  const [claiming,     setClaiming]     = useState<string | null>(null);
  const [typeFilter,   setTypeFilter]   = useState("all");
  const [catFilter,    setCatFilter]    = useState("all");

  const loadQuests = useCallback(async (addr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quests?wallet=${addr}`).then(r => r.json());
      setData(res);
    } catch {
      toast.error("Failed to load quests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (address) loadQuests(address);
    else setData(null);
  }, [address, loadQuests]);

  async function claimQuest(questId: string) {
    if (!address || claiming) return;
    setClaiming(questId);
    try {
      const res  = await fetch("/api/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, questId }),
      });
      const body = await res.json();
      if (!res.ok) { toast.error(body.error ?? "Claim failed"); return; }
      toast.success(`+${body.earned_xp} XP claimed!`);
      loadQuests(address);
    } catch { toast.error("Something went wrong"); }
    finally { setClaiming(null); }
  }

  const quests = data?.quests ?? [];
  const stats  = data?.stats;

  const filtered = quests.filter(q => {
    if (typeFilter !== "all" && q.type !== typeFilter) return false;
    if (catFilter  !== "all" && q.category !== catFilter) return false;
    return true;
  });

  const milestones = filtered.filter(q => q.type === "milestone");
  const dailies    = filtered.filter(q => q.type === "daily");

  const totalXp    = quests.filter(q => q.status === "claimed").reduce((s, q) => s + q.xp, 0);
  const claimable  = quests.filter(q => q.status === "claimable").length;
  const totalQuests = quests.length;
  const doneQuests  = quests.filter(q => q.status === "claimed").length;

  return (
    <div className="space-y-8">

      {/* Stats strip */}
      {isConnected && data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Quest XP",    value: totalXp.toLocaleString(),     color: "text-white" },
            { label: "Completed",   value: `${doneQuests}/${totalQuests}`,color: "text-zinc-300" },
            { label: "Claimable",   value: claimable,                     color: claimable > 0 ? "text-green-400" : "text-zinc-500" },
            { label: "Drops entered", value: stats?.entryCount ?? 0,       color: "text-blue-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <p className="text-zinc-600 text-[10px] uppercase tracking-[0.15em] mb-1">{label}</p>
              <p className={`font-black text-xl tabular-nums ${color}`} style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {isConnected && (
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-1">
            {TYPE_FILTERS.map(f => (
              <button key={f.key} onClick={() => setTypeFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  typeFilter === f.key
                    ? "bg-white/[0.08] text-white"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {CAT_FILTERS.map(f => (
              <button key={f.key} onClick={() => setCatFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  catFilter === f.key
                    ? "bg-white/[0.08] text-white"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isConnected ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] px-8 py-16 text-center space-y-5">
          <div className="space-y-2">
            <p className="text-white font-bold text-xl" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
              Connect to see your quests
            </p>
            <p className="text-zinc-500 text-sm">Complete quests to earn bonus XP toward your Hunter rank.</p>
          </div>
          <ConnectButton />
        </div>
      ) : loading ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] px-8 py-12 text-center">
          <p className="text-zinc-600 text-sm">Loading quests…</p>
        </div>
      ) : (
        <div className="space-y-8">

          {/* Daily quests */}
          {(typeFilter === "all" || typeFilter === "daily") && dailies.length > 0 && (
            <QuestSection title="Daily" subtitle="Refresh every 24 hours" quests={dailies} claiming={claiming} onClaim={claimQuest} />
          )}

          {/* Milestones */}
          {(typeFilter === "all" || typeFilter === "milestone") && milestones.length > 0 && (
            <QuestSection title="Milestones" subtitle="One-time rewards" quests={milestones} claiming={claiming} onClaim={claimQuest} />
          )}

          {filtered.length === 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] px-8 py-12 text-center">
              <p className="text-zinc-600 text-sm">No quests match this filter.</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function QuestSection({ title, subtitle, quests, claiming, onClaim }: {
  title: string;
  subtitle: string;
  quests: QuestWithStatus[];
  claiming: string | null;
  onClaim: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-white font-bold text-base" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>{title}</h2>
        <span className="text-zinc-700 text-xs">{subtitle}</span>
        <div className="flex-1 h-px bg-white/[0.05]" />
        <span className="text-zinc-700 text-[10px] font-mono">{quests.filter(q => q.status === "claimed").length}/{quests.length}</span>
      </div>

      <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
        {quests.map((quest, i) => (
          <QuestRow key={quest.id} quest={quest} isLast={i === quests.length - 1} claiming={claiming === quest.id} onClaim={onClaim} />
        ))}
      </div>
    </div>
  );
}

function QuestRow({ quest, isLast, claiming, onClaim }: {
  quest: QuestWithStatus;
  isLast: boolean;
  claiming: boolean;
  onClaim: (id: string) => void;
}) {
  const badge  = STATUS_BADGE[quest.status];
  const catCls = CATEGORY_COLORS[quest.category];
  const catDot = CATEGORY_DOT[quest.category];
  const isDone = quest.status === "claimed";

  return (
    <div className={`flex items-center gap-4 px-5 py-4 ${!isLast ? "border-b border-white/[0.04]" : ""} ${isDone ? "opacity-50" : "hover:bg-white/[0.02]"} transition-colors`}>

      {/* Category dot */}
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${catDot} ${isDone ? "opacity-40" : ""}`} />

      {/* Quest info */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${isDone ? "text-zinc-500" : "text-white"}`}>{quest.title}</span>
          <span className={`text-[10px] font-medium ${catCls} opacity-60`}>{CATEGORY_LABELS[quest.category]}</span>
        </div>
        <p className="text-zinc-600 text-xs">{quest.description}</p>

        {/* Progress bar */}
        {quest.progress && quest.status !== "claimed" && (
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden max-w-[120px]">
              <div className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${(quest.progress.current / quest.progress.total) * 100}%` }} />
            </div>
            <span className="text-zinc-600 text-[10px] font-mono tabular-nums">{quest.progress.current}/{quest.progress.total}</span>
          </div>
        )}
      </div>

      {/* XP reward */}
      <div className="text-right flex-shrink-0 hidden sm:block">
        <span className={`font-bold text-sm tabular-nums ${isDone ? "text-zinc-600" : "text-amber-400"}`}>+{quest.xp} XP</span>
      </div>

      {/* Action button */}
      <div className="flex-shrink-0">
        {quest.status === "claimable" ? (
          <button
            onClick={() => onClaim(quest.id)}
            disabled={claiming}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${badge.cls} ${claiming ? "opacity-50" : ""}`}>
            {claiming ? "…" : badge.label}
          </button>
        ) : (
          <span className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${badge.cls}`}>
            {badge.label}
          </span>
        )}
      </div>
    </div>
  );
}
