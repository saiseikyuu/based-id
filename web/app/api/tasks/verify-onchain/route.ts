import { createPublicClient, http, isAddress } from "viem";
import { base, baseSepolia } from "viem/chains";
import { BASED_ID_ADDRESS, BASED_ID_ABI } from "@/lib/contracts";

export const runtime = "nodejs";

const isMainnet = process.env.NEXT_PUBLIC_CHAIN_ID === "8453";
const chain     = isMainnet ? base : baseSepolia;
const rpcUrl    = isMainnet ? "https://mainnet.base.org" : "https://sepolia.base.org";

export async function POST(req: Request) {
  const { task_id, task_type, params, wallet } = await req.json() as {
    task_id:   string;
    task_type: string;
    params:    Record<string, unknown>;
    wallet:    string;
  };

  if (!isAddress(wallet)) {
    return Response.json({ verified: false, reason: "Invalid wallet address" }, { status: 400 });
  }

  const client = createPublicClient({ chain, transport: http(rpcUrl, { timeout: 8_000 }) });

  try {
    switch (task_type) {
      case "hold_based_id": {
        const bal = await client.readContract({
          address: BASED_ID_ADDRESS, abi: BASED_ID_ABI,
          functionName: "balanceOf", args: [wallet as `0x${string}`],
        }) as bigint;
        if (bal > BigInt(0)) return Response.json({ verified: true, task_id });
        return Response.json({ verified: false, reason: "Wallet does not hold a Based ID" });
      }

      case "hold_nft": {
        const contract = params.contract as string;
        const minCount = Number(params.minCount ?? 1);
        if (!isAddress(contract)) {
          return Response.json({ verified: false, reason: "Invalid NFT contract address" });
        }
        const bal = await client.readContract({
          address: contract as `0x${string}`,
          abi: [{ type: "function", name: "balanceOf", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" }],
          functionName: "balanceOf",
          args: [wallet as `0x${string}`],
        }) as bigint;
        if (Number(bal) >= minCount) return Response.json({ verified: true, task_id });
        return Response.json({ verified: false, reason: `Need ${minCount} NFT(s), wallet holds ${bal}` });
      }

      default:
        return Response.json({ verified: false, reason: `Task type '${task_type}' cannot be verified onchain` }, { status: 400 });
    }
  } catch {
    return Response.json({ verified: false, reason: "Onchain verification failed" }, { status: 502 });
  }
}
