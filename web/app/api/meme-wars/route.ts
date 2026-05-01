import { createServerClient } from "@/lib/supabase";
import { isAddress } from "viem";

export const runtime = "nodejs";

// GET /api/meme-wars?status=active
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "active";
  const db = createServerClient();

  const { data, error } = await db
    .from("meme_wars")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

// POST /api/meme-wars — create war
export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      creator_wallet?: string;
      title?: string;
      theme?: string;
      prize_pool_usdc?: number;
      vote_cost_usdc?: number;
      submission_fee_usdc?: number;
      ends_at?: string;
      contract_war_id?: number;
      contract_address?: string;
    };

    if (!body.creator_wallet || !isAddress(body.creator_wallet)) {
      return Response.json({ error: "creator_wallet required" }, { status: 400 });
    }
    if (!body.title?.trim()) return Response.json({ error: "title required" }, { status: 400 });
    if (!body.prize_pool_usdc || body.prize_pool_usdc <= 0) {
      return Response.json({ error: "prize_pool_usdc required" }, { status: 400 });
    }
    if (!body.ends_at || new Date(body.ends_at) <= new Date()) {
      return Response.json({ error: "ends_at must be in the future" }, { status: 400 });
    }

    const db = createServerClient();
    const { data, error } = await db
      .from("meme_wars")
      .insert({
        creator_wallet:   body.creator_wallet.toLowerCase(),
        title:            body.title.trim(),
        theme:            body.theme?.trim() ?? null,
        prize_pool_usdc:  body.prize_pool_usdc,
        vote_cost_usdc:      body.vote_cost_usdc ?? 0.10,
        submission_fee_usdc: body.submission_fee_usdc ?? 0.50,
        ends_at:          body.ends_at,
        contract_war_id:  body.contract_war_id ?? null,
        contract_address: body.contract_address ?? null,
        status:           "active",
      })
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ meme_war: data }, { status: 201 });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
