"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { RelativeTime } from "./RelativeTime";

const BASESCAN_URL = process.env.NEXT_PUBLIC_CHAIN_ID === "8453"
  ? "https://basescan.org"
  : "https://sepolia.basescan.org";

export type ActivityEvent = {
  type: "mint" | "transfer";
  tokenId: number;
  tier: string;
  from: string;
  to: string;
  blockNumber: string;
  timestamp: number;
  txHash: string;
};

function addressToHue(address: string): number {
  return parseInt(address.slice(2, 6), 16) % 360;
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function bucketLabel(timestamp: number): "now" | "recent" | "today" | "earlier" {
  const diff = Math.floor(Date.now() / 1000 - timestamp);
  if (diff < 300) return "now";
  if (diff < 3600) return "recent";
  if (diff < 86400) return "today";
  return "earlier";
}

const BUCKET_TITLES = {
  now: "Just now",
  recent: "Last hour",
  today: "Today",
  earlier: "Earlier",
};

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  const grouped = events.reduce<Record<string, ActivityEvent[]>>((acc, e) => {
    const key = bucketLabel(e.timestamp);
    (acc[key] ||= []).push(e);
    return acc;
  }, {});

  const bucketOrder: Array<keyof typeof BUCKET_TITLES> = ["now", "recent", "today", "earlier"];

  return (
    <motion.div
      className="space-y-10"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
      }}
    >
      {bucketOrder.map((bucket) => {
        const items = grouped[bucket];
        if (!items || items.length === 0) return null;

        return (
          <div key={bucket} className="space-y-4">
            {/* Bucket header */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
              }}
              className="flex items-center gap-3"
            >
              <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">
                {BUCKET_TITLES[bucket]}
              </span>
              <div className="flex-1 h-px bg-white/[0.05]" />
              <span className="text-zinc-700 text-[10px] font-mono tabular-nums">
                {items.length} event{items.length !== 1 ? "s" : ""}
              </span>
            </motion.div>

            {/* Timeline items */}
            <div className="relative pl-5">
              {/* Vertical connecting line */}
              <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gradient-to-b from-white/[0.08] via-white/[0.05] to-transparent" />

              <div className="space-y-3">
                {items.map((event, i) => (
                  <ActivityRow key={`${event.txHash}-${event.tokenId}-${i}`} event={event} />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  const isMint = event.type === "mint";

  const tierAccent =
    event.tier === "GENESIS" ? { bg: "bg-amber-400/10", text: "text-amber-400", border: "border-amber-400/20", dot: "bg-amber-400", glow: "shadow-[0_0_24px_rgba(251,191,36,0.08)]" } :
    event.tier === "FOUNDING" ? { bg: "bg-blue-400/10", text: "text-blue-400", border: "border-blue-400/20", dot: "bg-blue-400", glow: "shadow-[0_0_24px_rgba(96,165,250,0.08)]" } :
    event.tier === "PIONEER" ? { bg: "bg-zinc-400/10", text: "text-zinc-300", border: "border-zinc-400/20", dot: "bg-zinc-400", glow: "" } :
    { bg: "bg-zinc-800/50", text: "text-zinc-500", border: "border-zinc-700", dot: "bg-zinc-500", glow: "" };

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, x: -12 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
      }}
      className="relative"
    >
      {/* Timeline dot */}
      <div className="absolute -left-5 top-5 flex items-center justify-center">
        <div className={`absolute w-3 h-3 rounded-full ${tierAccent.dot} opacity-40 animate-ping`} />
        <div className={`relative w-2 h-2 rounded-full ${tierAccent.dot}`} />
      </div>

      {/* Event card */}
      <div className={`group rounded-xl border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.02] hover:border-white/[0.12] transition-all duration-200 overflow-hidden ${tierAccent.glow}`}>
        <div className="px-4 py-3 flex items-center gap-4">

          {/* Left: ID badge (mini NFT preview) */}
          <Link
            href={`/profile/${event.tokenId}`}
            className={`flex-shrink-0 w-14 h-14 rounded-lg border ${tierAccent.border} ${tierAccent.bg} flex flex-col items-center justify-center font-bold transition-transform group-hover:scale-[1.04]`}
          >
            <span className={`${tierAccent.text} text-xs leading-none`}>#</span>
            <span className={`${tierAccent.text} text-base font-black leading-none tabular-nums mt-0.5`}>
              {event.tokenId}
            </span>
          </Link>

          {/* Middle: event details */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-[0.14em] ${
                isMint ? "text-green-500" : "text-blue-400"
              }`}>
                {isMint ? "▲ Minted" : "⇄ Transferred"}
              </span>
              <span className="text-zinc-700 text-[10px]">·</span>
              <span className={`text-[10px] font-bold uppercase tracking-[0.12em] ${tierAccent.text}`}>
                {event.tier}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {isMint ? (
                <>
                  <span className="text-zinc-500 text-xs">by</span>
                  <WalletChip address={event.to} />
                </>
              ) : (
                <>
                  <WalletChip address={event.from} subtle />
                  <span className="text-zinc-700 text-[10px]">→</span>
                  <WalletChip address={event.to} />
                </>
              )}
            </div>
          </div>

          {/* Right: timestamp + tx */}
          <div className="flex-shrink-0 text-right space-y-1">
            <p className="text-zinc-500 text-[11px] font-mono tabular-nums">
              {event.timestamp > 0 ? <RelativeTime timestamp={event.timestamp} /> : "—"}
            </p>
            {event.txHash && event.txHash.length > 4 && (
              <a
                href={`${BASESCAN_URL}/tx/${event.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-block text-zinc-700 text-[10px] hover:text-zinc-400 transition-colors font-mono"
              >
                {event.txHash.slice(0, 6)}↗
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function WalletChip({ address, subtle = false }: { address: string; subtle?: boolean }) {
  return (
    <a
      href={`${BASESCAN_URL}/address/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md transition-colors ${
        subtle
          ? "text-zinc-600 hover:text-zinc-400"
          : "text-zinc-300 hover:text-white hover:bg-white/[0.03]"
      }`}
    >
      <span
        className="w-3.5 h-3.5 rounded-full inline-flex items-center justify-center text-[7px] font-bold flex-shrink-0"
        style={{
          background: `hsl(${addressToHue(address)}, 45%, 16%)`,
          border: `1px solid hsl(${addressToHue(address)}, 45%, 26%)`,
          color: `hsl(${addressToHue(address)}, 70%, 65%)`,
        }}
      >
        {address.slice(2, 3).toUpperCase()}
      </span>
      <span className="font-mono text-[11px]">{shortAddress(address)}</span>
    </a>
  );
}
