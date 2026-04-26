"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt,
} from "wagmi";
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  BASED_ID_ADDRESS, USDC_ADDRESS, MINT_PRICE, BASED_ID_ABI, ERC20_ABI, BASESCAN_URL,
} from "@/lib/contracts";
import { NftCard } from "./NftCard";
import CountUp from "./components/CountUp";
import { motion, AnimatePresence } from "motion/react";
import { DropCard } from "./drops/DropCard";
import { AuroraBackground } from "./components/BackgroundEffects";
import type { Drop } from "@/lib/supabase";

type MintState = "idle" | "approving" | "approved" | "minting" | "success";
const D: React.CSSProperties = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const ease = [0.16, 1, 0.3, 1] as const;

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay, ease }}>
      {children}
    </motion.div>
  );
}

const HOW_STEPS = [
  {
    n: "01",
    title: "Connect wallet",
    desc: "Use any Base-compatible wallet — Coinbase Wallet, MetaMask, or WalletConnect.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
  },
  {
    n: "02",
    title: "Approve $2 USDC",
    desc: "One-time approval. $2 paid once — permanent access, never charged again.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><path d="M14.8 9A2 2 0 0 0 13 8h-2a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-2a2 2 0 0 1-1.8-1M12 7v1m0 8v1"/>
      </svg>
    ),
  },
  {
    n: "03",
    title: "Mint your Based ID",
    desc: "Your NFT is minted on Base. Immediate, permanent, verifiable onchain.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
  },
  {
    n: "04",
    title: "Access everything",
    desc: "Enter drops, claim your Hunter NFT, earn XP, and win raffles. Full ecosystem access.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
  },
];

// Hunter rank data used for the rotating card showcase
const HUNTER_RANKS = [
  { label:"E", color:"#94a3b8", name:"E-Rank Hunter",   cls:"E-CLASS",  d1:"#1a1c26", d2:"#030508" },
  { label:"D", color:"#a3e635", name:"D-Rank Hunter",   cls:"D-CLASS",  d1:"#141d09", d2:"#030508" },
  { label:"C", color:"#34d399", name:"C-Rank Hunter",   cls:"C-CLASS",  d1:"#071a13", d2:"#030508" },
  { label:"B", color:"#60a5fa", name:"B-Rank Hunter",   cls:"B-CLASS",  d1:"#071528", d2:"#030508" },
  { label:"A", color:"#c084fc", name:"A-Rank Hunter",   cls:"A-CLASS",  d1:"#160826", d2:"#030508" },
  { label:"S", color:"#f97316", name:"S-Rank Hunter",   cls:"S-CLASS",  d1:"#1e0d04", d2:"#030508" },
  { label:"N", color:"#fcd34d", name:"National Hunter", cls:"NATIONAL", d1:"#1a1404", d2:"#030508" },
];

