import { isAddress, createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";
import { BASED_ID_ADDRESS, BASED_ID_ABI } from "@/lib/contracts";

export const runtime = "nodejs";

const isMainnet = process.env.NEXT_PUBLIC_CHAIN_ID === "8453";
const chain = isMainnet ? base : baseSepolia;
const rpcUrl = isMainnet ? "https://mainnet.base.org" : "https://sepolia.base.org";

// Base mainnet launched Aug 2023 — used as reference for wallet age
const BASE_LAUNCH_TIMESTAMP = 1691366400; // Aug 7 2023

function grade(score: number): string {
  if (score >= 80) return "S";
  if (score >= 60) return "A";
  if (score >= 40) return "B";
  return "C";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  if (!isAddress(address)) {
    return Response.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const client = createPublicClient({ chain, transport: http(rpcUrl, { timeout: 8_000 }) });

    // eth_getTransactionCount = nonce = number of txs sent (outgoing activity)
    const [nonce, nftBalance] = await Promise.all([
      client.getTransactionCount({ address: address as `0x${string}` }),
      client.readContract({
        address: BASED_ID_ADDRESS,
        abi: BASED_ID_ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      }) as Promise<bigint>,
    ]);

    const txCount = nonce;
    const nftCount = Number(nftBalance);

    // Wallet age: days since Base launched (all Base wallets started Aug 2023 at earliest)
    // We approximate age by when the wallet first could have been active on Base
    const ageDays = Math.floor((Date.now() / 1000 - BASE_LAUNCH_TIMESTAMP) / 86400);

    // Score components (all normalized 0–100):
    // - TX count:   how active the wallet is (50% weight) — 200 txs on Base = max
    // - NFT count:  Based ID holdings signal commitment (30% weight) — 10 IDs = max
    // - Age proxy:  time since Base launch, capped at 365 days (20% weight)
    const txScore  = Math.min(100, (txCount / 200) * 100);
    const nftScore = Math.min(100, (nftCount / 10) * 100);
    const ageScore = Math.min(100, (ageDays / 365) * 100);

    const score = Math.round(txScore * 0.5 + nftScore * 0.3 + ageScore * 0.2);

    return Response.json(
      { address, score, txCount, nftCount, ageDays, grade: grade(score) },
      { headers: { "Cache-Control": "public, max-age=3600" } }
    );
  } catch {
    return Response.json({ error: "Failed to fetch activity" }, { status: 502 });
  }
}
