import { createPublicClient, http, parseAbiItem } from "viem";
import { base, baseSepolia } from "viem/chains";
import { BASED_ID_ADDRESS, BASED_ID_ABI, isAuctionId, DEPLOY_BLOCK } from "@/lib/contracts";
import Link from "next/link";
import type { Metadata } from "next";
import { IdSearch } from "./IdSearch";
import { LeaderboardTable, type HolderRow } from "./LeaderboardTable";
import { MobileNav } from "@/app/components/MobileNav";

export const revalidate = 60;

const chain = process.env.NEXT_PUBLIC_CHAIN_ID === "8453" ? base : baseSepolia;

function getTier(id: number) {
  if (id <= 100) return "GENESIS";
  if (id <= 1000) return "FOUNDING";
  if (id <= 10000) return "PIONEER";
  return "BUILDER";
}

export const metadata: Metadata = {
  title: "Leaderboard — Based ID",
  description: "The 100 lowest Based IDs ranked by $BASED weight.",
};

async function getLeaderboard(): Promise<HolderRow[]> {
  const client = createPublicClient({ chain, transport: http() });
  try {
    const logs = await client.getLogs({
      address: BASED_ID_ADDRESS,
      event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"),
      args: { from: "0x0000000000000000000000000000000000000000" },
      fromBlock: DEPLOY_BLOCK,
    });
    const ids = logs
      .map((log) => Number(log.args.tokenId))
      .filter((id) => !isNaN(id) && id > 0)
      .sort((a, b) => a - b)
      .slice(0, 100);

    const rows: HolderRow[] = [];
    for (let i = 0; i < ids.length; i += 10) {
      const batch = ids.slice(i, i + 10);
      const results = await Promise.allSettled(
        batch.map((id) =>
          client.readContract({ address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "ownerOf", args: [BigInt(id)] })
        )
      );
      results.forEach((result, idx) => {
        const id = batch[idx];
        const holder = result.status === "fulfilled" ? (result.value as string) : "—";
        rows.push({ tokenId: id, tier: getTier(id), weight: 1 / Math.sqrt(id), holder, isAuction: isAuctionId(id) });
      });
    }
    return rows;
  } catch {
    return [];
  }
}

