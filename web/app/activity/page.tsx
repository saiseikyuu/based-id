import { createPublicClient, http, parseAbiItem } from "viem";
import { base, baseSepolia } from "viem/chains";
import { BASED_ID_ADDRESS } from "@/lib/contracts";
import Link from "next/link";
import type { Metadata } from "next";
import { ActivityFeed, type ActivityEvent } from "./ActivityFeed";
import { LivePulse } from "./LivePulse";

export const revalidate = 30;

const chain = process.env.NEXT_PUBLIC_CHAIN_ID === "8453" ? base : baseSepolia;

export const metadata: Metadata = {
  title: "Activity — Based ID",
  description: "Live minting and transfer activity for Based ID on Base.",
};

function getTier(id: number) {
  if (id <= 100) return "GENESIS";
  if (id <= 1000) return "FOUNDING";
  if (id <= 10000) return "PIONEER";
  return "BUILDER";
}

const ZERO = "0x0000000000000000000000000000000000000000";

function mockEvents(): ActivityEvent[] {
  const now = Math.floor(Date.now() / 1000);
  return [
    { type: "mint",     tokenId: 1,   tier: "GENESIS",  from: ZERO, to: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12", blockNumber: "1000", timestamp: now - 45,    txHash: "0x01a2b3c4d5e6f" },
    { type: "mint",     tokenId: 2,   tier: "GENESIS",  from: ZERO, to: "0x2b3c4d5e6f7890abcdef1234567890abcdef1234", blockNumber: "999",  timestamp: now - 180,   txHash: "0x02b3c4d5e6f78" },
    { type: "transfer", tokenId: 1,   tier: "GENESIS",  from: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12", to: "0x3c4d5e6f7890abcdef1234567890abcdef123456", blockNumber: "998", timestamp: now - 240,   txHash: "0x03c4d5e6f7890" },
    { type: "mint",     tokenId: 3,   tier: "GENESIS",  from: ZERO, to: "0x4d5e6f7890abcdef1234567890abcdef12345678", blockNumber: "997",  timestamp: now - 420,   txHash: "0x04d5e6f789012" },
    { type: "mint",     tokenId: 15,  tier: "GENESIS",  from: ZERO, to: "0x5e6f7890abcdef1234567890abcdef1234567890", blockNumber: "990",  timestamp: now - 1800,  txHash: "0x05e6f7890abcd" },
    { type: "mint",     tokenId: 42,  tier: "GENESIS",  from: ZERO, to: "0x6f7890abcdef1234567890abcdef123456789012", blockNumber: "980",  timestamp: now - 3000,  txHash: "0x06f7890abcdef" },
    { type: "transfer", tokenId: 15,  tier: "GENESIS",  from: "0x5e6f7890abcdef1234567890abcdef1234567890", to: "0x7890abcdef1234567890abcdef12345678901234", blockNumber: "975", timestamp: now - 7200, txHash: "0x07890abcdef12" },
    { type: "mint",     tokenId: 99,  tier: "GENESIS",  from: ZERO, to: "0x890abcdef1234567890abcdef123456789012345", blockNumber: "960",  timestamp: now - 14400, txHash: "0x0890abcdef123" },
    { type: "mint",     tokenId: 150, tier: "FOUNDING", from: ZERO, to: "0x90abcdef1234567890abcdef12345678901234ab", blockNumber: "950",  timestamp: now - 28800, txHash: "0x090abcdef1234" },
    { type: "mint",     tokenId: 300, tier: "FOUNDING", from: ZERO, to: "0xabcdef1234567890abcdef12345678901234abcd", blockNumber: "940",  timestamp: now - 43200, txHash: "0x0abcdef123456" },
    { type: "transfer", tokenId: 42,  tier: "GENESIS",  from: "0x6f7890abcdef1234567890abcdef123456789012", to: "0xbcdef1234567890abcdef1234567890abcdef123", blockNumber: "935", timestamp: now - 54000, txHash: "0x0bcdef1234567" },
    { type: "mint",     tokenId: 500, tier: "FOUNDING", from: ZERO, to: "0xcdef1234567890abcdef1234567890abcdef1234", blockNumber: "930",  timestamp: now - 72000, txHash: "0x0cdef12345678" },
  ];
}

async function getActivity(): Promise<{ events: ActivityEvent[]; isPreview: boolean }> {
  try {
    const client = createPublicClient({ chain, transport: http() });
    const logs = await client.getLogs({
      address: BASED_ID_ADDRESS,
      event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"),
      fromBlock: BigInt(0),
      toBlock: "latest",
    });
    if (logs.length === 0) return { events: mockEvents(), isPreview: true };

    const recent = [...logs]
      .sort((a, b) => (a.blockNumber > b.blockNumber ? -1 : 1))
      .slice(0, 50);

    const uniqueBlocks = [...new Set(recent.map((l) => l.blockNumber))];
    const blockData = await Promise.allSettled(
      uniqueBlocks.map((bn) => client.getBlock({ blockNumber: bn }))
    );
    const tsMap = new Map<bigint, number>();
    uniqueBlocks.forEach((bn, i) => {
      const r = blockData[i];
      if (r.status === "fulfilled") tsMap.set(bn, Number(r.value.timestamp));
    });

    const events: ActivityEvent[] = recent.map((l) => {
      const tokenId = Number(l.args.tokenId ?? 0);
      const from = (l.args.from ?? ZERO).toLowerCase();
      const to = (l.args.to ?? ZERO).toLowerCase();
      return {
        type: from === ZERO ? "mint" : "transfer",
        tokenId,
        tier: getTier(tokenId),
        from,
        to,
        blockNumber: l.blockNumber.toString(),
        timestamp: tsMap.get(l.blockNumber) ?? 0,
        txHash: l.transactionHash ?? "",
      };
    });
    return { events, isPreview: false };
  } catch {
    return { events: mockEvents(), isPreview: true };
  }
}

export default async function ActivityPage() {
  const { events, isPreview } = await getActivity();

  const mintCount = events.filter((e) => e.type === "mint").length;
  const transferCount = events.filter((e) => e.type === "transfer").length;
  const uniqueHolders = new Set(events.map((e) => e.to)).size;

  return (
    <div className="min-h-screen bg-background">

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/[0.04] bg-black/70 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity">
            <span className="font-bold text-sm text-white tracking-tight">Based</span>
            <span className="font-mono text-[11px] text-zinc-500 tracking-widest">ID</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-full px-2 py-1.5">
            <Link href="/leaderboard" className="px-3.5 py-1 rounded-full text-[11px] text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all duration-150 tracking-wide">Leaderboard</Link>
            <Link href="/activity"    className="px-3.5 py-1 rounded-full text-[11px] text-white bg-white/[0.07] transition-all duration-150 tracking-wide">Activity</Link>
            <Link href="/dashboard"   className="px-3.5 py-1 rounded-full text-[11px] text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all duration-150 tracking-wide">Dashboard</Link>
          </nav>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-zinc-600 text-[11px] tracking-wide">Live</span>
          </div>
        </div>
      </header>

      {/* Ambient glow */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 50% 40% at 50% 0%, rgba(34,197,94,0.05), transparent 70%)",
          }}
        />

        <div className="relative max-w-3xl mx-auto px-6 pt-14 pb-10 space-y-10">

          {/* Header */}
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1
                className="text-white font-black text-5xl leading-[1] tracking-tight"
                style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
              >
                Activity
              </h1>
              <p className="text-zinc-500 text-sm mt-3 max-w-md leading-relaxed">
                Every mint and transfer on Based ID, in real time. Refreshes every 30s.
              </p>
            </div>
            <LivePulse />
          </div>

          {/* Preview banner */}
          {isPreview && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-400/20 bg-amber-400/5 text-amber-400 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 animate-pulse" />
              <span>Preview mode — no activity on testnet yet. This is how it looks once minting begins.</span>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: mintCount, label: "Recent Mints", color: "text-green-500" },
              { value: transferCount, label: "Transfers", color: "text-blue-400" },
              { value: uniqueHolders, label: "Unique Wallets", color: "text-white" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/[0.06] bg-white/[0.01] px-4 py-3.5"
              >
                <p className={`${stat.color} font-bold text-2xl tabular-nums leading-none`}>
                  {stat.value}
                </p>
                <p className="text-zinc-600 text-[10px] uppercase tracking-[0.15em] mt-2">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Feed */}
          <ActivityFeed events={events} />

          {/* Footer CTA */}
          <div className="flex items-center justify-between pt-6 border-t border-white/[0.05]">
            <p className="text-zinc-700 text-xs">Last {events.length} events on Base</p>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-100 transition-colors"
            >
              Mint your Based ID →
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
