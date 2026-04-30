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
import { motion, AnimatePresence, useInView, animate } from "motion/react";
import { useRef } from "react";
import { CampaignCard } from "./campaigns/CampaignCard";
import { Nav } from "@/app/components/Nav";
import type { Campaign } from "@/lib/supabase";
import { createBrowserClient } from "@/lib/supabase";

type MintState = "idle" | "approving" | "approved" | "minting" | "success";

const D: React.CSSProperties = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const BODY: React.CSSProperties = { fontFamily: "var(--font-sans), system-ui, sans-serif" };
const ease = [0.16, 1, 0.3, 1] as const;

// ── Reveal animation ──────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay, ease }}>
      {children}
    </motion.div>
  );
}

// ── Animated counter ──────────────────────────────────────────────────────────
function AnimatedCounter({ value, prefix = "", suffix = "" }: { value: number | null; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [display, setDisplay] = useState("—");

  useEffect(() => {
    if (!isInView || value === null) return;
    if (value === 0) { setDisplay(prefix + "0" + suffix); return; }
    const controls = animate(0, value, {
      duration: 1.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: v => setDisplay(prefix + Math.floor(v).toLocaleString() + suffix),
    });
    return controls.stop;
  }, [isInView, value, prefix, suffix]);

  return <span ref={ref}>{display}</span>;
}

// ── How it works steps ────────────────────────────────────────────────────────
const HOW_STEPS = [
  {
    n: "01",
    title: "Connect wallet",
    desc: "Use any Base-compatible wallet — Coinbase Wallet, MetaMask, or WalletConnect.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
  },
  {
    n: "02",
    title: "Approve $2 USDC",
    desc: "One-time approval. $2 paid once — permanent access, never charged again.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><path d="M14.8 9A2 2 0 0 0 13 8h-2a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-2a2 2 0 0 1-1.8-1M12 7v1m0 8v1"/>
      </svg>
    ),
  },
  {
    n: "03",
    title: "Mint your Based ID",
    desc: "Your NFT is minted on Base. Immediate, permanent, verifiable onchain.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
  },
  {
    n: "04",
    title: "Access everything",
    desc: "Enter drops, claim your Hunter NFT, earn XP, and win raffles. Full ecosystem access.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
  },
];

