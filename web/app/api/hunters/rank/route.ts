import { createServerClient } from "@/lib/supabase";
import { createPublicClient, http, keccak256, encodeAbiParameters, parseAbiParameters } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

export const runtime = "nodejs";

const isMainnet  = process.env.NEXT_PUBLIC_CHAIN_ID === "8453";
const chain      = isMainnet ? base : baseSepolia;
const rpcUrl     = isMainnet ? "https://mainnet.base.org" : "https://sepolia.base.org";
const HUNTERS    = (process.env.NEXT_PUBLIC_HUNTERS_ADDRESS ?? "") as `0x${string}`;
const ORACLE_PK  = process.env.HUNTERS_ORACLE_PK as `0x${string}` | undefined;

// XP thresholds per rank (0=E, 1=D, 2=C, 3=B, 4=A, 5=S, 6=National)
const RANK_XP_THRESHOLDS = [0, 100, 300, 700, 1500, 3000, 6000];

// Rank sync costs in USDC (for display, matches contract)
export const RANK_COSTS = [0, 2, 2, 2, 5, 10, 20];

function xpToRank(xp: number): number {
  let rank = 0;
  for (let i = RANK_XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= RANK_XP_THRESHOLDS[i]) { rank = i; break; }
  }
  return rank;
}

// POST /api/hunters/rank — compute XP, determine new rank, return oracle signature
export async function POST(req: Request) {
  if (!ORACLE_PK) return Response.json({ error: "Oracle not configured" }, { status: 503 });
  if (!HUNTERS || HUNTERS === "0x0000000000000000000000000000000000000000") {
    return Response.json({ error: "Hunters contract not deployed" }, { status: 503 });
  }

  const { wallet } = await req.json() as { wallet?: string };
  if (!wallet) return Response.json({ error: "wallet required" }, { status: 400 });

  const db = createServerClient();

  // Fetch activity data
  const [entriesRes, winsRes, xpRow] = await Promise.all([
    db.from("entries").select("id", { count: "exact" }).eq("wallet_address", wallet.toLowerCase()).in("status", ["entered", "won", "lost"]),
    db.from("entries").select("id", { count: "exact" }).eq("wallet_address", wallet.toLowerCase()).eq("status", "won"),
    db.from("hunter_xp").select("*").eq("wallet_address", wallet.toLowerCase()).single(),
  ]);

  const entryCount = entriesRes.count ?? 0;
  const winCount   = winsRes.count   ?? 0;

  // Calculate XP from each source
  const entriesXp = entryCount * 10;
  const winsXp    = winCount   * 50;
  const checkinXp = xpRow.data?.checkin_xp ?? 0;

  // Sum quest bonus XP from completed quests
  const { data: questCompletions } = await db
    .from("quest_completions")
    .select("earned_xp")
    .eq("wallet_address", wallet.toLowerCase());
  const questXp = (questCompletions ?? []).reduce((s: number, c: { earned_xp: number }) => s + (c.earned_xp ?? 0), 0);

  const totalXp = entriesXp + winsXp + checkinXp + questXp;

  // Upsert XP record
  await db.from("hunter_xp").upsert({
    wallet_address: wallet.toLowerCase(),
    entries_xp:     entriesXp,
    wins_xp:        winsXp,
    checkin_xp:     checkinXp,
    quest_xp:       questXp,
    total_xp:       totalXp,
    updated_at:     new Date().toISOString(),
  }, { onConflict: "wallet_address" });

  const newRank = xpToRank(totalXp);

  // Get current nonce from contract
  const client = createPublicClient({ chain, transport: http(rpcUrl) });
  let currentNonce = BigInt(0);
  try {
    currentNonce = await client.readContract({
      address: HUNTERS,
      abi: [{ type: "function", name: "nonces", inputs: [{ name: "wallet", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" }] as const,
      functionName: "nonces",
      args: [wallet as `0x${string}`],
    }) as bigint;
  } catch { /* contract may not be deployed yet */ }

  const nonce = currentNonce + BigInt(1);

  // Sign: keccak256(chainId, contract, wallet, newRank, nonce)
  const hash    = keccak256(encodeAbiParameters(
    parseAbiParameters("uint256 chainId, address contract, address wallet, uint8 rank, uint256 nonce"),
    [BigInt(chain.id), HUNTERS, wallet as `0x${string}`, newRank, nonce]
  ));
  const oracle  = privateKeyToAccount(ORACLE_PK);
  const sig     = await oracle.signMessage({ message: { raw: hash } });

  // Calculate XP to next rank
  const nextRankXp  = RANK_XP_THRESHOLDS[newRank + 1] ?? null;
  const xpToNext    = nextRankXp ? nextRankXp - totalXp : null;
  const syncCost    = RANK_COSTS[newRank] ?? 0;

  return Response.json({
    wallet,
    totalXp,
    breakdown: { entriesXp, winsXp, checkinXp, entryCount, winCount },
    newRank,
    rankThresholds: RANK_XP_THRESHOLDS,
    rankCosts: RANK_COSTS,
    xpToNext,
    syncCost,
    nonce: nonce.toString(),
    sig,
  });
}

// GET /api/hunters/rank?wallet=0x... — get XP without signing (for display)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  if (!wallet) return Response.json({ error: "wallet required" }, { status: 400 });

  const db = createServerClient();
  const [entriesRes, winsRes, xpRow] = await Promise.all([
    db.from("entries").select("id", { count: "exact" }).eq("wallet_address", wallet.toLowerCase()).in("status", ["entered", "won", "lost"]),
    db.from("entries").select("id", { count: "exact" }).eq("wallet_address", wallet.toLowerCase()).eq("status", "won"),
    db.from("hunter_xp").select("*").eq("wallet_address", wallet.toLowerCase()).single(),
  ]);

  const entryCount = entriesRes.count ?? 0;
  const winCount   = winsRes.count   ?? 0;
  const entriesXp  = entryCount * 10;
  const winsXp     = winCount   * 50;
  const checkinXp  = xpRow.data?.checkin_xp ?? 0;
  const totalXp    = entriesXp + winsXp + checkinXp;
  const newRank    = xpToRank(totalXp);
  const nextRankXp = RANK_XP_THRESHOLDS[newRank + 1] ?? null;

  return Response.json({
    totalXp,
    breakdown: { entriesXp, winsXp, checkinXp, entryCount, winCount },
    rank: newRank,
    rankThresholds: RANK_XP_THRESHOLDS,
    rankCosts: RANK_COSTS,
    xpToNext: nextRankXp ? nextRankXp - totalXp : null,
    lastCheckin: xpRow.data?.last_checkin_at ?? null,
    streak: xpRow.data?.checkin_streak ?? 0,
  });
}
