import { createServerClient } from "@/lib/supabase";
import { isAddress } from "viem";

export const runtime = "nodejs";

// POST /api/meme-wars/[id]/vote — record a confirmed on-chain vote
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as {
      voter_wallet?: string;
      entry_id?: string;
      on_chain_id?: number;
      vote_count?: number;
      amount_paid?: number;
      tx_hash?: string;
    };

    if (!body.voter_wallet || !isAddress(body.voter_wallet)) {
      return Response.json({ error: "voter_wallet required" }, { status: 400 });
    }
    if (!body.entry_id) return Response.json({ error: "entry_id required" }, { status: 400 });
    if (!body.vote_count || body.vote_count < 1) {
      return Response.json({ error: "vote_count required" }, { status: 400 });
    }

    const db = createServerClient();

    const { data: entry } = await db
      .from("meme_entries").select("id, vote_count, support_amt")
      .eq("id", body.entry_id).eq("meme_war_id", id).single();
    if (!entry) return Response.json({ error: "Entry not found" }, { status: 404 });

    await db.from("meme_votes").insert({
      entry_id:     body.entry_id,
      voter_wallet: body.voter_wallet.toLowerCase(),
      vote_count:   body.vote_count,
      amount_paid:  body.amount_paid ?? 0,
      tx_hash:      body.tx_hash ?? null,
    });

    await db.from("meme_entries").update({
      vote_count:  entry.vote_count + body.vote_count,
      support_amt: Number(entry.support_amt) + (body.amount_paid ?? 0),
    }).eq("id", body.entry_id);

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
