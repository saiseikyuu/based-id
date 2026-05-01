import { createServerClient } from "@/lib/supabase";
import { isAddress } from "viem";
import { awardBadges } from "@/lib/badges";

export const runtime = "nodejs";

// POST /api/meme-wars/[id]/settle — settle war, assign ranks, award XP
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as { admin_wallet?: string };

    if (!body.admin_wallet || !isAddress(body.admin_wallet)) {
      return Response.json({ error: "admin_wallet required" }, { status: 400 });
    }

    const db = createServerClient();
    const { data: war } = await db.from("meme_wars").select("*").eq("id", id).single();
    if (!war) return Response.json({ error: "Meme War not found" }, { status: 404 });
    if (war.status === "settled") return Response.json({ error: "Already settled" }, { status: 409 });
    if (new Date(war.ends_at) > new Date()) return Response.json({ error: "War not ended yet" }, { status: 400 });

    const { data: entries } = await db
      .from("meme_entries")
      .select("*")
      .eq("meme_war_id", id)
      .order("vote_count", { ascending: false })
      .limit(3);

    if (!entries?.length) {
      await db.from("meme_wars").update({ status: "cancelled" }).eq("id", id);
      return Response.json({ success: true, status: "cancelled", message: "No entries — war cancelled" });
    }

    // Assign ranks
    for (let i = 0; i < entries.length; i++) {
      await db.from("meme_entries").update({ rank: i + 1 }).eq("id", entries[i].id);
    }

    // Award XP: 1st=100, 2nd=50, 3rd=25
    const xpAwards = [100, 50, 25];
    for (let i = 0; i < entries.length; i++) {
      const wallet = entries[i].hunter_wallet;
      const xp = xpAwards[i] ?? 0;
      if (xp > 0) {
        const { data: xpRow } = await db.from("hunter_xp").select("quest_xp, total_xp").eq("wallet_address", wallet).single();
        if (xpRow) {
          await db.from("hunter_xp").update({
            quest_xp:   xpRow.quest_xp + xp,
            total_xp:   xpRow.total_xp + xp,
            updated_at: new Date().toISOString(),
          }).eq("wallet_address", wallet);
        }
      }
      await awardBadges(wallet, db);
    }

    await db.from("meme_wars").update({
      status:          "settled",
      winner_entry_id: entries[0].id,
    }).eq("id", id);

    return Response.json({
      success: true,
      winners: entries.map((e, i) => ({ rank: i + 1, wallet: e.hunter_wallet, votes: e.vote_count })),
    });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
