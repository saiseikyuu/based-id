import { createServerClient } from "@/lib/supabase";
import { isAddress } from "viem";

export const runtime = "nodejs";

// POST /api/campaigns/[id]/enter
// Body: { wallet_address, completed_tasks: [{ task_id, method }] }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json() as {
    wallet_address: string;
    completed_tasks: Array<{ task_id: string; method: "self_attest" | "onchain" }>;
  };

  if (!isAddress(body.wallet_address)) {
    return Response.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const db  = createServerClient();
  const addr = body.wallet_address.toLowerCase();

  const { data: campaign } = await db
    .from("campaigns")
    .select("*, tasks(*)")
    .eq("id", id)
    .eq("status", "active")
    .single();

  if (!campaign) {
    return Response.json({ error: "Campaign not found or not active" }, { status: 404 });
  }
  if (new Date(campaign.ends_at) < new Date()) {
    return Response.json({ error: "Campaign has ended" }, { status: 400 });
  }

  const { data: existing } = await db
    .from("entries")
    .select("id, status")
    .eq("campaign_id", id)
    .eq("wallet_address", addr)
    .maybeSingle();

  if (existing) {
    if (existing.status === "disqualified") {
      return Response.json({ error: "Your entry was disqualified" }, { status: 403 });
    }
    return Response.json({ error: "Already entered", entry_id: existing.id }, { status: 409 });
  }

  // Check min_reputation_score gate
  const repTask = (campaign.tasks ?? []).find((t: { type: string }) => t.type === "min_reputation_score");
  if (repTask) {
    const minScore = Number((repTask.params as Record<string, unknown>)?.min_score ?? 0);
    if (minScore > 0) {
      const { data: xpRow } = await db
        .from("hunter_xp")
        .select("reputation_score")
        .eq("wallet_address", addr)
        .single();
      const repScore = xpRow?.reputation_score ?? 0;
      if (repScore < minScore) {
        return Response.json({
          error: `Reputation score too low. Required: ${minScore}, yours: ${repScore}`,
          required: minScore,
          current: repScore,
        }, { status: 403 });
      }
    }
  }

  const requiredTaskIds = (campaign.tasks ?? []).map((t: { id: string }) => t.id);
  const completedIds    = (body.completed_tasks ?? []).map((c) => c.task_id);
  const missing         = requiredTaskIds.filter((tid: string) => !completedIds.includes(tid));

  if (missing.length > 0) {
    return Response.json({
      error: "Not all tasks completed",
      missing_task_ids: missing,
    }, { status: 400 });
  }

  const { data: entry, error: entryErr } = await db
    .from("entries")
    .insert({ campaign_id: id, wallet_address: addr, status: "entered" })
    .select()
    .single();

  if (entryErr) return Response.json({ error: entryErr.message }, { status: 500 });

  if (body.completed_tasks?.length) {
    await db.from("task_completions").insert(
      body.completed_tasks.map((c) => ({
        entry_id:    entry.id,
        task_id:     c.task_id,
        method:      c.method,
        verified_at: new Date().toISOString(),
      }))
    );
  }

  return Response.json({ success: true, entry_id: entry.id }, { status: 201 });
}
