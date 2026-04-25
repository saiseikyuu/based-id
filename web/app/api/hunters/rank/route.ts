import { createServerClient } from "@/lib/supabase";
import { createPublicClient, http, keccak256, encodeAbiParameters, parseAbiParameters } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

export const runtime = "nodejs";

const isMainnet = process.env.NEXT_PUBLIC_CHAIN_ID === "8453";
const chain     = isMainnet ? base : baseSepolia;
const rpcUrl    = isMainnet ? "https://mainnet.base.org" : "https://sepolia.base.org";
const HUNTERS   = (process.env.NEXT_PUBLIC_HUNTERS_ADDRESS ?? "") as `0x${string}`;
const ORACLE_PK = process.env.HUNTERS_ORACLE_PK as `0x${string}` | undefined;

// Rank thresholds (score 0–100)
const RANK_THRESHOLDS = [0, 20, 35, 50, 65, 80, 95]; // E D C B A S N

function scoreToRank(score: number): number {
  let rank = 0;
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (score >= RANK_THRESHOLDS[i]) { rank = i; break; }
  }
  return rank;
}

// POST /api/hunters/rank — compute new rank + return oracle signature
export async function POST(req: Request) {
  if (!ORACLE_PK) {
    return Response.json({ error: "Oracle not configured" }, { status: 503 });
  }
  if (!HUNTERS || HUNTERS === "0x0000000000000000000000000000000000000000") {
    return Response.json({ error: "Hunters contract not deployed" }, { status: 503 });
  }

  const { wallet } = await req.json() as { wallet?: string };
  if (!wallet) return Response.json({ error: "wallet required" }, { status: 400 });

  const db = createServerClient();

  // Gather activity data to compute score
  const [entriesRes, winsRes] = await Promise.all([
    db.from("entries").select("id, created_at", { count: "exact" }).eq("wallet_address", wallet.toLowerCase()),
    db.from("entries").select("id", { count: "exact" }).eq("wallet_address", wallet.toLowerCase()).eq("status", "won"),
  ]);

  const entryCount  = entriesRes.count ?? 0;
  const winCount    = winsRes.count    ?? 0;

  // Simple score: 0–100
  // drops entered (capped 50 entries = 50pts) + wins (capped 10 wins = 20pts) + static 30pts for holding
  const score = Math.min(100,
    Math.min(50, entryCount)       // up to 50 pts for entering drops
    + Math.min(20, winCount * 2)   // 2pts per win, max 20
    + 30                           // base score for any hunter
  );

  const newRank = scoreToRank(score);

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
  const hash = keccak256(encodeAbiParameters(
    parseAbiParameters("uint256 chainId, address contract, address wallet, uint8 rank, uint256 nonce"),
    [BigInt(chain.id), HUNTERS, wallet as `0x${string}`, newRank, nonce]
  ));

  const oracle  = privateKeyToAccount(ORACLE_PK);
  const sig     = await oracle.signMessage({ message: { raw: hash } });

  return Response.json({
    wallet,
    score,
    newRank,
    nonce: nonce.toString(),
    sig,
    breakdown: { entryCount, winCount },
  });
}
