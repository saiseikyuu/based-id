import { isAuctionId } from "@/lib/contracts";

type Props = {
  id: string;       // e.g. "#1" or "#101"
  holder?: string;
  fontSize?: number;
};

function idFontSize(digits: number) {
  if (digits <= 3) return 108;
  if (digits <= 4) return 90;
  if (digits <= 5) return 74;
  if (digits <= 6) return 58;
  if (digits <= 7) return 48;
  if (digits <= 8) return 40;
  return 34;
}

export function NftCard({ id, holder = "—", fontSize }: Props) {
  const numStr = id.replace("#", "");
  const fs     = fontSize ?? idFontSize(numStr.length);
  const parsed = parseInt(numStr, 10);
  const auction = !isNaN(parsed) && isAuctionId(parsed);

  // Tier badge — matches contract and dashboard labels exactly
  const badgeText = parsed <= 100 ? "GENESIS"
    : parsed <= 1000  ? "FOUNDING"
    : parsed <= 10000 ? "PIONEER"
    : "BUILDER";

  // Color tokens — gold for Genesis, blue for all others
  const numGradStop0  = auction ? "#fde68a" : "#93c5fd";
  const numGradStop1  = auction ? "#d97706" : "#1d4ed8";
  const borderColor   = auction ? "#d97706" : "#2563eb";
  const accentColor   = auction ? "#f59e0b" : "#3b82f6";
  const dotColor      = auction ? "#f59e0b" : "#3b82f6";
  const squareColor   = auction ? "#d97706" : "#2563eb";
  const badgeFill     = auction ? "#2d1a00" : "#0f1f4a";
  const badgeStroke   = auction ? "#d97706" : "#3b82f6";
  const badgeTextColor = auction ? "#fde68a" : "#93c5fd";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 480 270"
      width="100%"
      style={{ display: "block", borderRadius: 16 }}
    >
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   style={{ stopColor: "#060818" }} />
          <stop offset="60%"  style={{ stopColor: "#080d22" }} />
          <stop offset="100%" style={{ stopColor: "#0a1030" }} />
        </linearGradient>
        <linearGradient id="ng" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   style={{ stopColor: numGradStop0 }} />
          <stop offset="100%" style={{ stopColor: numGradStop1 }} />
        </linearGradient>
        <pattern id="dots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.9" fill={dotColor} fillOpacity="0.09" />
        </pattern>
        <clipPath id="c">
          <rect width="480" height="270" rx="16" />
        </clipPath>
      </defs>

      {/* Background */}
      <rect width="480" height="270" rx="16" fill="url(#bg)" />
      <rect width="480" height="270" rx="16" fill="url(#dots)" />

      {/* BASED ID watermark */}
      <text
        x="240" y="195" textAnchor="middle"
        fontFamily="monospace, Courier New" fontSize="72" fontWeight="900"
        fill={accentColor} fillOpacity="0.055" letterSpacing="0.04em"
      >
        BASED ID
      </text>

      {/* Holographic stripe */}
      <polygon
        points="300,0 480,0 480,120 100,270 0,270 0,150"
        fill="white" fillOpacity="0.015" clipPath="url(#c)"
      />

      {/* Border */}
      <rect width="480" height="270" rx="16" fill="none" stroke={borderColor} strokeWidth="1.5" strokeOpacity="0.45" />

      {/* Top accent line */}
      <line x1="40" y1="0" x2="440" y2="0" stroke={accentColor} strokeWidth="2.5" strokeOpacity="0.75" clipPath="url(#c)" />

      {/* Corner brackets */}
      <path d="M16,42 L16,16 L42,16"   fill="none" stroke={accentColor} strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />
      <path d="M438,16 L464,16 L464,42" fill="none" stroke={accentColor} strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />
      <path d="M16,228 L16,254 L42,254" fill="none" stroke={accentColor} strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />
      <path d="M438,254 L464,254 L464,228" fill="none" stroke={accentColor} strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />

      {/* Top-left: square + label */}
      <rect x="30" y="28" width="13" height="13" rx="2.5" fill={squareColor} />
      <text x="50" y="40" fontFamily="monospace, Courier New" fontSize="12" fontWeight="700" fill="#e2e8f0" letterSpacing="0.07em">
        Based ID
      </text>

      {/* Top-right: badge */}
      <rect x="384" y="21" width="72" height="22" rx="11" fill={badgeFill} fillOpacity="0.9" />
      <rect x="384" y="21" width="72" height="22" rx="11" fill="none" stroke={badgeStroke} strokeWidth="0.75" strokeOpacity="0.55" />
      <text x="420" y="36" fontFamily="monospace, Courier New" fontSize="9.5" fontWeight="700" fill={badgeTextColor} textAnchor="middle" letterSpacing="0.1em">
        {badgeText}
      </text>

      {/* ID number */}
      <text
        x="28" y="185"
        fontFamily="monospace, Courier New"
        fontSize={fs}
        fontWeight="900"
        fill="url(#ng)"
        letterSpacing="-0.02em"
      >
        {id}
      </text>

      {/* Divider */}
      <line x1="28" y1="212" x2="452" y2="212" stroke="#1d4ed8" strokeWidth="0.75" strokeOpacity="0.25" />

      {/* Holder */}
      <text x="28" y="232" fontFamily="monospace, Courier New" fontSize="8.5" fill="#334155" letterSpacing="0.14em">
        HOLDER
      </text>
      <text x="28" y="250" fontFamily="monospace, Courier New" fontSize="10.5" fill="#475569" letterSpacing="0.025em">
        {holder}
      </text>
    </svg>
  );
}
