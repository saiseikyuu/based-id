"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import toast from "react-hot-toast";
import {
  HUNTERS_ADDRESS, HUNTERS_ABI,
  BASED_ID_ADDRESS, BASED_ID_ABI,
  RANK_COLORS, RANK_LABELS,
} from "@/lib/contracts";

const DISPLAY  = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const DEPLOYED = HUNTERS_ADDRESS !== "0x0000000000000000000000000000000000000000";

const RANK_DATA = [
  { label: "E", color: "#94a3b8", name: "E-Rank Hunter",   class: "E-CLASS",  d1: "#1a1c26" },
  { label: "D", color: "#a3e635", name: "D-Rank Hunter",   class: "D-CLASS",  d1: "#141d09" },
  { label: "C", color: "#34d399", name: "C-Rank Hunter",   class: "C-CLASS",  d1: "#071a13" },
  { label: "B", color: "#60a5fa", name: "B-Rank Hunter",   class: "B-CLASS",  d1: "#071528" },
  { label: "A", color: "#c084fc", name: "A-Rank Hunter",   class: "A-CLASS",  d1: "#160826" },
  { label: "S", color: "#f97316", name: "S-Rank Hunter",   class: "S-CLASS",  d1: "#1e0d04" },
  { label: "N", color: "#fcd34d", name: "National Hunter", class: "NATIONAL", d1: "#1a1404" },
];

