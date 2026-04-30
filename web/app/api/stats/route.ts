import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const revalidate = 300;

// GET /api/stats — public platform stats
export async function GET() {
  const db = createServerClient();

  const [
    { count: hunters },
    { count: campaigns },
    { data: xpData },
    { count: rewards_paid },
    { count: projects },
  ] = await Promise.all([
    db.from("hunter_xp").select("*", { count: "exact", head: true }),
    db.from("campaigns").select("*", { count: "exact", head: true })
      .not("status", "eq", "cancelled"),
    db.from("hunter_xp").select("total_xp"),
    db.from("entries").select("*", { count: "exact", head: true })
      .eq("status", "won"),
    db.from("projects").select("*", { count: "exact", head: true }),
  ]);

  const total_xp = (xpData ?? []).reduce((sum, row) => sum + (row.total_xp ?? 0), 0);

  return Response.json({
    hunters:      hunters ?? 0,
    campaigns:    campaigns ?? 0,
    total_xp,
    rewards_paid: rewards_paid ?? 0,
    projects:     projects ?? 0,
  }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}
