import { createServerClient, type CampaignType, type DropTier } from "@/lib/supabase";
import { isAddress } from "viem";

export const runtime = "nodejs";

// GET /api/campaigns — list active + upcoming campaigns (optionally filter by partner)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const partner   = searchParams.get("partner");
  const tier      = searchParams.get("tier") as DropTier | null;
  const statusAll = searchParams.get("status") === "all";

  const db = createServerClient();

  let query = db
    .from("campaigns")
    .select("*, tasks(*)")
    .order("featured",   { ascending: false })
    .order("tier",       { ascending: false })
    .order("created_at", { ascending: false });

  const statusFilter = searchParams.get("status");

  if (partner) {
    query = query.eq("partner_address", partner.toLowerCase());
  } else if (statusFilter === "pending_review") {
    query = query.eq("status", "pending_review");
  } else if (statusAll) {
    query = query.in("status", ["active", "ended", "drawn"]);
  } else {
    query = query.eq("status", "active");
  }

  if (tier) query = query.eq("tier", tier);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data?.length) return Response.json([], { headers: { "Cache-Control": "no-store" } });

  const ids = data.map((d) => d.id);
  const { data: counts } = await db
    .from("entries")
    .select("campaign_id")
    .in("campaign_id", ids)
    .eq("status", "entered");
  const countMap: Record<string, number> = {};
  for (const row of counts ?? []) countMap[row.campaign_id] = (countMap[row.campaign_id] ?? 0) + 1;
  const enriched = data.map((d) => ({ ...d, entry_count: countMap[d.id] ?? 0 }));
  return Response.json(enriched, { headers: { "Cache-Control": "no-store" } });
}

// POST /api/campaigns — create a new campaign (status: active, free for now)
export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      partner_address: string;
      title: string;
      description?: string;
      image_url?: string;
      campaign_type: CampaignType;
      tier: DropTier;
      prize_details?: Record<string, unknown>;
      winner_count?: number;
      xp_reward?: number;
      starts_at: string;
      ends_at: string;
      tasks?: Array<{ type: string; params: Record<string, unknown> }>;
    };

    if (!isAddress(body.partner_address)) {
      return Response.json({ error: "Invalid partner address" }, { status: 400 });
    }
    if (!body.title?.trim()) {
      return Response.json({ error: "Title is required" }, { status: 400 });
    }
    if (!body.ends_at || new Date(body.ends_at) <= new Date()) {
      return Response.json({ error: "end_date must be in the future" }, { status: 400 });
    }

    const db = createServerClient();

    const { data: campaign, error: campaignErr } = await db
      .from("campaigns")
      .insert({
        partner_address: body.partner_address.toLowerCase(),
        title:           body.title.trim(),
        description:     body.description?.trim() ?? "",
        image_url:       body.image_url ?? null,
        type:            body.campaign_type,
        tier:            body.tier,
        fee_amount_usdc: 0,
        prize_details:   body.prize_details ?? {},
        winner_count:    body.winner_count ?? 1,
        xp_reward:       body.xp_reward ?? 0,
        starts_at:       body.starts_at,
        ends_at:         body.ends_at,
        status:          "active",
      })
      .select()
      .single();

    if (campaignErr) return Response.json({ error: campaignErr.message }, { status: 500 });

    if (body.tasks?.length) {
      const { error: taskErr } = await db.from("tasks").insert(
        body.tasks.map((t) => ({
          campaign_id: campaign.id,
          type:        t.type,
          params:      t.params,
        }))
      );
      if (taskErr) return Response.json({ error: taskErr.message }, { status: 500 });
    }

    return Response.json({ campaign }, { status: 201 });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
