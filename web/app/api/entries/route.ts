import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

// GET /api/entries?wallet=0x...&won=true|false
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  const won    = searchParams.get("won") === "true";

  if (!wallet) return Response.json([], { status: 400 });

  const db = createServerClient();

  let query = db
    .from("entries")
    .select("id, drop_id, status, created_at, drops(title, image_url, type, ends_at, status)")
    .eq("wallet_address", wallet.toLowerCase())
    .order("created_at", { ascending: false })
    .limit(50);

  if (won) {
    query = query.eq("status", "won");
  } else {
    query = query.in("status", ["entered", "won", "lost"]);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? [], { headers: { "Cache-Control": "no-store" } });
}
