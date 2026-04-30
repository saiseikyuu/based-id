import { createServerClient } from "@/lib/supabase";
import { isAddress } from "viem";
import { awardBadges } from "@/lib/badges";

export const runtime = "nodejs";

// POST /api/hunters/badges/check — trigger badge check for a wallet
export async function POST(req: Request) {
  try {
    const { wallet_address } = await req.json() as { wallet_address?: string };
    if (!wallet_address || !isAddress(wallet_address)) {
      return Response.json({ error: "wallet_address required" }, { status: 400 });
    }
    const db = createServerClient();
    const earned = await awardBadges(wallet_address, db);
    return Response.json({ earned });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
