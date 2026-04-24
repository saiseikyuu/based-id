import { createServerClient } from "@/lib/supabase";
import { randomInt } from "crypto";

export const runtime = "nodejs";

// POST /api/drops/[id]/draw — partner draws winners (after end time)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { partner_address } = await req.json() as { partner_address: string };

  const db = createServerClient();

  const { data: drop } = await db
    .from("drops")
    .select("*")
    .eq("id", id)
    .single();

  if (!drop) return Response.json({ error: "Drop not found" }, { status: 404 });
  if (drop.partner_address !== partner_address?.toLowerCase()) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (drop.status !== "active" && drop.status !== "ended") {
    return Response.json({ error: `Cannot draw from a drop with status: ${drop.status}` }, { status: 400 });
  }
  if (new Date(drop.ends_at) > new Date()) {
    return Response.json({ error: "Drop has not ended yet" }, { status: 400 });
  }

  // Get all valid entries
  const { data: entries } = await db
    .from("entries")
    .select("id, wallet_address")
    .eq("drop_id", id)
    .eq("status", "entered");

  if (!entries?.length) {
    return Response.json({ error: "No eligible entries to draw from" }, { status: 400 });
  }

  const pool       = [...entries];
  const winnerCount = Math.min(drop.winner_count, pool.length);

  // Fisher-Yates shuffle with crypto.randomInt for fairness
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const winners    = pool.slice(0, winnerCount);
  const losers     = pool.slice(winnerCount);
  const winnerAddresses = winners.map((e) => e.wallet_address);

  // Update entry statuses in parallel
  await Promise.all([
    winners.length && db.from("entries")
      .update({ status: "won" })
      .in("id", winners.map((e) => e.id)),
    losers.length && db.from("entries")
      .update({ status: "lost" })
      .in("id", losers.map((e) => e.id)),
  ]);

  // Update drop: mark drawn + store winners
  await db.from("drops").update({
    status:  "drawn",
    winners: winnerAddresses,
  }).eq("id", id);

  return Response.json({
    success: true,
    winner_count: winnerCount,
    winners: winnerAddresses,
    total_entries: entries.length,
  });
}
