import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

const RANK_THRESHOLDS = [0, 300, 800, 2000, 5000, 12000, 30000];

function getRankIdx(xp: number): number {
  let r = 0;
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= RANK_THRESHOLDS[i]) { r = i; break; }
  }
  return r;
}

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
    db.from("entries").select("campaign_id, status, wallet_address").in("campaign_id", ids),
    db.from("campaign_claims").select("campaign_id, wallet_address").in("campaign_id", ids),
    db.from("bounty_submissions").select("campaign_id, status").in("campaign_id", ids),
  ]);

  // Fetch XP + reputation for all unique wallets
  const allWallets = [...new Set((entries ?? []).map(e => e.wallet_address))];
  const { data: xpRows } = allWallets.length
    ? await db.from("hunter_xp").select("wallet_address, total_xp, reputation_score").in("wallet_address", allWallets)
    : { data: [] };

  const xpMap = Object.fromEntries((xpRows ?? []).map(r => [r.wallet_address, r]));

  const entryMap: Record<string, { total: number; won: number; wallets: string[] }> = {};
  for (const e of entries ?? []) {
    if (!entryMap[e.campaign_id]) entryMap[e.campaign_id] = { total: 0, won: 0, wallets: [] };
    entryMap[e.campaign_id].total++;
    if (e.status === "won") entryMap[e.campaign_id].won++;
    entryMap[e.campaign_id].wallets.push(e.wallet_address);
  }

  const claimMap: Record<string, number> = {};
  for (const c of claims ?? []) claimMap[c.campaign_id] = (claimMap[c.campaign_id] ?? 0) + 1;

  const bountyMap: Record<string, { total: number; approved: number; rejected: number; pending: number }> = {};
  for (const b of bountyData ?? []) {
    if (!bountyMap[b.campaign_id]) bountyMap[b.campaign_id] = { total: 0, approved: 0, rejected: 0, pending: 0 };
    bountyMap[b.campaign_id].total++;
    bountyMap[b.campaign_id][b.status as "approved" | "rejected" | "pending"]++;
  }

  const result = campaigns.map(c => {
    const e            = entryMap[c.id] ?? { total: 0, won: 0, wallets: [] };
    const claims_count = claimMap[c.id] ?? 0;
    const b            = bountyMap[c.id];

    const walletData     = e.wallets.map(w => xpMap[w]).filter(Boolean);
    const lowRepCount    = walletData.filter(w => (w.reputation_score ?? 0) < 100).length;
    const lowRepPct      = e.total > 0 ? Math.round((lowRepCount / e.total) * 100) : 0;
    const qualifiedCount = walletData.filter(w => getRankIdx(w.total_xp ?? 0) >= 3).length;

    return {
      id:              c.id,
      title:           c.title,
      type:            c.type,
      status:          c.status,
      entries:         e.total,
      winners:         e.won,
      claims:          claims_count,
      completion_rate: e.total > 0 ? Math.round((claims_count / e.total) * 100) : 0,
      low_rep_count:   lowRepCount,
      low_rep_pct:     lowRepPct,
      qualified_count: qualifiedCount,
      qualified_pct:   e.total > 0 ? Math.round((qualifiedCount / e.total) * 100) : 0,
      bounty:          b ?? null,
    };
  });

  return Response.json({ campaigns: result });
}
