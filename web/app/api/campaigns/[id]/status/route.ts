import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }  = await params;
  const wallet  = new URL(req.url).searchParams.get("wallet");
  if (!wallet) return Response.json({ entered: false });

  const db = createServerClient();
  const { data } = await db
    .from("entries")
    .select("id, status")
    .eq("campaign_id", id)
    .eq("wallet_address", wallet.toLowerCase())
    .maybeSingle();

  return Response.json({
    entered: !!data,
    status:  data?.status ?? null,
  }, { headers: { "Cache-Control": "no-store" } });
}
