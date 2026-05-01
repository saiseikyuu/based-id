import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

// GET /api/meme-wars/[id] — war detail + entries sorted by vote_count desc
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = createServerClient();

  const [{ data: war }, { data: entries }] = await Promise.all([
    db.from("meme_wars").select("*").eq("id", id).single(),
    db.from("meme_entries").select("*").eq("meme_war_id", id).order("vote_count", { ascending: false }),
  ]);

  if (!war) return Response.json({ error: "Meme War not found" }, { status: 404 });
  return Response.json({ war, entries: entries ?? [] });
}
