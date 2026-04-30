import { createServerClient } from "@/lib/supabase";
import { isAddress } from "viem";

export const runtime = "nodejs";

// POST /api/squads/[id]/join
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { wallet_address } = await req.json() as { wallet_address?: string };

    if (!wallet_address || !isAddress(wallet_address)) {
      return Response.json({ error: "wallet_address required" }, { status: 400 });
    }

    const wallet = wallet_address.toLowerCase();
    const db = createServerClient();

    const { data: squad } = await db.from("squads").select("id, member_count").eq("id", id).single();
    if (!squad) return Response.json({ error: "Squad not found" }, { status: 404 });

    const { data: existing } = await db
      .from("squad_members").select("squad_id").eq("wallet_address", wallet).maybeSingle();
    if (existing) return Response.json({ error: "Already in a squad — leave first" }, { status: 409 });

    const { error } = await db.from("squad_members").insert({
      squad_id: id, wallet_address: wallet, role: "member",
    });
    if (error) return Response.json({ error: error.message }, { status: 500 });

    await db.from("squads").update({ member_count: squad.member_count + 1 }).eq("id", id);

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
