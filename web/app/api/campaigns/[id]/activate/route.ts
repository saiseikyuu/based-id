import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

// POST /api/campaigns/[id]/activate — no-op for campaigns (all are free, created active)
// Kept for API compatibility; returns success if campaign exists and belongs to partner
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { partner_address } = await req.json() as { partner_address: string };

  if (!partner_address) {
    return Response.json({ error: "partner_address required" }, { status: 400 });
  }

  const db = createServerClient();

  const { data: campaign, error: campaignErr } = await db
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (campaignErr || !campaign) {
    return Response.json({ error: "Campaign not found" }, { status: 404 });
  }
  if (campaign.partner_address !== partner_address.toLowerCase()) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  return Response.json({ success: true, message: "Campaign is already active" });
}
