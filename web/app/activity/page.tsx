import { createPublicClient, http, parseAbiItem } from "viem";
import { base, baseSepolia } from "viem/chains";
import { BASED_ID_ADDRESS, BASED_ID_ABI, DEPLOY_BLOCK } from "@/lib/contracts";
import Link from "next/link";
import type { Metadata } from "next";
import { ActivityFeed, type ActivityEvent } from "./ActivityFeed";
import { LivePulse } from "./LivePulse";
import { MobileNav } from "@/app/components/MobileNav";
import { Nav } from "@/app/components/Nav";

export const revalidate = 30;

const chain = process.env.NEXT_PUBLIC_CHAIN_ID === "8453" ? base : baseSepolia;
const rpcUrl = process.env.NEXT_PUBLIC_CHAIN_ID === "8453"
  ? "https://mainnet.base.org"
  : "https://sepolia.base.org";

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

type ActivityResult = {
  events: ActivityEvent[];
  totalMints: number;
  totalTransfers: number;
  uniqueHolders: number;
};

async function getActivity(): Promise<ActivityResult> {
  const empty = { events: [], totalMints: 0, totalTransfers: 0, uniqueHolders: 0 };
  try {
    const client = createPublicClient({ chain, transport: http(rpcUrl, { timeout: 8_000 }) });

    // Accurate totals from contract — not affected by log truncation
    const totalMinted = await client.readContract({
      address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "totalMinted",
    }) as bigint;
    const totalMints = Number(totalMinted);
    if (totalMints === 0) return empty;

    // Recent transfer events for the feed (may be truncated by RPC — that's fine for a feed)
    const logs = await client.getLogs({
      address: BASED_ID_ADDRESS,
      event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"),
      fromBlock: DEPLOY_BLOCK,
      toBlock: "latest",
    });

    // All non-mint transfers for transfer count
    const transferLogs = logs.filter((l) =>
      l.args.from?.toLowerCase() !== ZERO
    );
    const totalTransfers = transferLogs.length;

    // Unique current-holder addresses from all logs we have
    const uniqueHolders = new Set(
      logs.map((l) => l.args.to?.toLowerCase()).filter(Boolean)
    ).size;

    // Feed: most recent 50 events
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

    return { events, totalMints, totalTransfers, uniqueHolders };
  } catch {
    return empty;
  }
}

export default async function ActivityPage() {
  const { events, totalMints, totalTransfers, uniqueHolders } = await getActivity();
  const isEmpty = totalMints === 0;

  return (
    <div className="min-h-screen bg-background">
      <Nav active="/activity" />
      <MobileNav />

      <div className="max-w-3xl mx-auto px-6 pt-14 pb-16 space-y-10">

          {/* Header */}
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-white font-black text-4xl sm:text-5xl tracking-tight" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
                Activity
              </h1>
              <p className="text-zinc-500 text-sm">Every mint and transfer on Based ID, live. Refreshes every 30s.</p>
            </div>
            <LivePulse />
          </div>

          {isEmpty ? (
            /* Empty state — waiting for first mint */
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] px-8 py-20 text-center space-y-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div className="space-y-2 max-w-sm mx-auto">
                <h2 className="text-white font-bold text-xl" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
                  Waiting for the first mint
                </h2>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Every mint and transfer will appear here in real time. Be the first — you&apos;ll own Based ID #101 forever.
                </p>
              </div>
              <Link
                href="/"
                className="inline-block px-6 py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-100 transition-colors"
              >
                Mint your Based ID →
              </Link>
            </div>
          ) : (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { value: totalMints, label: "Mints", color: "text-green-500" },
                  { value: totalTransfers, label: "Transfers", color: "text-blue-400" },
                  { value: uniqueHolders, label: "Wallets", color: "text-white" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.01] px-3 sm:px-4 py-3.5"
                  >
                    <p className={`${stat.color} font-bold text-2xl tabular-nums leading-none`}>
                      {stat.value}
                    </p>
                    <p className="text-zinc-600 text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.15em] mt-2">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Feed */}
              <ActivityFeed events={events} />

              {/* Footer CTA */}
              <div className="flex items-center justify-between pt-6 border-t border-white/[0.05]">
                <p className="text-zinc-700 text-xs">Showing last {events.length} of {totalMints + totalTransfers} events on Base</p>
                <Link
                  href="/"
                  className="px-5 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-100 transition-colors"
                >
                  Mint your Based ID →
                </Link>
              </div>
            </>
          )}

      </div>

      <footer className="border-t border-white/[0.06] px-6 py-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <span className="text-zinc-700 text-xs">Built on Base · 2026</span>
          <div className="flex items-center gap-5 text-xs text-zinc-700">
            <Link href="/" className="hover:text-zinc-400 transition-colors">Home</Link>
            <Link href="/dashboard" className="hover:text-zinc-400 transition-colors">Dashboard</Link>
            <a href="https://x.com/basedidofficial" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">@basedidofficial</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
