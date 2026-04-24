import { createServerClient, type DropType, type DropTier } from "@/lib/supabase";
import { isAddress } from "viem";

export const runtime = "nodejs";

// GET /api/drops — list active + upcoming drops (optionally filter by partner)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const partner = searchParams.get("partner");
  const tier    = searchParams.get("tier") as DropTier | null;

  const db = createServerClient();

  let query = db
    .from("drops")
    .select("*, tasks(*)")
    .order("tier",       { ascending: false }) // featured first
    .order("created_at", { ascending: false });

  if (partner) {
    // Partner viewing their own drops (all statuses)
    query = query.eq("partner_address", partner.toLowerCase());
  } else {
    // Public view: only active drops
    query = query.eq("status", "active");
  }

  if (tier) query = query.eq("tier", tier);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? [], { headers: { "Cache-Control": "no-store" } });
}

// POST /api/drops — create a new drop (status: pending_payment)
export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      partner_address: string;
      title: string;
      description?: string;
      image_url?: string;
      type: DropType;
      tier: DropTier;
      prize_details?: Record<string, unknown>;
      winner_count?: number;
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

    // Insert drop
    const feeAmount = body.tier === "featured" ? 200 : 0;
    const { data: drop, error: dropErr } = await db
      .from("drops")
      .insert({
        partner_address: body.partner_address.toLowerCase(),
        title:           body.title.trim(),
        description:     body.description?.trim() ?? "",
        image_url:       body.image_url ?? null,
        type:            body.type,
        tier:            body.tier,
        fee_amount_usdc: feeAmount,
        prize_details:   body.prize_details ?? {},
        winner_count:    body.winner_count ?? 1,
        starts_at:       body.starts_at,
        ends_at:         body.ends_at,
        status:          "pending_payment",
      })
      .select()
      .single();

    if (dropErr) return Response.json({ error: dropErr.message }, { status: 500 });

    // Insert tasks
    if (body.tasks?.length) {
      const { error: taskErr } = await db.from("tasks").insert(
        body.tasks.map((t) => ({
          drop_id: drop.id,
          type:    t.type,
          params:  t.params,
        }))
      );
      if (taskErr) return Response.json({ error: taskErr.message }, { status: 500 });
    }

    return Response.json({
      drop,
      payment: {
        amount_usdc:     feeAmount,
        treasury_address: process.env.TREASURY_ADDRESS ?? "0x0CC1984533619f37A82052af1f05997f9d44Ec02",
        instructions:    `Send exactly ${feeAmount} USDC on Base to the treasury address, then call POST /api/drops/${drop.id}/activate with your tx hash.`,
      },
    }, { status: 201 });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
