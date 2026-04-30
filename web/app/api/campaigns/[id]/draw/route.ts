import { createServerClient } from "@/lib/supabase";
import { randomInt } from "crypto";
import { Resend } from "resend";

export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://basedid.space";
const resend   = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// POST /api/campaigns/[id]/draw — partner draws winners (after end time)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { partner_address } = await req.json() as { partner_address: string };

  const db = createServerClient();

  const { data: campaign } = await db
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (!campaign) return Response.json({ error: "Campaign not found" }, { status: 404 });
  if (campaign.partner_address !== partner_address?.toLowerCase()) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (campaign.status !== "active" && campaign.status !== "ended") {
    return Response.json({ error: `Cannot draw from a campaign with status: ${campaign.status}` }, { status: 400 });
  }
  if (new Date(campaign.ends_at) > new Date()) {
    return Response.json({ error: "Campaign has not ended yet" }, { status: 400 });
  }

  const { data: entries } = await db
    .from("entries")
    .select("id, wallet_address")
    .eq("campaign_id", id)
    .eq("status", "entered");

  if (!entries?.length) {
    return Response.json({ error: "No eligible entries to draw from" }, { status: 400 });
  }

  const pool        = [...entries];
  const winnerCount = Math.min(campaign.winner_count, pool.length);

  for (let i = pool.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const winners         = pool.slice(0, winnerCount);
  const losers          = pool.slice(winnerCount);
  const winnerAddresses = winners.map((e) => e.wallet_address);

  await Promise.all([
    winners.length && db.from("entries").update({ status: "won"  }).in("id", winners.map((e) => e.id)),
    losers.length  && db.from("entries").update({ status: "lost" }).in("id", losers.map((e) => e.id)),
  ]);

  await db.from("campaigns").update({ status: "drawn", winners: winnerAddresses }).eq("id", id);

  if (resend) {
    const { data: project } = await db
      .from("projects")
      .select("email, name")
      .eq("address", partner_address.toLowerCase())
      .single();

    const campaignUrl = `${SITE_URL}/campaigns/${id}`;

    if (project?.email) {
      resend.emails.send({
        from:    "Based ID <noreply@basedid.space>",
        to:      project.email,
        subject: `Winners drawn — ${campaign.title}`,
        html:    `
<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#0a0a0a;color:#e5e5e5;">
  <div style="margin-bottom:24px;">
    <span style="background:#1e3a8a;color:#93c5fd;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Based ID Campaigns</span>
  </div>
  <h1 style="font-size:28px;font-weight:900;color:#fff;margin:0 0 8px;">Winners drawn 🎉</h1>
  <p style="color:#71717a;margin:0 0 24px;font-size:15px;">${campaign.title}</p>

  <div style="background:#111;border:1px solid #222;border-radius:12px;padding:20px;margin-bottom:24px;">
    <p style="color:#52525b;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 12px;">
      ${winnerCount} winner${winnerCount !== 1 ? "s" : ""} out of ${entries.length} entr${entries.length !== 1 ? "ies" : "y"}
    </p>
    ${winnerAddresses.map((addr) => `
      <div style="padding:10px 0;border-bottom:1px solid #1a1a1a;">
        <code style="color:#4ade80;font-size:13px;">${addr}</code>
      </div>
    `).join("")}
  </div>

  <a href="${campaignUrl}" style="display:inline-block;background:#fff;color:#000;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">View campaign →</a>

  <p style="color:#374151;font-size:12px;margin-top:32px;">Based ID · basedid.space</p>
</div>`,
      }).catch(() => {/* ignore email errors */});
    }
  }

  return Response.json({
    success:       true,
    winner_count:  winnerCount,
    winners:       winnerAddresses,
    total_entries: entries.length,
  });
}
