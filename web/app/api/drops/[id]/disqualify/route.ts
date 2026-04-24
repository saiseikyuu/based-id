import { createServerClient } from "@/lib/supabase";
import { isAddress } from "viem";

export const runtime = "nodejs";

// POST /api/drops/[id]/disqualify — partner removes an entry
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { partner_address, wallet_address } = await req.json() as {
    partner_address: string;
    wallet_address: string;
  };

  if (!isAddress(partner_address) || !isAddress(wallet_address)) {
    return Response.json({ error: "Invalid address" }, { status: 400 });
  }

  const db = createServerClient();

  const { data: drop } = await db
    .from("drops")
    .select("partner_address, status")
    .eq("id", id)
    .single();

  if (!drop) return Response.json({ error: "Drop not found" }, { status: 404 });
  if (drop.partner_address !== partner_address.toLowerCase()) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (drop.status === "drawn" || drop.status === "cancelled") {
    return Response.json({ error: "Cannot disqualify after draw" }, { status: 400 });
  }

  const { error } = await db
    .from("entries")
    .update({ status: "disqualified" })
    .eq("drop_id", id)
    .eq("wallet_address", wallet_address.toLowerCase())
    .eq("status", "entered");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}