// Inline SVG card preview matching the on-chain design
function HunterCard({ rankIdx, tokenId }: { rankIdx: number; tokenId?: string }) {
  const r = RANK_DATA[rankIdx];
  const lic = tokenId ? `HA-2026-${tokenId.padStart(4, "0")}` : "HA-2026-????";
  const c = r.color;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 330" className="w-full rounded-xl">
      <defs>
        <linearGradient id={`bg${rankIdx}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={r.d1} />
          <stop offset="100%" stopColor="#030508" />
        </linearGradient>
        <linearGradient id={`hd${rankIdx}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#090c15" />
          <stop offset="100%" stopColor="#05070d" />
        </linearGradient>
        <radialGradient id={`rb${rankIdx}`} cx="50%" cy="30%" r="75%">
          <stop offset="0%" stopColor={c} stopOpacity="0.32" />
          <stop offset="100%" stopColor={c} stopOpacity="0.05" />
        </radialGradient>
        <linearGradient id={`bt${rankIdx}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#04060d" />
          <stop offset="100%" stopColor="#020409" />
        </linearGradient>
        <filter id={`gf${rankIdx}`}>
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <clipPath id={`cl${rankIdx}`}><rect width="520" height="330" rx="13" /></clipPath>
      </defs>

      {/* Background */}
      <rect width="520" height="330" fill={`url(#bg${rankIdx})`} rx="13" />

      {/* Diagonal lines */}
      <g clipPath={`url(#cl${rankIdx})`}>
        {[-84,-42,0,42,84,126,168,210].map((x, i) => (
          <line key={i} x1={x} y1="0" x2={x+330} y2="330" stroke={c} strokeWidth="0.4" strokeOpacity="0.05" />
        ))}
      </g>

      {/* Header */}
      <rect x="0" y="0" width="520" height="52" fill={`url(#hd${rankIdx})`} />
      <rect x="0" y="0" width="520" height="2.5" fill={c} fillOpacity="0.9" />
      <rect x="0" y="51" width="520" height="1" fill={c} fillOpacity="0.15" />
      <text x="28" y="21" fontFamily="system-ui,sans-serif" fontSize="13" fontWeight="700" fill="#fff" opacity="0.95">Official Hunter&apos;s License</text>
      <text x="28" y="39" fontFamily="system-ui,sans-serif" fontSize="9.5" fill={c} opacity="0.75" letterSpacing="1.5">HUNTER LICENSE  &gt;&gt;&gt;</text>

      {/* Name strip */}
      <polygon points="18,68 432,68 420,106 18,106" fill={c} fillOpacity="0.9" />
      <polygon points="18,68 432,68 420,106 18,106" fill="#000" fillOpacity="0.15" />
      <text x="28" y="93" fontFamily="system-ui,sans-serif" fontSize="22" fontWeight="900" fill="#fff">BASED HUNTERS</text>
      <text x="28" y="125" fontFamily="system-ui,sans-serif" fontSize="9.5" letterSpacing="5" fill={c} opacity="0.65">BASED  ID</text>
      <line x1="18" y1="138" x2="390" y2="138" stroke={c} strokeWidth="0.4" strokeOpacity="0.2" />
      <line x1="18" y1="143" x2="200" y2="143" stroke={c} strokeWidth="0.4" strokeOpacity="0.12" />
      <path d="M20 66 L20 55 L32 55" fill="none" stroke={c} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.6" />
      <text x="28" y="190" fontFamily="monospace,system-ui" fontSize="9" letterSpacing="2" fill={c} opacity="0.12">{lic}</text>

      {/* Rank badge */}
      <rect x="400" y="52" width="120" height="158" fill={`url(#rb${rankIdx})`} />
      <rect x="400" y="52" width="1.5" height="158" fill={c} fillOpacity="0.45" />
      <text x="413" y="142" fontFamily="system-ui,sans-serif" fontSize="22" fontWeight="900" fill={c} opacity="0.5">&#9668;&#9668;</text>
      <text x="460" y="138" textAnchor="middle" dominantBaseline="middle" fontFamily="system-ui,sans-serif" fontSize="68" fontWeight="900" fill={c} filter={`url(#gf${rankIdx})`}>{r.label}</text>
      <rect x="418" y="163" width="84" height="22" rx="3" fill={c} fillOpacity="0.2" stroke={c} strokeWidth="0.8" strokeOpacity="0.6" />
      <text x="460" y="178" textAnchor="middle" fontFamily="system-ui,sans-serif" fontSize="10" fontWeight="800" letterSpacing="3" fill="#fff">RANK</text>
      <text x="460" y="200" textAnchor="middle" fontFamily="system-ui,sans-serif" fontSize="10" fill={c} opacity="0.85" fontWeight="700">{r.class}</text>

      {/* Bottom section */}
      <rect x="0" y="210" width="520" height="120" fill={`url(#bt${rankIdx})`} />
      <rect x="0" y="210" width="520" height="1" fill={c} fillOpacity="0.18" />
      <text x="300" y="285" textAnchor="middle" fontFamily="system-ui,sans-serif" fontSize="68" fontWeight="900" fill={c} opacity="0.04" transform="rotate(-8,300,285)">HUNTERS</text>
      <text x="76" y="228" fontFamily="system-ui,sans-serif" fontSize="8" fill="#475569">Class</text>
      <text x="115" y="228" fontFamily="system-ui,sans-serif" fontSize="8.5" fill={c} fontWeight="700">{r.name}</text>
      <text x="76" y="245" fontFamily="system-ui,sans-serif" fontSize="8" fill="#475569">License</text>
      <text x="115" y="245" fontFamily="monospace,system-ui" fontSize="8.5" fill="#cbd5e1">{lic}</text>
      <line x1="70" y1="252" x2="390" y2="252" stroke="#fff" strokeWidth="0.3" strokeOpacity="0.1" />
      <text x="76" y="265" fontFamily="system-ui,sans-serif" fontSize="8" fill="#475569">Affiliation</text>
      <text x="120" y="265" fontFamily="system-ui,sans-serif" fontSize="8.5" fill="#94a3b8">N/A</text>
      <text x="76" y="280" fontFamily="system-ui,sans-serif" fontSize="8" fill="#475569">Issued by</text>
      <text x="120" y="280" fontFamily="system-ui,sans-serif" fontSize="8.5" fill="#94a3b8">Based ID Hunters Association</text>

      {/* EMV Chip */}
      <rect x="18" y="218" width="42" height="32" rx="4" fill="#c9a227" fillOpacity="0.85" />
      <rect x="18" y="218" width="42" height="32" rx="4" fill="none" stroke="#a07a10" strokeWidth="0.5" />
      <line x1="18" y1="228" x2="60" y2="228" stroke="#a07a10" strokeWidth="0.5" />
      <line x1="18" y1="238" x2="60" y2="238" stroke="#a07a10" strokeWidth="0.5" />
      <line x1="32" y1="218" x2="32" y2="250" stroke="#a07a10" strokeWidth="0.5" />
      <line x1="46" y1="218" x2="46" y2="250" stroke="#a07a10" strokeWidth="0.5" />
      {[20,34,48].map(x => <rect key={x} x={x} y="220" width="10" height="10" rx="1" fill="#b8860b" fillOpacity="0.6" />)}
      {[20,34,48].map(x => <rect key={x+100} x={x} y="240" width="10" height="8" rx="1" fill="#b8860b" fillOpacity="0.5" />)}

      {/* Barcode */}
      {[[145,3],[150,2],[154,3],[161,1],[165,1],[170,1],[174,3],[179,1],[184,3],[189,2],[193,2],[198,3],[203,2],[208,1]].map(([x,w]) => (
        <rect key={x} x={x} y="248" width={w} height="44" fill={c} opacity="0.65" />
      ))}
      <text x="303" y="300" textAnchor="middle" fontFamily="monospace,system-ui" fontSize="7.5" letterSpacing="2" fill={c} opacity="0.4">{lic}</text>

      {/* Footer */}
      <rect x="0" y="316" width="520" height="14" fill="#000" fillOpacity="0.45" />
      <rect x="0" y="327.5" width="520" height="2.5" fill={c} fillOpacity="0.4" />
      <text x="260" y="324" textAnchor="middle" fontFamily="system-ui,sans-serif" fontSize="6.5" letterSpacing="2" fill={c} opacity="0.25">BASEDID.SPACE  ·  OFFICIAL HUNTER LICENSE</text>
      <rect x="0.5" y="0.5" width="519" height="329" rx="12.5" fill="none" stroke={c} strokeWidth="0.8" strokeOpacity="0.4" />
    </svg>
  );
}

export function HuntersClaim() {
  const { address, isConnected } = useAccount();
  const [updatingRank, setUpdatingRank] = useState(false);
  const [previewRank, setPreviewRank] = useState(0);

  const { data: idBalance } = useReadContract({
    address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && DEPLOYED },
  });
  const holdsId = idBalance !== undefined ? (idBalance as bigint) > BigInt(0) : null;

  const { data: tokenId, refetch: refetchToken } = useReadContract({
    address: HUNTERS_ADDRESS, abi: HUNTERS_ABI, functionName: "tokenOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && DEPLOYED },
  });
  const hasClaimed = tokenId !== undefined && (tokenId as bigint) > BigInt(0);

  const { data: rankRaw, refetch: refetchRank } = useReadContract({
    address: HUNTERS_ADDRESS, abi: HUNTERS_ABI, functionName: "rankOf",
    args: tokenId ? [tokenId as bigint] : undefined,
    query: { enabled: !!tokenId && hasClaimed && DEPLOYED },
  });
  const currentRank = rankRaw !== undefined ? Number(rankRaw) : 0;

  const { data: totalSupply } = useReadContract({
    address: HUNTERS_ADDRESS, abi: HUNTERS_ABI, functionName: "totalSupply",
    query: { enabled: DEPLOYED },
  });

  const { writeContract, data: claimTxHash, isPending: claimPending } = useWriteContract();
  const { isLoading: claimConfirming, isSuccess: claimConfirmed } = useWaitForTransactionReceipt({ hash: claimTxHash });
  if (claimConfirmed && !hasClaimed) { refetchToken(); toast.success("Based Hunter claimed!"); }

  const { writeContract: writeRank, data: rankTxHash, isPending: rankPending } = useWriteContract();
  const { isLoading: rankConfirming, isSuccess: rankConfirmed } = useWaitForTransactionReceipt({ hash: rankTxHash });
  if (rankConfirmed) { refetchRank(); toast.success("Rank updated on-chain!"); }

  function handleClaim() {
    writeContract(
      { address: HUNTERS_ADDRESS, abi: HUNTERS_ABI, functionName: "claim" },
      { onError: (e) => toast.error(e.message.split("\n")[0]) }
    );
  }

  async function handleUpdateRank() {
    if (!address) return;
    setUpdatingRank(true);
    try {
      const res  = await fetch("/api/hunters/rank", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wallet: address }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed"); return; }
      if (data.newRank === currentRank) { toast("Already at max rank for your current activity — enter more drops to level up!"); return; }
      writeRank(
        { address: HUNTERS_ADDRESS, abi: HUNTERS_ABI, functionName: "updateRank", args: [address, data.newRank, BigInt(data.nonce), data.sig as `0x${string}`] },
        { onError: (e) => toast.error(e.message.split("\n")[0]) }
      );
    } catch { toast.error("Something went wrong"); }
    finally { setUpdatingRank(false); }
  }

  const activeRank = hasClaimed ? currentRank : previewRank;
  const activeColor = RANK_DATA[activeRank].color;
  const tokenIdStr = hasClaimed ? (tokenId as bigint).toString() : undefined;

  return (
    <div className="flex-1 max-w-6xl mx-auto px-6 py-14 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

        {/* Left — card preview */}
        <div className="space-y-5">
          <div className="relative">
            <HunterCard rankIdx={activeRank} tokenId={tokenIdStr} />
            {/* Live badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-[10px] font-medium tracking-wide">Live on Base</span>
            </div>
          </div>

          {/* Rank selector (only before claiming — for preview) */}
          {!hasClaimed && (
            <div className="space-y-2">
              <p className="text-zinc-600 text-xs">Preview ranks</p>
              <div className="grid grid-cols-7 gap-1.5">
                {RANK_DATA.map((r, i) => (
                  <button key={r.label} onClick={() => setPreviewRank(i)}
                    className={`rounded-xl py-2.5 text-center transition-all border ${
                      previewRank === i ? "border-white/20 bg-white/[0.06]" : "border-white/[0.05] bg-white/[0.01] hover:border-white/[0.1]"
                    }`}>
                    <div className="text-base font-black" style={{ color: r.color }}>{r.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {totalSupply !== undefined && (
            <p className="text-zinc-700 text-xs text-center">{(totalSupply as bigint).toString()} hunters claimed so far</p>
          )}
        </div>

        {/* Right — info + action */}
        <div className="space-y-8 lg:pt-4">
          {/* Header */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white" style={DISPLAY}>
              Based Hunters
            </h1>
            <p className="text-zinc-400 text-base leading-relaxed">
              Soulbound Hunter License NFT. Claim free (gas only) with any Based ID. Your rank rises as you enter drops and win raffles — sync it on-chain anytime.
            </p>
          </div>

          {/* Rank progression */}
          <div className="space-y-3">
            <p className="text-zinc-500 text-xs uppercase tracking-[0.2em]">Rank progression</p>
            <div className="space-y-1.5">
              {RANK_DATA.map((r, i) => (
                <div key={r.label} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all ${
                  hasClaimed && i === currentRank ? "bg-white/[0.05] border border-white/[0.1]" : "border border-transparent"
                }`}>
                  <span className="font-black text-sm w-4" style={{ color: r.color }}>{r.label}</span>
                  <span className="text-zinc-400 text-sm flex-1">{r.name}</span>
                  {hasClaimed && i === currentRank && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ color: r.color, borderColor: r.color + "40" }}>Current</span>
                  )}
                  {hasClaimed && i > currentRank && (
                    <span className="text-zinc-700 text-[10px]">Locked</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action area */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.01] p-6 space-y-4">
            {!isConnected ? (
              <>
                <p className="text-white font-bold">Connect wallet to claim</p>
                <ConnectButton />
              </>
            ) : holdsId === false ? (
              <>
                <p className="text-red-300 font-medium text-sm">No Based ID on this wallet</p>
                <p className="text-zinc-500 text-xs">You need a Based ID to claim a Hunter. Mint for $2.</p>
                <a href="/#mint-card" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors">
                  Mint Based ID — $2 →
                </a>
              </>
            ) : hasClaimed ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold">Hunter #{tokenIdStr}</p>
                    <p className="text-sm mt-0.5" style={{ color: activeColor }}>{RANK_DATA[currentRank].name}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ borderColor: activeColor + "40", backgroundColor: activeColor + "10" }}>
                    <span className="font-black text-xl" style={{ color: activeColor }}>{RANK_DATA[currentRank].label}</span>
                  </div>
                </div>
                <button onClick={handleUpdateRank} disabled={updatingRank || rankPending || rankConfirming}
                  className="w-full py-3 rounded-xl border border-white/[0.1] text-zinc-200 text-sm font-medium hover:bg-white/[0.04] hover:text-white transition-colors disabled:opacity-40">
                  {updatingRank || rankPending || rankConfirming ? "Syncing…" : "Sync rank on-chain"}
                </button>
                <p className="text-zinc-700 text-xs text-center">Enter drops and win raffles to increase your score</p>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <p className="text-white font-bold">Claim your Hunter</p>
                  <p className="text-zinc-500 text-sm">Free · gas only · starts at E-Rank · soulbound</p>
                </div>
                <button onClick={handleClaim} disabled={claimPending || claimConfirming}
                  className="w-full py-4 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors disabled:opacity-30 shadow-[0_2px_40px_rgba(255,255,255,0.08)]">
                  {claimPending || claimConfirming ? "Claiming…" : "Claim free Hunter NFT"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
