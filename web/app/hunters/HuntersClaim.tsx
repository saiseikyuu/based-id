"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  HUNTERS_ADDRESS, HUNTERS_ABI,
  BASED_ID_ADDRESS, BASED_ID_ABI,
} from "@/lib/contracts";

const D = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const DEPLOYED = HUNTERS_ADDRESS !== "0x0000000000000000000000000000000000000000";

const RANK_DATA = [
  { label: "E", color: "#94a3b8", name: "E-Rank Hunter",   cls: "E-CLASS",  d1: "#1a1c26", d2: "#030508", threshold: 0 },
  { label: "D", color: "#a3e635", name: "D-Rank Hunter",   cls: "D-CLASS",  d1: "#141d09", d2: "#030508", threshold: 20 },
  { label: "C", color: "#34d399", name: "C-Rank Hunter",   cls: "C-CLASS",  d1: "#071a13", d2: "#030508", threshold: 35 },
  { label: "B", color: "#60a5fa", name: "B-Rank Hunter",   cls: "B-CLASS",  d1: "#071528", d2: "#030508", threshold: 50 },
  { label: "A", color: "#c084fc", name: "A-Rank Hunter",   cls: "A-CLASS",  d1: "#160826", d2: "#030508", threshold: 65 },
  { label: "S", color: "#f97316", name: "S-Rank Hunter",   cls: "S-CLASS",  d1: "#1e0d04", d2: "#030508", threshold: 80 },
  { label: "N", color: "#fcd34d", name: "National Hunter", cls: "NATIONAL", d1: "#1a1404", d2: "#030508", threshold: 95 },
];

