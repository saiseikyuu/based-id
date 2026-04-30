import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

// GET /api/hunters/badges?wallet=0x...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();
  if (!wallet) return Response.json({ error: "wallet required" }, { status: 400 });

  const db = createServerClient();
  const { data, error } = await db
    .from("hunter_badges")
    .select("*, badge:badges(*)")
    .eq("wallet_address", wallet)
    .order("earned_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}
