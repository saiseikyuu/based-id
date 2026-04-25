import { randomBytes, createHash } from "crypto";

export const runtime = "nodejs";

const SITE_URL      = process.env.NEXT_PUBLIC_SITE_URL ?? "https://basedid.space";
const CLIENT_ID     = process.env.TWITTER_CLIENT_ID   ?? "";
const REDIRECT_URI  = `${SITE_URL}/api/twitter/callback`;

// GET /api/twitter/auth?wallet=0x...&handle=basedidofficial&drop_id=...
// Starts Twitter OAuth 2.0 PKCE flow to verify a wallet follows a Twitter account.
export async function GET(req: Request) {
  if (!CLIENT_ID) {
    return Response.json({ error: "Twitter OAuth not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const wallet  = searchParams.get("wallet");
  const handle  = searchParams.get("handle")?.replace(/^@/, "").toLowerCase();
  const dropId  = searchParams.get("drop_id") ?? "";
  const taskId  = searchParams.get("task_id") ?? "";

  if (!wallet || !handle) {
    return Response.json({ error: "wallet and handle required" }, { status: 400 });
  }

  // PKCE: generate code_verifier (128 bytes → base64url) and code_challenge (SHA-256)
  const verifier   = randomBytes(96).toString("base64url");
  const challenge  = createHash("sha256").update(verifier).digest("base64url");

  // Encode context in state so we can retrieve it after callback
  const state = Buffer.from(JSON.stringify({ wallet, handle, dropId, taskId, verifier })).toString("base64url");

  const params = new URLSearchParams({
    response_type:         "code",
    client_id:             CLIENT_ID,
    redirect_uri:          REDIRECT_URI,
    scope:                 "tweet.read users.read follows.read",
    state,
    code_challenge:        challenge,
    code_challenge_method: "S256",
  });

  return Response.redirect(`https://twitter.com/i/oauth2/authorize?${params.toString()}`);
}
