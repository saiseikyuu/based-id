import { createServerClient } from "@/lib/supabase";
import { createPublicClient, http, parseUnits, parseAbiItem } from "viem";
import { base, baseSepolia } from "viem/chains";

export const runtime = "nodejs";

const isMainnet = process.env.NEXT_PUBLIC_CHAIN_ID === "8453";
const chain     = isMainnet ? base : baseSepolia;
const rpcUrl    = isMainnet ? "https://mainnet.base.org" : "https://sepolia.base.org";
const TREASURY  = (process.env.TREASURY_ADDRESS ?? "0x0CC1984533619f37A82052af1f05997f9d44Ec02").toLowerCase();
const USDC      = isMainnet
  ? "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  : "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { tx_hash, partner_address } = await req.json() as {
    tx_hash: string;
    partner_address: string;
  };

  if (!tx_hash || !partner_address) {
    return Response.json({ error: "tx_hash and partner_address required" }, { status: 400 });
  }

  const db = createServerClient();

  // Load the drop
  const { data: drop, error: dropErr } = await db
    .from("drops")
    .select("*")
    .eq("id", id)
    .eq("status", "pending_payment")
    .single();

  if (dropErr || !drop) {
    return Response.json({ error: "Drop not found or already activated" }, { status: 404 });
  }
  if (drop.partner_address !== partner_address.toLowerCase()) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Verify tx onchain
  try {
    const client = createPublicClient({ chain, transport: http(rpcUrl) });
    const receipt = await client.getTransactionReceipt({ hash: tx_hash as `0x${string}` });

    if (receipt.status !== "success") {
      return Response.json({ error: "Transaction failed" }, { status: 400 });
    }

    // Check a USDC Transfer event: from=partner, to=treasury, value >= fee
    const expectedAmount = parseUnits(String(drop.fee_amount_usdc), 6);
    const logs = await client.getLogs({
      address:   USDC as `0x${string}`,
      event:     parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)"),
      args:      { from: partner_address as `0x${string}`, to: TREASURY as `0x${string}` },
      blockHash: receipt.blockHash,
    });

    const valid = logs.some((l) => {
      const val = l.args.value as bigint | undefined;
      return val !== undefined && val >= expectedAmount;
    });

    if (!valid) {
      return Response.json({
        error: `No matching USDC transfer of ${drop.fee_amount_usdc} USDC found in this tx`,
      }, { status: 400 });
    }
  } catch {
    return Response.json({ error: "Could not verify transaction onchain" }, { status: 502 });
  }

  // Activate the drop
  const { error: updateErr } = await db
    .from("drops")
    .update({ status: "active", fee_paid_tx: tx_hash })
    .eq("id", id);

  if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 });

  return Response.json({ success: true, message: "Drop is now active" });
}
