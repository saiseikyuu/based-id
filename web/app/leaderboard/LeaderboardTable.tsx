"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { BASESCAN_URL } from "@/lib/contracts";

export type HolderRow = {
  tokenId: number;
  tier: string;
  weight: number;
  holder: string;
  isAuction: boolean;
};

function addressToHue(address: string): number {
  return parseInt(address.slice(2, 6), 16) % 360;
}

export function LeaderboardTable({ rows }: { rows: HolderRow[] }) {
  const { address } = useAccount();
  const lower = address?.toLowerCase();

  const myRows = lower ? rows.filter((r) => r.holder.toLowerCase() === lower) : [];
  const myBest = myRows[0];
  const myRank = myBest ? rows.findIndex((r) => r.tokenId === myBest.tokenId) + 1 : 0;

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
              myBest
                ? "border-blue-500/25 bg-gradient-to-r from-blue-500/[0.06] to-blue-500/[0.02]"
                : "border-white/[0.06] bg-white/[0.01]"
            }`}
          >
            {myBest ? (
              <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em]">You</span>
                  </div>
                  <div className="h-6 w-px bg-white/[0.08]" />
                  <div className="flex items-center gap-3 min-w-0">
                    <Link
                      href={`/profile/${myBest.tokenId}`}
                      className="text-blue-400 font-bold text-sm font-mono hover:text-blue-300 transition-colors"
                    >
                      #{myBest.tokenId.toLocaleString()}
                    </Link>
                    <span className="text-zinc-600 text-[11px]">·</span>
                    <span className="text-zinc-400 text-xs font-mono">
                      Rank <span className="text-white font-bold tabular-nums">{myRank}</span>
                      <span className="text-zinc-700"> / {rows.length}</span>
                    </span>
                    <span className="text-zinc-600 text-[11px]">·</span>
                    <span className="text-zinc-400 text-xs font-mono tabular-nums">
                      {myBest.weight.toFixed(4)}×
                    </span>
                    {myRows.length > 1 && (
                      <>
                        <span className="text-zinc-600 text-[11px]">·</span>
                        <span className="text-zinc-500 text-[11px]">
                          +{myRows.length - 1} more
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  className="text-blue-400 text-[11px] font-medium hover:text-blue-300 transition-colors flex-shrink-0"
                >
                  Dashboard →
                </Link>
              </div>
            ) : (
              <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                  <span className="text-zinc-500 text-xs">
                    You haven&apos;t minted yet — the lower your ID, the higher you rank.
                  </span>
                </div>
                <Link
                  href="/"
                  className="text-white text-[11px] font-bold hover:text-zinc-300 transition-colors flex-shrink-0"
                >
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
        <div className="grid grid-cols-[48px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] px-5 py-3 border-b border-white/[0.05] bg-white/[0.015]">
          <span className="text-[10px] text-zinc-700 uppercase tracking-[0.18em]">Rank</span>
          <span className="text-[10px] text-zinc-700 uppercase tracking-[0.18em]">Holder</span>
          <span className="text-[10px] text-zinc-700 uppercase tracking-[0.18em]">Based ID</span>
          <span className="text-[10px] text-zinc-700 uppercase tracking-[0.18em]">Tier</span>
          <span className="text-[10px] text-zinc-700 uppercase tracking-[0.18em] text-right">Weight</span>
        </div>

        {rows.map((row, i) => {
          const hue = addressToHue(row.holder);
          const isTop = i < 3;
          const isYou = lower ? row.holder.toLowerCase() === lower : false;
          const rankColors = ["text-amber-400", "text-zinc-400", "text-amber-700/80"];

          const leftBorder = isYou
            ? "border-l-2 border-l-blue-400"
            : i === 0
            ? "border-l-2 border-l-amber-400/50"
            : isTop
            ? "border-l-2 border-l-zinc-700/50"
            : "";

          const rowBg = isYou
            ? "bg-blue-500/[0.04] hover:bg-blue-500/[0.07]"
            : i === 0
            ? "bg-amber-400/[0.02] hover:bg-white/[0.02]"
            : "hover:bg-white/[0.02]";

          return (
            <div
              key={row.tokenId}
              className={`grid grid-cols-[48px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] px-5 py-3.5 border-b border-white/[0.03] last:border-0 transition-colors items-center ${leftBorder} ${rowBg}`}
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

              {/* Based ID */}
              <Link href={`/profile/${row.tokenId}`} className="group">
                <span className={`font-bold text-sm font-mono group-hover:opacity-70 transition-opacity ${
                  row.isAuction ? "text-amber-400" : "text-blue-400"
                }`}>
                  #{row.tokenId.toLocaleString()}
                </span>
              </Link>

              {/* Tier */}
              <span className={`text-[10px] font-mono tracking-widest ${
                row.isAuction ? "text-amber-400/80" : "text-zinc-500"
              }`}>
                {row.tier}
              </span>

              {/* Weight */}
              <div className="text-right">
                <span className={`text-sm font-mono font-semibold tabular-nums ${
                  row.isAuction ? "text-amber-300" : "text-zinc-300"
                }`}>
                  {row.weight.toFixed(4)}
                </span>
                <span className="text-zinc-600 text-xs ml-0.5">×</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
