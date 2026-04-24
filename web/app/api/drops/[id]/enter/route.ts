import { createServerClient } from "@/lib/supabase";
import { isAddress } from "viem";

export const runtime = "nodejs";

// POST /api/drops/[id]/enter
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

  // Check drop is active
  const { data: drop } = await db
    .from("drops")
    .select("*, tasks(*)")
    .eq("id", id)
    .eq("status", "active")
    .single();

  if (!drop) {
    return Response.json({ error: "Drop not found or not active" }, { status: 404 });
  }
  if (new Date(drop.ends_at) < new Date()) {
    return Response.json({ error: "Drop has ended" }, { status: 400 });
  }

  // Check not already entered
  const { data: existing } = await db
    .from("entries")
    .select("id, status")
    .eq("drop_id", id)
    .eq("wallet_address", addr)
    .maybeSingle();

  if (existing) {
    if (existing.status === "disqualified") {
      return Response.json({ error: "Your entry was disqualified" }, { status: 403 });
    }
    return Response.json({ error: "Already entered", entry_id: existing.id }, { status: 409 });
  }

  // Verify all required tasks are completed
  const requiredTaskIds = (drop.tasks ?? []).map((t: { id: string }) => t.id);
  const completedIds    = (body.completed_tasks ?? []).map((c) => c.task_id);
  const missing         = requiredTaskIds.filter((tid: string) => !completedIds.includes(tid));

  if (missing.length > 0) {
    return Response.json({
      error: "Not all tasks completed",
      missing_task_ids: missing,
    }, { status: 400 });
  }

  // Create entry
  const { data: entry, error: entryErr } = await db
    .from("entries")
    .insert({ drop_id: id, wallet_address: addr, status: "entered" })
    .select()
    .single();

  if (entryErr) return Response.json({ error: entryErr.message }, { status: 500 });

  // Record task completions
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
