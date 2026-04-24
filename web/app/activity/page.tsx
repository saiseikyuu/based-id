import { createPublicClient, http, parseAbiItem } from "viem";
import { base, baseSepolia } from "viem/chains";
import { BASED_ID_ADDRESS, DEPLOY_BLOCK } from "@/lib/contracts";
import Link from "next/link";
import type { Metadata } from "next";
import { ActivityFeed, type ActivityEvent } from "./ActivityFeed";
import { LivePulse } from "./LivePulse";
import { MobileNav } from "@/app/components/MobileNav";

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

async function getActivity(): Promise<ActivityEvent[]> {
  try {
    const client = createPublicClient({ chain, transport: http(rpcUrl, { timeout: 8_000 }) });
    const logs = await client.getLogs({
      address: BASED_ID_ADDRESS,
      event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"),
      fromBlock: DEPLOY_BLOCK,
      toBlock: "latest",
    });
    if (logs.length === 0) return [];

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

    return recent.map((l) => {
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
  } catch {
    return [];
  }
}

export default async function ActivityPage() {
  const events = await getActivity();
  const isEmpty = events.length === 0;

  const mintCount = events.filter((e) => e.type === "mint").length;
  const transferCount = events.filter((e) => e.type === "transfer").length;
  const uniqueHolders = new Set(events.map((e) => e.to)).size;

  return (
    <div className="min-h-screen bg-background">

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/[0.04] bg-black/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Based ID" className="w-7 h-7 rounded-lg" />
            <div className="flex items-center gap-1">
              <span style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }} className="font-bold text-sm text-white tracking-tight">Based</span>
              <span className="font-mono text-[11px] text-zinc-500 tracking-widest ml-0.5">ID</span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-7">
            <Link href="/leaderboard" className="text-[13px] text-zinc-400 hover:text-white transition-colors">Leaderboard</Link>
            <Link href="/activity"    className="text-[13px] text-white transition-colors">Activity</Link>
            <Link href="/dashboard"   className="text-[13px] text-zinc-400 hover:text-white transition-colors">Dashboard</Link>
          </nav>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-zinc-600 text-[11px] tracking-wide">Live</span>
          </div>
        </div>
      </header>

      <MobileNav />

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
                  { value: mintCount, label: "Mints", color: "text-green-500" },
                  { value: transferCount, label: "Transfers", color: "text-blue-400" },
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
                <p className="text-zinc-700 text-xs">Last {events.length} events on Base</p>
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
      </div>

      <footer className="border-t border-white/[0.04] mt-8 px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <svg width="16" height="16" viewBox="0 0 111 111" fill="none" className="opacity-40">
              <path d="M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6 85.359 0 54.921 0C26.0 0 2.0 22.0 0 50.354H72.943V59.68H0C2.0 88.0 26.0 110.034 54.921 110.034Z" fill="#0052FF"/>
            </svg>
            <span className="text-zinc-700 text-[11px]">Built on Base · 2026</span>
          </div>
          <div className="flex items-center gap-5 text-[11px] text-zinc-700">
            <Link href="/" className="hover:text-zinc-400 transition-colors">Home</Link>
            <Link href="/dashboard" className="hover:text-zinc-400 transition-colors">Dashboard</Link>
            <a href="https://x.com/basedidofficial" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">@basedidofficial</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
