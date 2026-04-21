import { isAuctionId } from "./contracts";

function idFontSize(digits: number) {
  if (digits <= 3) return 108;
  if (digits <= 4) return 90;
  if (digits <= 5) return 74;
  if (digits <= 6) return 58;
  if (digits <= 7) return 48;
  if (digits <= 8) return 40;
  if (digits <= 10) return 34;
  if (digits <= 13) return 28;
  return 24;
}

export function renderNftCardSvg(id: string, holder = "—"): string {
  const numStr = id.replace("#", "");
  const fs = idFontSize(numStr.length);
  const parsed = parseInt(numStr, 10);
  const auction = !isNaN(parsed) && isAuctionId(parsed);
  const uid = `nft_${numStr || "x"}`;

  const badgeText = parsed <= 100 ? "GENESIS"
    : parsed <= 1000  ? "FOUNDING"
    : parsed <= 10000 ? "PIONEER"
    : "BUILDER";

  const numGradStop0  = auction ? "#fde68a" : "#93c5fd";
  const numGradStop1  = auction ? "#d97706" : "#1d4ed8";
  const borderColor   = auction ? "#d97706" : "#2563eb";
  const accentColor   = auction ? "#f59e0b" : "#3b82f6";
  const dotColor      = auction ? "#f59e0b" : "#3b82f6";
  const squareColor   = auction ? "#d97706" : "#2563eb";
  const badgeFill     = auction ? "#2d1a00" : "#0f1f4a";
  const badgeStroke   = auction ? "#d97706" : "#3b82f6";
  const badgeTextColor = auction ? "#fde68a" : "#93c5fd";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="480" height="270">
  <defs>
    <linearGradient id="bg_${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#060818" />
      <stop offset="60%"  stop-color="#080d22" />
      <stop offset="100%" stop-color="#0a1030" />
    </linearGradient>
    <linearGradient id="ng_${uid}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="${numGradStop0}" />
      <stop offset="100%" stop-color="${numGradStop1}" />
    </linearGradient>
    <pattern id="dots_${uid}" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="0.9" fill="${dotColor}" fill-opacity="0.09" />
    </pattern>
    <clipPath id="c_${uid}">
      <rect width="480" height="270" rx="16" />
    </clipPath>
  </defs>

  <rect width="480" height="270" rx="16" fill="url(#bg_${uid})" />
  <rect width="480" height="270" rx="16" fill="url(#dots_${uid})" />

  <text x="240" y="195" text-anchor="middle" font-family="monospace, Courier New" font-size="72" font-weight="900"
    fill="${accentColor}" fill-opacity="0.055" letter-spacing="0.04em">BASED ID</text>

  <polygon points="300,0 480,0 480,120 100,270 0,270 0,150"
    fill="white" fill-opacity="0.015" clip-path="url(#c_${uid})" />

  <rect width="480" height="270" rx="16" fill="none" stroke="${borderColor}" stroke-width="1.5" stroke-opacity="0.45" />
  <line x1="40" y1="0" x2="440" y2="0" stroke="${accentColor}" stroke-width="2.5" stroke-opacity="0.75" clip-path="url(#c_${uid})" />

  <path d="M16,42 L16,16 L42,16"   fill="none" stroke="${accentColor}" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round" />
  <path d="M438,16 L464,16 L464,42" fill="none" stroke="${accentColor}" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round" />
  <path d="M16,228 L16,254 L42,254" fill="none" stroke="${accentColor}" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round" />
  <path d="M438,254 L464,254 L464,228" fill="none" stroke="${accentColor}" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round" />

  <rect x="30" y="28" width="13" height="13" rx="2.5" fill="${squareColor}" />
  <text x="50" y="40" font-family="monospace, Courier New" font-size="12" font-weight="700" fill="#e2e8f0" letter-spacing="0.07em">Based ID</text>

  <rect x="384" y="21" width="72" height="22" rx="11" fill="${badgeFill}" fill-opacity="0.9" />
  <rect x="384" y="21" width="72" height="22" rx="11" fill="none" stroke="${badgeStroke}" stroke-width="0.75" stroke-opacity="0.55" />
  <text x="420" y="36" font-family="monospace, Courier New" font-size="9.5" font-weight="700" fill="${badgeTextColor}"
    text-anchor="middle" letter-spacing="0.1em">${badgeText}</text>

  <text x="28" y="185" font-family="monospace, Courier New" font-size="${fs}" font-weight="900"
    fill="url(#ng_${uid})" letter-spacing="-0.02em" clip-path="url(#c_${uid})">${id}</text>

  <line x1="28" y1="212" x2="452" y2="212" stroke="#1d4ed8" stroke-width="0.75" stroke-opacity="0.25" />

  <text x="28" y="232" font-family="monospace, Courier New" font-size="8.5" fill="#334155" letter-spacing="0.14em">HOLDER</text>
  <text x="28" y="250" font-family="monospace, Courier New" font-size="10.5" fill="#475569" letter-spacing="0.025em">${holder}</text>
</svg>`;
}
