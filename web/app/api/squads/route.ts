import { createServerClient } from "@/lib/supabase";
import { isAddress } from "viem";
import { awardBadges } from "@/lib/badges";

export const runtime = "nodejs";

// GET /api/squads?region=
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region");
  const db = createServerClient();

  let query = db.from("squads").select("*").order("total_xp", { ascending: false });
  if (region) query = query.ilike("region", `%${region}%`);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

// POST /api/squads — create a squad
export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      wallet_address?: string;
      name?: string;
      description?: string;
      region?: string;
      type?: string;
      logo_url?: string;
    };

    if (!body.wallet_address || !isAddress(body.wallet_address)) {
      return Response.json({ error: "wallet_address required" }, { status: 400 });
    }
    if (!body.name?.trim()) {
      return Response.json({ error: "name required" }, { status: 400 });
    }

    const VALID_TYPES = ["general", "regional", "skill", "project"];
    const squadType = VALID_TYPES.includes(body.type ?? "") ? body.type! : "general";
    const slug = body.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const wallet = body.wallet_address.toLowerCase();

    const db = createServerClient();

    const { data: existing } = await db
      .from("squad_members").select("squad_id").eq("wallet_address", wallet).maybeSingle();
    if (existing) return Response.json({ error: "Already in a squad — leave first" }, { status: 409 });

    const { data: squad, error: squadErr } = await db
      .from("squads")
      .insert({
        name:         body.name.trim(),
        slug,
        description:  body.description?.trim() ?? null,
        region:       body.region?.trim() ?? null,
        type:         squadType,
        logo_url:     body.logo_url ?? null,
        owner_wallet: wallet,
        member_count: 1,
      })
      .select()
      .single();

    if (squadErr) {
      if (squadErr.code === "23505") return Response.json({ error: "Squad name already taken" }, { status: 409 });
      return Response.json({ error: squadErr.message }, { status: 500 });
    }

    await db.from("squad_members").insert({
      squad_id: squad.id, wallet_address: wallet, role: "owner",
    });

    await awardBadges(wallet, db);

    return Response.json({ squad }, { status: 201 });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
