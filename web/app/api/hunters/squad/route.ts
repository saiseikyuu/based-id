import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

// GET /api/hunters/squad?wallet=0x...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();
  if (!wallet) return Response.json({ error: "wallet required" }, { status: 400 });

  const db = createServerClient();

  const { data: member } = await db
    .from("squad_members")
    .select("*")
    .eq("wallet_address", wallet)
    .maybeSingle();

  if (!member) return Response.json({ squad: null, member: null });

  const { data: squad } = await db
    .from("squads")
    .select("*")
    .eq("id", member.squad_id)
    .single();

  return Response.json({ squad: squad ?? null, member });
}
