"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { BASESCAN_URL } from "@/lib/contracts";

export type HolderRow = {
  tokenId: number;
  tier: string;
  weight: number;
  idCount: number;
  holder: string;
  isAuction: boolean;
};

type ScoreMap = Record<string, { score: number; grade: string }>;

function addressToHue(address: string): number {
  return parseInt(address.slice(2, 6), 16) % 360;
}

function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    S: "text-amber-400 border-amber-400/30 bg-amber-400/10",
    A: "text-blue-400 border-blue-400/30 bg-blue-400/10",
    B: "text-zinc-300 border-zinc-500/30 bg-zinc-500/10",
    C: "text-zinc-600 border-zinc-700/30 bg-zinc-700/10",
  };
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-black border ${colors[grade] ?? colors.C}`}>
      {grade}
    </span>
  );
}

export function LeaderboardTable({ rows }: { rows: HolderRow[] }) {
  const { address } = useAccount();
  const lower = address?.toLowerCase();

  const myRow = lower ? rows.find((r) => r.holder.toLowerCase() === lower) : undefined;
  const myRank = myRow ? rows.findIndex((r) => r.holder === myRow.holder) + 1 : 0;

  // Fetch activity scores client-side in batches of 5
  const [scores, setScores] = useState<ScoreMap>({});
  const [scoresLoaded, setScoresLoaded] = useState(false);

  useEffect(() => {
    if (rows.length === 0) return;
    let cancelled = false;
    const BATCH = 5;

    async function fetchAll() {
      const result: ScoreMap = {};
      for (let i = 0; i < rows.length; i += BATCH) {
        if (cancelled) return;
        const batch = rows.slice(i, i + BATCH);
        await Promise.allSettled(
          batch.map(async (row) => {
            try {
              const res = await fetch(`/api/activity/${row.holder}`);
              if (!res.ok) return;
              const data = await res.json();
              if (data.score !== undefined) result[row.holder] = { score: data.score, grade: data.grade };
            } catch { /* skip */ }
          })
        );
        if (!cancelled) setScores((prev) => ({ ...prev, ...result }));
      }
      if (!cancelled) setScoresLoaded(true);
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [rows]);

  return (
    <>
      {/* Your Rank banner */}
      <AnimatePresence>
        {address && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={`rounded-2xl border overflow-hidden ${
              myRow
                ? "border-blue-500/25 bg-gradient-to-r from-blue-500/[0.06] to-blue-500/[0.02]"
                : "border-white/[0.06] bg-white/[0.01]"
            }`}
          >
            {myRow ? (
              <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em]">You</span>
                  </div>
                  <div className="h-6 w-px bg-white/[0.08]" />
                  <div className="flex items-center gap-3 min-w-0 flex-wrap">
                    <span className="text-zinc-400 text-xs font-mono">
                      Rank <span className="text-white font-bold tabular-nums">{myRank}</span>
                      <span className="text-zinc-700"> / {rows.length}</span>
                    </span>
                    <span className="text-zinc-600 text-[11px]">·</span>
                    <Link href={`/profile/${myRow.tokenId}`} className="text-amber-400 font-bold text-sm font-mono hover:text-amber-300 transition-colors">
                      Best #{myRow.tokenId}
                    </Link>
                    <span className="text-zinc-600 text-[11px]">·</span>
                    <span className="text-zinc-400 text-xs font-mono tabular-nums">
                      {myRow.idCount} ID{myRow.idCount !== 1 ? "s" : ""}
                    </span>
                    <span className="text-zinc-600 text-[11px]">·</span>
                    <span className="text-blue-300 text-xs font-mono font-semibold tabular-nums">
                      {myRow.weight.toFixed(4)}× weight
                    </span>
                    {scores[myRow.holder] && (
                      <>
                        <span className="text-zinc-600 text-[11px]">·</span>
                        <span className="text-xs font-mono text-zinc-400">
                          Score <span className="text-white font-bold">{scores[myRow.holder].score}</span>
                          <span className="text-zinc-600"> ({scores[myRow.holder].grade})</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <Link href="/dashboard" className="text-blue-400 text-[11px] font-medium hover:text-blue-300 transition-colors flex-shrink-0">
                  Dashboard →
                </Link>
              </div>
            ) : (
              <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                  <span className="text-zinc-500 text-xs">
                    Not on the leaderboard — mint a Based ID to earn $BASED weight.
                  </span>
                </div>
                <Link href="/" className="text-white text-[11px] font-bold hover:text-zinc-300 transition-colors flex-shrink-0">
                  Mint your Based ID →
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden">

        {/* Column headers */}
        <div className="grid grid-cols-[40px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] sm:grid-cols-[48px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_80px] px-4 sm:px-5 py-3 border-b border-white/[0.05] bg-white/[0.015]">
          <span className="text-[10px] text-zinc-700 uppercase tracking-[0.18em]">Rank</span>
          <span className="text-[10px] text-zinc-700 uppercase tracking-[0.18em]">Holder</span>
          <span className="text-[10px] text-zinc-700 uppercase tracking-[0.18em]">Best ID</span>
          <span className="hidden sm:block text-[10px] text-zinc-700 uppercase tracking-[0.18em]">IDs</span>
          <span className="text-[10px] text-zinc-700 uppercase tracking-[0.18em] text-right">Weight</span>
          <span className="hidden sm:block text-[10px] text-zinc-700 uppercase tracking-[0.18em] text-right">
            Score
            {!scoresLoaded && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-zinc-700 animate-pulse align-middle" />}
          </span>
        </div>

        {rows.map((row, i) => {
          const hue = addressToHue(row.holder);
          const isTop = i < 3;
          const isYou = lower ? row.holder.toLowerCase() === lower : false;
          const rankColors = ["text-amber-400", "text-zinc-300", "text-amber-700/80"];
          const rowScore = scores[row.holder];

          const leftBorder = isYou
            ? "border-l-2 border-l-blue-400"
            : i === 0 ? "border-l-2 border-l-amber-400/50"
            : isTop ? "border-l-2 border-l-zinc-700/50"
            : "";

          const rowBg = isYou
            ? "bg-blue-500/[0.04] hover:bg-blue-500/[0.07]"
            : i === 0 ? "bg-amber-400/[0.02] hover:bg-white/[0.02]"
            : "hover:bg-white/[0.02]";

          return (
            <div
              key={row.holder}
              className={`grid grid-cols-[40px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] sm:grid-cols-[48px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_80px] px-4 sm:px-5 py-3.5 border-b border-white/[0.03] last:border-0 transition-colors items-center ${leftBorder} ${rowBg}`}
            >
              {/* Rank */}
              <span className={`text-sm font-mono font-bold tabular-nums ${isTop ? rankColors[i] : "text-zinc-700"}`}>
                {i + 1}
              </span>

              {/* Holder */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: `hsl(${hue}, 55%, 18%)`,
                    border: `1px solid hsl(${hue}, 55%, 28%)`,
                    color: `hsl(${hue}, 70%, 65%)`,
                  }}
                >
                  {row.holder.slice(2, 4).toUpperCase()}
                </div>
                <a
                  href={`${BASESCAN_URL}/address/${row.holder}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 text-xs font-mono hover:text-white transition-colors truncate"
                >
                  {row.holder.slice(0, 6)}…{row.holder.slice(-4)}
                </a>
                {isYou && (
                  <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-[0.15em] bg-blue-500/15 text-blue-300 border border-blue-500/25">
                    You
                  </span>
                )}
              </div>

              {/* Best ID */}
              <Link href={`/profile/${row.tokenId}`} className="group">
                <span className={`font-bold text-sm font-mono group-hover:opacity-70 transition-opacity ${
                  row.isAuction ? "text-amber-400" : "text-blue-400"
                }`}>
                  #{row.tokenId.toLocaleString()}
                </span>
              </Link>

              {/* ID Count */}
              <div className="hidden sm:block">
                <span className="text-zinc-400 text-xs font-mono tabular-nums">{row.idCount}</span>
                <span className="text-zinc-700 text-[10px] ml-1">ID{row.idCount !== 1 ? "s" : ""}</span>
              </div>

              {/* Total Weight */}
              <div className="text-right">
                <span className={`text-sm font-mono font-semibold tabular-nums ${
                  row.isAuction ? "text-amber-300" : "text-zinc-300"
                }`}>
                  {row.weight.toFixed(4)}
                </span>
                <span className="text-zinc-600 text-xs ml-0.5">×</span>
              </div>

              {/* Activity Score */}
              <div className="hidden sm:flex items-center justify-end gap-1.5">
                {rowScore ? (
                  <>
                    <span className="text-zinc-400 text-xs font-mono tabular-nums">{rowScore.score}</span>
                    <GradeBadge grade={rowScore.grade} />
                  </>
                ) : (
                  <span className="w-6 h-2 rounded bg-white/[0.04] animate-pulse" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
