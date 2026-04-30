"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { BASESCAN_URL, RANK_LABELS, RANK_COLORS } from "@/lib/contracts";

export type HolderRow = {
  tokenId: number;
  tier: string;
  weight: number;
  idCount: number;
  holder: string;
  isAuction: boolean;
  hunterRank?: number | null;
  hunterXp?:   number | null;
};

const D = { fontFamily: "var(--font-display), system-ui, sans-serif" };

function addressToHue(address: string): number {
  return parseInt(address.slice(2, 6), 16) % 360;
}

// Tier badge pill styles
function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, React.CSSProperties> = {
    GENESIS: {
      background: "rgba(245,158,11,0.10)",
      color: "#f59e0b",
      border: "1px solid rgba(245,158,11,0.25)",
    },
    FOUNDING: {
      background: "rgba(96,165,250,0.10)",
      color: "#60a5fa",
      border: "1px solid rgba(96,165,250,0.25)",
    },
    PIONEER: {
      background: "rgba(113,113,122,0.10)",
      color: "#a1a1aa",
      border: "1px solid rgba(113,113,122,0.20)",
    },
    BUILDER: {
      background: "rgba(39,39,42,0.8)",
      color: "#52525b",
      border: "1px solid rgba(63,63,70,0.5)",
    },
  };

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.12em] flex-shrink-0"
      style={{ ...D, ...(styles[tier] ?? styles.BUILDER) }}
    >
      {tier}
    </span>
  );
}

// Hunter rank dot badge
function HunterBadge({ rankIdx }: { rankIdx: number }) {
  const label = RANK_LABELS[rankIdx];
  const color = RANK_COLORS[rankIdx];

  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-[10px] flex-shrink-0"
      style={{
        ...D,
        background: `${color}18`,
        color,
        border: `1px solid ${color}40`,
      }}
      title={`${label}-Rank Hunter`}
    >
      {label}
    </span>
  );
}

