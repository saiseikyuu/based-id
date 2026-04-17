"use client";

/**
 * EnvWarning
 * Shows a visible banner in the browser if critical env vars are missing or
 * still pointing to the zero address. Only renders in the browser — SSR safe.
 * Remove this component (or the import in layout.tsx) after mainnet deploy.
 */

const ZERO = "0x0000000000000000000000000000000000000000";

function check(val: string | undefined, name: string): string | null {
  if (!val || val === ZERO || val.startsWith("0xYOUR"))
    return `${name} is not set`;
  return null;
}

export default function EnvWarning() {
  const warnings = [
    check(process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,     "NEXT_PUBLIC_CONTRACT_ADDRESS"),
    check(process.env.NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS,"NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS"),
    !process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
      ? "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set"
      : null,
    !process.env.NEXT_PUBLIC_CHAIN_ID
      ? "NEXT_PUBLIC_CHAIN_ID is not set"
      : null,
  ].filter(Boolean) as string[];

  if (warnings.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "#1a0000",
        border: "1px solid rgba(239,68,68,0.4)",
        borderRadius: 12,
        padding: "12px 20px",
        maxWidth: 480,
        width: "calc(100vw - 32px)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.6)",
      }}
    >
      <p style={{ color: "#f87171", fontFamily: "monospace", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.15em" }}>
        ⚠ Missing env vars
      </p>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {warnings.map((w) => (
          <li key={w} style={{ color: "#fca5a5", fontFamily: "monospace", fontSize: 11, lineHeight: 1.6 }}>
            · {w}
          </li>
        ))}
      </ul>
      <p style={{ color: "#7f1d1d", fontFamily: "monospace", fontSize: 10, marginTop: 8 }}>
        Set these in .env.local or Vercel → Environment Variables
      </p>
    </div>
  );
}
