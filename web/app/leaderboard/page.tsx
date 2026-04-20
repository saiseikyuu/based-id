import { createPublicClient, http, parseAbiItem } from "viem";
import { base, baseSepolia } from "viem/chains";
import { BASED_ID_ADDRESS, BASED_ID_ABI, isAuctionId, BASESCAN_URL } from "@/lib/contracts";
import Link from "next/link";
import type { Metadata } from "next";

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
  description: "The 100 lowest Based IDs. The earlier you minted, the higher your $BASED weight.",
};

type HolderRow = {
  tokenId: number;
  tier: string;
  weight: string;
  holder: string;
  isAuction: boolean;
};

async function getLeaderboard(): Promise<HolderRow[]> {
  const client = createPublicClient({ chain, transport: http() });

  try {
    const logs = await client.getLogs({
      address: BASED_ID_ADDRESS,
      event: parseAbiItem("event Minted(address indexed to, uint256 indexed tokenId)"),
      fromBlock: BigInt(0),
    });

    const ids = logs
      .map((log) => Number(log.args.tokenId))
      .filter((id) => !isNaN(id) && id > 0)
      .sort((a, b) => a - b)
      .slice(0, 100);

    // Batch ownerOf calls in groups of 10
    const rows: HolderRow[] = [];
    for (let i = 0; i < ids.length; i += 10) {
      const batch = ids.slice(i, i + 10);
      const results = await Promise.allSettled(
        batch.map((id) =>
          client.readContract({
            address: BASED_ID_ADDRESS,
            abi: BASED_ID_ABI,
            functionName: "ownerOf",
            args: [BigInt(id)],
          })
        )
      );

      results.forEach((result, idx) => {
        const id = batch[idx];
        const holder =
          result.status === "fulfilled" ? (result.value as string) : "—";
        rows.push({
          tokenId: id,
          tier: getTier(id),
          weight: (1 / Math.sqrt(id)).toFixed(4),
          holder,
          isAuction: isAuctionId(id),
        });
      });
    }

    return rows;
  } catch {
    return [];
  }
}

export default async function LeaderboardPage() {
  const rows = await getLeaderboard();

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <div className="border-b border-white/[0.05] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-zinc-500 text-[11px] uppercase tracking-[0.2em] hover:text-white transition-colors"
          >
            ← Based ID
          </Link>
          <span className="text-zinc-700 text-[11px] uppercase tracking-[0.15em]">
            Leaderboard
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-white font-bold text-2xl mb-2" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
            Top 100 Holders
          </h1>
          <p className="text-zinc-500 text-sm">
            Ranked by ID number. Lower = earlier = higher $BASED weight.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-600 text-sm">No minted IDs found yet.</p>
          </div>
        ) : (
          <div className="border border-white/[0.06] rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[48px_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-white/[0.05] bg-white/[0.01]">
              <span className="text-zinc-700 text-[10px] uppercase tracking-[0.15em]">Rank</span>
              <span className="text-zinc-700 text-[10px] uppercase tracking-[0.15em]">ID</span>
              <span className="text-zinc-700 text-[10px] uppercase tracking-[0.15em]">Weight</span>
              <span className="text-zinc-700 text-[10px] uppercase tracking-[0.15em]">Holder</span>
            </div>

            {/* Rows */}
            {rows.map((row, i) => (
              <div
                key={row.tokenId}
                className="grid grid-cols-[48px_1fr_1fr_1fr] gap-4 px-5 py-3.5 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                {/* Rank */}
                <span className="text-zinc-600 text-sm font-mono">
                  {i + 1}
                </span>

                {/* ID + Tier */}
                <Link
                  href={`/profile/${row.tokenId}`}
                  className="flex items-center gap-2 group"
                >
                  <span
                    className={`font-bold text-sm font-mono group-hover:opacity-80 transition-opacity ${
                      row.isAuction ? "text-amber-400" : "text-blue-400"
                    }`}
                  >
                    #{row.tokenId}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full border font-mono tracking-wider ${
                      row.isAuction
                        ? "text-amber-400/70 border-amber-400/20 bg-amber-400/5"
                        : "text-blue-400/60 border-blue-400/15 bg-blue-400/5"
                    }`}
                  >
                    {row.tier}
                  </span>
                </Link>

                {/* Weight */}
                <span className="text-zinc-300 text-sm font-mono">
                  {row.weight}×
                </span>

                {/* Holder */}
                {row.holder === "—" ? (
                  <span className="text-zinc-700 text-sm font-mono">—</span>
                ) : (
                  <a
                    href={`${BASESCAN_URL}/address/${row.holder}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-500 text-sm font-mono hover:text-zinc-300 transition-colors truncate"
                  >
                    {row.holder.slice(0, 6)}…{row.holder.slice(-4)}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-zinc-700 text-[11px] text-center mt-6">
          Updates every 60 seconds · {rows.length} IDs shown
        </p>
      </div>
    </div>
  );
}
