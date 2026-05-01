import { createServerClient } from "@/lib/supabase";
import { isAddress } from "viem";

export const runtime = "nodejs";

// GET /api/projects/[address]/shortlist
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const db = createServerClient();

  const { data, error } = await db
    .from("project_shortlists")
    .select("*")
    .eq("project_address", address.toLowerCase())
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

// POST /api/projects/[address]/shortlist — add or remove a hunter
export async function POST(
  req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const body = await req.json() as {
      project_owner?: string;
      wallet_address?: string;
      note?: string;
      remove?: boolean;
    };

    if (!body.project_owner || !isAddress(body.project_owner)) {
      return Response.json({ error: "project_owner required" }, { status: 400 });
    }
    if (body.project_owner.toLowerCase() !== address.toLowerCase()) {
      return Response.json({ error: "Not authorized" }, { status: 403 });
    }
    if (!body.wallet_address || !isAddress(body.wallet_address)) {
      return Response.json({ error: "wallet_address required" }, { status: 400 });
    }

    const db = createServerClient();

    if (body.remove) {
      await db.from("project_shortlists")
        .delete()
        .eq("project_address", address.toLowerCase())
        .eq("wallet_address", body.wallet_address.toLowerCase());
      return Response.json({ success: true, action: "removed" });
    }

    const { error } = await db.from("project_shortlists").upsert({
      project_address: address.toLowerCase(),
      wallet_address:  body.wallet_address.toLowerCase(),
      note:            body.note?.trim() ?? null,
    }, { onConflict: "project_address,wallet_address" });

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true, action: "added" });
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
