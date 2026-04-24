import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

const BUCKET   = "drop-images";
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED  = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// POST /api/upload — multipart form with a "file" field
// Returns { url: "https://..." }
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;

  if (!file) return Response.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED.includes(file.type)) {
    return Response.json({ error: "Only JPEG, PNG, WebP, or GIF allowed" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ error: "File too large (max 5 MB)" }, { status: 400 });
  }

  const ext  = file.name.split(".").pop() ?? "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const db      = createServerClient();
  const buffer  = Buffer.from(await file.arrayBuffer());

  const { error } = await db.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  return Response.json({ url: data.publicUrl });
}