// ── Hunter ranks ──────────────────────────────────────────────────────────────
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
      <div className="flex justify-center gap-2 flex-wrap">
        {HUNTER_RANKS.map((r, i) => (
          <button key={r.label} onClick={() => setIdx(i)}
            className="px-2.5 py-1 rounded-full border text-[11px] font-bold transition-all duration-200"
            style={{
              color:        i === idx ? r.color : "#9ca3af",
              borderColor:  i === idx ? r.color + "50" : "rgba(0,0,0,0.15)",
              background:   i === idx ? r.color + "12" : "transparent",
            }}>
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Rank helpers ─────────────────────────────────────────────────────────────
const XP_THRESHOLDS = [0, 300, 800, 2000, 5000, 12000, 30000];
const RANK_BADGE_LABELS = ["E", "D", "C", "B", "A", "S", "N"];
const RANK_BADGE_COLORS = ["#94a3b8","#a3e635","#34d399","#60a5fa","#c084fc","#f97316","#fcd34d"];

function xpToRankIdx(xp: number): number {
  let r = 0;
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) { r = i; break; }
  }
  return r;
}

function addrHue(addr: string): number {
  return parseInt(addr.slice(2, 6), 16) % 360;
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
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
    <button onClick={() => setOpen(o => !o)} className="w-full text-left border-b border-black/[0.07] py-5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-gray-900 text-sm font-semibold" style={BODY}>{q}</span>
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.18 }}
          className="text-gray-400 flex-shrink-0 w-6 h-6 rounded-full border border-black/[0.1] flex items-center justify-center">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="5.5" y1="1" x2="5.5" y2="10"/><line x1="1" y1="5.5" x2="10" y2="5.5"/>
          </svg>
        </motion.div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden">
            <p className="text-gray-500 text-sm leading-relaxed mt-3 pr-8" style={BODY}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const { address, isConnected } = useAccount();
  const [mintState, setMintState] = useState<MintState>("idle");
  const [mintedId,  setMintedId]  = useState<bigint | null>(null);
  const [errorMsg,  setErrorMsg]  = useState("");
  const [liveCampaigns, setLiveCampaigns] = useState<Campaign[]>([]);
  const [topHunters, setTopHunters] = useState<Array<{wallet_address: string; total_xp: number}>>([]);
  const [hunterCount, setHunterCount] = useState<number | null>(null);
  const [totalCampaignCount, setTotalCampaignCount] = useState<number | null>(null);
  const [totalXP, setTotalXP] = useState<number | null>(null);
  const [rewardsPaid, setRewardsPaid] = useState<number | null>(null);

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
    fetch("/api/campaigns").then(r => r.json())
      .then(d => { if (Array.isArray(d)) setLiveCampaigns(d.slice(0, 6)); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const db = createBrowserClient();
    db.from("hunter_xp")
      .select("wallet_address, total_xp")
      .order("total_xp", { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data?.length) setTopHunters(data); });
    fetch("/api/stats")
      .then(r => r.json())
      .then((s: { hunters: number; campaigns: number; total_xp: number; rewards_paid: number }) => {
        setHunterCount(s.hunters);
        setTotalCampaignCount(s.campaigns);
        setTotalXP(s.total_xp);
        setRewardsPaid(s.rewards_paid);
      })
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

  // suppress unused warning — handleReset is available for future use
  void handleReset;

  return (
    <div className="min-h-screen bg-white text-black overflow-x-hidden" style={BODY}>

      {/* ── NAV ── */}
      <Nav />

      {/* ── HERO ── */}
      <section className="relative min-h-[calc(100vh-64px)] flex items-center bg-white overflow-hidden">

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(0,0,0,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.025) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />

        <div className="relative max-w-7xl mx-auto px-6 py-20 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-16 items-center">

            {/* Left — headline + CTAs */}
            <div className="space-y-10">
              <div className="space-y-6">

                {/* Headline — each line staggers in */}
                <h1 style={D} className="font-black text-7xl sm:text-8xl lg:text-9xl uppercase tracking-tight leading-none">
                  {["THE", "HUNTERS", "OF BASE."].map((word, i) => (
                    <motion.span key={word}
                      className="block"
                      style={{ color: i === 2 ? "#0052FF" : "#000" }}
                      initial={{ opacity: 0, x: -24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: i * 0.12, ease }}>
                      {word}
                    </motion.span>
                  ))}
                </h1>

                {/* Subtitle */}
                <motion.p
                  className="text-gray-500 text-lg leading-relaxed max-w-md"
                  style={BODY}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.5, ease }}>
                  The home for quests, drops, and rewards on Base. Browse free. Participate with a Based ID.
                </motion.p>
              </div>

              {/* CTAs */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.14, ease }}
                className="flex items-center gap-3 flex-wrap">
                <Link href="/campaigns"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-sm text-white transition-colors"
                  style={{ background: "#111111" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#333")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#111111")}>
                  Browse Campaigns
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 7h10M8 3l4 4-4 4"/></svg>
                </Link>
                <Link href="/hunters"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-medium text-sm text-gray-600 border transition-colors hover:text-black hover:border-black/[0.3]"
                  style={{ borderColor: "rgba(0,0,0,0.15)" }}>
                  Hunters NFT
                </Link>
              </motion.div>

            </div>

            {/* Right — Mint card with float */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: [24, 0, -6, 0] }}
              transition={{ duration: 2, delay: 0.1, ease, times: [0, 0.4, 0.7, 1] }}
              className="flex justify-center lg:justify-end" id="mint-card">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                className="w-full max-w-[400px]">
                <div className="rounded-3xl overflow-hidden" style={{ background: "#0d0d0d" }}>

                  {/* Label */}
                  <div className="px-5 pt-5 pb-2 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.35em] text-gray-600" style={D}>
                      Based ID NFT
                    </span>
                    <span className="text-[10px] text-gray-700 font-mono">{previewId}</span>
                  </div>

                  {/* NFT preview */}
                  <div className="relative overflow-hidden mx-4 rounded-2xl" style={{ background: "#111" }}>
                    <NftCard id={previewId} />
                  </div>

                  {/* Mint panel */}
                  <div className="p-5 space-y-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    {mintState === "success" ? (
                      <div className="text-center space-y-4 py-2">
                        <div className="w-12 h-12 rounded-full border flex items-center justify-center mx-auto"
                          style={{ background: "rgba(34,197,94,0.1)", borderColor: "rgba(34,197,94,0.25)" }}>
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M4 10l4 4 8-8" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-black text-lg" style={D}>Based ID {previewId} minted!</p>
                          <p className="text-gray-500 text-sm mt-1" style={BODY}>Full platform access unlocked.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Link href="/campaigns"
                            className="py-2.5 rounded-xl border text-zinc-200 text-sm font-medium text-center hover:bg-white/[0.06] transition-colors"
                            style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                            Browse campaigns
                          </Link>
                          <Link href="/hunters"
                            className="py-2.5 rounded-xl text-white text-sm font-bold text-center transition-colors"
                            style={{ background: "#0052FF" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#0041cc")}
                            onMouseLeave={e => (e.currentTarget.style.background = "#0052FF")}>
                            Claim Hunter →
                          </Link>
                        </div>
                        <a href={`${BASESCAN_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                          className="block text-zinc-600 text-xs hover:text-zinc-400 transition-colors" style={BODY}>
                          View on Basescan ↗
                        </a>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-black text-base" style={D}>Based ID NFT</p>
                            <p className="text-gray-500 text-xs mt-0.5" style={BODY}>Permanent platform pass</p>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-black text-3xl" style={D}>$2</p>
                            <p className="text-zinc-600 text-xs" style={BODY}>USDC · one-time</p>
                          </div>
                        </div>

                        <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }} />

                        {!isConnected ? (
                          <ConnectButton.Custom>
                            {({ openConnectModal }) => (
                              <button onClick={openConnectModal}
                                className="w-full py-4 rounded-xl text-white text-sm font-bold transition-colors"
                                style={{ background: "#0052FF", boxShadow: "0 4px 24px rgba(0,82,255,0.35)" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#0041cc")}
                                onMouseLeave={e => (e.currentTarget.style.background = "#0052FF")}>
                                Connect wallet to mint
                              </button>
                            )}
                          </ConnectButton.Custom>
                        ) : insufficientBalance ? (
                          <div className="rounded-xl border px-4 py-3 text-center"
                            style={{ borderColor: "rgba(180,83,9,0.4)", background: "rgba(120,53,15,0.15)" }}>
                            <p className="text-amber-300 text-sm font-semibold" style={BODY}>Insufficient USDC</p>
                            <p className="text-zinc-500 text-xs mt-0.5" style={BODY}>You need $2 USDC on Base.</p>
                          </div>
                        ) : !hasAllowance && mintState === "idle" ? (
                          <button onClick={handleApprove} disabled={isLoading}
                            className="w-full py-4 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-colors"
                            style={{ background: "#0052FF", boxShadow: "0 4px 24px rgba(0,82,255,0.35)" }}
                            onMouseEnter={e => { if (!isLoading) e.currentTarget.style.background = "#0041cc"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "#0052FF"; }}>
                            Approve $2 USDC
                          </button>
                        ) : mintState === "approving" ? (
                          <button disabled className="w-full py-4 rounded-xl text-white text-sm font-bold opacity-60"
                            style={{ background: "#0052FF" }}>
                            Approving… confirm in wallet
                          </button>
                        ) : (hasAllowance || mintState === "approved") ? (
                          <button onClick={handleMint} disabled={isLoading}
                            className="w-full py-4 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-colors"
                            style={{ background: "#0052FF", boxShadow: "0 4px 24px rgba(0,82,255,0.35)" }}
                            onMouseEnter={e => { if (!isLoading) e.currentTarget.style.background = "#0041cc"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "#0052FF"; }}>
                            {isLoading ? "Minting…" : "Mint Based ID — $2"}
                          </button>
                        ) : null}

                        {errorMsg && <p className="text-red-400 text-xs text-center" style={BODY}>{errorMsg}</p>}
                      </>
                    )}
                  </div>

                </div>{/* close rounded-3xl */}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>


      {/* ── STATS BAR ── */}
      <section className="bg-white" style={{ borderTop: "1px solid rgba(0,0,0,0.07)", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-black/[0.06]">
            {[
              { num: totalMinted !== undefined ? Number(totalMinted) : null, label: "IDs on Base",      blue: false },
              { num: hunterCount,        label: "Hunters ranked",    blue: false },
              { num: totalCampaignCount, label: "Campaigns run",     blue: true  },
              { num: totalXP,            label: "XP distributed",    blue: false },
              { num: rewardsPaid,        label: "Rewards paid out",   blue: false },
            ].map(({ num, label, blue }) => (
              <div key={label} className="px-5 py-10 first:pl-0 last:pr-0">
                <p className="font-black text-4xl sm:text-5xl tabular-nums leading-none"
                  style={{ ...D, color: blue ? "#0052FF" : "#000" }}>
                  <AnimatedCounter value={num} />
                </p>
                <p className="text-gray-400 text-xs uppercase tracking-[0.2em] mt-3" style={D}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EXPLORE NEW CAMPAIGNS ── */}
      <section className="bg-white" style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="max-w-7xl mx-auto px-6 py-20 space-y-10">
          <Reveal>
            <div className="flex items-end justify-between gap-6">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300" style={D}>Live now</p>
                <h2 className="font-black text-5xl sm:text-6xl uppercase tracking-tight text-black leading-none" style={D}>
                  Explore New<br />Campaigns
                </h2>
              </div>
              <Link href="/campaigns"
                className="flex-shrink-0 px-6 py-3 rounded-full border border-black/[0.15] text-sm font-bold text-black hover:bg-black hover:text-white transition-all">
                View all
              </Link>
            </div>
          </Reveal>

          {liveCampaigns.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {liveCampaigns.slice(0, 6).map((c, i) => (
                <motion.div key={c.id}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease }}>
                  <CampaignCard campaign={c} featured={c.tier === "featured"} />
                </motion.div>
              ))}
            </div>
          ) : (
            <Reveal delay={0.08}>
              <div className="rounded-2xl border border-black/[0.07] bg-gray-50 px-8 py-24 text-center space-y-5">
                <p className="font-black text-3xl text-black" style={D}>First campaigns launching soon</p>
                <p className="text-gray-400 text-sm" style={BODY}>Be the first project to run a campaign on Based ID.</p>
                <Link href="/projects"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-black text-white text-sm font-bold hover:bg-zinc-800 transition-colors">
                  List your project →
                </Link>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS — editorial black ── */}
      <section className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <Reveal>
            <h2 className="font-black text-5xl sm:text-6xl lg:text-7xl uppercase tracking-tight text-white mb-14 leading-none" style={D}>
              How it works
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.07]">
            {[
              { n: "01", title: "Mint once", body: "One NFT. $2. Permanent. Based ID is your identity on Base — no subscriptions, no resets, no expiry." },
              { n: "02", title: "Enter campaigns", body: "Quests, raffles, NFT drops, token airdrops. Every Based ID holder gets access to every campaign on the platform." },
              { n: "03", title: "Climb the ranks", body: "XP from every campaign entered, raffle won, and daily check-in. Rise from E-Rank to National Hunter." },
            ].map((step, i) => (
              <div key={step.n} className={`py-10 space-y-5 ${i === 0 ? "sm:pr-12" : i === 1 ? "sm:px-12" : "sm:pl-12"}`}>
                <p className="font-black text-6xl leading-none text-white/[0.08]" style={D}>{step.n}</p>
                <p className="font-black text-2xl text-white" style={D}>{step.title}</p>
                <p className="text-white/70 text-sm leading-relaxed" style={BODY}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BASED HUNTERS ── */}
      <section className="bg-white min-h-screen flex items-center" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="w-full">
          <div className="max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-[1fr_520px] gap-20 items-center">

            <Reveal>
              <div className="space-y-10">
                {/* Headline */}
                <h2 className="font-black text-7xl sm:text-8xl lg:text-[7rem] uppercase tracking-tight text-black leading-[0.9]" style={D}>
                  Based<br />Hunters
                </h2>

                {/* Divider */}
                <div className="w-16 h-px bg-black/[0.15]" />

                {/* Description */}
                <p className="text-gray-500 text-xl leading-relaxed max-w-md" style={BODY}>
                  Claim a free soulbound Hunter License NFT. Earn XP from campaigns, wins, and daily check-ins — and rise from E-Rank to National.
                </p>

                {/* CTA */}
                <Link href="/hunters"
                  className="inline-flex items-center gap-3 px-10 py-5 rounded-full bg-black text-white text-base font-bold hover:bg-zinc-800 transition-colors">
                  Claim your Hunter
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
                </Link>
              </div>
            </Reveal>

            {/* Card — larger, with subtle shadow for depth */}
            <Reveal delay={0.12}>
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-50 -z-10" />
                <RotatingHunterCard />
              </div>
            </Reveal>

          </div>
        </div>
      </section>

      {/* ── TOP HUNTERS LEADERBOARD PREVIEW ── */}
      {topHunters.length > 0 && (
        <section style={{ background: "#0a0a0a" }}>
          <div className="max-w-7xl mx-auto px-6 py-20">
            <Reveal>
              <div className="flex items-end justify-between mb-10">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20" style={D}>Ranked by XP</p>
                  <h2 className="font-black text-5xl sm:text-6xl uppercase tracking-tight text-white leading-none" style={D}>
                    Top Hunters
                  </h2>
                </div>
                <Link href="/leaderboard"
                  className="text-sm font-medium text-white/30 hover:text-white transition-colors flex-shrink-0" style={BODY}>
                  View full leaderboard →
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="space-y-px">
                {topHunters.map((hunter, i) => {
                  const rankIdx = xpToRankIdx(hunter.total_xp);
                  const hue = addrHue(hunter.wallet_address);
                  return (
                    <Link key={hunter.wallet_address} href={`/profile/${hunter.wallet_address}`}
                      className="flex items-center gap-5 px-5 py-4 rounded-xl hover:bg-white/[0.03] transition-colors group">
                      <span className="font-black text-2xl w-8 text-right flex-shrink-0 tabular-nums"
                        style={{ ...D, color: i === 0 ? "#fbbf24" : i === 1 ? "#d1d5db" : i === 2 ? "#b87333" : "rgba(255,255,255,0.2)" }}>
                        {i + 1}
                      </span>
                      <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-black"
                        style={{ background: `hsl(${hue},50%,16%)`, border: `1px solid hsl(${hue},50%,26%)`, color: `hsl(${hue},65%,62%)`, ...D }}>
                        {hunter.wallet_address.slice(2,4).toUpperCase()}
                      </div>
                      <span className="text-white/40 text-xs font-mono flex-1 min-w-0 truncate group-hover:text-white/60 transition-colors">
                        {hunter.wallet_address.slice(0,6)}…{hunter.wallet_address.slice(-4)}
                      </span>
                      <span className="font-black text-sm tabular-nums flex-shrink-0" style={{ ...D, color: "#0052FF" }}>
                        {hunter.total_xp.toLocaleString()} XP
                      </span>
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0"
                        style={{ background: `${RANK_BADGE_COLORS[rankIdx]}15`, border: `1px solid ${RANK_BADGE_COLORS[rankIdx]}30`, color: RANK_BADGE_COLORS[rankIdx], ...D }}>
                        {RANK_BADGE_LABELS[rankIdx]}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ── FOR PARTNERS — blue brand section ── */}
      <section style={{ background: "#0052FF" }} className="text-white">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-start">
            <div className="space-y-5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40" style={D}>For projects on Base</p>
              <h2 className="font-black text-5xl sm:text-6xl uppercase tracking-tight text-white leading-none" style={D}>
                Drop to real<br />wallets.
              </h2>
              <p className="text-white/60 text-base leading-relaxed max-w-lg" style={BODY}>
                Every Based ID holder paid $2 onchain. No bots, no empty wallets, no sybil farmers.
                Your campaigns reach Base&apos;s most committed audience. Free to list.
              </p>
            </div>
            <div className="flex flex-col gap-3 flex-shrink-0 lg:pt-14">
              <Link href="/projects"
                className="px-10 py-4 rounded-full bg-white font-black text-sm text-center hover:bg-blue-50 transition-colors"
                style={{ color: "#0052FF" }}>
                List your project →
              </Link>
              <Link href="/campaigns"
                className="px-10 py-4 rounded-full border border-white/25 text-white text-sm font-medium text-center hover:bg-white/10 transition-colors">
                Browse campaigns
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8 mt-16 pt-12" style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
            {[
              { stat: "Free", label: "Standard listing" },
              { stat: "$2",  label: "Entry filter — no bots" },
              { stat: "7",   label: "Hunter rank tiers" },
            ].map(({ stat, label }) => (
              <div key={label} className="text-center">
                <p className="font-black text-4xl sm:text-5xl text-white" style={D}>{stat}</p>
                <p className="text-white/35 text-[10px] uppercase tracking-[0.2em] mt-2" style={D}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white" style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="max-w-3xl mx-auto px-6 py-20 space-y-10">
          <Reveal>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300" style={D}>Questions</p>
              <h2 className="font-black text-5xl uppercase tracking-tight text-black" style={D}>FAQ</h2>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}>
              {FAQ_ITEMS.map(item => <FAQItem key={item.q} {...item} />)}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(0,0,0,0.07)", background: "#ffffff" }}
        className="px-6 py-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Based ID" className="w-5 h-5 rounded-md opacity-60" />
            <span className="text-sm text-gray-400" style={BODY}>Based ID · Built on Base · 2026</span>
          </div>
          <div className="flex items-center gap-6 text-[13px] text-gray-400" style={BODY}>
            {[["Campaigns", "/campaigns"], ["Hunters", "/hunters"], ["Projects", "/projects"], ["Leaderboard", "/leaderboard"]].map(([l, h]) => (
              <Link key={h} href={h} className="transition-colors hover:text-black">{l}</Link>
            ))}
            <a href="https://x.com/basedidofficial" target="_blank" rel="noopener noreferrer"
              className="transition-colors hover:text-black">
              @basedidofficial
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
