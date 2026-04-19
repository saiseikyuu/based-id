import sharp from "sharp";

function makeNftSvg(idStr, isAuction) {
  const numGradient = isAuction
    ? `<linearGradient id="ng" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#fde68a"/><stop offset="100%" style="stop-color:#d97706"/></linearGradient>`
    : `<linearGradient id="ng" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#93c5fd"/><stop offset="100%" style="stop-color:#1d4ed8"/></linearGradient>`;

  const id = parseInt(idStr);
  const borderColor    = isAuction ? "#d97706" : "#2563eb";
  const accentColor    = isAuction ? "#f59e0b" : "#3b82f6";
  const bracketColor   = isAuction ? "#d97706" : "#3b82f6";
  const squareColor    = isAuction ? "#f59e0b" : "#2563eb";
  const badgeFill      = isAuction ? "rgba(120,53,15,0.85)" : "rgba(30,58,138,0.85)";
  const badgeStroke    = isAuction ? "#d97706" : "#2563eb";
  const badgeText      = id <= 100 ? "GENESIS" : id <= 1000 ? "FOUNDING" : id <= 10000 ? "PIONEER" : "BUILDER";
  const badgeTextColor = isAuction ? "#fde68a" : "#93c5fd";
  const holderStr      = "0x0000...0000";
  const digits         = idStr.length;
  const fontSize       = digits <= 2 ? "120" : digits <= 3 ? "100" : digits <= 4 ? "82" : "64";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="480" height="270">
  <defs>
    <linearGradient id="bg${idStr}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#060818"/>
      <stop offset="60%" style="stop-color:#080d22"/>
      <stop offset="100%" style="stop-color:#0a1030"/>
    </linearGradient>
    ${numGradient.replace('id="ng"', `id="ng${idStr}"`)}
    <pattern id="dots${idStr}" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="0.9" fill="${accentColor}" fill-opacity="0.09"/>
    </pattern>
    <clipPath id="c${idStr}"><rect width="480" height="270" rx="16"/></clipPath>
  </defs>
  <rect width="480" height="270" rx="16" fill="url(#bg${idStr})"/>
  <rect width="480" height="270" rx="16" fill="url(#dots${idStr})"/>
  <text x="240" y="195" text-anchor="middle" font-family="monospace,Courier New" font-size="72" font-weight="900" fill="${accentColor}" fill-opacity="0.055" letter-spacing="0.04em">BASED ID</text>
  <polygon points="300,0 480,0 480,120 100,270 0,270 0,150" fill="white" fill-opacity="0.015" clip-path="url(#c${idStr})"/>
  <rect width="480" height="270" rx="16" fill="none" stroke="${borderColor}" stroke-width="1.5" stroke-opacity="0.45"/>
  <line x1="40" y1="0" x2="440" y2="0" stroke="${accentColor}" stroke-width="2.5" stroke-opacity="0.75" clip-path="url(#c${idStr})"/>
  <path d="M16,42 L16,16 L42,16" fill="none" stroke="${bracketColor}" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
  <path d="M438,16 L464,16 L464,42" fill="none" stroke="${bracketColor}" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
  <path d="M16,228 L16,254 L42,254" fill="none" stroke="${bracketColor}" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
  <path d="M438,254 L464,254 L464,228" fill="none" stroke="${bracketColor}" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
  <text x="28" y="185" font-family="monospace,Courier New" font-size="${fontSize}" font-weight="900" fill="url(#ng${idStr})" letter-spacing="-0.02em">#${idStr}</text>
  <rect x="30" y="28" width="13" height="13" rx="2.5" fill="${squareColor}"/>
  <text x="50" y="40" font-family="monospace,Courier New" font-size="12" font-weight="700" fill="#e2e8f0" letter-spacing="0.07em">Based ID</text>
  <rect x="384" y="21" width="72" height="22" rx="11" fill="${badgeFill}" fill-opacity="0.9"/>
  <rect x="384" y="21" width="72" height="22" rx="11" fill="none" stroke="${badgeStroke}" stroke-width="0.75" stroke-opacity="0.55"/>
  <text x="420" y="36" font-family="monospace,Courier New" font-size="9.5" font-weight="700" fill="${badgeTextColor}" text-anchor="middle" letter-spacing="0.1em">${badgeText}</text>
  <text x="28" y="232" font-family="monospace,Courier New" font-size="8.5" fill="#334155" letter-spacing="0.14em">HOLDER</text>
  <text x="28" y="250" font-family="monospace,Courier New" font-size="10.5" fill="#475569" letter-spacing="0.025em">${holderStr}</text>
</svg>`;
}

function svgToDataUri(svg) {
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
}

// Generate perspective grid lines converging from center-right vanishing point
function perspectiveGrid() {
  const W = 1500, H = 500;
  const vx = 1100, vy = 250; // vanishing point
  const lineColor = "#2563eb";
  const opacity = 0.07;
  let lines = "";

  // Horizontal rays from vanishing point
  const ySteps = 20;
  for (let i = 0; i <= ySteps; i++) {
    const t = i / ySteps;
    const y = t * H;
    lines += `<line x1="${vx}" y1="${vy}" x2="${-100}" y2="${y}" stroke="${lineColor}" stroke-width="0.8" opacity="${opacity}"/>`;
  }

  // Vertical rays from vanishing point fanning out left
  const xSteps = 14;
  for (let i = 0; i <= xSteps; i++) {
    const t = i / xSteps;
    const x = t * (vx - 50);
    lines += `<line x1="${vx}" y1="${vy}" x2="${x}" y2="${-20}" stroke="${lineColor}" stroke-width="0.8" opacity="${opacity}"/>`;
    lines += `<line x1="${vx}" y1="${vy}" x2="${x}" y2="${H + 20}" stroke="${lineColor}" stroke-width="0.8" opacity="${opacity}"/>`;
  }

  // Horizontal grid lines (parallel, full width)
  const hLines = 12;
  for (let i = 1; i < hLines; i++) {
    const y = (i / hLines) * H;
    lines += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${lineColor}" stroke-width="0.5" opacity="0.04"/>`;
  }

  // Vertical grid lines (parallel, full height)
  const vLines = 20;
  for (let i = 1; i < vLines; i++) {
    const x = (i / vLines) * W;
    lines += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${lineColor}" stroke-width="0.5" opacity="0.04"/>`;
  }

  return lines;
}

