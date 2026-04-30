import { createServerClient } from "@/lib/supabase";
import { isAddress } from "viem";

export const runtime = "nodejs";

// POST /api/campaigns/[id]/submit — submit a bounty entry
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as {
      wallet_address?: string;
      content_url?: string;
      submission_text?: string;
    };

    if (!body.wallet_address || !isAddress(body.wallet_address)) {
      return Response.json({ error: "wallet_address required" }, { status: 400 });
    }
    if (!body.content_url && !body.submission_text) {
      return Response.json({ error: "content_url or submission_text required" }, { status: 400 });
    }

    const db = createServerClient();

    const { data: campaign } = await db
      .from("campaigns")
      .select("id, type, status")
      .eq("id", id)
      .single();

    if (!campaign) return Response.json({ error: "Campaign not found" }, { status: 404 });
    if (campaign.type !== "bounty") return Response.json({ error: "Not a bounty campaign" }, { status: 400 });
    if (campaign.status !== "active") return Response.json({ error: "Campaign is not active" }, { status: 400 });

    const { data: existing } = await db
      .from("bounty_submissions")
      .select("id")
      .eq("campaign_id", id)
      .eq("wallet_address", body.wallet_address.toLowerCase())
      .single();

    if (existing) return Response.json({ error: "Already submitted to this bounty" }, { status: 409 });

    const { data: submission, error } = await db
      .from("bounty_submissions")
      .insert({
        campaign_id:     id,
        wallet_address:  body.wallet_address.toLowerCase(),
        content_url:     body.content_url ?? null,
        submission_text: body.submission_text ?? null,
        status:          "pending",
      })
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ submission }, { status: 201 });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
