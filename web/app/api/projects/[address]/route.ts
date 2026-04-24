import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const db = createServerClient();
  const { data, error } = await db
    .from("projects")
    .select("*")
    .eq("address", address.toLowerCase())
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data)  return Response.json(null, { status: 404 });
  return Response.json(data);
}