const card1   = makeNftSvg("1",   true);
const card101 = makeNftSvg("101", false);

const banner = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1500" height="500">
  <defs>
    <filter id="cardGlow1">
      <feDropShadow dx="0" dy="16" stdDeviation="28" flood-color="#d97706" flood-opacity="0.22"/>
    </filter>
    <filter id="cardGlow2">
      <feDropShadow dx="0" dy="16" stdDeviation="28" flood-color="#2563eb" flood-opacity="0.18"/>
    </filter>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#060c1e"/>
      <stop offset="100%" stop-color="#071028"/>
    </linearGradient>
    <radialGradient id="leftFade" cx="0%" cy="50%" r="60%">
      <stop offset="0%"   stop-color="#0d1535" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#060c1e" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Deep navy background -->
  <rect width="1500" height="500" fill="url(#bgGrad)"/>

  <!-- Perspective grid -->
  ${perspectiveGrid()}

  <!-- Subtle left vignette so text pops -->
  <rect width="1500" height="500" fill="url(#leftFade)"/>

  <!-- Top + bottom accent lines -->
  <rect width="1500" height="2" fill="#2563eb" opacity="0.55"/>
  <rect y="498" width="1500" height="2" fill="#2563eb" opacity="0.2"/>

  <!-- ── LEFT: Branding ── -->

  <!-- Small blue square mark -->
  <rect x="80" y="130" width="18" height="18" rx="4" fill="#2563eb"/>

  <!-- BASED ID wordmark -->
  <text x="108" y="148"
    font-family="Arial Black, Impact, sans-serif"
    font-size="24"
    font-weight="900"
    fill="#e2e8f0"
    letter-spacing="0.12em">BASED ID</text>

  <!-- Hero headline -->
  <text x="80" y="225"
    font-family="Arial Black, Impact, sans-serif"
    font-size="58"
    font-weight="900"
    fill="#f1f5f9"
    letter-spacing="-1.5">One ID. Your entire</text>
  <text x="80" y="290"
    font-family="Arial Black, Impact, sans-serif"
    font-size="58"
    font-weight="900"
    fill="#2563eb"
    letter-spacing="-1.5">Base journey.</text>

  <!-- Thin divider -->
  <rect x="80" y="312" width="480" height="1" fill="#2563eb" opacity="0.2"/>

  <!-- Subline -->
  <text x="80" y="340"
    font-family="monospace, Courier New"
    font-size="14"
    fill="#475569"
    letter-spacing="0.03em">NFTs, airdrops, whitelists, and DAO — all for $2.</text>

  <!-- Stats -->
  <text x="80"  y="400" font-family="monospace,Courier New" font-size="20" font-weight="700" fill="#2563eb">$2 USDC</text>
  <text x="80"  y="420" font-family="monospace,Courier New" font-size="11" fill="#1e3a5f" letter-spacing="0.1em">FLAT MINT PRICE</text>

  <text x="220" y="400" font-family="monospace,Courier New" font-size="20" font-weight="700" fill="#64748b">1B $BASED</text>
  <text x="220" y="420" font-family="monospace,Courier New" font-size="11" fill="#1e3a5f" letter-spacing="0.1em">AIRDROP POOL</text>

  <text x="380" y="400" font-family="monospace,Courier New" font-size="20" font-weight="700" fill="#64748b">ON-CHAIN</text>
  <text x="380" y="420" font-family="monospace,Courier New" font-size="11" fill="#1e3a5f" letter-spacing="0.1em">SVG ART</text>

  <!-- basedid.space -->
  <text x="80" y="468"
    font-family="monospace, Courier New"
    font-size="12"
    fill="#1e3a5f"
    letter-spacing="0.08em">basedid.space</text>

  <!-- ── RIGHT: NFT Cards ── -->

  <!-- Genesis #1 — back, tilted left -->
  <g transform="translate(740, 28) rotate(-7) scale(0.84)" filter="url(#cardGlow1)">
    <image href="${svgToDataUri(card1)}" width="480" height="270"/>
  </g>

  <!-- Public #101 — front, tilted right -->
  <g transform="translate(1000, 80) rotate(5) scale(0.84)" filter="url(#cardGlow2)">
    <image href="${svgToDataUri(card101)}" width="480" height="270"/>
  </g>
</svg>`;

await sharp(Buffer.from(banner))
  .resize(1500, 500)
  .png()
  .toFile("public/x-banner.png");

console.log("Done — x-banner.png saved to web/public/");
