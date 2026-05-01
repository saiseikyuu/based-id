import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

// GET /api/projects/[address]/analytics/csv?requester=0x...
export async function GET(
  req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const { searchParams } = new URL(req.url);
  const requester = searchParams.get("requester")?.toLowerCase();

  if (requester !== address.toLowerCase()) {
    return new Response("Unauthorized", { status: 403 });
  }

  const db = createServerClient();

  const { data: campaigns } = await db
    .from("campaigns")
    .select("id, title, type, status, xp_reward, starts_at, ends_at")
    .eq("partner_address", address.toLowerCase())
    .order("created_at", { ascending: false });

  if (!campaigns?.length) return new Response("No campaigns found", { status: 404 });

  const ids = campaigns.map(c => c.id);
  const [{ data: entries }, { data: claims }] = await Promise.all([
    db.from("entries").select("campaign_id, status").in("campaign_id", ids),
    db.from("campaign_claims").select("campaign_id").in("campaign_id", ids),
  ]);

  const entryMap: Record<string, { total: number; won: number }> = {};
  for (const e of entries ?? []) {
    if (!entryMap[e.campaign_id]) entryMap[e.campaign_id] = { total: 0, won: 0 };
    entryMap[e.campaign_id].total++;
    if (e.status === "won") entryMap[e.campaign_id].won++;
  }

  const claimMap: Record<string, number> = {};
  for (const c of claims ?? []) claimMap[c.campaign_id] = (claimMap[c.campaign_id] ?? 0) + 1;

  const headers = ["Title", "Type", "Status", "Entries", "Winners", "Claims", "Completion %", "XP Reward", "Starts At", "Ends At"];
  const rows = campaigns.map(c => {
    const e  = entryMap[c.id] ?? { total: 0, won: 0 };
    const cl = claimMap[c.id] ?? 0;
    return [
      `"${c.title.replace(/"/g, '""')}"`,
      c.type,
      c.status,
      e.total,
      e.won,
      cl,
      e.total > 0 ? Math.round((cl / e.total) * 100) : 0,
      c.xp_reward,
      c.starts_at,
      c.ends_at,
    ].join(",");
  });

  const csv      = [headers.join(","), ...rows].join("\n");
  const filename = `based-id-analytics-${address.slice(0, 8)}-${new Date().toISOString().split("T")[0]}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type":        "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
