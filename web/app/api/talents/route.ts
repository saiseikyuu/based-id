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

// GET /api/talents?skills=designer,writer&rank=2&reputation=100&region=Philippines&availability=available
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const skillsParam   = searchParams.get("skills");
  const minRank       = parseInt(searchParams.get("rank") ?? "0");
  const minReputation = parseInt(searchParams.get("reputation") ?? "0");
  const region        = searchParams.get("region");
  const availability  = searchParams.get("availability");

  const db = createServerClient();

  let profileQuery = db
    .from("hunter_profiles")
    .select("*")
    .neq("availability", "not_looking");

  if (availability && availability !== "all") {
    profileQuery = profileQuery.eq("availability", availability);
  }
  if (region) {
    profileQuery = profileQuery.ilike("region", `%${region}%`);
  }
  if (skillsParam) {
    const skills = skillsParam.split(",").map(s => s.trim()).filter(Boolean);
    if (skills.length) {
      profileQuery = profileQuery.overlaps("skills", skills);
    }
  }

  const { data: profiles, error } = await profileQuery
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!profiles?.length) return Response.json([]);

  const wallets = profiles.map((p: { wallet_address: string }) => p.wallet_address);
  const { data: xpRows } = await db
    .from("hunter_xp")
    .select("wallet_address, total_xp, reputation_score")
    .in("wallet_address", wallets);

  const xpMap = Object.fromEntries(
    (xpRows ?? []).map((r: { wallet_address: string; total_xp: number; reputation_score: number }) => [r.wallet_address, r])
  );

  const results = profiles
    .map((p: { wallet_address: string; skills: string[]; availability: string; region: string | null; portfolio_links: string[] }) => {
      const xp = xpMap[p.wallet_address];
      const rankIdx         = xp ? getRankIdx(xp.total_xp) : 0;
      const reputationScore = xp?.reputation_score ?? 0;
      return { ...p, total_xp: xp?.total_xp ?? 0, rank_idx: rankIdx, reputation_score: reputationScore };
    })
    .filter((p: { rank_idx: number; reputation_score: number }) => p.rank_idx >= minRank && p.reputation_score >= minReputation)
    .sort((a: { reputation_score: number }, b: { reputation_score: number }) => b.reputation_score - a.reputation_score);

  return Response.json(results);
}
