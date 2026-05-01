import { createServerClient } from "@/lib/supabase";
import { isAddress } from "viem";

export const runtime = "nodejs";

// POST /api/meme-wars/[id]/submit — submit a meme entry
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as {
      hunter_wallet?: string;
      media_url?: string;
      caption?: string;
    };

    if (!body.hunter_wallet || !isAddress(body.hunter_wallet)) {
      return Response.json({ error: "hunter_wallet required" }, { status: 400 });
    }
    if (!body.media_url?.startsWith("http")) {
      return Response.json({ error: "media_url required (must be a URL)" }, { status: 400 });
    }

    const wallet = body.hunter_wallet.toLowerCase();
    const db = createServerClient();

    const { data: war } = await db.from("meme_wars").select("id, status, ends_at").eq("id", id).single();
    if (!war) return Response.json({ error: "Meme War not found" }, { status: 404 });
    if (war.status !== "active") return Response.json({ error: "War is not active" }, { status: 400 });
    if (new Date(war.ends_at) <= new Date()) return Response.json({ error: "War has ended" }, { status: 400 });

    const { data: existing } = await db
      .from("meme_entries").select("id").eq("meme_war_id", id).eq("hunter_wallet", wallet).maybeSingle();
    if (existing) return Response.json({ error: "Already submitted to this war" }, { status: 409 });

    const { count } = await db
      .from("meme_entries").select("*", { count: "exact", head: true }).eq("meme_war_id", id);
    const on_chain_id = (count ?? 0) + 1;

    const { data: entry, error } = await db
      .from("meme_entries")
      .insert({
        meme_war_id:   id,
        on_chain_id,
        hunter_wallet: wallet,
        media_url:     body.media_url,
        caption:       body.caption?.trim() ?? null,
      })
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Award +10 XP for submission
    const { data: xpRow } = await db.from("hunter_xp").select("quest_xp, total_xp").eq("wallet_address", wallet).single();
    if (xpRow) {
      await db.from("hunter_xp").update({
        quest_xp:   xpRow.quest_xp + 10,
        total_xp:   xpRow.total_xp + 10,
        updated_at: new Date().toISOString(),
      }).eq("wallet_address", wallet);
    }

    return Response.json({ entry }, { status: 201 });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
