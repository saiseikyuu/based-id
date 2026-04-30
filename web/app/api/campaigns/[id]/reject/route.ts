import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

const OWNER = (process.env.OWNER_ADDRESS ?? "").toLowerCase();

// POST /api/campaigns/[id]/reject — owner rejects a pending_review campaign
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { owner_address } = await req.json() as { owner_address?: string };

  if (!owner_address || owner_address.toLowerCase() !== OWNER) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServerClient();
  const { error } = await db
    .from("campaigns")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("status", "pending_review");

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