// Clean SVG weight-curve chart — minimal, Hyperliquid-style
function WeightChart({ rows }: { rows: HolderRow[] }) {
  const W = 800, H = 100;
  const PAD = { t: 8, r: 16, b: 24, l: 52 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;

  const maxW = rows[0]?.weight ?? 1;
  const minW = 0;

  const pts = rows.map((r, i) => ({
    x: PAD.l + (i / Math.max(rows.length - 1, 1)) * iW,
    y: PAD.t + (1 - (r.weight - minW) / (maxW - minW || 1)) * iH,
    r,
  }));

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${(PAD.l + iW).toFixed(1)},${(PAD.t + iH).toFixed(1)} L${PAD.l},${(PAD.t + iH).toFixed(1)} Z`;

  const yTicks = [maxW, maxW * 0.5, 0].map((v, i) => ({
    y: PAD.t + i * (iH / 2),
    label: i === 2 ? "0" : v.toFixed(2) + "×",
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Horizontal grid */}
      {yTicks.map((t) => (
        <line key={t.label} x1={PAD.l} y1={t.y} x2={PAD.l + iW} y2={t.y}
          stroke="#ffffff" strokeOpacity="0.04" strokeWidth="1" />
      ))}

      {/* Area + line */}
      <path d={area} fill="url(#areaFill)" />
      <path d={line} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.8" strokeLinejoin="round" />

      {/* Genesis boundary */}
      {(() => {
        const idx = rows.findIndex(r => r.tokenId > 100);
        if (idx < 1) return null;
        const x = pts[idx]?.x;
        if (!x) return null;
        return (
          <>
            <line x1={x} y1={PAD.t} x2={x} y2={PAD.t + iH}
              stroke="#f59e0b" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="4,3" />
            <text x={x + 4} y={PAD.t + 9} fontSize="8.5" fill="#f59e0b" fillOpacity="0.5" fontFamily="monospace">
              GENESIS
            </text>
          </>
        );
      })()}

      {/* Top dot */}
      {pts[0] && (
        <circle cx={pts[0].x} cy={pts[0].y} r="3"
          fill="#f59e0b" stroke="#060818" strokeWidth="1.5" />
      )}

      {/* Y labels */}
      {yTicks.map((t) => (
        <text key={t.label} x={PAD.l - 6} y={t.y + 4}
          textAnchor="end" fontSize="9" fill="#374151" fontFamily="monospace">
          {t.label}
        </text>
      ))}

      {/* X labels */}
      {[0, Math.floor((rows.length - 1) / 2), rows.length - 1].map((idx) => {
        const p = pts[idx];
        if (!p) return null;
        return (
          <text key={idx} x={p.x} y={H - 4}
            textAnchor="middle" fontSize="9" fill="#374151" fontFamily="monospace">
            #{rows[idx].tokenId.toLocaleString()}
          </text>
        );
      })}
    </svg>
  );
}

export default async function LeaderboardPage() {
  const rows = await getLeaderboard();
  const isEmpty = rows.length === 0;

  const genesisCount = rows.filter(r => r.isAuction).length;
  const totalWeight = rows.reduce((s, r) => s + r.weight, 0);

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
            <Link href="/leaderboard" className="text-[13px] text-white transition-colors">Leaderboard</Link>
            <Link href="/activity"    className="text-[13px] text-zinc-400 hover:text-white transition-colors">Activity</Link>
            <Link href="/dashboard"   className="text-[13px] text-zinc-400 hover:text-white transition-colors">Dashboard</Link>
          </nav>
          <div className="flex items-center gap-4 flex-shrink-0">
            <IdSearch />
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-zinc-600 text-[11px] tracking-wide">Live</span>
            </div>
          </div>
        </div>
      </header>

      <MobileNav />

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">

        {/* Page title */}
        <div>
          <h1
            className="text-white font-black text-3xl mb-1"
            style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
          >
            Leaderboard
          </h1>
          <p className="text-zinc-600 text-sm leading-relaxed">
            Top 100 Based IDs ranked by $BASED weight.<br className="sm:hidden" /> Lower ID = bigger airdrop share.
          </p>
        </div>

        {isEmpty ? (
          /* Empty state — no holders yet */
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] px-8 py-20 text-center space-y-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl border border-amber-400/20 bg-amber-400/[0.04]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400/70">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/>
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
              </svg>
            </div>
            <div className="space-y-2 max-w-sm mx-auto">
              <h2 className="text-white font-bold text-xl" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
                The leaderboard opens with the first mint
              </h2>
              <p className="text-zinc-500 text-sm leading-relaxed">
                No Based IDs minted yet. Mint yours for $2 USDC and you&apos;ll take #101 — the first public ID on Base.
              </p>
            </div>
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-100 transition-colors"
            >
              Mint Based ID #101 →
            </Link>
          </div>
        ) : (
          <>
            {/* Stats + chart card */}
            <div className="border border-white/[0.06] rounded-2xl overflow-hidden">
              {/* Stat row */}
              <div className="grid grid-cols-3 divide-x divide-white/[0.05] border-b border-white/[0.05]">
                <div className="px-3 sm:px-6 py-4 sm:py-5">
                  <p className="text-[9px] sm:text-[11px] text-zinc-600 uppercase tracking-[0.12em] sm:tracking-[0.18em] mb-2">Ranked</p>
                  <p className="text-white font-black text-xl tabular-nums" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
                    {rows.length}
                  </p>
                </div>
                <div className="px-3 sm:px-6 py-4 sm:py-5">
                  <p className="text-[9px] sm:text-[11px] text-zinc-600 uppercase tracking-[0.12em] sm:tracking-[0.18em] mb-2">Genesis</p>
                  <p className="text-amber-400 font-black text-xl tabular-nums" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
                    {genesisCount}
                    <span className="text-zinc-700 font-normal text-sm ml-1">/ 100</span>
                  </p>
                </div>
                <div className="px-3 sm:px-6 py-4 sm:py-5">
                  <p className="text-[9px] sm:text-[11px] text-zinc-600 uppercase tracking-[0.12em] sm:tracking-[0.18em] mb-2">Weight</p>
                  <p className="text-blue-400 font-black text-xl tabular-nums" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
                    {totalWeight.toFixed(2)}
                    <span className="text-zinc-700 font-normal text-sm ml-1">×</span>
                  </p>
                </div>
              </div>

              {/* Chart */}
              <div className="px-6 pt-5 pb-4 border-b border-white/[0.04]">
                <p className="text-[10px] text-zinc-700 uppercase tracking-[0.18em] mb-3">$BASED Weight Curve</p>
                <WeightChart rows={rows} />
              </div>

              {/* Chart legend */}
              <div className="px-4 sm:px-6 py-3 flex items-center flex-wrap gap-x-5 gap-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-px bg-blue-500 opacity-70 flex-shrink-0" />
                  <span className="text-zinc-600 text-[10px]">Weight = 1 ÷ √ID</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-px border-t border-dashed border-amber-500/50 flex-shrink-0" />
                  <span className="text-zinc-600 text-[10px]">Genesis boundary (#100)</span>
                </div>
              </div>
            </div>

            {/* Table (with "Your Rank" highlighting) */}
            <LeaderboardTable rows={rows} />

            {/* Footer */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-zinc-700 text-[11px] font-mono">
                {rows.length} holders · refreshes every 60s
              </p>
              <Link href="/" className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors">
                Mint your Based ID →
              </Link>
            </div>
          </>
        )}

      </div>

      <footer className="border-t border-white/[0.04] mt-16 px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
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
