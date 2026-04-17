"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  BASED_ID_ADDRESS,
  USDC_ADDRESS,
  MINT_PRICE,
  BASED_ID_ABI,
  ERC20_ABI,
  BASESCAN_URL,
} from "@/lib/contracts";
import { useCountdown, pad } from "@/lib/countdown";
import { NftCard } from "./NftCard";
import BlurText from "./components/BlurText";
import CountUp from "./components/CountUp";
import SpotlightCard from "./components/SpotlightCard";
import ShinyText from "./components/ShinyText";
import RotatingText from "./components/RotatingText";
import AnimatedBackground from "./components/AnimatedBackground";
import { motion } from "motion/react";

type MintState = "idle" | "approving" | "approved" | "minting" | "success";

const MINT_CLOSE_DATE = new Date("2026-12-31T23:59:59Z");

// Space Grotesk applied via CSS variable — used on all display headings
const D: React.CSSProperties = {
  fontFamily: "var(--font-display), system-ui, sans-serif",
};

const GRAD: React.CSSProperties = {
  background: "linear-gradient(180deg,#93c5fd 0%,#1d4ed8 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

// ── Scroll animation helpers ─────────────────────────────────────────────────

/** Fade-up on scroll into view. `delay` staggers sibling items (seconds). */
function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const { address, isConnected } = useAccount();
  const [mintState, setMintState] = useState<MintState>("idle");
  const [mintedId, setMintedId]   = useState<bigint | null>(null);
  const [errorMsg, setErrorMsg]   = useState("");
  const [menuOpen, setMenuOpen]   = useState(false);

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
      // Minted event has 3 topics: [sig, to, tokenId]
      // ERC721 Transfer has 4 topics — filter specifically on 3 to avoid reading address as ID
      const log = receipt.logs.find(
        (l) =>
          l.address.toLowerCase() === BASED_ID_ADDRESS.toLowerCase() &&
          l.topics.length === 3
      );
      const newId = log?.topics[2] ? BigInt(log.topics[2]) : null;
      if (newId) setMintedId(newId);
      setMintState("success"); refetchTotal(); refetchNext();
      toast.success(newId ? `Based ID #${newId.toString()} minted!` : "Minted successfully!");
    }
  }, [isConfirmed, receipt, mintState, refetchAllowance, refetchTotal, refetchNext]);

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
  const mintClose           = useCountdown(MINT_CLOSE_DATE);

  // If nextId is in the auction reserve range (1–100), public mint hasn't opened yet.
  // Show #101 as the first public ID in that case.
  const resolvedNextId =
    nextId !== undefined
      ? nextId <= BigInt(100)
        ? BigInt(101)
        : nextId
      : BigInt(101);

  const previewId =
    mintState === "success" && mintedId !== null
      ? `#${mintedId.toString()}`
      : `#${resolvedNextId.toString()}`;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden relative">
      {/* ── Animated aurora background (fixed, behind all content) ── */}
      <AnimatedBackground />

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.05] bg-background/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">

          {/* Logo + wordmark */}
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Based ID" className="w-8 h-8 rounded-xl" />
            <div className="flex items-center gap-1">
              <span style={D} className="font-bold text-sm text-white tracking-tight">Based</span>
              <span className="text-white/20 text-xs mx-0.5">·</span>
              <span className="font-mono text-xs text-zinc-500 tracking-widest">ID</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[11px] text-zinc-600 uppercase tracking-[0.15em]">
            <a href="#unlock"   className="hover:text-white transition-colors">What you unlock</a>
            <a href="#genesis"  className="hover:text-white transition-colors">Genesis IDs</a>
            <a href="#roadmap"  className="hover:text-white transition-colors">Roadmap</a>
            <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">Dashboard</Link>
          </nav>

          <div className="flex items-center gap-3">
            <ConnectButton showBalance={false} chainStatus="icon" />
            <button
              className="md:hidden p-1.5 text-zinc-500 hover:text-white transition-colors"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="2" y1="2" x2="14" y2="14" /><line x1="14" y1="2" x2="2" y2="14" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="2" y1="4" x2="14" y2="4" /><line x1="2" y1="8" x2="14" y2="8" /><line x1="2" y1="12" x2="14" y2="12" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-white/[0.05] bg-background">
            <nav className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-5 text-[11px] text-zinc-500 uppercase tracking-[0.15em]">
              <a href="#unlock"  onClick={() => setMenuOpen(false)} className="hover:text-white transition-colors">What you unlock</a>
              <a href="#genesis" onClick={() => setMenuOpen(false)} className="hover:text-white transition-colors">Genesis IDs</a>
              <a href="#roadmap" onClick={() => setMenuOpen(false)} className="hover:text-white transition-colors">Roadmap</a>
              <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="text-zinc-400 hover:text-white transition-colors">Dashboard</Link>
            </nav>
          </div>
        )}
      </header>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section id="mint" className="min-h-screen flex items-center relative overflow-hidden">


        <div className="max-w-7xl mx-auto px-6 pt-24 pb-24 w-full grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">

          {/* Left */}
          <div className="space-y-8">

            {/* Badge */}
            <p className="flex items-center gap-2.5 text-[11px] uppercase tracking-[0.2em]">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
              <ShinyText text="Live on Base" speed={6} />
            </p>

            {/* Headline with RotatingText */}
            <div
              style={D}
              className="text-[clamp(3rem,7vw,5.5rem)] font-bold tracking-tight leading-[0.92]"
            >
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                One ID.<br />Your entire
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.5 }}
              >
                <RotatingText
                  texts={["Base journey.", "airdrop.", "community."]}
                  splitBy="words"
                  elementLevelClassName="grad-text"
                  rotationInterval={3000}
                  transition={{ type: "spring", damping: 30, stiffness: 400 }}
                  initial={{ y: "110%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "-110%", opacity: 0 }}
                  animatePresenceInitial
                />
              </motion.div>
            </div>

            {/* Subline */}
            <BlurText
              text="NFTs, airdrops, whitelists, and DAO — all for $2. Safe, permanent, and onchain. The easiest way to start on Base."
              delay={60}
              direction="bottom"
              className="text-zinc-500 text-[15px] leading-relaxed max-w-[22rem]"
            />

            {/* Mini stats row */}
            <div className="flex items-center gap-6 pt-1 border-t border-white/[0.05] flex-wrap">
              <div className="flex items-center gap-1.5">
                {totalMinted !== undefined ? (
                  <CountUp to={Number(totalMinted)} duration={1.8} className="text-xl font-black tabular-nums leading-none" />
                ) : (
                  <span className="text-xl font-black leading-none">—</span>
                )}
                <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                <span className="text-zinc-600 text-[10px] uppercase tracking-[0.18em]">Minted</span>
              </div>
              <span className="w-px h-5 bg-white/[0.05]" />
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black leading-none">$2</span>
                <span className="text-zinc-600 text-[10px] uppercase tracking-[0.18em]">USDC flat</span>
              </div>
              <span className="w-px h-5 bg-white/[0.05]" />
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black leading-none" style={GRAD}>1B</span>
                <span className="text-zinc-600 text-[10px] uppercase tracking-[0.18em]">$BASED supply</span>
              </div>
            </div>
          </div>

          {/* Right — mint card */}
          <div id="mint-card" className="space-y-3">
            <div className="flex items-center justify-between text-[10px] text-zinc-600 px-0.5 uppercase tracking-[0.15em]">
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                Minting open
              </div>
              <span className="tabular-nums normal-case tracking-normal">
                Closes {pad(mintClose.d)}d {pad(mintClose.h)}h {pad(mintClose.m)}m {pad(mintClose.s)}s
              </span>
            </div>

            <NftCard id={previewId} holder={address ?? "connect wallet to mint"} />

            <div className="flex items-center justify-between px-0.5 text-[10px] text-zinc-700 uppercase tracking-[0.12em]">
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-blue-700" />
                Snapshot #1 — Sep 30, 2026 (UTC)
              </div>
              <span className="normal-case tracking-normal">$2 USDC</span>
            </div>

            {mintState === "success" && mintedId !== null ? (
              <SuccessCard id={mintedId} onMintAnother={handleReset} />
            ) : !isConnected ? (
              <div className="rounded-xl border border-white/[0.07] p-5 text-center space-y-3">
                <p className="text-zinc-500 text-sm">Connect your wallet to mint</p>
                <div className="flex justify-center">
                  <ConnectButton label="Connect Wallet" />
                </div>
              </div>
            ) : insufficientBalance ? (
              <div className="rounded-xl border border-red-900/30 p-4 text-center">
                <p className="text-red-400 text-sm">You need $2 USDC on Base to mint.</p>
              </div>
            ) : !hasAllowance && mintState !== "approved" ? (
              <MintAction
                label="Approve $2 USDC"
                sub="Step 1 of 2"
                btnLabel={isLoading && mintState === "approving" ? (isConfirming ? "Confirming…" : "Approving…") : "Approve $2 USDC"}
                onClick={handleApprove}
                loading={isLoading && mintState === "approving"}
              />
            ) : (
              <MintAction
                label={`Mint Based ID #${resolvedNextId.toString()}`}
                sub="Step 2 of 2 — permanent"
                btnLabel={isLoading && mintState === "minting" ? (isConfirming ? "Confirming…" : "Minting…") : "Mint Now — $2 USDC"}
                onClick={handleMint}
                loading={isLoading && mintState === "minting"}
                primary
              />
            )}
            {errorMsg && <p className="text-red-400 text-xs text-center">{errorMsg}</p>}
          </div>
        </div>
      </section>

      {/* ── PROBLEM / WHY WE EXIST ──────────────────────────────── */}
      <section className="border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <FadeIn className="mb-14 max-w-2xl">
            <p className="text-zinc-600 text-[11px] uppercase tracking-[0.2em] mb-4">Why Based ID</p>
            <h2 style={D} className="text-[clamp(2rem,4vw,3.2rem)] font-bold tracking-tight leading-tight">
              Web3 promised a lot.<br />We actually deliver.
            </h2>
            <p className="text-zinc-500 text-sm mt-4 leading-relaxed">
              You've seen the rugs. The bots. The projects that vanished. The complexity that kept you out.
              Based ID is built differently — transparent, permanent, and open to anyone with $2.
            </p>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/[0.05] rounded-2xl overflow-hidden">
            {[
              {
                pain: "Got rugged before?",
                icon: "⚠",
                fix: "Every partner project is community-vetted. No anonymous teams, no unlocked allocations. The community decides who's legitimate.",
                accent: false,
              },
              {
                pain: "Worried about scams?",
                icon: "🔒",
                fix: "Fully onchain, open-source contract. No admin wallet, no upgrades, no hidden permissions. Read every line yourself on Basescan.",
                accent: false,
              },
              {
                pain: "Always miss the good projects?",
                icon: "⚡",
                fix: "Your ID auto-qualifies you for every partner drop and whitelist. No more hunting. No more missing out. It just shows up in your dashboard.",
                accent: false,
              },
              {
                pain: "Too complex or risky?",
                icon: "✓",
                fix: "$2 flat on Base. If you have USDC, you're in. No gas surprises, no phases, no price changes. Under 60 seconds from connect to mint.",
                accent: true,
              },
            ].map(({ pain, icon, fix, accent }) => (
              <SpotlightCard
                key={pain}
                className="bg-background p-7 space-y-3"
                spotlightColor="rgba(37, 99, 235, 0.06)"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{icon}</span>
                  <p className="text-zinc-500 text-[11px] uppercase tracking-[0.18em]">{pain}</p>
                </div>
                <p className={`text-sm leading-relaxed ${accent ? "text-zinc-300" : "text-zinc-400"}`}>{fix}</p>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT YOU UNLOCK ─────────────────────────────────────── */}
      <section id="unlock" className="border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 py-28">
          <FadeIn className="mb-14">
            <p className="text-zinc-600 text-[11px] uppercase tracking-[0.2em] mb-4">Benefits</p>
            <h2 style={D} className="text-[clamp(2.5rem,5vw,4rem)] font-bold tracking-tight leading-tight">
              One ID.<br />Everything unlocks.
            </h2>
            <p className="text-zinc-500 text-sm mt-4 max-w-md leading-relaxed">
              Mint once. Your Based ID becomes your permanent pass — activating more benefits as the ecosystem grows.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Live: $BASED Airdrop */}
            <FadeIn delay={0}>
              <SpotlightCard className="bg-background rounded-2xl border border-blue-900/30 p-7 space-y-4 h-full" spotlightColor="rgba(37,99,235,0.1)">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-blue-400 font-medium uppercase tracking-[0.2em]">$BASED Airdrop</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-[0.1em]">Live</span>
                </div>
                <p style={D} className="text-white font-bold text-xl leading-tight">Lower number. Bigger share.</p>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  1 billion $BASED tokens distributed across two snapshots — Sep 30 and Dec 31, 2026 (UTC).
                  Your ID number determines your weight. #1 always earns more than #1000. Claim January 2027.
                </p>
                <div className="pt-2 border-t border-white/[0.05] grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-[0.15em] mb-1">Snapshot #1</p>
                    <p className="text-white font-semibold text-sm">Sep 30, 2026 (UTC)</p>
                    <p className="text-zinc-600 text-xs">400M $BASED</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-[0.15em] mb-1">Snapshot #2</p>
                    <p className="text-white font-semibold text-sm">Dec 31, 2026 (UTC)</p>
                    <p className="text-zinc-600 text-xs">400M $BASED</p>
                  </div>
                </div>
              </SpotlightCard>
            </FadeIn>

            {/* Live: Permanent Onchain Identity */}
            <FadeIn delay={0.08}>
              <SpotlightCard className="bg-background rounded-2xl border border-white/[0.06] p-7 space-y-4 h-full" spotlightColor="rgba(37,99,235,0.07)">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-[0.2em]">Onchain Identity</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 uppercase tracking-[0.1em]">Live</span>
                </div>
                <p style={D} className="text-white font-bold text-xl leading-tight">Your number. Forever.</p>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  No servers. No IPFS. No expiry. Your Based ID art is generated entirely inside the contract as SVG.
                  It exists for as long as Base exists. #101 will always be #101.
                </p>
                <div className="pt-2 border-t border-white/[0.05]">
                  <p className="text-zinc-700 text-xs">Verifiable on Basescan · Fully open source · No admin control</p>
                </div>
              </SpotlightCard>
            </FadeIn>

            {/* Soon: Partner NFT Drops */}
            <FadeIn delay={0.12}>
              <div className="bg-background rounded-2xl border border-white/[0.04] p-7 space-y-4 h-full relative overflow-hidden">
                <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 rounded-2xl">
                  <span className="text-2xl mb-2">🔒</span>
                  <p className="text-zinc-500 text-xs uppercase tracking-[0.2em]">Coming soon</p>
                  <p className="text-zinc-600 text-[11px] mt-1">Activates with partner launch</p>
                </div>
                <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-[0.2em]">Partner NFT Drops</span>
                <p style={D} className="text-white font-bold text-xl leading-tight">Drops land in your dashboard.</p>
                <p className="text-zinc-600 text-sm leading-relaxed">
                  Hold a Based ID and automatically qualify for partner project airdrops.
                  No forms. No grinding. Your dashboard shows everything ready to claim.
                </p>
              </div>
            </FadeIn>

            {/* Soon: Whitelist + DAO */}
            <FadeIn delay={0.16}>
              <div className="bg-background rounded-2xl border border-white/[0.04] p-7 space-y-4 h-full relative overflow-hidden">
                <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 rounded-2xl">
                  <span className="text-2xl mb-2">🔒</span>
                  <p className="text-zinc-500 text-xs uppercase tracking-[0.2em]">Coming soon</p>
                  <p className="text-zinc-600 text-[11px] mt-1">Activates with DAO launch</p>
                </div>
                <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-[0.2em]">Whitelist Access + DAO</span>
                <p style={D} className="text-white font-bold text-xl leading-tight">One ID. Many doors.</p>
                <p className="text-zinc-600 text-sm leading-relaxed">
                  Auto-whitelisted for partner mint launches. Plus: vote on which projects join the ecosystem.
                  Your $BASED weight = your governance power.
                </p>
              </div>
            </FadeIn>
          </div>

          {/* How to mint — 3 steps */}
          <FadeIn className="mt-16">
            <p className="text-zinc-700 text-[10px] uppercase tracking-[0.2em] mb-6">How to mint — under 60 seconds</p>
            <div className="flex flex-col sm:flex-row gap-0 rounded-2xl overflow-hidden border border-white/[0.05]">
              {[
                { n: "01", title: "Connect wallet", body: "Any Base wallet — Coinbase, MetaMask, Rainbow." },
                { n: "02", title: "Approve $2 USDC", body: "One-time. Exactly $2. Nothing hidden." },
                { n: "03", title: "Mint your ID", body: "Your permanent number is onchain. Forever." },
              ].map(({ n, title, body }, i) => (
                <div key={n} className="flex-1 bg-background p-6 flex gap-4 items-start border-b sm:border-b-0 sm:border-r border-white/[0.05] last:border-0">
                  <span className="text-[2rem] font-black text-white/[0.06] leading-none tabular-nums flex-shrink-0">{n}</span>
                  <div>
                    <p className="text-white font-semibold text-sm mb-1">{title}</p>
                    <p className="text-zinc-500 text-xs leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── GENESIS VAULT ───────────────────────────────────────── */}
      <section id="genesis" className="border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

            {/* Left — copy */}
            <div className="lg:sticky lg:top-24">
              <FadeIn>
                <p className="text-amber-500/70 text-[11px] uppercase tracking-[0.2em] mb-5">Genesis Reserve</p>
                <h2 style={D} className="text-[clamp(2.5rem,5vw,4rem)] font-bold tracking-tight leading-tight">
                  100 IDs.<br />Never publicly<br />minted.
                </h2>
                <p className="text-zinc-500 text-sm mt-6 leading-relaxed max-w-sm">
                  IDs #1–#100 are permanently reserved. They will never be available for $2 mint.
                  Auctions open when the time is right — starting from #100 and working down to #1.
                  The lower the number, the rarer it gets.
                </p>
                <div className="mt-8 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="w-1 h-1 rounded-full bg-amber-500/50 flex-shrink-0 mt-2" />
                    <p className="text-zinc-600 text-sm">Each auction is a one-week event — bid in USDC, winner takes the ID.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-1 h-1 rounded-full bg-amber-500/50 flex-shrink-0 mt-2" />
                    <p className="text-zinc-600 text-sm">#100 auctions first. #1 auctions last. Every number rarer than the one before.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-1 h-1 rounded-full bg-amber-500/50 flex-shrink-0 mt-2" />
                    <p className="text-zinc-600 text-sm">Genesis IDs carry the highest $BASED weight of any ID on Base.</p>
                  </div>
                </div>
                <div className="mt-8 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-900/30 bg-amber-500/[0.04]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                  <span className="text-amber-500/80 text-[11px] uppercase tracking-[0.18em]">Auctions begin after 10,000 IDs minted</span>
                </div>
              </FadeIn>
            </div>

            {/* Right — locked grid */}
            <FadeIn delay={0.1}>
              <div className="grid grid-cols-10 gap-1.5">
                {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => (
                  <div
                    key={n}
                    title={`#${n}`}
                    className={`aspect-square rounded-md flex items-center justify-center text-[8px] font-mono transition-colors
                      ${n <= 10
                        ? "bg-amber-950/40 border border-amber-800/30 text-amber-700/60"
                        : "bg-zinc-900/60 border border-white/[0.04] text-zinc-700"
                      }`}
                  >
                    {n <= 10 ? (
                      <svg width="8" height="8" viewBox="0 0 10 12" fill="currentColor" className="text-amber-700/50">
                        <path d="M8 5V3.5C8 1.57 6.43 0 4.5 0S1 1.57 1 3.5V5H0v7h9V5H8zM3 3.5C3 2.67 3.67 2 4.5 2S6 2.67 6 3.5V5H3V3.5z"/>
                      </svg>
                    ) : (
                      <svg width="7" height="7" viewBox="0 0 10 12" fill="currentColor" className="opacity-30">
                        <path d="M8 5V3.5C8 1.57 6.43 0 4.5 0S1 1.57 1 3.5V5H0v7h9V5H8zM3 3.5C3 2.67 3.67 2 4.5 2S6 2.67 6 3.5V5H3V3.5z"/>
                      </svg>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-zinc-700 text-[10px] mt-4 uppercase tracking-[0.15em]">100 of 100 slots locked · Auctions begin at peak</p>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── FOR PROJECTS ────────────────────────────────────────── */}
      <section className="border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeIn>
              <p className="text-zinc-600 text-[11px] uppercase tracking-[0.2em] mb-5">For Projects</p>
              <h2 style={D} className="text-[clamp(2.5rem,5vw,4rem)] font-bold tracking-tight leading-tight">
                Build on real people.<br />Not bots.
              </h2>
              <p className="text-zinc-500 text-sm mt-6 leading-relaxed max-w-sm">
                Based ID holders are committed — they paid $2, they're on Base, and they opted in to the ecosystem.
                No wallet farmers. No airdrop hunters with 50 wallets. Just real people who want to grow with you.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  { label: "Verified community", body: "Every holder paid $2 and signed onchain. Not bots." },
                  { label: "Targeted drops",      body: "Reach holders by tier, ID range, or activity." },
                  { label: "Community vetting",   body: "The DAO votes on which projects get partner status — protecting everyone." },
                ].map(({ label, body }) => (
                  <div key={label} className="flex gap-4">
                    <div className="w-px bg-blue-900/40 flex-shrink-0" />
                    <div>
                      <p className="text-white text-sm font-semibold mb-0.5">{label}</p>
                      <p className="text-zinc-500 text-xs leading-relaxed">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-8 space-y-6">
                <p style={D} className="text-white font-bold text-xl">Interested in partnering?</p>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  We're looking for projects that are building real things on Base — not just launching and leaving.
                  If that's you, reach out. We'll work together to introduce you to the Based ID community the right way.
                </p>
                <div className="space-y-3 text-sm">
                  {[
                    "Open-source or verifiable contracts",
                    "Doxxed or publicly accountable team",
                    "Real utility for Base users",
                    "Community-driven, long-term mindset",
                  ].map((req) => (
                    <div key={req} className="flex items-center gap-2.5">
                      <span className="w-1 h-1 rounded-full bg-blue-500 flex-shrink-0" />
                      <span className="text-zinc-400">{req}</span>
                    </div>
                  ))}
                </div>
                <a
                  href="https://x.com/basedid"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/[0.08] text-white text-sm font-semibold hover:bg-white/[0.05] transition-colors"
                >
                  DM us on X →
                </a>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── TOKENOMICS ──────────────────────────────────────────── */}
      <section className="border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 py-28">
          <FadeIn className="mb-14">
            <p className="text-zinc-600 text-[11px] uppercase tracking-[0.2em] mb-4">Tokenomics</p>
            <h2 style={D} className="text-[clamp(2.5rem,5vw,4rem)] font-bold tracking-tight">1,000,000,000 $BASED.</h2>
            <p className="text-zinc-500 text-sm mt-3 max-w-md leading-relaxed">
              Fixed supply. 80% goes directly to the community — distributed proportionally by ID number.
              The earlier you minted, the more you earn.
            </p>
          </FadeIn>

          <FadeIn>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.05] rounded-2xl overflow-hidden">
              {[
                { pct: "40%", label: "Snapshot #1",  sub: "Sep 30, 2026 UTC · 400M tokens",   blue: true  },
                { pct: "40%", label: "Snapshot #2",  sub: "Dec 31, 2026 UTC · 400M tokens",   blue: true  },
                { pct: "15%", label: "Founder",      sub: "Locked until Dec 2026",         blue: false },
                { pct: "5%",  label: "Partners",     sub: "Ecosystem growth",              blue: false },
              ].map(({ pct, label, sub, blue }) => (
                <div key={label} className="bg-background p-7">
                  <p className="text-[2.5rem] font-black mb-4" style={blue ? GRAD : { color: "#3f3f46" }}>{pct}</p>
                  <p className="text-white font-semibold text-sm">{label}</p>
                  <p className="text-zinc-600 text-xs mt-1 leading-relaxed">{sub}</p>
                </div>
              ))}
            </div>
          </FadeIn>

          {/* Tier table */}
          <FadeIn delay={0.1} className="mt-6">
            <div className="rounded-2xl border border-white/[0.05] overflow-hidden">
              <div className="grid grid-cols-3 border-b border-white/[0.05] px-6 py-3">
                <p className="text-zinc-600 text-[10px] uppercase tracking-[0.2em]">Tier</p>
                <p className="text-zinc-600 text-[10px] uppercase tracking-[0.2em]">ID Range</p>
                <p className="text-zinc-600 text-[10px] uppercase tracking-[0.2em]">$BASED Weight</p>
              </div>
              {[
                { tier: "Genesis",  range: "#1 – #100",     weight: "Highest",   accent: "text-amber-400",   dot: "bg-amber-500"  },
                { tier: "Founding", range: "#101 – #1,000", weight: "High",      accent: "text-blue-400",    dot: "bg-blue-500"   },
                { tier: "Pioneer",  range: "#1,001 – #10,000", weight: "Medium", accent: "text-zinc-300",    dot: "bg-zinc-400"   },
                { tier: "Builder",  range: "#10,001+",      weight: "Base rate", accent: "text-zinc-500",    dot: "bg-zinc-600"   },
              ].map(({ tier, range, weight, accent, dot }) => (
                <div key={tier} className="grid grid-cols-3 px-6 py-4 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                    <span className={`font-semibold text-sm ${accent}`}>{tier}</span>
                  </div>
                  <span className="text-zinc-400 text-sm tabular-nums">{range}</span>
                  <span className="text-zinc-500 text-sm">{weight}</span>
                </div>
              ))}
            </div>
            <p className="text-zinc-700 text-xs mt-3">Your tier is determined by your lowest-owned ID. Multiple IDs each earn separately.</p>
          </FadeIn>
        </div>
      </section>

      {/* ── ROADMAP ─────────────────────────────────────────────── */}
      <section id="roadmap" className="border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 py-28">
          <FadeIn className="mb-16">
            <p className="text-zinc-600 text-[11px] uppercase tracking-[0.2em] mb-4">Timeline</p>
            <h2 style={D} className="text-[clamp(2.5rem,5vw,4rem)] font-bold tracking-tight">The roadmap.</h2>
            <p className="text-zinc-500 text-sm mt-3 max-w-sm leading-relaxed">
              Transparent and milestone-driven. No vague "Q3 2025" promises — just what's built, what's next, and what's coming.
            </p>
          </FadeIn>
          <div className="max-w-xl space-y-0">
            {[
              { date: "Now",                title: "Based ID launches. Public mint open.",               status: "now"      as const },
              { date: "Peak momentum",      title: "First Genesis auction — ID #100",                    status: "upcoming" as const },
              { date: "Sep 30, 2026 UTC",    title: "Snapshot #1 — 400M $BASED distributed",             status: "upcoming" as const },
              { date: "Ongoing",            title: "Genesis auctions continue — #99 down to #1",         status: "upcoming" as const },
              { date: "Dec 31, 2026 UTC",    title: "Snapshot #2 + public mint closes",                  status: "upcoming" as const },
              { date: "January 2027",       title: "Claim $BASED — all holders",                        status: "upcoming" as const },
              { date: "2027",               title: "DAO voting launches. Community governs partners.",   status: "future"   as const },
              { date: "2027+",              title: "Genesis ID #1 — the final auction.",                 status: "future"   as const },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 0.07}>
                <RoadmapItem {...item} />
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── VS SECTION ──────────────────────────────────────────── */}
      <section className="py-24 border-t border-white/[0.05] relative">
        <div className="max-w-7xl mx-auto px-6 space-y-14">
          <FadeIn>
            <div className="space-y-3 max-w-xl">
              <p className="text-zinc-600 text-[11px] uppercase tracking-[0.2em]">Why Based ID</p>
              <h2 style={D} className="text-4xl font-bold tracking-tight">
                Different from everything else
              </h2>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Alphabot and Premint are tools for <span className="text-white">project owners</span> to manage raffles.
                Based ID is a passport for <span className="text-white">you</span> — hold one ID, auto-qualify everywhere.
              </p>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[520px]">
                <thead>
                  <tr>
                    <th className="text-left text-[10px] text-zinc-600 uppercase tracking-[0.15em] pb-4 pr-6 font-medium w-1/4"></th>
                    <th className="text-left text-[10px] text-zinc-600 uppercase tracking-[0.15em] pb-4 pr-6 font-medium">Alphabot / Premint</th>
                    <th className="text-left text-[10px] text-blue-500 uppercase tracking-[0.15em] pb-4 font-medium">Based ID</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Who it's for",    "Project owners managing lists",          "You — one ID gets you in everywhere"],
                    ["Anti-bot",        "Requires manual configuration per drop", "Onchain by default. Can't fake it."],
                    ["Cost to users",   "Free to enter, but gas + forms each time","$2 once. Permanent."],
                    ["NFT drops",       "Enter one raffle at a time",             "Every approved project, auto-delivered"],
                    ["Whitelist spots", "Fill a new form per project",            "Auto-whitelisted as a holder"],
                    ["Identity",        "Temporary wallet connection",            "Permanent sequential onchain ID"],
                    ["Airdrop",         "None",                                   "1B $BASED distributed to holders"],
                  ].map(([feature, them, us], i) => (
                    <tr key={i} className="border-t border-white/[0.04]">
                      <td className="py-3.5 pr-6 text-zinc-500 text-xs align-top">{feature}</td>
                      <td className="py-3.5 pr-6 text-zinc-600 text-xs align-top leading-relaxed">{them}</td>
                      <td className="py-3.5 text-zinc-300 text-xs align-top leading-relaxed font-medium">{us}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── GET USDC GUIDE ───────────────────────────────────────── */}
      <section className="py-24 border-t border-white/[0.05] relative">
        <div className="max-w-7xl mx-auto px-6 space-y-10">
          <FadeIn>
            <div className="space-y-3 max-w-xl">
              <p className="text-zinc-600 text-[11px] uppercase tracking-[0.2em]">Before you mint</p>
              <h2 style={D} className="text-4xl font-bold tracking-tight">
                How to get USDC on Base
              </h2>
              <p className="text-zinc-500 text-sm leading-relaxed">
                You need $2 USDC on the Base network. Here are the easiest ways to get it.
              </p>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  step: "01",
                  title: "Bridge from Ethereum",
                  body: "Go to bridge.base.org, connect your wallet, and bridge USDC from Ethereum mainnet to Base. Takes ~1 minute.",
                  tag: "Recommended",
                  tagColor: "text-blue-400",
                },
                {
                  step: "02",
                  title: "Buy directly on Base",
                  body: "Use Coinbase, Uniswap, or any DEX on Base to swap ETH → USDC. You'll need a small amount of ETH on Base for gas first.",
                  tag: "Quick",
                  tagColor: "text-green-400",
                },
                {
                  step: "03",
                  title: "Withdraw from Coinbase",
                  body: "If you have USDC on Coinbase, go to Send → select USDC → choose Base network → paste your wallet address.",
                  tag: "Easiest for beginners",
                  tagColor: "text-amber-400",
                },
              ].map(({ step, title, body, tag, tagColor }) => (
                <SpotlightCard
                  key={step}
                  className="bg-background rounded-2xl border border-white/[0.05] p-6 space-y-3"
                  spotlightColor="rgba(37,99,235,0.05)"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-700 text-[10px] font-mono">{step}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-[0.12em] ${tagColor}`}>{tag}</span>
                  </div>
                  <p className="text-white font-semibold text-sm">{title}</p>
                  <p className="text-zinc-500 text-xs leading-relaxed">{body}</p>
                </SpotlightCard>
              ))}
            </div>
          </FadeIn>

          <FadeIn>
            <div className="rounded-xl border border-white/[0.05] p-5 flex items-start gap-3 max-w-xl">
              <span className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
              <p className="text-zinc-500 text-xs leading-relaxed">
                <span className="text-white font-medium">You also need a tiny amount of ETH on Base for gas.</span>{" "}
                Each transaction costs less than $0.01 on Base. Bridge a small amount of ETH alongside your USDC.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 border-t border-white/[0.05] relative">
        <div className="max-w-7xl mx-auto px-6 space-y-10">
          <FadeIn>
            <div className="space-y-3 max-w-xl">
              <p className="text-zinc-600 text-[11px] uppercase tracking-[0.2em]">FAQ</p>
              <h2 style={D} className="text-4xl font-bold tracking-tight">
                Common questions
              </h2>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.04] rounded-2xl overflow-hidden max-w-4xl">
              {[
                {
                  q: "Can I mint more than one ID?",
                  a: "Yes. There's no limit per wallet. Each ID earns $BASED separately in both snapshots — your lowest-numbered ID earns the most.",
                },
                {
                  q: "What happens if I sell my ID before the snapshot?",
                  a: "Whoever holds the ID at snapshot time earns the allocation. If you sell before Sep 30, the buyer gets the Snapshot #1 rewards.",
                },
                {
                  q: "Is the $2 price permanent?",
                  a: "Yes. The mint price is hardcoded in the contract at $2 USDC. It cannot be changed — not even by us.",
                },
                {
                  q: "What is $BASED? Is it tradeable?",
                  a: "$BASED is a community governance token distributed to Based ID holders. It will be claimable in January 2027. No guaranteed value.",
                },
                {
                  q: "How does the airdrop weight work?",
                  a: "Weight = 1 / sqrt(your ID number). So #1 has weight 1.0, #4 has 0.5, #100 has 0.1. Lower ID = higher share of each snapshot pool.",
                },
                {
                  q: "What are Genesis IDs (#1–#100)?",
                  a: "They're held back from public minting and will be auctioned one-by-one starting after 10,000 IDs are minted, from #100 down to #1.",
                },
                {
                  q: "Is the contract verified and open source?",
                  a: "Yes. The full contract source is verified on Basescan. You can read every line — mint price, snapshot logic, withdrawal rules.",
                },
                {
                  q: "Do I need to do anything to receive the airdrop?",
                  a: "No action needed before January 2027. Just hold your Based ID through both snapshots. A claim button will appear in your dashboard.",
                },
              ].map(({ q, a }) => (
                <div key={q} className="bg-background p-6 space-y-2">
                  <p className="text-white font-semibold text-sm leading-snug">{q}</p>
                  <p className="text-zinc-500 text-xs leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] py-14">
        <div className="max-w-7xl mx-auto px-6 space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">

            {/* Wordmark */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <span style={D} className="font-bold text-sm text-white tracking-tight">Based</span>
                <span className="text-white/20 text-xs mx-1">·</span>
                <span className="font-mono text-xs text-zinc-500 tracking-widest">ID</span>
              </div>
              <p className="text-zinc-700 text-xs">Built on Base · 2026</p>
            </div>

            {/* Nav */}
            <div className="flex items-center gap-8 text-[11px] text-zinc-600">
              <a href="#unlock"   className="hover:text-white transition-colors">What you unlock</a>
              <a href="#genesis"  className="hover:text-white transition-colors">Genesis IDs</a>
              <a href="#roadmap"  className="hover:text-white transition-colors">Roadmap</a>
              <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors">Dashboard</Link>
            </div>

            {/* Social */}
            <a
              href="https://x.com/basedid"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-600 hover:text-white transition-colors text-sm font-bold"
              aria-label="Based ID on X"
            >
              𝕏
            </a>
          </div>

          {/* Contract + disclaimer */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-white/[0.05]">
            <div className="flex items-center gap-2 text-[11px] text-zinc-700">
              <span>Contract:</span>
              <a
                href={`${BASESCAN_URL}/address/${BASED_ID_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono hover:text-zinc-400 transition-colors"
              >
                {BASED_ID_ADDRESS.slice(0, 6)}…{BASED_ID_ADDRESS.slice(-4)}
              </a>
            </div>
            <p className="text-zinc-700 text-[11px]">Mint closes Dec 31, 2026 (UTC)</p>
          </div>

          {/* Risk disclaimer */}
          <p className="text-zinc-800 text-[11px] leading-relaxed">
            Minting requires USDC on Base. All transactions are final and onchain.
            Based ID is not a financial product — $BASED token has no guaranteed value.
            Only spend what you can afford to lose.
          </p>
        </div>
      </footer>

    </div>
  );
}

// ─── Components ───────────────────────────────────────────────────────────────

function MintAction({
  label, sub, btnLabel, onClick, loading, primary = false,
}: {
  label: string; sub: string; btnLabel: string;
  onClick: () => void; loading: boolean; primary?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] p-5 space-y-4">
      <div>
        <p className="text-white font-semibold text-sm">{label}</p>
        <p className="text-zinc-600 text-xs mt-0.5">{sub}</p>
      </div>
      <button
        onClick={onClick} disabled={loading}
        className={`w-full py-3.5 rounded-lg font-bold text-sm tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed
          ${primary
            ? "bg-white text-black hover:bg-zinc-100"
            : "bg-zinc-900 border border-white/[0.08] text-white hover:bg-zinc-800"
          }`}
      >
        {btnLabel}
      </button>
    </div>
  );
}

function SuccessCard({ id, onMintAnother }: { id: bigint; onMintAnother: () => void }) {
  function shareOnX() {
    const text = `Just minted Based ID #${id.toString()} on Base 🔵\n\nLower number = earlier = bigger $BASED airdrop.\n$2 USDC flat. No phases. No price hikes.\n\nMint yours → basedid.space`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  }
  return (
    <div className="rounded-xl border border-white/[0.07] p-5 space-y-4">
      <div className="text-center">
        <p className="text-green-400 text-[11px] font-medium uppercase tracking-[0.15em] mb-1">Minted</p>
        <p className="text-zinc-400 text-sm">Based ID #{id.toString()} is yours forever.</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button onClick={shareOnX}
          className="py-3 rounded-lg bg-zinc-900 border border-white/[0.07] hover:bg-zinc-800 text-white text-xs font-medium transition-colors">
          Share on X
        </button>
        <Link href="/dashboard"
          className="py-3 rounded-lg bg-zinc-900 border border-white/[0.07] hover:bg-zinc-800 text-white text-xs font-medium transition-colors text-center">
          Dashboard
        </Link>
        <button onClick={onMintAnother}
          className="py-3 rounded-lg bg-white text-black text-xs font-bold transition-colors hover:bg-zinc-100">
          Mint Again
        </button>
      </div>
    </div>
  );
}


function RoadmapItem({ date, title, status }: {
  date: string; title: string; status: "now" | "upcoming" | "future";
}) {
  const isNow    = status === "now";
  const isFuture = status === "future";
  return (
    <div className="relative flex gap-6 pb-10 last:pb-0">
      <div className="flex flex-col items-center flex-shrink-0 w-5">
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center z-10
          ${isNow ? "border-green-500 bg-green-500/10" : isFuture ? "border-zinc-800 bg-background" : "border-blue-600 bg-blue-600/10"}`}>
          <div className={`w-1 h-1 rounded-full
            ${isNow ? "bg-green-500 animate-pulse" : isFuture ? "bg-zinc-700" : "bg-blue-500"}`} />
        </div>
        <div className="w-px flex-1 bg-white/[0.05] mt-1" />
      </div>
      <div className="pt-0.5">
        <p className={`text-[10px] font-medium uppercase tracking-[0.18em] mb-1
          ${isNow ? "text-green-500" : isFuture ? "text-zinc-700" : "text-blue-500"}`}>
          {date}
        </p>
        <p className={`font-semibold text-lg ${isFuture ? "text-zinc-700" : "text-white"}`}>{title}</p>
      </div>
    </div>
  );
}
