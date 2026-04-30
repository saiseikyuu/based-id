import { createServerClient } from "@/lib/supabase";
import { isAddress } from "viem";

export const runtime = "nodejs";

// POST /api/squads/[id]/leave
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

    const { data: member } = await db
      .from("squad_members").select("role").eq("squad_id", id).eq("wallet_address", wallet).single();
    if (!member) return Response.json({ error: "Not a member of this squad" }, { status: 404 });
    if (member.role === "owner") {
      return Response.json({ error: "Owner cannot leave — transfer ownership or disband first" }, { status: 400 });
    }

    await db.from("squad_members").delete().eq("squad_id", id).eq("wallet_address", wallet);

    const { data: squad } = await db.from("squads").select("member_count").eq("id", id).single();
    if (squad) {
      await db.from("squads").update({ member_count: Math.max(0, squad.member_count - 1) }).eq("id", id);
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
