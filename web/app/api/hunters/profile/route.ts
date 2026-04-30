import { createServerClient } from "@/lib/supabase";
import { isAddress } from "viem";

export const runtime = "nodejs";

const VALID_SKILLS = [
  "meme_creator","designer","writer","community_mod","ambassador",
  "developer","qa_tester","translator","video_editor","growth_lead",
];
const VALID_AVAILABILITY = ["available","open_to_offers","not_looking"];

// GET /api/hunters/profile?wallet=0x...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();
  if (!wallet) return Response.json({ error: "wallet required" }, { status: 400 });

  const db = createServerClient();
  const { data } = await db
    .from("hunter_profiles")
    .select("*")
    .eq("wallet_address", wallet)
    .single();

  return Response.json({ profile: data ?? null });
}

// POST /api/hunters/profile — upsert hunter profile
export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      wallet_address?: string;
      skills?: string[];
      availability?: string;
      region?: string;
      timezone?: string;
      portfolio_links?: string[];
    };

    if (!body.wallet_address || !isAddress(body.wallet_address)) {
      return Response.json({ error: "wallet_address required" }, { status: 400 });
    }
    if (body.availability && !VALID_AVAILABILITY.includes(body.availability)) {
      return Response.json({ error: "Invalid availability value" }, { status: 400 });
    }

    const skills = (body.skills ?? []).filter(s => VALID_SKILLS.includes(s));
    const portfolioLinks = (body.portfolio_links ?? [])
      .slice(0, 3)
      .filter(l => l.startsWith("http"));

    const db = createServerClient();
    const { data, error } = await db
      .from("hunter_profiles")
      .upsert({
        wallet_address:  body.wallet_address.toLowerCase(),
        skills,
        availability:    body.availability ?? "not_looking",
        region:          body.region?.trim() ?? null,
        timezone:        body.timezone?.trim() ?? null,
        portfolio_links: portfolioLinks,
        updated_at:      new Date().toISOString(),
      }, { onConflict: "wallet_address" })
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ profile: data });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
