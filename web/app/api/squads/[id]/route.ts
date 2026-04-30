import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

// GET /api/squads/[id] — squad detail with members
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = createServerClient();

  const [{ data: squad }, { data: members }] = await Promise.all([
    db.from("squads").select("*").eq("id", id).single(),
    db.from("squad_members").select("*").eq("squad_id", id).order("contribution_xp", { ascending: false }),
  ]);

  if (!squad) return Response.json({ error: "Squad not found" }, { status: 404 });
  return Response.json({ squad, members: members ?? [] });
}
