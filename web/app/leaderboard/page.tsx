import { createPublicClient, http, parseAbiItem } from "viem";
import { base, baseSepolia } from "viem/chains";
import { BASED_ID_ADDRESS, BASED_ID_ABI, isAuctionId } from "@/lib/contracts";
import Link from "next/link";
import type { Metadata } from "next";
import { IdSearch } from "./IdSearch";
import { LeaderboardTable, type HolderRow } from "./LeaderboardTable";

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

const MOCK_ADDRESSES = [
  "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
  "0x2b3c4d5e6f7890abcdef1234567890abcdef1234",
  "0x3c4d5e6f7890abcdef1234567890abcdef123456",
  "0x4d5e6f7890abcdef1234567890abcdef12345678",
  "0x5e6f7890abcdef1234567890abcdef1234567890",
  "0x6f7890abcdef1234567890abcdef123456789012",
  "0x7890abcdef1234567890abcdef12345678901234",
  "0x890abcdef1234567890abcdef123456789012345",
  "0x90abcdef1234567890abcdef12345678901234ab",
  "0xabcdef1234567890abcdef12345678901234abcd",
];

function getMockRows(): HolderRow[] {
  const ids = [
    1,2,3,4,5,6,7,8,9,10,12,14,16,18,20,23,26,30,35,40,
    45,50,55,60,65,70,75,80,85,90,95,99,100,
    105,115,130,150,175,200,250,300,350,400,450,500,
    550,600,650,700,750,800,850,900,950,1000,
    1100,1300,1500,1800,2000,2500,3000,3500,4000,4500,
    5000,5500,6000,6500,7000,7500,8000,8500,9000,9500,10000,
    11000,13000,15000,18000,20000,25000,30000,40000,50000,
    60000,70000,80000,90000,100000,
    120000,150000,200000,250000,300000,
    400000,500000,600000,700000,800000,900000,1000000,
  ].slice(0, 100);

  return ids.map((id, i) => ({
    tokenId: id,
    tier: getTier(id),
    weight: 1 / Math.sqrt(id),
    holder: MOCK_ADDRESSES[i % MOCK_ADDRESSES.length],
    isAuction: isAuctionId(id),
  }));
}

async function getLeaderboard(): Promise<HolderRow[]> {
  const client = createPublicClient({ chain, transport: http() });
  try {
    const logs = await client.getLogs({
      address: BASED_ID_ADDRESS,
      event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"),
      args: { from: "0x0000000000000000000000000000000000000000" },
      fromBlock: BigInt(0),
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
  const liveRows = await getLeaderboard();
  const isPreview = liveRows.length === 0;
  const rows = isPreview ? getMockRows() : liveRows;

  const genesisCount = rows.filter(r => r.isAuction).length;
  const totalWeight = rows.reduce((s, r) => s + r.weight, 0);

  return (
    <div className="min-h-screen bg-background">

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/[0.04] bg-black/70 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity">
            <span className="font-bold text-sm text-white tracking-tight">Based</span>
            <span className="font-mono text-[11px] text-zinc-500 tracking-widest">ID</span>
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

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">

        {/* Page title */}
        <div>
          <h1
            className="text-white font-black text-3xl mb-1"
            style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
          >
            Leaderboard
          </h1>
          <p className="text-zinc-600 text-sm">
            Top 100 Based IDs ranked by $BASED weight · Lower ID = earlier = bigger airdrop share
          </p>
        </div>

        {/* Stats + chart card */}
        <div className="border border-white/[0.06] rounded-2xl overflow-hidden">
          {/* Stat row */}
          <div className="grid grid-cols-3 divide-x divide-white/[0.05] border-b border-white/[0.05]">
            <div className="px-6 py-5">
              <p className="text-[11px] text-zinc-600 uppercase tracking-[0.18em] mb-2">IDs Ranked</p>
              <p className="text-white font-black text-xl tabular-nums" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
                {isPreview ? "—" : rows.length}
              </p>
            </div>
            <div className="px-6 py-5">
              <p className="text-[11px] text-zinc-600 uppercase tracking-[0.18em] mb-2">Genesis Holders</p>
              <p className="text-amber-400 font-black text-xl tabular-nums" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
                {isPreview ? "—" : genesisCount}
                <span className="text-zinc-700 font-normal text-sm ml-1">/ 100</span>
              </p>
            </div>
            <div className="px-6 py-5">
              <p className="text-[11px] text-zinc-600 uppercase tracking-[0.18em] mb-2">Combined Weight</p>
              <p className="text-blue-400 font-black text-xl tabular-nums" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
                {isPreview ? "—" : totalWeight.toFixed(2)}
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
          <div className="px-6 py-3 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-px bg-blue-500 opacity-70" />
              <span className="text-zinc-600 text-[10px]">Weight = 1 ÷ √ID</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-px border-t border-dashed border-amber-500/50" />
              <span className="text-zinc-600 text-[10px]">Genesis boundary (#100)</span>
            </div>
          </div>
        </div>

        {/* Preview banner */}
        {isPreview && (
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl border border-amber-400/15 bg-amber-400/[0.03]">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400/50 flex-shrink-0" />
            <p className="text-amber-400/60 text-xs">
              Preview mode — no IDs minted yet. This is how the leaderboard will look once minting begins.
            </p>
          </div>
        )}

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

      </div>
    </div>
  );
}
