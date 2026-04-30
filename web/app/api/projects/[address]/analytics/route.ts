import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

// GET /api/projects/[address]/analytics — per-campaign analytics for the project owner
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const db = createServerClient();

  const { data: campaigns, error } = await db
    .from("campaigns")
    .select("id, title, type, status, xp_reward, winner_count, starts_at, ends_at")
    .eq("partner_address", address.toLowerCase())
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!campaigns?.length) return Response.json({ campaigns: [] });

  const ids = campaigns.map(c => c.id);

  const [
    { data: entries },
    { data: claims },
    { data: bountyData },
  ] = await Promise.all([
    db.from("entries").select("campaign_id, status").in("campaign_id", ids),
    db.from("campaign_claims").select("campaign_id").in("campaign_id", ids),
    db.from("bounty_submissions").select("campaign_id, status").in("campaign_id", ids),
  ]);

  const entryMap: Record<string, { total: number; won: number }> = {};
  for (const e of entries ?? []) {
    if (!entryMap[e.campaign_id]) entryMap[e.campaign_id] = { total: 0, won: 0 };
    entryMap[e.campaign_id].total++;
    if (e.status === "won") entryMap[e.campaign_id].won++;
  }

  const claimMap: Record<string, number> = {};
  for (const c of claims ?? []) {
    claimMap[c.campaign_id] = (claimMap[c.campaign_id] ?? 0) + 1;
  }

  const bountyMap: Record<string, { total: number; approved: number; rejected: number; pending: number }> = {};
  for (const b of bountyData ?? []) {
    if (!bountyMap[b.campaign_id]) bountyMap[b.campaign_id] = { total: 0, approved: 0, rejected: 0, pending: 0 };
    bountyMap[b.campaign_id].total++;
    bountyMap[b.campaign_id][b.status as "approved" | "rejected" | "pending"]++;
  }

  const result = campaigns.map(c => {
    const e = entryMap[c.id] ?? { total: 0, won: 0 };
    const claims_count = claimMap[c.id] ?? 0;
    return {
      id:              c.id,
      title:           c.title,
      type:            c.type,
      status:          c.status,
      entries:         e.total,
      winners:         e.won,
      claims:          claims_count,
      completion_rate: e.total > 0 ? Math.round((claims_count / e.total) * 100) : 0,
      bounty:          bountyMap[c.id] ?? null,
    };
  });

  return Response.json({ campaigns: result });
}
