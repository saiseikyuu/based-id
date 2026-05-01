export const runtime = "edge";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://basedid.space";

export async function GET() {
  const frameImageUrl = `${SITE_URL}/api/frame/checkin/image`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="${frameImageUrl}" />
  <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
  <meta property="fc:frame:button:1" content="Check In on Based ID" />
  <meta property="fc:frame:button:1:action" content="link" />
  <meta property="fc:frame:button:1:target" content="${SITE_URL}/hunters" />
  <meta property="og:image" content="${frameImageUrl}" />
  <title>Based ID Daily Check-In</title>
</head>
<body></body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html" } });
}
