import { createPublicClient, http, isAddress, parseAbiItem } from "viem";
import { base, baseSepolia } from "viem/chains";
import { BASED_ID_ADDRESS, isAuctionId } from "@/lib/contracts";

export const runtime = "nodejs";

const chain = process.env.NEXT_PUBLIC_CHAIN_ID === "8453" ? base : baseSepolia;

function getTier(id: number) {
  if (id <= 100) return "GENESIS";
  if (id <= 1000) return "FOUNDING";
  if (id <= 10000) return "PIONEER";
  return "BUILDER";
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  if (!isAddress(address)) {
    return Response.json(
      { error: "Invalid Ethereum address" },
      { status: 400, headers: CORS }
    );
  }

  const client = createPublicClient({ chain, transport: http() });

  try {
    const balance = Number(
      await client.readContract({
        address: BASED_ID_ADDRESS,
        abi: [
          {
            type: "function",
            name: "balanceOf",
            inputs: [{ name: "owner", type: "address" }],
            outputs: [{ name: "", type: "uint256" }],
            stateMutability: "view",
          },
        ] as const,
        functionName: "balanceOf",
        args: [address],
      })
    );

    if (balance === 0) {
      return Response.json(
        {
          address,
          holds: false,
          count: 0,
          ids: [],
          lowestId: null,
          tier: null,
          weight: null,
          checkedAt: new Date().toISOString(),
        },
        {
          headers: {
            ...CORS,
            "Cache-Control": "public, max-age=60",
          },
        }
      );
    }

    const logs = await client.getLogs({
      address: BASED_ID_ADDRESS,
      event: parseAbiItem(
        "event Minted(address indexed to, uint256 indexed tokenId)"
      ),
      args: { to: address },
      fromBlock: BigInt(0),
    });

    const ids = logs
      .map((log) => Number(log.args.tokenId))
      .filter((id) => !isNaN(id))
      .sort((a, b) => a - b);

    const lowestId = ids.length > 0 ? ids[0] : null;
    const tier = lowestId !== null ? getTier(lowestId) : null;
    const weight = lowestId !== null ? parseFloat((1 / Math.sqrt(lowestId)).toFixed(6)) : null;
    const auction = lowestId !== null ? isAuctionId(lowestId) : false;

    return Response.json(
      {
        address,
        holds: true,
        count: balance,
        ids,
        lowestId,
        tier,
        weight,
        isGenesisHolder: auction,
        checkedAt: new Date().toISOString(),
      },
      {
        headers: {
          ...CORS,
          "Cache-Control": "public, max-age=60",
        },
      }
    );
  } catch {
    return Response.json(
      { error: "Failed to query chain" },
      { status: 502, headers: CORS }
    );
  }
}
