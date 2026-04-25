import { createServerClient } from "@/lib/supabase";
import { isAddress } from "viem";

export const runtime = "nodejs";

// GET /api/drops/[id]/entries?partner=0x...
// Returns full entrant list for drop owner only
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const partner = searchParams.get("partner");

  if (!partner || !isAddress(partner)) {
    return Response.json({ error: "partner address required" }, { status: 400 });
  }

  const db = createServerClient();

  const { data: drop } = await db
    .from("drops").select("partner_address, title").eq("id", id).single();

  if (!drop) return Response.json({ error: "Not found" }, { status: 404 });
  if (drop.partner_address !== partner.toLowerCase()) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { data: entries, error } = await db
    .from("entries")
    .select("id, wallet_address, status, created_at")
    .eq("drop_id", id)
    .order("created_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(entries ?? [], { headers: { "Cache-Control": "no-store" } });
}