function HunterLicenseCard({ rankIdx }: { rankIdx: number }) {
  const r = HUNTER_RANKS[rankIdx];
  const c = r.color;
  const uid = `lp${rankIdx}`;
  const lic = "HA-2026-????";
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 330" className="w-full rounded-xl">
      <defs>
        <linearGradient id={`bg${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={r.d1}/><stop offset="100%" stopColor={r.d2}/></linearGradient>
        <linearGradient id={`hd${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#090c15"/><stop offset="100%" stopColor="#05070d"/></linearGradient>
        <radialGradient id={`rb${uid}`} cx="50%" cy="30%" r="75%"><stop offset="0%" stopColor={c} stopOpacity="0.32"/><stop offset="100%" stopColor={c} stopOpacity="0.05"/></radialGradient>
        <linearGradient id={`bt${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#04060d"/><stop offset="100%" stopColor="#020409"/></linearGradient>
        <filter id={`gf${uid}`}><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <clipPath id={`cl${uid}`}><rect width="520" height="330" rx="13"/></clipPath>
      </defs>
      <rect width="520" height="330" fill={`url(#bg${uid})`} rx="13"/>
      <g clipPath={`url(#cl${uid})`}>{[-84,-42,0,42,84,126,168,210].map((x,i)=><line key={i} x1={x} y1="0" x2={x+330} y2="330" stroke={c} strokeWidth="0.4" strokeOpacity="0.05"/>)}</g>
      <rect x="0" y="0" width="520" height="52" fill={`url(#hd${uid})`}/>
      <rect x="0" y="0" width="520" height="2.5" fill={c} fillOpacity="0.9"/>
      <rect x="0" y="51" width="520" height="1" fill={c} fillOpacity="0.15"/>
      <text x="28" y="21" fontFamily="system-ui" fontSize="13" fontWeight="700" fill="#fff" opacity="0.95">Official Hunter&apos;s License</text>
      <text x="28" y="39" fontFamily="system-ui" fontSize="9.5" fill={c} opacity="0.75" letterSpacing="1.5">HUNTER LICENSE  &gt;&gt;&gt;</text>
      <polygon points="18,68 432,68 420,106 18,106" fill={c} fillOpacity="0.9"/>
      <polygon points="18,68 432,68 420,106 18,106" fill="#000" fillOpacity="0.15"/>
      <text x="28" y="93" fontFamily="system-ui" fontSize="22" fontWeight="900" fill="#fff">BASED HUNTERS</text>
      <text x="28" y="125" fontFamily="system-ui" fontSize="9.5" letterSpacing="5" fill={c} opacity="0.65">BASED  ID</text>
      <line x1="18" y1="138" x2="390" y2="138" stroke={c} strokeWidth="0.4" strokeOpacity="0.2"/>
      <path d="M20 66 L20 55 L32 55" fill="none" stroke={c} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.6"/>
      <text x="28" y="190" fontFamily="monospace" fontSize="9" letterSpacing="2" fill={c} opacity="0.12">{lic}</text>
      <rect x="400" y="52" width="120" height="158" fill={`url(#rb${uid})`}/>
      <rect x="400" y="52" width="1.5" height="158" fill={c} fillOpacity="0.45"/>
      <text x="413" y="142" fontFamily="system-ui" fontSize="22" fontWeight="900" fill={c} opacity="0.5">&#9668;&#9668;</text>
      <text x="460" y="138" textAnchor="middle" dominantBaseline="middle" fontFamily="system-ui" fontSize="68" fontWeight="900" fill={c} filter={`url(#gf${uid})`}>{r.label}</text>
      <rect x="418" y="163" width="84" height="22" rx="3" fill={c} fillOpacity="0.2" stroke={c} strokeWidth="0.8" strokeOpacity="0.6"/>
      <text x="460" y="178" textAnchor="middle" fontFamily="system-ui" fontSize="10" fontWeight="800" letterSpacing="3" fill="#fff">RANK</text>
      <text x="460" y="200" textAnchor="middle" fontFamily="system-ui" fontSize="10" fill={c} opacity="0.85" fontWeight="700">{r.cls}</text>
      <rect x="0" y="210" width="520" height="120" fill={`url(#bt${uid})`}/>
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
      <rect x="18" y="218" width="42" height="32" rx="4" fill="#c9a227" fillOpacity="0.85"/>
      <rect x="18" y="218" width="42" height="32" rx="4" fill="none" stroke="#a07a10" strokeWidth="0.5"/>
      <line x1="18" y1="228" x2="60" y2="228" stroke="#a07a10" strokeWidth="0.5"/>
      <line x1="18" y1="238" x2="60" y2="238" stroke="#a07a10" strokeWidth="0.5"/>
      <line x1="32" y1="218" x2="32" y2="250" stroke="#a07a10" strokeWidth="0.5"/>
      <line x1="46" y1="218" x2="46" y2="250" stroke="#a07a10" strokeWidth="0.5"/>
      {[20,34,48].map(x=><rect key={x} x={x} y="220" width="10" height="10" rx="1" fill="#b8860b" fillOpacity="0.6"/>)}
      {[20,34,48].map(x=><rect key={x+100} x={x} y="240" width="10" height="8" rx="1" fill="#b8860b" fillOpacity="0.5"/>)}
      {[[145,3],[150,2],[154,3],[161,1],[165,1],[170,1],[174,3],[179,1],[184,3],[189,2],[193,2],[198,3],[203,2],[208,1]].map(([x,w])=><rect key={x} x={x} y="248" width={w} height="44" fill={c} opacity="0.65"/>)}
      <text x="303" y="300" textAnchor="middle" fontFamily="monospace" fontSize="7.5" letterSpacing="2" fill={c} opacity="0.4">{lic}</text>
      <rect x="0" y="316" width="520" height="14" fill="#000" fillOpacity="0.45"/>
      <rect x="0" y="327.5" width="520" height="2.5" fill={c} fillOpacity="0.4"/>
      <text x="260" y="324" textAnchor="middle" fontFamily="system-ui" fontSize="6.5" letterSpacing="2" fill={c} opacity="0.25">BASEDID.SPACE  ·  OFFICIAL HUNTER LICENSE</text>
      <rect x="0.5" y="0.5" width="519" height="329" rx="12.5" fill="none" stroke={c} strokeWidth="0.8" strokeOpacity="0.4"/>
    </svg>
  );
}

function RotatingHunterCard() {
  const [idx, setIdx] = useState(3); // start at B-rank
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % HUNTER_RANKS.length), 3000);
    return () => clearInterval(t);
  }, []);
  const active = HUNTER_RANKS[idx];
  return (
    <div className="space-y-5">
      {/* Card with drop shadow matching rank color */}
      <div className="relative">
        <div className="absolute inset-0 rounded-xl blur-2xl opacity-20 scale-95 transition-all duration-700"
          style={{ background: active.color }} />
        <AnimatePresence mode="wait">
          <motion.div key={idx}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 1.01 }}
            transition={{ duration: 0.35, ease: [0.16,1,0.3,1] }}
            className="relative">
            <HunterLicenseCard rankIdx={idx} />
          </motion.div>
        </AnimatePresence>
      </div>
      {/* Rank selector */}
      <div className="flex justify-center gap-2 flex-wrap">
        {HUNTER_RANKS.map((r, i) => (
          <button key={r.label} onClick={() => setIdx(i)}
            className="px-2.5 py-1 rounded-full border text-[11px] font-bold transition-all duration-200"
            style={{
              color:        i === idx ? r.color : "#52525b",
              borderColor:  i === idx ? r.color + "50" : "rgba(255,255,255,0.07)",
              background:   i === idx ? r.color + "12" : "transparent",
            }}>
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const ACCESS_FEATURES = [
  { label: "Browse drops & projects",    locked: false },
  { label: "Enter drops & win raffles",  locked: true  },
  { label: "Claim Based Hunter NFT",     locked: true  },
  { label: "Earn XP & rank up",          locked: true  },
  { label: "Daily check-ins & streaks",  locked: true  },
  { label: "Leaderboard & rewards",      locked: true  },
];

const FAQ_ITEMS = [
  { q: "What is Based ID?",        a: "A $2 NFT on Base that acts as your permanent platform pass. It proves you're a real, committed participant and unlocks every feature: drops, hunters, leaderboard, and rewards." },
  { q: "Why does it cost $2?",     a: "The $2 price filters bots and empty wallets. You pay once, hold forever, and access everything indefinitely. It's the lowest viable commitment that ensures a quality community." },
  { q: "Can I browse without one?",a: "Yes. Anyone can browse drops, projects, and leaderboards. But to enter a drop, claim a Hunter NFT, or earn XP, you need a Based ID." },
  { q: "What are Based Hunters?",  a: "Free soulbound NFTs for Based ID holders. Your Hunter License card shows your rank (E → National), which rises as you enter drops, win raffles, and check in daily." },
  { q: "Is the ID tradeable?",     a: "Yes. Based ID is a standard ERC-721 — you can transfer or sell it. Only the current holder gets platform access." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen(o => !o)} className="w-full text-left border-b border-white/[0.06] py-5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-white text-sm font-medium">{q}</span>
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.18 }} className="text-zinc-600 flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="7" y1="2" x2="7" y2="12"/><line x1="2" y1="7" x2="12" y2="7"/></svg>
        </motion.div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden">
            <p className="text-zinc-500 text-sm leading-relaxed mt-3 pr-6">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const [mintState, setMintState] = useState<MintState>("idle");
  const [mintedId,  setMintedId]  = useState<bigint | null>(null);
  const [errorMsg,  setErrorMsg]  = useState("");
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [liveDrops, setLiveDrops] = useState<Drop[]>([]);

  const { data: totalMinted, refetch: refetchTotal } = useReadContract({
    address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "totalMinted",
    query: { refetchInterval: 5000 },
  });
  const { data: nextId, refetch: refetchNext } = useReadContract({
    address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "nextTokenId",
    query: { refetchInterval: 5000 },
  });
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "allowance",
    args: [address as `0x${string}`, BASED_ID_ADDRESS],
    query: { enabled: !!address },
  });
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: { enabled: !!address },
  });

  const hasAllowance = allowance !== undefined && allowance >= MINT_PRICE;
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!isConfirmed || !receipt) return;
    if (mintState === "approving") {
      setMintState("approved"); refetchAllowance();
      toast.success("USDC approved — ready to mint");
    } else if (mintState === "minting") {
      const log = receipt.logs.find(
        l => l.address.toLowerCase() === BASED_ID_ADDRESS.toLowerCase() && l.topics.length === 3
      );
      const newId = log?.topics[2] ? BigInt(log.topics[2]) : null;
      if (newId) setMintedId(newId);
      setMintState("success"); refetchTotal(); refetchNext();
      toast.success(newId ? `Based ID #${newId.toString()} minted!` : "Minted successfully!");
    }
  }, [isConfirmed, receipt, mintState, refetchAllowance, refetchTotal, refetchNext]);

  useEffect(() => {
    fetch("/api/drops").then(r => r.json())
      .then(d => { if (Array.isArray(d)) setLiveDrops(d.slice(0, 6)); })
      .catch(() => {});
  }, []);

  const handleApprove = useCallback(() => {
    setErrorMsg(""); setMintState("approving");
    writeContract(
      { address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "approve", args: [BASED_ID_ADDRESS, MINT_PRICE] },
      { onError: e => { const m = e.message.split("\n")[0]; setErrorMsg(m); setMintState("idle"); toast.error(m); } }
    );
  }, [writeContract]);

  const handleMint = useCallback(() => {
    setErrorMsg(""); setMintState("minting");
    writeContract(
      { address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "mint" },
      { onError: e => { const m = e.message.split("\n")[0]; setErrorMsg(m); setMintState("approved"); toast.error(m); } }
    );
  }, [writeContract]);

  const handleReset = useCallback(() => {
    setMintState("idle"); setMintedId(null); setErrorMsg(""); refetchAllowance();
  }, [refetchAllowance]);

  const isLoading           = isPending || isConfirming;
  const insufficientBalance = usdcBalance !== undefined && usdcBalance < MINT_PRICE;
  const resolvedNextId      = nextId !== undefined ? (nextId <= BigInt(100) ? BigInt(101) : nextId) : BigInt(101);
  const previewId           = mintState === "success" && mintedId ? `#${mintedId.toString()}` : `#${resolvedNextId.toString()}`;

  return (
    <div className="min-h-screen bg-[#060608] text-white overflow-x-hidden">
      <AuroraBackground />

      {/* ── NAV ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-black/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Based ID" className="w-6 h-6 rounded-md" />
            <span style={D} className="font-bold text-[13px] tracking-tight">Based ID</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7">
            {[["Drops","/drops"],["Calendar","/calendar"],["Hunters","/hunters"],["Projects","/projects"],["Dashboard","/dashboard"]].map(([l,h])=>(
              <Link key={h} href={h} className="text-[13px] text-zinc-400 hover:text-white transition-colors">{l}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden md:block"><ConnectButton showBalance={false} chainStatus="icon" /></div>
            <button className="md:hidden p-1.5 text-zinc-500 hover:text-white" onClick={() => setMenuOpen(o=>!o)}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                {menuOpen ? <><line x1="3" y1="3" x2="15" y2="15"/><line x1="15" y1="3" x2="3" y2="15"/></> : <><line x1="3" y1="5" x2="15" y2="5"/><line x1="3" y1="9" x2="15" y2="9"/><line x1="3" y1="13" x2="15" y2="13"/></>}
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-white/[0.05] bg-black/95">
            <nav className="px-6 py-4 space-y-0.5">
              {[["Drops","/drops"],["Calendar","/calendar"],["Hunters","/hunters"],["Projects","/projects"],["Dashboard","/dashboard"]].map(([l,h])=>(
                <Link key={h} href={h} onClick={()=>setMenuOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-white/[0.04]">{l}</Link>
              ))}
              <div className="pt-3 pb-1"><ConnectButton showBalance={false} chainStatus="icon" /></div>
            </nav>
          </div>
        )}
      </header>

      {/* All page content — above the fixed background */}
      <div className="relative z-10">

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center pt-14">

        <div className="relative max-w-7xl mx-auto px-6 py-20 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-16 items-center">

            {/* Left — tagline only */}
            <div className="space-y-8">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}
                className="space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.1] bg-white/[0.03]">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[11px] text-zinc-400 font-medium tracking-wide">Live on Base mainnet</span>
                </div>
                <h1 className="text-[clamp(3rem,6.5vw,5.5rem)] font-black tracking-tight leading-[1.03]" style={D}>
                  The Based<br />
                  Hunter<br />
                  <span className="text-blue-400">Ecosystem.</span>
                </h1>
                <p className="text-zinc-400 text-lg leading-relaxed max-w-md">
                  Enter drops, earn your Hunter rank, collect XP, and win rewards. Based ID is your key to everything built on Base.
                </p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.12, ease }}>
                <Link href="/drops"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.1] text-zinc-300 text-sm font-medium hover:border-white/[0.25] hover:text-white transition-all">
                  Browse drops →
                </Link>
              </motion.div>
            </div>

            {/* Right — Mint card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease }}
              className="flex justify-center lg:justify-end" id="mint-card">
              <div className="w-full max-w-[380px] space-y-3">

                {/* NFT preview */}
                <div className="relative rounded-2xl border border-white/[0.08] overflow-hidden">
                  <NftCard id={previewId} />
                </div>

                {/* Mint panel */}
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-5 space-y-4">
                  {mintState === "success" ? (
                    <div className="text-center space-y-4 py-2">
                      <div className="w-11 h-11 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-8" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <div>
                        <p className="text-white font-bold" style={D}>Based ID {previewId} minted!</p>
                        <p className="text-zinc-500 text-sm mt-1">Full platform access unlocked.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Link href="/drops" className="py-2.5 rounded-xl border border-white/[0.08] text-zinc-200 text-sm font-medium text-center hover:bg-white/[0.04] transition-colors">Browse drops</Link>
                        <Link href="/hunters" className="py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold text-center hover:bg-blue-500 transition-colors">Claim Hunter →</Link>
                      </div>
                      <a href={`${BASESCAN_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="block text-zinc-600 text-xs hover:text-zinc-400 transition-colors">View on Basescan ↗</a>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-bold text-[15px]" style={D}>Based ID NFT</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-black text-2xl" style={D}>$2</p>
                          <p className="text-zinc-600 text-xs">USDC</p>
                        </div>
                      </div>

                      {!isConnected ? (
                        <ConnectButton.Custom>
                          {({ openConnectModal }) => (
                            <button onClick={openConnectModal} className="w-full py-3.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-colors" style={{boxShadow:"0 4px 20px rgba(37,99,235,0.4)"}}>
                              Connect wallet to mint
                            </button>
                          )}
                        </ConnectButton.Custom>
                      ) : insufficientBalance ? (
                        <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-center">
                          <p className="text-amber-300 text-sm font-medium">Insufficient USDC</p>
                          <p className="text-zinc-500 text-xs mt-0.5">You need $2 USDC on Base.</p>
                        </div>
                      ) : !hasAllowance && mintState === "idle" ? (
                        <button onClick={handleApprove} disabled={isLoading} className="w-full py-3.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 disabled:opacity-50 transition-colors" style={{boxShadow:"0 4px 20px rgba(37,99,235,0.4)"}}>
                          Approve $2 USDC
                        </button>
                      ) : mintState === "approving" ? (
                        <button disabled className="w-full py-3.5 rounded-xl bg-blue-600/50 text-white text-sm font-bold">Approving… confirm in wallet</button>
                      ) : (hasAllowance || mintState === "approved") ? (
                        <button onClick={handleMint} disabled={isLoading} className="w-full py-3.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 disabled:opacity-50 transition-colors" style={{boxShadow:"0 4px 20px rgba(255,255,255,0.12)"}}>
                          {isLoading ? "Minting…" : "Mint Based ID — $2"}
                        </button>
                      ) : null}

                      {errorMsg && <p className="text-red-400 text-xs text-center">{errorMsg}</p>}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-24 space-y-16">

          {/* Header */}
          <Reveal>
            <div className="text-center space-y-3 max-w-lg mx-auto">
              <p className="text-blue-400 text-[11px] font-semibold uppercase tracking-[0.3em]">Get started in minutes</p>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight" style={D}>How it works</h2>
              <p className="text-zinc-500 text-base">From zero to full access in under 2 minutes.</p>
            </div>
          </Reveal>

          {/* Steps */}
          <div className="relative">
            {/* Connecting line — desktop only */}
            <div className="hidden lg:block absolute top-[52px] left-[calc(12.5%+20px)] right-[calc(12.5%+20px)] h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 15%, rgba(255,255,255,0.08) 85%, transparent)" }} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {HOW_STEPS.map(({ n, title, desc, icon }, i) => (
                <Reveal key={n} delay={i * 0.08}>
                  <div className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 h-full overflow-hidden
                    hover:border-blue-500/30 hover:bg-white/[0.04] transition-all duration-300 cursor-default">

                    {/* Hover gradient top border */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent
                      opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Large watermark step number */}
                    <span className="absolute -right-2 -top-4 text-[80px] font-black text-white/[0.03] select-none leading-none pointer-events-none"
                      style={D}>{n}</span>

                    <div className="relative space-y-5">
                      {/* Icon + step number row */}
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl border border-white/[0.08] bg-white/[0.03]
                          flex items-center justify-center text-zinc-400
                          group-hover:border-blue-500/30 group-hover:text-blue-400 group-hover:bg-blue-500/[0.06]
                          transition-all duration-300">
                          {icon}
                        </div>
                        <span className="font-mono text-[11px] text-zinc-700 tracking-widest">{n}</span>
                      </div>

                      {/* Text */}
                      <div className="space-y-2">
                        <p className="text-white font-bold text-[15px] leading-snug" style={D}>{title}</p>
                        <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* CTA under steps */}
          <Reveal delay={0.2}>
            <div className="text-center">
              <a href="#mint-card"
                onClick={e=>{e.preventDefault();document.getElementById("mint-card")?.scrollIntoView({behavior:"smooth"});}}
                className="inline-flex items-center gap-2 text-zinc-500 text-sm hover:text-white transition-colors group">
                <span>Ready to mint?</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                  className="group-hover:translate-x-1 transition-transform">
                  <path d="M2 7h10M8 3l4 4-4 4"/>
                </svg>
              </a>
            </div>
          </Reveal>

        </div>
      </section>

      {/* ── LIVE DROPS ── */}
      <section className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-20 space-y-8">
          <Reveal>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${liveDrops.length>0?"bg-green-500 animate-pulse":"bg-zinc-700"}`}/>
                  <span className={`text-xs font-medium ${liveDrops.length>0?"text-green-400":"text-zinc-600"}`}>
                    {liveDrops.length>0?`${liveDrops.length} drop${liveDrops.length!==1?"s":""} live`:"No active drops"}
                  </span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={D}>Live drops</h2>
                <p className="text-zinc-500 text-sm max-w-sm">Airdrops, NFT mints, whitelists, raffles. Hold a Based ID to enter any drop.</p>
              </div>
              <Link href="/drops" className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0">View all →</Link>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            {liveDrops.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveDrops.map(d=><DropCard key={d.id} drop={d} featured={d.tier==="featured"}/>)}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] px-8 py-16 text-center space-y-4">
                <p className="text-zinc-400 font-bold text-xl" style={D}>First drops coming soon</p>
                <p className="text-zinc-600 text-sm">Be the first partner to list. Standard listings are free.</p>
                <Link href="/partner" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.1] text-zinc-200 text-sm font-medium hover:border-white/20 transition-colors">
                  List a drop →
                </Link>
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {/* ── BASED HUNTERS ── */}
      <section className="border-t border-white/[0.06] relative">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <Reveal>
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/25 bg-blue-500/[0.06]">
                  <span className="text-blue-400 text-[11px] font-medium">Exclusive to Based ID holders</span>
                </div>
                <h2 className="text-4xl font-black tracking-tight" style={D}>Based Hunters</h2>
                <p className="text-zinc-400 text-base leading-relaxed max-w-md">
                  Claim a free soulbound Hunter License NFT. Your rank rises from E to National as you enter drops, win raffles, and check in daily.
                </p>
                <div className="space-y-3">
                  {[
                    ["7 rank tiers",          "E → D → C → B → A → S → National"],
                    ["Multiple XP sources",   "Drops (+10 XP), wins (+50 XP), daily check-ins (+5 XP)"],
                    ["Rank synced on-chain",  "Your NFT art updates when you level up"],
                  ].map(([title, sub]) => (
                    <div key={title} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 mt-1.5"/>
                      <div>
                        <p className="text-white text-sm font-semibold">{title}</p>
                        <p className="text-zinc-600 text-xs mt-0.5">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/hunters" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-colors">
                  View Based Hunters →
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <RotatingHunterCard />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── FOR PARTNERS ── */}
      <section className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <Reveal>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-center rounded-2xl border border-white/[0.07] bg-white/[0.01] p-8 sm:p-12">
              <div className="space-y-4 max-w-lg">
                <p className="text-zinc-500 text-xs uppercase tracking-[0.2em]">For projects on Base</p>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={D}>
                  Drop to real wallets.<br/>Not bots.
                </h2>
                <p className="text-zinc-400 text-base leading-relaxed">
                  Every Based ID holder paid $2 onchain — no bots, no empty wallets, no sybil farmers. Run your drop in front of Base&apos;s most committed audience. Free to list.
                </p>
                <div className="flex items-center gap-4 flex-wrap">
                  <Link href="/partner" className="px-5 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors">
                    Become a partner →
                  </Link>
                  <Link href="/partner/new" className="text-sm text-zinc-500 hover:text-white transition-colors">
                    Create a drop for free
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:w-80">
                {[
                  {tier:"Standard",price:"Free",   color:"border-white/[0.08]",  features:["Listed in /drops","Partner dashboard","Auto-drawn winners"]},
                  {tier:"Featured",price:"$200 USDC",color:"border-blue-500/30 bg-blue-500/[0.04]",features:["Top placement","Landing page","X announcement"]},
                ].map(({tier,price,color,features})=>(
                  <div key={tier} className={`rounded-xl border p-5 space-y-3 ${color}`}>
                    <div>
                      <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] font-bold">{tier}</p>
                      <p className="text-white font-black text-lg mt-1" style={D}>{price}</p>
                    </div>
                    <ul className="space-y-1.5">
                      {features.map(f=>(
                        <li key={f} className="flex items-start gap-2 text-xs text-zinc-500">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="mt-0.5 flex-shrink-0"><path d="M2 5l2 2 4-4" stroke="#52525b" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 py-20 space-y-10">
          <Reveal>
            <div className="space-y-2">
              <p className="text-zinc-600 text-xs uppercase tracking-[0.25em]">Questions</p>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={D}>FAQ</h2>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="border-t border-white/[0.06]">
              {FAQ_ITEMS.map(item=><FAQItem key={item.q} {...item}/>)}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-white/[0.06] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{background:"radial-gradient(ellipse 70% 80% at 50% 100%, rgba(37,99,235,0.1), transparent 60%)"}}/>
        <div className="relative max-w-4xl mx-auto px-6 py-28 text-center space-y-8">
          <Reveal>
            <h2 className="text-5xl sm:text-6xl font-black tracking-tight leading-none" style={D}>
              Ready to join?
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="text-zinc-400 text-lg max-w-sm mx-auto">
              Mint your Based ID for $2. One transaction. Permanent access. Everything unlocked.
            </p>
          </Reveal>
          <Reveal delay={0.16}>
            <div className="flex items-center gap-4 justify-center flex-wrap">
              <a href="#mint-card" onClick={e=>{e.preventDefault();document.getElementById("mint-card")?.scrollIntoView({behavior:"smooth"});}}
                className="px-8 py-4 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors"
                style={{boxShadow:"0 4px 40px rgba(255,255,255,0.15)"}}>
                Mint Based ID — $2
              </a>
              <Link href="/drops" className="px-8 py-4 rounded-xl border border-white/[0.08] text-zinc-400 text-sm font-medium hover:text-white hover:border-white/[0.16] transition-colors">
                Browse drops first
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.06] px-6 py-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Based ID" className="w-5 h-5 rounded-md opacity-50"/>
            <span className="text-zinc-600 text-sm">Based ID · Built on Base · 2026</span>
          </div>
          <div className="flex items-center gap-6 text-[13px] text-zinc-600">
            {[["Drops","/drops"],["Hunters","/hunters"],["Partners","/partner"],["Calendar","/calendar"]].map(([l,h])=>(
              <Link key={h} href={h} className="hover:text-zinc-300 transition-colors">{l}</Link>
            ))}
            <a href="https://x.com/basedidofficial" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors">@basedidofficial</a>
          </div>
        </div>
      </footer>

      {/* Close z-10 content wrapper */}
      </div>
    </div>
  );
}
