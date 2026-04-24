import { createServerClient } from "@/lib/supabase";
import { isAddress } from "viem";

export const runtime = "nodejs";

// GET /api/projects — list all projects that have at least one active/drawn drop
export async function GET() {
  const db = createServerClient();
  const { data, error } = await db
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

// POST /api/projects — upsert project profile
export async function POST(req: Request) {
  const body = await req.json() as {
    address: string;
    name: string;
    description?: string;
    logo_url?: string;
    banner_url?: string;
    website?: string;
    twitter?: string;
    discord?: string;
  };

  if (!isAddress(body.address)) {
    return Response.json({ error: "Invalid address" }, { status: 400 });
  }
  if (!body.name?.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const db = createServerClient();
  const { data, error } = await db
    .from("projects")
    .upsert({
      address:     body.address.toLowerCase(),
      name:        body.name.trim(),
      description: body.description?.trim() ?? "",
      logo_url:    body.logo_url ?? null,
      banner_url:  body.banner_url ?? null,
      website:     body.website?.trim() ?? null,
      twitter:     body.twitter?.trim() ?? null,
      discord:     body.discord?.trim() ?? null,
      updated_at:  new Date().toISOString(),
    }, { onConflict: "address" })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
