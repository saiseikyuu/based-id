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
      transition={{ duration: 0.6, delay, ease }}>
      {children}
    </motion.div>
  );
}

const ACCESS_FEATURES = [
  { label: "Browse drops & projects",      free: true,  holder: true  },
  { label: "Enter drops & win raffles",    free: false, holder: true  },
  { label: "Claim Based Hunter NFT",       free: false, holder: true  },
  { label: "Earn XP & rank up",            free: false, holder: true  },
  { label: "Daily check-ins & streaks",    free: false, holder: true  },
  { label: "Leaderboard & rewards",        free: false, holder: true  },
  { label: "Priority in featured drops",   free: false, holder: true  },
];

const FAQ_ITEMS = [
  {
    q: "What is Based ID?",
    a: "Based ID is a $2 USDC NFT on Base that acts as your platform pass. It proves you're a real, bot-free participant — and unlocks every feature: drops, hunters, leaderboard, and rewards.",
  },
  {
    q: "Why $2?",
    a: "The $2 price is a minimal commitment that filters out bots and empty wallets. It's permanent — you pay once, hold forever, and access everything indefinitely.",
  },
  {
    q: "Can I browse without minting?",
    a: "Yes. Anyone can browse drops, projects, and the leaderboard. But to enter a drop, claim a Hunter NFT, or earn XP, you need a Based ID.",
  },
  {
    q: "What are Based Hunters?",
    a: "Based Hunters are free soulbound NFTs exclusively for Based ID holders. Your Hunter rank (E → National) rises as you enter drops and win raffles — and can be synced on-chain.",
  },
  {
    q: "Is the ID tradeable?",
    a: "Yes, Based ID is a standard ERC-721. You can transfer or list it. However, only the current holder gets access to platform features.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen(o => !o)} className="w-full text-left border-b border-white/[0.06] py-5 group">
      <div className="flex items-center justify-between gap-4">
        <span className="text-white text-sm font-medium group-hover:text-zinc-200 transition-colors">{q}</span>
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }} className="text-zinc-500 flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="7" y1="2" x2="7" y2="12"/><line x1="2" y1="7" x2="12" y2="7"/></svg>
        </motion.div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }}
            className="text-zinc-500 text-sm leading-relaxed mt-3 overflow-hidden">
            {a}
          </motion.p>
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
        (l) => l.address.toLowerCase() === BASED_ID_ADDRESS.toLowerCase() && l.topics.length === 3
      );
      const newId = log?.topics[2] ? BigInt(log.topics[2]) : null;
      if (newId) setMintedId(newId);
      setMintState("success"); refetchTotal(); refetchNext();
      toast.success(newId ? `Based ID #${newId.toString()} minted!` : "Minted successfully!");
    }
  }, [isConfirmed, receipt, mintState, refetchAllowance, refetchTotal, refetchNext]);

  useEffect(() => {
    fetch("/api/drops")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setLiveDrops(d.slice(0, 6)); })
      .catch(() => {});
  }, []);

  const handleApprove = useCallback(() => {
    setErrorMsg(""); setMintState("approving");
    writeContract(
      { address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "approve", args: [BASED_ID_ADDRESS, MINT_PRICE] },
      { onError: (e) => { const msg = e.message.split("\n")[0]; setErrorMsg(msg); setMintState("idle"); toast.error(msg); } }
    );
  }, [writeContract]);

  const handleMint = useCallback(() => {
    setErrorMsg(""); setMintState("minting");
    writeContract(
      { address: BASED_ID_ADDRESS, abi: BASED_ID_ABI, functionName: "mint" },
      { onError: (e) => { const msg = e.message.split("\n")[0]; setErrorMsg(msg); setMintState("approved"); toast.error(msg); } }
    );
  }, [writeContract]);

  const handleReset = useCallback(() => {
    setMintState("idle"); setMintedId(null); setErrorMsg(""); refetchAllowance();
  }, [refetchAllowance]);

  const isLoading           = isPending || isConfirming;
  const insufficientBalance = usdcBalance !== undefined && usdcBalance < MINT_PRICE;
  const resolvedNextId      = nextId !== undefined ? (nextId <= BigInt(100) ? BigInt(101) : nextId) : BigInt(101);
  const previewId           = mintState === "success" && mintedId !== null ? `#${mintedId.toString()}` : `#${resolvedNextId.toString()}`;

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">

      {/* ── NAV ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 hover:opacity-75 transition-opacity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Based ID" className="w-6 h-6 rounded-md" />
            <span style={D} className="font-bold text-sm tracking-tight">Based ID</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {[
              { href: "/drops",    label: "Drops"    },
              { href: "/calendar", label: "Calendar" },
              { href: "/hunters",  label: "Hunters"  },
              { href: "/projects", label: "Projects" },
              { href: "/dashboard",label: "Dashboard"},
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="text-[13px] text-zinc-400 hover:text-white transition-colors">{label}</Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden md:block"><ConnectButton showBalance={false} chainStatus="icon" /></div>
            <button className="md:hidden p-1.5 text-zinc-500 hover:text-white transition-colors" onClick={() => setMenuOpen(o => !o)}>
              {menuOpen
                ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="2" y1="2" x2="14" y2="14"/><line x1="14" y1="2" x2="2" y2="14"/></svg>
                : <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></svg>}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-white/[0.05] bg-black/95">
            <nav className="px-6 py-4 flex flex-col gap-0.5">
              {["/drops","/calendar","/hunters","/projects","/dashboard"].map((href) => (
                <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-all capitalize">
                  {href.slice(1)}
                </Link>
              ))}
              <div className="pt-3"><ConnectButton showBalance={false} chainStatus="icon" /></div>
            </nav>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center pt-14">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full"
            style={{ background: "radial-gradient(ellipse at center, rgba(37,99,235,0.12) 0%, transparent 70%)" }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24 w-full grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

          {/* Left — headline + access list */}
          <div className="space-y-10">
            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.1] bg-white/[0.03] mb-6">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-zinc-400 font-medium">Live on Base</span>
                </div>
                <h1 className="text-5xl sm:text-6xl xl:text-7xl font-black tracking-tight leading-[1.0]" style={D}>
                  Your pass to<br />
                  <span className="text-white">every Base</span><br />
                  <span style={{ WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    background: "linear-gradient(135deg, #3b82f6, #60a5fa 50%, #93c5fd)" }}>
                    opportunity.
                  </span>
                </h1>
              </motion.div>

              <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease }}
                className="text-zinc-400 text-lg leading-relaxed max-w-md">
                Mint once for $2. Access every drop, claim your Hunter NFT, earn XP, win raffles.
                Anyone can browse — only holders can play.
              </motion.p>
            </div>

            {/* Access list */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease }}
              className="space-y-2">
              <p className="text-zinc-600 text-xs uppercase tracking-[0.2em] mb-3">What Based ID unlocks</p>
              {ACCESS_FEATURES.map((f, i) => (
                <motion.div key={f.label}
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.05, ease }}
                  className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    f.holder ? "bg-blue-500/20 border border-blue-500/40" : "bg-white/[0.04] border border-white/[0.08]"
                  }`}>
                    {f.holder
                      ? <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l1.8 1.8L6.5 2.5" stroke="#60a5fa" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : <svg width="7" height="7" viewBox="0 0 7 7" fill="none"><path d="M1.5 1.5l4 4M5.5 1.5l-4 4" stroke="#52525b" strokeWidth="1" strokeLinecap="round"/></svg>
                    }
                  </div>
                  <span className={`text-sm ${f.holder ? "text-zinc-200" : "text-zinc-600 line-through"}`}>{f.label}</span>
                  {!f.free && f.holder && (
                    <span className="text-[10px] text-blue-400/70 font-medium">Holders only</span>
                  )}
                  {f.free && (
                    <span className="text-[10px] text-zinc-600">Free</span>
                  )}
                </motion.div>
              ))}
            </motion.div>

            {/* Stats */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.5, ease }}
              className="flex items-center gap-6 pt-2">
              <div>
                <div className="text-2xl font-black" style={D}>
                  {totalMinted !== undefined ? <CountUp to={Number(totalMinted)} duration={1.5} /> : "—"}
                </div>
                <p className="text-zinc-600 text-xs mt-0.5">IDs minted</p>
              </div>
              <div className="w-px h-8 bg-white/[0.08]" />
              <div>
                <div className="text-2xl font-black" style={D}>${"2"}</div>
                <p className="text-zinc-600 text-xs mt-0.5">One-time · permanent</p>
              </div>
              <div className="w-px h-8 bg-white/[0.08]" />
              <div>
                <div className="text-2xl font-black" style={D}>{liveDrops.length > 0 ? liveDrops.length : "—"}</div>
                <p className="text-zinc-600 text-xs mt-0.5">Drops live</p>
              </div>
            </motion.div>
          </div>

          {/* Right — Mint card */}
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
            className="flex justify-center lg:justify-end" id="mint-card">
            <div className="w-full max-w-sm space-y-4">
              {/* NFT preview */}
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl blur-2xl opacity-20 scale-95"
                  style={{ background: "radial-gradient(#3b82f6, #1d4ed8)" }} />
                <div className="relative rounded-2xl border border-white/[0.08] overflow-hidden bg-zinc-950">
                  <NftCard id={previewId} />
                </div>
              </div>

              {/* Mint panel */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
                {mintState === "success" ? (
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto">
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 11l4.5 4.5L18 7" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg" style={D}>Based ID {previewId} minted!</p>
                      <p className="text-zinc-500 text-sm mt-1">You now have full access to the platform.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Link href="/drops" className="py-2.5 rounded-xl border border-white/[0.08] text-white text-sm font-medium text-center hover:bg-white/[0.04] transition-colors">
                        Browse drops
                      </Link>
                      <Link href="/hunters" className="py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold text-center hover:bg-blue-500 transition-colors">
                        Claim Hunter →
                      </Link>
                    </div>
                    <a href={`${BASESCAN_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                      className="block text-zinc-600 text-xs hover:text-zinc-400 transition-colors">
                      View on Basescan ↗
                    </a>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-white font-bold" style={D}>Based ID NFT</p>
                        <p className="text-zinc-500 text-xs mt-0.5">Permanent access pass · ERC-721</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-white font-black text-xl" style={D}>$2</p>
                        <p className="text-zinc-600 text-xs">USDC</p>
                      </div>
                    </div>

                    {!isConnected ? (
                      <div className="space-y-3">
                        <ConnectButton.Custom>
                          {({ openConnectModal }) => (
                            <button onClick={openConnectModal}
                              className="w-full py-3.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-colors"
                              style={{ boxShadow: "0 4px 24px rgba(37,99,235,0.35)" }}>
                              Connect wallet to mint
                            </button>
                          )}
                        </ConnectButton.Custom>
                        <p className="text-zinc-600 text-xs text-center">Requires USDC on Base · ~$0.01 gas</p>
                      </div>
                    ) : insufficientBalance ? (
                      <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-center">
                        <p className="text-amber-300 text-sm font-medium">Insufficient USDC balance</p>
                        <p className="text-zinc-500 text-xs mt-1">You need $2 USDC on Base to mint.</p>
                      </div>
                    ) : !hasAllowance && mintState === "idle" ? (
                      <div className="space-y-3">
                        <button onClick={handleApprove} disabled={isLoading}
                          className="w-full py-3.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-colors disabled:opacity-50"
                          style={{ boxShadow: "0 4px 24px rgba(37,99,235,0.35)" }}>
                          Approve $2 USDC
                        </button>
                        <p className="text-zinc-600 text-xs text-center">Step 1 of 2 — Approve USDC spend</p>
                      </div>
                    ) : mintState === "approving" ? (
                      <button disabled className="w-full py-3.5 rounded-xl bg-blue-600/50 text-white text-sm font-bold opacity-60">
                        Approving… confirm in wallet
                      </button>
                    ) : (hasAllowance || mintState === "approved") ? (
                      <div className="space-y-3">
                        <button onClick={handleMint} disabled={isLoading}
                          className="w-full py-3.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors disabled:opacity-50"
                          style={{ boxShadow: "0 4px 24px rgba(255,255,255,0.12)" }}>
                          {isLoading ? "Minting…" : "Mint Based ID — $2"}
                        </button>
                        <p className="text-zinc-600 text-xs text-center">Step 2 of 2 — Confirm mint transaction</p>
                      </div>
                    ) : null}

                    {errorMsg && <p className="text-red-400 text-xs text-center">{errorMsg}</p>}

                    <div className="flex items-center gap-3 pt-1 border-t border-white/[0.05]">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-zinc-600 text-xs">Bot-free · Onchain · Permanent</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── LIVE DROPS ── */}
      <section className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-24 space-y-10">
          <Reveal>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${liveDrops.length > 0 ? "bg-green-500 animate-pulse" : "bg-zinc-600"}`} />
                  <span className={`text-xs font-medium ${liveDrops.length > 0 ? "text-green-400" : "text-zinc-500"}`}>
                    {liveDrops.length > 0 ? `${liveDrops.length} drop${liveDrops.length !== 1 ? "s" : ""} live now` : "No active drops"}
                  </span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={D}>Live drops</h2>
                <p className="text-zinc-500 text-base max-w-md">Airdrops, NFT mints, whitelists, raffles. Hold a Based ID to enter any drop.</p>
              </div>
              <Link href="/drops" className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0">
                View all drops →
              </Link>
            </div>
          </Reveal>

          {liveDrops.length > 0 ? (
            <Reveal delay={0.1}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveDrops.map(drop => <DropCard key={drop.id} drop={drop} featured={drop.tier === "featured"} />)}
              </div>
            </Reveal>
          ) : (
            <Reveal delay={0.1}>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] px-8 py-16 text-center space-y-4">
                <p className="text-zinc-400 font-bold text-xl" style={D}>First drops coming soon</p>
                <p className="text-zinc-600 text-sm max-w-sm mx-auto">Be the first partner to run a drop on Based ID. Standard listings are free.</p>
                <Link href="/partner" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors">
                  List a drop →
                </Link>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* ── BASED HUNTERS ── */}
      <section className="border-t border-white/[0.06] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(37,99,235,0.05), transparent 70%)" }} />
        <div className="relative max-w-7xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <Reveal>
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/[0.06]">
                  <span className="text-blue-400 text-xs font-medium">Exclusive to holders</span>
                </div>
                <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight" style={D}>
                  Based Hunters
                </h2>
                <p className="text-zinc-400 text-lg leading-relaxed">
                  Claim a free soulbound Hunter License NFT — exclusive to Based ID holders. Your rank rises from E to National as you enter drops and win raffles.
                </p>
                <div className="space-y-2">
                  {[
                    { label: "E → D → C → B → A → S → National", sub: "7 rank tiers, each with its own Hunter card design" },
                    { label: "XP from drops, wins, daily check-ins",  sub: "Multiple ways to earn — every action counts" },
                    { label: "Sync rank on-chain anytime",            sub: "Your NFT art updates to match your rank" },
                  ].map(({ label, sub }) => (
                    <div key={label} className="flex items-start gap-3 py-2">
                      <div className="w-1 h-1 rounded-full bg-blue-400 flex-shrink-0 mt-2" />
                      <div>
                        <p className="text-white text-sm font-medium">{label}</p>
                        <p className="text-zinc-600 text-xs mt-0.5">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/hunters" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-colors"
                  style={{ boxShadow: "0 4px 24px rgba(37,99,235,0.3)" }}>
                  View Based Hunters →
                </Link>
              </div>
            </Reveal>

            {/* Rank preview cards */}
            <Reveal delay={0.1}>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { l: "E", c: "#94a3b8", n: "E-Class" },
                  { l: "B", c: "#60a5fa", n: "B-Class" },
                  { l: "A", c: "#c084fc", n: "A-Class" },
                  { l: "S", c: "#f97316", n: "S-Class" },
                  { l: "D", c: "#a3e635", n: "D-Class" },
                  { l: "C", c: "#34d399", n: "C-Class" },
                  { l: "N", c: "#fcd34d", n: "National", wide: true },
                ].map((r) => (
                  <div key={r.l}
                    className={`rounded-xl border p-4 flex flex-col items-center gap-2 ${r.wide ? "col-span-2" : ""}`}
                    style={{ borderColor: r.c + "30", background: r.c + "08" }}>
                    <span className="font-black text-3xl" style={{ color: r.c }}>{r.l}</span>
                    <span className="text-zinc-600 text-[10px] font-medium">{r.n}</span>
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
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.01] p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <p className="text-zinc-500 text-xs uppercase tracking-[0.2em]">For projects</p>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={D}>
                  Drop to real wallets.<br />Not bots.
                </h2>
                <p className="text-zinc-400 text-base leading-relaxed max-w-md">
                  Every Based ID holder paid $2 and signed onchain. Run your NFT drop, token airdrop, or whitelist in front of the most committed Base audience. Standard listings are free.
                </p>
                <div className="flex items-center gap-4 flex-wrap">
                  <Link href="/partner" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors">
                    Become a partner →
                  </Link>
                  <Link href="/partner/new" className="text-sm text-zinc-400 hover:text-white transition-colors">
                    Create a drop
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { tier: "Standard", price: "Free", features: ["Listed in /drops grid", "Partner dashboard", "Auto-drawn winners"] },
                  { tier: "Featured", price: "$200 USDC", features: ["Top placement", "Landing page slot", "X announcement"] },
                ].map(({ tier, price, features }) => (
                  <div key={tier} className={`rounded-xl border p-5 space-y-3 ${tier === "Featured" ? "border-blue-500/30 bg-blue-500/[0.04]" : "border-white/[0.07]"}`}>
                    <div>
                      <p className="text-zinc-500 text-[10px] uppercase tracking-[0.15em] font-bold">{tier}</p>
                      <p className="text-white font-black text-xl mt-1" style={D}>{price}</p>
                    </div>
                    <ul className="space-y-1.5">
                      {features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-xs text-zinc-500">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="mt-0.5 flex-shrink-0 text-zinc-600"><path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
        <div className="max-w-3xl mx-auto px-6 py-24 space-y-10">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={D}>FAQ</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div>
              {FAQ_ITEMS.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="border-t border-white/[0.06] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 100% at 50% 100%, rgba(37,99,235,0.08), transparent 60%)" }} />
        <div className="relative max-w-4xl mx-auto px-6 py-28 text-center space-y-8">
          <Reveal>
            <h2 className="text-4xl sm:text-6xl font-black tracking-tight leading-none" style={D}>
              Ready to join?
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-zinc-400 text-lg max-w-md mx-auto">
              Mint your Based ID for $2. One transaction. Permanent access. Everything unlocked.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="flex items-center gap-4 justify-center flex-wrap">
              <a href="#mint-card" onClick={e => { e.preventDefault(); document.getElementById("mint-card")?.scrollIntoView({ behavior: "smooth" }); }}
                className="px-8 py-4 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors"
                style={{ boxShadow: "0 4px 40px rgba(255,255,255,0.15)" }}>
                Mint Based ID — $2
              </a>
              <Link href="/drops" className="px-8 py-4 rounded-xl border border-white/[0.08] text-zinc-400 text-sm font-medium hover:text-white hover:border-white/[0.15] transition-colors">
                Browse drops first →
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
            <img src="/logo.svg" alt="Based ID" className="w-5 h-5 rounded-md opacity-60" />
            <span className="text-zinc-600 text-sm">Based ID · Built on Base · 2026</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-600">
            <Link href="/drops"    className="hover:text-zinc-300 transition-colors">Drops</Link>
            <Link href="/hunters"  className="hover:text-zinc-300 transition-colors">Hunters</Link>
            <Link href="/partner"  className="hover:text-zinc-300 transition-colors">Partners</Link>
            <Link href="/calendar" className="hover:text-zinc-300 transition-colors">Calendar</Link>
            <a href="https://x.com/basedidofficial" target="_blank" rel="noopener noreferrer"
              className="hover:text-zinc-300 transition-colors">@basedidofficial</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
