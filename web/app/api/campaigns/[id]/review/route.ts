import { createServerClient } from "@/lib/supabase";
import { isAddress } from "viem";

export const runtime = "nodejs";

// POST /api/campaigns/[id]/review — project owner approves or rejects a bounty submission
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as {
      reviewer_address?: string;
      submission_id?: string;
      action?: "approve" | "reject";
      reviewer_notes?: string;
      xp_awarded?: number;
    };

    if (!body.reviewer_address || !isAddress(body.reviewer_address)) {
      return Response.json({ error: "reviewer_address required" }, { status: 400 });
    }
    if (!body.submission_id) {
      return Response.json({ error: "submission_id required" }, { status: 400 });
    }
    if (!body.action || !["approve", "reject"].includes(body.action)) {
      return Response.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
    }

    const db = createServerClient();

    const { data: campaign } = await db
      .from("campaigns")
      .select("id, partner_address, xp_reward")
      .eq("id", id)
      .single();

    if (!campaign) return Response.json({ error: "Campaign not found" }, { status: 404 });
    if (campaign.partner_address.toLowerCase() !== body.reviewer_address.toLowerCase()) {
      return Response.json({ error: "Not authorized" }, { status: 403 });
    }

    const { data: submission } = await db
      .from("bounty_submissions")
      .select("id, wallet_address, status")
      .eq("id", body.submission_id)
      .eq("campaign_id", id)
      .single();

    if (!submission) return Response.json({ error: "Submission not found" }, { status: 404 });
    if (submission.status !== "pending") {
      return Response.json({ error: "Submission already reviewed" }, { status: 409 });
    }

    const xpToAward = body.action === "approve"
      ? (body.xp_awarded ?? campaign.xp_reward ?? 0)
      : 0;

    const { error: updateErr } = await db
      .from("bounty_submissions")
      .update({
        status:         body.action === "approve" ? "approved" : "rejected",
        reviewer_notes: body.reviewer_notes ?? null,
        xp_awarded:     xpToAward,
      })
      .eq("id", body.submission_id);

    if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 });

    if (body.action === "approve" && xpToAward > 0) {
      const wallet = submission.wallet_address;
      const { data: xpRow } = await db
        .from("hunter_xp")
        .select("quest_xp, total_xp")
        .eq("wallet_address", wallet)
        .single();

      if (xpRow) {
        await db.from("hunter_xp").update({
          quest_xp:   (xpRow.quest_xp ?? 0) + xpToAward,
          total_xp:   (xpRow.total_xp ?? 0) + xpToAward,
          updated_at: new Date().toISOString(),
        }).eq("wallet_address", wallet);
      }
    }

    return Response.json({ success: true, action: body.action, xp_awarded: xpToAward });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
