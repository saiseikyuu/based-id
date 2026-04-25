import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

// GET /api/twitter/verified?wallet=0x...&handle=basedidofficial
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  const handle = searchParams.get("handle")?.replace(/^@/, "").toLowerCase();

  if (!wallet || !handle) return Response.json({ verified: false });

  const db = createServerClient();
  const { data } = await db
    .from("twitter_verifications")
    .select("id, verified_at")
    .eq("wallet_address", wallet.toLowerCase())
    .eq("twitter_handle", handle)
    .single();

  return Response.json({ verified: !!data, verified_at: data?.verified_at ?? null });
}
