import { isAddress } from "viem";

export const runtime = "nodejs";

const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID === "8453" ? "8453" : "84532";
const BASESCAN_API = `https://api.etherscan.io/v2/api?chainid=${CHAIN_ID}`;

const API_KEY = process.env.BASESCAN_API_KEY ?? "";

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
    // Fetch normal transactions
    const txRes = await fetch(
      `${BASESCAN_API}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${API_KEY}`
    );
    const txData = await txRes.json();
    const txList: { timeStamp: string; to: string | null }[] =
      txData.status === "1" ? txData.result : [];

    const txCount = txList.length;
    const ageDays =
      txList.length > 0
        ? Math.floor(
            (Date.now() / 1000 - parseInt(txList[0].timeStamp)) / 86400
          )
        : 0;

    // Unique contracts interacted with
    const uniqueContracts = new Set(
      txList.map((tx) => tx.to?.toLowerCase()).filter(Boolean)
    ).size;

    // Normalize each component to 0–100 then weight
    const txScore = Math.min(100, (txCount / 500) * 100);       // 500 txs = max
    const ageScore = Math.min(100, (ageDays / 365) * 100);      // 1 year = max
    const contractScore = Math.min(100, (uniqueContracts / 50) * 100); // 50 contracts = max

    const score = Math.round(txScore * 0.4 + ageScore * 0.3 + contractScore * 0.3);

    return Response.json(
      { address, score, txCount, ageDays, uniqueContracts, grade: grade(score) },
      { headers: { "Cache-Control": "public, max-age=3600" } }
    );
  } catch {
    return Response.json({ error: "Failed to fetch activity" }, { status: 502 });
  }
}
