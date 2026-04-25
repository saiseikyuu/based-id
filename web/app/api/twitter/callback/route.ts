import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

const SITE_URL     = process.env.NEXT_PUBLIC_SITE_URL ?? "https://basedid.space";
const CLIENT_ID    = process.env.TWITTER_CLIENT_ID    ?? "";
const CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET ?? "";
const REDIRECT_URI = `${SITE_URL}/api/twitter/callback`;

// GET /api/twitter/callback?code=...&state=...
// Exchanges code for token, verifies follow, stores in DB, redirects back.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return Response.redirect(`${SITE_URL}/drops?twitter_error=${error ?? "cancelled"}`);
  }

  // Decode state
  let ctx: { wallet: string; handle: string; dropId: string; taskId: string; verifier: string };
  try {
    ctx = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  } catch {
    return Response.redirect(`${SITE_URL}/drops?twitter_error=invalid_state`);
  }

  const { wallet, handle, dropId, verifier } = ctx;
  const failUrl    = `${SITE_URL}/drops/${dropId}?twitter_error=1`;
  const successUrl = `${SITE_URL}/drops/${dropId}?twitter_ok=${encodeURIComponent(handle)}`;

  // Exchange code for access token
  const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
    method:  "POST",
    headers: {
      "Content-Type":  "application/x-www-form-urlencoded",
      "Authorization": `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type:    "authorization_code",
      code,
      redirect_uri:  REDIRECT_URI,
      code_verifier: verifier,
    }).toString(),
  });

  if (!tokenRes.ok) return Response.redirect(failUrl);
  const { access_token } = await tokenRes.json() as { access_token?: string };
  if (!access_token) return Response.redirect(failUrl);

  // Get authenticated user's Twitter ID
  const meRes = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!meRes.ok) return Response.redirect(failUrl);
  const { data: meData } = await meRes.json() as { data?: { id: string; username: string } };
  if (!meData) return Response.redirect(failUrl);

  // Look up the target account
  const targetRes = await fetch(`https://api.twitter.com/2/users/by/username/${handle}`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!targetRes.ok) return Response.redirect(failUrl);
  const { data: targetData } = await targetRes.json() as { data?: { id: string } };
  if (!targetData) return Response.redirect(failUrl);

  // Check if authenticated user follows the target
  const followRes = await fetch(
    `https://api.twitter.com/2/users/${meData.id}/following?user_fields=id&max_results=1000`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );

  let isFollowing = false;
  if (followRes.ok) {
    const { data: followData } = await followRes.json() as { data?: { id: string }[] };
    isFollowing = (followData ?? []).some((u) => u.id === targetData.id);
  }

  if (!isFollowing) {
    return Response.redirect(`${SITE_URL}/drops/${dropId}?twitter_error=not_following`);
  }

  // Store verified follow in DB
  const db = createServerClient();
  await db.from("twitter_verifications").upsert({
    wallet_address:  wallet.toLowerCase(),
    twitter_handle:  handle,
    twitter_user_id: meData.id,
    verified_at:     new Date().toISOString(),
  }, { onConflict: "wallet_address,twitter_handle" });

  return Response.redirect(successUrl);
}