function HunterCard({ rankIdx, tokenId }: { rankIdx: number; tokenId?: string }) {
  const r  = RANK_DATA[rankIdx];
  const c  = r.color;
  const lic = tokenId ? `HA-2026-${tokenId.padStart(4, "0")}` : "HA-2026-????";

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 330" className="w-full rounded-xl">
      <defs>
        <linearGradient id={`bg${rankIdx}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={r.d1}/><stop offset="100%" stopColor={r.d2}/></linearGradient>
        <linearGradient id={`hd${rankIdx}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#090c15"/><stop offset="100%" stopColor="#05070d"/></linearGradient>
        <radialGradient id={`rb${rankIdx}`} cx="50%" cy="30%" r="75%"><stop offset="0%" stopColor={c} stopOpacity="0.32"/><stop offset="100%" stopColor={c} stopOpacity="0.05"/></radialGradient>
        <linearGradient id={`bt${rankIdx}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#04060d"/><stop offset="100%" stopColor="#020409"/></linearGradient>
        <filter id={`gf${rankIdx}`}><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <clipPath id={`cl${rankIdx}`}><rect width="520" height="330" rx="13"/></clipPath>
      </defs>
      <rect width="520" height="330" fill={`url(#bg${rankIdx})`} rx="13"/>
      <g clipPath={`url(#cl${rankIdx})`}>
        {[-84,-42,0,42,84,126,168,210].map((x,i)=><line key={i} x1={x} y1="0" x2={x+330} y2="330" stroke={c} strokeWidth="0.4" strokeOpacity="0.05"/>)}
      </g>
      {/* Header */}
      <rect x="0" y="0" width="520" height="52" fill={`url(#hd${rankIdx})`}/>
      <rect x="0" y="0" width="520" height="2.5" fill={c} fillOpacity="0.9"/>
      <rect x="0" y="51" width="520" height="1" fill={c} fillOpacity="0.15"/>
      <text x="28" y="21" fontFamily="system-ui" fontSize="13" fontWeight="700" fill="#fff" opacity="0.95">Official Hunter&apos;s License</text>
      <text x="28" y="39" fontFamily="system-ui" fontSize="9.5" fill={c} opacity="0.75" letterSpacing="1.5">HUNTER LICENSE  &gt;&gt;&gt;</text>
      {/* Name strip */}
      <polygon points="18,68 432,68 420,106 18,106" fill={c} fillOpacity="0.9"/>
      <polygon points="18,68 432,68 420,106 18,106" fill="#000" fillOpacity="0.15"/>
      <text x="28" y="93" fontFamily="system-ui" fontSize="22" fontWeight="900" fill="#fff">BASED HUNTERS</text>
      <text x="28" y="125" fontFamily="system-ui" fontSize="9.5" letterSpacing="5" fill={c} opacity="0.65">BASED  ID</text>
      <line x1="18" y1="138" x2="390" y2="138" stroke={c} strokeWidth="0.4" strokeOpacity="0.2"/>
      <line x1="18" y1="143" x2="200" y2="143" stroke={c} strokeWidth="0.4" strokeOpacity="0.12"/>
      <path d="M20 66 L20 55 L32 55" fill="none" stroke={c} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.6"/>
      <text x="28" y="190" fontFamily="monospace" fontSize="9" letterSpacing="2" fill={c} opacity="0.12">{lic}</text>
      {/* Rank badge */}
      <rect x="400" y="52" width="120" height="158" fill={`url(#rb${rankIdx})`}/>
      <rect x="400" y="52" width="1.5" height="158" fill={c} fillOpacity="0.45"/>
      <text x="413" y="142" fontFamily="system-ui" fontSize="22" fontWeight="900" fill={c} opacity="0.5">&#9668;&#9668;</text>
      <text x="460" y="138" textAnchor="middle" dominantBaseline="middle" fontFamily="system-ui" fontSize="68" fontWeight="900" fill={c} filter={`url(#gf${rankIdx})`}>{r.label}</text>
      <rect x="418" y="163" width="84" height="22" rx="3" fill={c} fillOpacity="0.2" stroke={c} strokeWidth="0.8" strokeOpacity="0.6"/>
      <text x="460" y="178" textAnchor="middle" fontFamily="system-ui" fontSize="10" fontWeight="800" letterSpacing="3" fill="#fff">RANK</text>
      <text x="460" y="200" textAnchor="middle" fontFamily="system-ui" fontSize="10" fill={c} opacity="0.85" fontWeight="700">{r.cls}</text>
      {/* Bottom */}
      <rect x="0" y="210" width="520" height="120" fill={`url(#bt${rankIdx})`}/>
      <rect x="0" y="210" width="520" height="1" fill={c} fillOpacity="0.18"/>
      <text x="300" y="285" textAnchor="middle" fontFamily="system-ui" fontSize="68" fontWeight="900" fill={c} opacity="0.04" transform="rotate(-8,300,285)">HUNTERS</text>
      <text x="76" y="228" fontFamily="system-ui" fontSize="8" fill="#475569">Class</text>
      <text x="115" y="228" fontFamily="system-ui" fontSize="8.5" fill={c} fontWeight="700">{r.name}</text>
      <text x="76" y="245" fontFamily="system-ui" fontSize="8" fill="#475569">License</text>
      <text x="115" y="245" fontFamily="monospace" fontSize="8.5" fill="#cbd5e1">{lic}</text>
      <line x1="70" y1="252" x2="390" y2="252" stroke="#fff" strokeWidth="0.3" strokeOpacity="0.1"/>
      <text x="76" y="265" fontFamily="system-ui" fontSize="8" fill="#475569">Affiliation</text>
      <text x="120" y="265" fontFamily="system-ui" fontSize="8.5" fill="#94a3b8">N/A</text>
      <text x="76" y="280" fontFamily="system-ui" fontSize="8" fill="#475569">Issued by</text>
      <text x="120" y="280" fontFamily="system-ui" fontSize="8.5" fill="#94a3b8">Based ID Hunters Association</text>
      {/* Chip */}
      <rect x="18" y="218" width="42" height="32" rx="4" fill="#c9a227" fillOpacity="0.85"/>
      <rect x="18" y="218" width="42" height="32" rx="4" fill="none" stroke="#a07a10" strokeWidth="0.5"/>
      <line x1="18" y1="228" x2="60" y2="228" stroke="#a07a10" strokeWidth="0.5"/>
      <line x1="18" y1="238" x2="60" y2="238" stroke="#a07a10" strokeWidth="0.5"/>
      <line x1="32" y1="218" x2="32" y2="250" stroke="#a07a10" strokeWidth="0.5"/>
      <line x1="46" y1="218" x2="46" y2="250" stroke="#a07a10" strokeWidth="0.5"/>
      {[20,34,48].map(x=><rect key={x} x={x} y="220" width="10" height="10" rx="1" fill="#b8860b" fillOpacity="0.6"/>)}
      {[20,34,48].map(x=><rect key={x+100} x={x} y="240" width="10" height="8" rx="1" fill="#b8860b" fillOpacity="0.5"/>)}
      {/* Barcode */}
      {[[145,3],[150,2],[154,3],[161,1],[165,1],[170,1],[174,3],[179,1],[184,3],[189,2],[193,2],[198,3],[203,2],[208,1]].map(([x,w])=><rect key={x} x={x} y="248" width={w} height="44" fill={c} opacity="0.65"/>)}
      <text x="303" y="300" textAnchor="middle" fontFamily="monospace" fontSize="7.5" letterSpacing="2" fill={c} opacity="0.4">{lic}</text>
      {/* Footer */}
      <rect x="0" y="316" width="520" height="14" fill="#000" fillOpacity="0.45"/>
      <rect x="0" y="327.5" width="520" height="2.5" fill={c} fillOpacity="0.4"/>
      <text x="260" y="324" textAnchor="middle" fontFamily="system-ui" fontSize="6.5" letterSpacing="2" fill={c} opacity="0.25">BASEDID.SPACE  ·  OFFICIAL HUNTER LICENSE</text>
      <rect x="0.5" y="0.5" width="519" height="329" rx="12.5" fill="none" stroke={c} strokeWidth="0.8" strokeOpacity="0.4"/>
    </svg>
  );
}

export function HuntersClaim() {
  const { address, isConnected } = useAccount();
  const [updatingRank, setUpdatingRank] = useState(false);
  const [previewRank,  setPreviewRank]  = useState(0);

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
      if (data.newRank === currentRank) { toast("Keep entering drops to level up!"); return; }
      writeRank(
        { address: HUNTERS_ADDRESS, abi: HUNTERS_ABI, functionName: "updateRank", args: [address, data.newRank, BigInt(data.nonce), data.sig as `0x${string}`] },
        { onError: (e) => toast.error(e.message.split("\n")[0]) }
      );
    } catch { toast.error("Something went wrong"); }
    finally { setUpdatingRank(false); }
  }

  const displayRank  = hasClaimed ? currentRank : previewRank;
  const activeColor  = RANK_DATA[displayRank].color;
  const tokenIdStr   = hasClaimed ? (tokenId as bigint).toString() : undefined;
  const supplyNum    = totalSupply !== undefined ? Number(totalSupply as bigint) : null;

  return (
    <div className="flex-1 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 50% at 30% 40%, ${activeColor}0d, transparent 70%)` }} />

      <div className="relative max-w-7xl mx-auto px-6 py-16 space-y-20">

        {/* ── HERO ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — Card */}
          <div className="space-y-6">
            {/* Glow behind card */}
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl blur-2xl scale-95 opacity-30 transition-all duration-500"
                style={{ background: activeColor }} />
              <div className="relative">
                <HunterCard rankIdx={displayRank} tokenId={tokenIdStr} />
              </div>
            </div>

            {/* Rank switcher */}
            {!hasClaimed && (
              <div className="space-y-2">
                <p className="text-zinc-600 text-xs uppercase tracking-[0.2em]">Preview all ranks</p>
                <div className="grid grid-cols-7 gap-2">
                  {RANK_DATA.map((r, i) => (
                    <button key={r.label} onClick={() => setPreviewRank(i)}
                      className="rounded-xl py-3 text-center border transition-all duration-200"
                      style={{
                        borderColor: previewRank === i ? r.color + "60" : "rgba(255,255,255,0.06)",
                        background:  previewRank === i ? r.color + "12" : "rgba(255,255,255,0.01)",
                        boxShadow:   previewRank === i ? `0 0 20px ${r.color}20` : "none",
                      }}>
                      <span className="text-base font-black" style={{ color: r.color }}>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Supply counter */}
            {supplyNum !== null && (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-zinc-500 text-sm">
                  <span className="text-white font-semibold">{supplyNum.toLocaleString()}</span> hunters claimed
                </span>
              </div>
            )}
          </div>

          {/* Right — Content */}
          <div className="space-y-10">
            {/* Heading */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-400 text-xs font-medium uppercase tracking-[0.2em]">Live on Base</span>
              </div>
              <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-none text-white" style={D}>
                Based<br />Hunters
              </h1>
              <p className="text-zinc-400 text-lg leading-relaxed max-w-md">
                Soulbound Hunter License NFT. Claim free with any Based ID. Your rank rises as you explore Base — synced on-chain.
              </p>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-8">
              {[
                { label: "Mint price", value: "Free" },
                { label: "Ranks",      value: "7" },
                { label: "Type",       value: "Soulbound" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-white font-black text-2xl" style={D}>{value}</p>
                  <p className="text-zinc-600 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* How ranks work */}
            <div className="space-y-3">
              <p className="text-zinc-500 text-xs uppercase tracking-[0.2em]">How to level up</p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { icon: "🎯", text: "Enter drops to earn activity points" },
                  { icon: "🏆", text: "Win raffles for bonus rank score" },
                  { icon: "⬆️", text: "Click 'Sync rank' to push new rank on-chain" },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-3 rounded-xl px-4 py-3 border border-white/[0.05] bg-white/[0.01]">
                    <span className="text-lg">{icon}</span>
                    <span className="text-zinc-400 text-sm">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action panel */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4 backdrop-blur-sm">
              {!isConnected ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-white font-bold text-lg" style={D}>Ready to claim?</p>
                    <p className="text-zinc-500 text-sm mt-1">Connect your wallet to get started.</p>
                  </div>
                  <ConnectButton />
                </div>
              ) : holdsId === false ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-red-900/30 bg-red-950/10 px-4 py-3">
                    <p className="text-red-300 text-sm font-medium">No Based ID found on this wallet</p>
                    <p className="text-zinc-500 text-xs mt-0.5">You need a Based ID to claim a Hunter.</p>
                  </div>
                  <Link href="/" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors">
                    Mint Based ID — $2 →
                  </Link>
                </div>
              ) : hasClaimed ? (
                <div className="space-y-4">
                  {/* Current rank display */}
                  <div className="flex items-center gap-4 p-4 rounded-xl border" style={{ borderColor: activeColor + "30", background: activeColor + "08" }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center border flex-shrink-0"
                      style={{ borderColor: activeColor + "40", background: activeColor + "12" }}>
                      <span className="font-black text-2xl" style={{ color: activeColor }}>{RANK_DATA[currentRank].label}</span>
                    </div>
                    <div>
                      <p className="text-white font-bold" style={D}>Hunter #{tokenIdStr}</p>
                      <p className="text-sm" style={{ color: activeColor }}>{RANK_DATA[currentRank].name}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-zinc-600 text-xs">License</p>
                      <p className="text-zinc-400 text-xs font-mono mt-0.5">HA-2026-{tokenIdStr?.padStart(4,"0")}</p>
                    </div>
                  </div>
                  <button onClick={handleUpdateRank} disabled={updatingRank || rankPending || rankConfirming}
                    className="w-full py-3.5 rounded-xl border border-white/[0.1] text-white text-sm font-bold hover:bg-white/[0.05] transition-colors disabled:opacity-40">
                    {updatingRank || rankPending || rankConfirming ? "Syncing rank…" : "Sync rank on-chain"}
                  </button>
                  <p className="text-zinc-700 text-xs text-center">Enter more drops to increase your score, then sync</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-white font-bold text-lg" style={D}>Claim your Hunter</p>
                    <p className="text-zinc-500 text-sm mt-1">Free to mint · gas only · starts at E-Rank · soulbound forever</p>
                  </div>
                  <button onClick={handleClaim} disabled={claimPending || claimConfirming}
                    className="w-full py-4 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors disabled:opacity-30"
                    style={{ boxShadow: "0 4px 40px rgba(255,255,255,0.1)" }}>
                    {claimPending || claimConfirming ? "Claiming…" : "Claim free Hunter NFT →"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RANK TIER TABLE ── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-white" style={D}>Rank tiers</h2>
            <p className="text-zinc-600 text-sm">Score based on drops entered + wins</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {RANK_DATA.map((r, i) => (
              <div key={r.label} className="rounded-2xl border p-5 space-y-3 transition-all"
                style={{
                  borderColor: hasClaimed && i === currentRank ? r.color + "50" : "rgba(255,255,255,0.06)",
                  background:  hasClaimed && i === currentRank ? r.color + "0a" : "rgba(255,255,255,0.01)",
                }}>
                <div className="flex items-center justify-between">
                  <span className="font-black text-3xl" style={{ color: r.color }}>{r.label}</span>
                  {hasClaimed && i === currentRank && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border" style={{ color: r.color, borderColor: r.color + "40" }}>YOU</span>
                  )}
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">{r.name}</p>
                  <p className="text-zinc-600 text-[10px] mt-0.5">{r.threshold}+ score</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
