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
  { n: "01", title: "Connect wallet",    desc: "Use any Base-compatible wallet — Coinbase Wallet, MetaMask, or WalletConnect." },
  { n: "02", title: "Approve $2 USDC",   desc: "One-time approval of $2 USDC. Permanent access — never pay again." },
  { n: "03", title: "Mint your Based ID", desc: "Your NFT is minted on Base. Immediate, onchain, yours forever." },
  { n: "04", title: "Access everything", desc: "Enter drops, claim your Hunter, earn XP, win raffles. Full platform access." },
];

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
    <div className="min-h-screen bg-black text-white overflow-x-hidden"
      style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.045) 1px, transparent 0)", backgroundSize: "52px 52px" }}>

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

      {/* ── Top accent line ── */}
      <div className="fixed top-0 inset-x-0 z-[60] h-px"
        style={{ background: "linear-gradient(90deg, transparent 0%, #2563eb 30%, #7c3aed 60%, transparent 100%)", opacity: 0.6 }} />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center pt-14">
        {/* Animated gradient blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Primary blue — top center */}
          <div className="blob-1 absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(37,99,235,0.18) 0%, transparent 65%)", filter: "blur(1px)" }} />
          {/* Purple — right */}
          <div className="blob-2 absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 65%)", filter: "blur(1px)" }} />
          {/* Cyan accent — bottom left */}
          <div className="blob-3 absolute bottom-0 -left-20 w-[400px] h-[400px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 65%)", filter: "blur(1px)" }} />
        </div>

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
                <div className="relative">
                  {/* Outer glow */}
                  <div className="absolute inset-0 rounded-2xl blur-3xl opacity-30 scale-95"
                    style={{background:"linear-gradient(135deg,#1d4ed8,#7c3aed)"}}/>
                  {/* Gradient border */}
                  <div className="absolute inset-0 rounded-2xl p-px"
                    style={{background:"linear-gradient(135deg,rgba(37,99,235,0.5),rgba(124,58,237,0.3),rgba(37,99,235,0.1))"}}>
                    <div className="w-full h-full rounded-2xl bg-[#050508]" />
                  </div>
                  <div className="relative rounded-2xl overflow-hidden">
                    <NftCard id={previewId} />
                  </div>
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
        <div className="max-w-7xl mx-auto px-6 py-20 space-y-12">
          <Reveal>
            <div className="text-center space-y-2">
              <p className="text-zinc-600 text-xs uppercase tracking-[0.25em]">Simple</p>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={D}>How it works</h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.05] rounded-2xl overflow-hidden">
            {HOW_STEPS.map(({ n, title, desc }, i) => (
              <Reveal key={n} delay={i * 0.07}>
                <div className="bg-black px-7 py-8 h-full space-y-4 hover:bg-white/[0.015] transition-colors">
                  <span className="text-zinc-700 text-xs font-mono tracking-widest">{n}</span>
                  <p className="text-white font-bold text-[15px]" style={D}>{title}</p>
                  <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
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
      <section className="border-t border-white/[0.06] relative overflow-hidden" style={{ background: "linear-gradient(180deg, rgba(37,99,235,0.04) 0%, transparent 60%)" }}>
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
              <div className="grid grid-cols-4 gap-2">
                {[
                  {l:"E",c:"#94a3b8",n:"E-Class"},
                  {l:"D",c:"#a3e635",n:"D-Class"},
                  {l:"C",c:"#34d399",n:"C-Class"},
                  {l:"B",c:"#60a5fa",n:"B-Class"},
                  {l:"A",c:"#c084fc",n:"A-Class"},
                  {l:"S",c:"#f97316",n:"S-Class"},
                  {l:"N",c:"#fcd34d",n:"National",wide:true},
                ].map(r=>(
                  <div key={r.l} className={`rounded-xl border p-4 flex flex-col items-center gap-2 transition-all hover:scale-[1.03] ${(r as {wide?:boolean}).wide?"col-span-2":""}`}
                    style={{borderColor:r.c+"28",background:r.c+"06"}}>
                    <span className="font-black text-3xl leading-none" style={{color:r.c}}>{r.l}</span>
                    <span className="text-zinc-600 text-[10px]">{r.n}</span>
                  </div>
                ))}
              </div>
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
    </div>
  );
}