export function LeaderboardTable({ rows }: { rows: HolderRow[] }) {
  const { address } = useAccount();
  const lower = address?.toLowerCase();

  const myRow = lower ? rows.find((r) => r.holder.toLowerCase() === lower) : undefined;
  const myRank = myRow ? rows.findIndex((r) => r.holder === myRow.holder) + 1 : 0;

  // Podium accent borders
  const leftBorderStyle = (i: number, isYou: boolean): React.CSSProperties => {
    if (isYou) return { borderLeft: "2px solid #0052FF" };
    if (i === 0) return { borderLeft: "2px solid #fbbf24" };
    if (i === 1) return { borderLeft: "2px solid #d4d4d8" };
    if (i === 2) return { borderLeft: "2px solid rgba(180,110,60,0.7)" };
    return { borderLeft: "2px solid transparent" };
  };

  const rowBgStyle = (i: number, isYou: boolean): React.CSSProperties => {
    if (isYou) return { background: "rgba(0,82,255,0.06)" };
    if (i === 0) return { background: "rgba(251,191,36,0.025)" };
    return {};
  };

  const rankNumColor = (i: number, isYou: boolean): string => {
    if (isYou) return "#0052FF";
    if (i === 0) return "#fbbf24";
    if (i === 1) return "#d4d4d8";
    if (i === 2) return "rgba(205,133,63,0.85)";
    return "#9ca3af";
  };

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
            className="rounded-2xl overflow-hidden"
            style={
              myRow
                ? {
                    background: "linear-gradient(90deg, rgba(0,82,255,0.06) 0%, transparent 100%)",
                    border: "1px solid rgba(0,82,255,0.2)",
                    borderLeft: "3px solid #0052FF",
                  }
                : {
                    background: "#f9fafb",
                    border: "1px solid rgba(0,0,0,0.07)",
                  }
            }
          >
            {myRow ? (
              <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ background: "#0052FF" }}
                    />
                    <span
                      className="font-black text-[10px] uppercase tracking-[0.25em]"
                      style={{ ...D, color: "#0052FF" }}
                    >
                      You
                    </span>
                  </div>

                  <div className="h-5 w-px" style={{ background: "rgba(255,255,255,0.08)" }} />

                  <div className="flex items-center gap-1 min-w-0 flex-wrap">
                    {/* Big rank number */}
                    <span className="font-black text-2xl tabular-nums text-black leading-none" style={D}>
                      #{myRank}
                    </span>
                    <span className="text-gray-400 text-xs font-mono ml-1">/ {rows.length}</span>

                    <span className="text-gray-300 text-[11px] mx-2">·</span>

                    <Link
                      href={`/profile/${myRow.holder}`}
                      className="font-black text-sm font-mono hover:opacity-70 transition-opacity"
                      style={{ color: "#f59e0b" }}
                    >
                      Best #{myRow.tokenId}
                    </Link>

                    <span className="text-gray-300 text-[11px] mx-2">·</span>

                    <span className="text-gray-500 text-xs font-mono tabular-nums">
                      {myRow.idCount} ID{myRow.idCount !== 1 ? "s" : ""}
                    </span>

                    <span className="text-gray-300 text-[11px] mx-2">·</span>

                    <span className="font-bold text-xs font-mono tabular-nums" style={{ color: "#0052FF" }}>
                      {myRow.weight.toFixed(4)}× weight
                    </span>
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  className="font-black text-[11px] uppercase tracking-wide flex-shrink-0 hover:opacity-70 transition-opacity"
                  style={{ ...D, color: "#0052FF" }}
                >
                  Dashboard →
                </Link>
              </div>
            ) : (
              <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-gray-300" />
                  <span className="text-gray-500 text-xs" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
                    Get a Based ID to appear on the leaderboard.
                  </span>
                </div>
                <Link
                  href="/"
                  className="font-black text-[11px] uppercase tracking-wide text-black flex-shrink-0 hover:opacity-70 transition-opacity"
                  style={D}
                >
                  Mint your Based ID →
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#ffffff" }}
      >
        {/* Column headers */}
        <div
          className="grid items-center px-4 sm:px-5 py-3"
          style={{
            gridTemplateColumns: "48px minmax(0,1fr) 110px 80px 80px 72px",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            background: "#f9fafb",
            position: "sticky",
            top: 0,
            zIndex: 1,
          }}
        >
          {["#", "WALLET", "WEIGHT", "IDs", "TIER", "RANK"].map((col, idx) => (
            <span
              key={col}
              className="font-black text-[10px] uppercase tracking-[0.25em]"
              style={{
                ...D,
                color: "#9ca3af",
                textAlign: idx >= 2 ? "center" : "left",
              }}
            >
              {col}
            </span>
          ))}
        </div>

        {rows.map((row, i) => {
          const hue = addressToHue(row.holder);
          const isYou = lower ? row.holder.toLowerCase() === lower : false;
          const hunterRankIdx = row.hunterRank ?? null;

          return (
            <div
              key={row.holder}
              className="grid items-center px-4 sm:px-5 py-3.5 transition-colors"
              style={{
                gridTemplateColumns: "48px minmax(0,1fr) 110px 80px 80px 72px",
                borderBottom: "1px solid rgba(0,0,0,0.04)",
                ...leftBorderStyle(i, isYou),
                ...rowBgStyle(i, isYou),
              }}
              onMouseEnter={(e) => {
                if (!isYou) {
                  (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.02)";
                }
              }}
              onMouseLeave={(e) => {
                const bg = rowBgStyle(i, isYou).background;
                (e.currentTarget as HTMLElement).style.background = typeof bg === "string" ? bg : "";
              }}
            >
              {/* Rank number */}
              <span
                className="font-black text-2xl tabular-nums leading-none"
                style={{ ...D, color: rankNumColor(i, isYou) }}
              >
                {i + 1}
              </span>

              {/* Holder */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-black text-[10px]"
                  style={{
                    ...D,
                    background: `hsl(${hue}, 55%, 92%)`,
                    border: `1px solid hsl(${hue}, 55%, 78%)`,
                    color: `hsl(${hue}, 55%, 35%)`,
                  }}
                >
                  {row.holder.slice(2, 4).toUpperCase()}
                </div>
                <a
                  href={`${BASESCAN_URL}/address/${row.holder}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 text-xs font-mono hover:text-black transition-colors truncate"
                >
                  {row.holder.slice(0, 6)}…{row.holder.slice(-4)}
                </a>
                {isYou && (
                  <span
                    className="flex-shrink-0 px-1.5 py-0.5 rounded font-black text-[9px] uppercase tracking-[0.15em]"
                    style={{
                      ...D,
                      background: "rgba(0,82,255,0.15)",
                      color: "#60a5fa",
                      border: "1px solid rgba(0,82,255,0.3)",
                    }}
                  >
                    You
                  </span>
                )}
              </div>

              {/* Weight */}
              <div className="text-center">
                <span
                  className="font-black text-sm tabular-nums"
                  style={{ ...D, color: row.isAuction ? "#f59e0b" : "#0052FF" }}
                >
                  {row.weight.toFixed(4)}
                </span>
                <span className="text-gray-300 text-xs ml-0.5">×</span>
              </div>

              {/* ID count */}
              <div className="text-center">
                <Link
                  href={`/profile/${row.holder}`}
                  className="font-bold text-sm font-mono hover:opacity-70 transition-opacity"
                  style={{ color: row.isAuction ? "#f59e0b" : "#6b7280" }}
                  title={`Best ID: #${row.tokenId}`}
                >
                  #{row.tokenId}
                </Link>
                {row.idCount > 1 && (
                  <span className="text-gray-300 text-[10px] font-mono ml-1">+{row.idCount - 1}</span>
                )}
              </div>

              {/* Tier */}
              <div className="flex justify-center">
                <TierBadge tier={row.tier} />
              </div>

              {/* Hunter rank */}
              <div className="flex justify-center">
                {hunterRankIdx !== null ? (
                  <HunterBadge rankIdx={hunterRankIdx} />
                ) : (
                  <span className="text-gray-300 text-sm">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
