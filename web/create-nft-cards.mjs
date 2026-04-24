import sharp from "sharp";

function makeNftSvg(idStr, isAuction, holderStr = "0x0000...0000") {
  const numGradient = isAuction
    ? `<linearGradient id="ng" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#fde68a"/><stop offset="100%" style="stop-color:#d97706"/></linearGradient>`
    : `<linearGradient id="ng" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#93c5fd"/><stop offset="100%" style="stop-color:#1d4ed8"/></linearGradient>`;

  const borderColor    = isAuction ? "#d97706" : "#2563eb";
  const accentColor    = isAuction ? "#f59e0b" : "#3b82f6";
  const bracketColor   = isAuction ? "#d97706" : "#3b82f6";
  const squareColor    = isAuction ? "#f59e0b" : "#2563eb";
  // Tier logic matches contract exactly
  const id = parseInt(idStr);
  const badgeFill      = isAuction ? "rgba(120,53,15,0.85)" : "rgba(30,58,138,0.85)";
  const badgeStroke    = isAuction ? "#d97706" : "#2563eb";
  const badgeText      = id <= 100 ? "GENESIS" : id <= 1000 ? "FOUNDING" : id <= 10000 ? "PIONEER" : "BUILDER";
  const badgeTextColor = isAuction ? "#fde68a" : "#93c5fd";

  const digits   = idStr.length;
  const fontSize = digits <= 2 ? "120" : digits <= 3 ? "100" : digits <= 4 ? "82" : "64";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="480" height="270">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#060818"/>
      <stop offset="60%" style="stop-color:#080d22"/>
      <stop offset="100%" style="stop-color:#0a1030"/>
    </linearGradient>
    ${numGradient}
    <pattern id="dots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="0.9" fill="${accentColor}" fill-opacity="0.09"/>
    </pattern>
    <clipPath id="c"><rect width="480" height="270" rx="16"/></clipPath>
  </defs>

  <rect width="480" height="270" rx="16" fill="url(#bg)"/>
  <rect width="480" height="270" rx="16" fill="url(#dots)"/>

  <text x="240" y="195" text-anchor="middle"
    font-family="monospace,Courier New" font-size="72" font-weight="900"
    fill="${accentColor}" fill-opacity="0.055" letter-spacing="0.04em">BASED ID</text>

  <polygon points="300,0 480,0 480,120 100,270 0,270 0,150"
    fill="white" fill-opacity="0.015" clip-path="url(#c)"/>

  <rect width="480" height="270" rx="16" fill="none" stroke="${borderColor}" stroke-width="1.5" stroke-opacity="0.45"/>
  <line x1="40" y1="0" x2="440" y2="0" stroke="${accentColor}" stroke-width="2.5" stroke-opacity="0.75" clip-path="url(#c)"/>

  <path d="M16,42 L16,16 L42,16" fill="none" stroke="${bracketColor}" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
  <path d="M438,16 L464,16 L464,42" fill="none" stroke="${bracketColor}" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
  <path d="M16,228 L16,254 L42,254" fill="none" stroke="${bracketColor}" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
  <path d="M438,254 L464,254 L464,228" fill="none" stroke="${bracketColor}" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>

  <text x="28" y="185"
    font-family="monospace,Courier New"
    font-size="${fontSize}"
    font-weight="900"
    fill="url(#ng)"
    letter-spacing="-0.02em">#${idStr}</text>

  <rect x="30" y="28" width="13" height="13" rx="2.5" fill="${squareColor}"/>
  <text x="50" y="40" font-family="monospace,Courier New" font-size="12" font-weight="700" fill="#e2e8f0" letter-spacing="0.07em">Based ID</text>

  <rect x="384" y="21" width="72" height="22" rx="11" fill="${badgeFill}" fill-opacity="0.9"/>
  <rect x="384" y="21" width="72" height="22" rx="11" fill="none" stroke="${badgeStroke}" stroke-width="0.75" stroke-opacity="0.55"/>
  <text x="420" y="36" font-family="monospace,Courier New" font-size="9.5" font-weight="700" fill="${badgeTextColor}" text-anchor="middle" letter-spacing="0.1em">${badgeText}</text>

  <text x="28" y="232" font-family="monospace,Courier New" font-size="8.5" fill="#334155" letter-spacing="0.14em">HOLDER</text>
  <text x="28" y="250" font-family="monospace,Courier New" font-size="10.5" fill="#475569" letter-spacing="0.025em">${holderStr}</text>
</svg>`;
}

// Genesis #1 — gold (2x resolution for sharpness)
await sharp(Buffer.from(makeNftSvg("1", true)))
  .resize(960, 540)
  .png()
  .toFile("public/nft-card-genesis-1.png");

// Public #101 — blue
await sharp(Buffer.from(makeNftSvg("101", false)))
  .resize(960, 540)
  .png()
  .toFile("public/nft-card-public-101.png");

// Both cards side by side on dark bg — good for tweet 2
const card1Uri   = "data:image/svg+xml;base64," + Buffer.from(makeNftSvg("1", true)).toString("base64");
const card101Uri = "data:image/svg+xml;base64," + Buffer.from(makeNftSvg("101", false)).toString("base64");

const sideBySide = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="400">
  <defs>
    <filter id="s1"><feDropShadow dx="0" dy="8" stdDeviation="18" flood-color="#d97706" flood-opacity="0.3"/></filter>
    <filter id="s2"><feDropShadow dx="0" dy="8" stdDeviation="18" flood-color="#2563eb" flood-opacity="0.25"/></filter>
  </defs>
  <rect width="1080" height="400" fill="#060818"/>
  <!-- Genesis card left -->
  <g transform="translate(30, 50) scale(0.62)" filter="url(#s1)">
    <image href="${card1Uri}" width="480" height="270"/>
  </g>
  <!-- Public card right -->
  <g transform="translate(560, 50) scale(0.62)" filter="url(#s2)">
    <image href="${card101Uri}" width="480" height="270"/>
  </g>
  <!-- Labels -->
  <text x="178" y="368" font-family="monospace,Courier New" font-size="12" fill="#d97706" text-anchor="middle" letter-spacing="0.15em">GENESIS — AUCTION ONLY</text>
  <text x="857" y="368" font-family="monospace,Courier New" font-size="12" fill="#2563eb" text-anchor="middle" letter-spacing="0.15em">PUBLIC — $2 USDC</text>
</svg>`;

await sharp(Buffer.from(sideBySide))
  .resize(1080, 400)
  .png()
  .toFile("public/nft-cards-preview.png");

console.log("Done — nft-card-genesis-1.png, nft-card-public-101.png, nft-cards-preview.png saved to web/public/");
