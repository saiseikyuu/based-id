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

const SNAPSHOT_2_DATE = new Date("2026-12-31T23:59:59Z");

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
  const mintClose           = useCountdown(SNAPSHOT_2_DATE);

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
                Snapshot #1 — Sep 30, 2026
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

      {/* ── BUILT ON BASE + PARTNERS ─────────────────────────────── */}
      <section className="border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 py-20 space-y-16">

          {/* Built on Base badge */}
          <FadeIn className="flex justify-center">
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-white/[0.07] bg-white/[0.02]">
              <svg width="20" height="20" viewBox="0 0 111 111" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6 85.359 0 54.921 0C26.0 0 2.0 22.0 0 50.354H72.943V59.68H0C2.0 88.0 26.0 110.034 54.921 110.034Z" fill="#0052FF"/>
              </svg>
              <span className="text-white/80 text-sm font-medium tracking-wide">Built on Base</span>
            </div>
          </FadeIn>

          {/* Partners */}
          <FadeIn>
            <div className="space-y-8">
              <div className="text-center space-y-2">
                <p className="text-zinc-600 text-[11px] uppercase tracking-[0.2em]">Partner Projects</p>
                <h3 style={D} className="text-2xl font-bold text-white tracking-tight">Ecosystem partners coming soon</h3>
                <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                  Vetted projects will drop NFTs, whitelist spots, and exclusive access directly to every Based ID holder.
                </p>
              </div>

              {/* Blurred placeholder partner slots */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-2xl border border-white/[0.05] bg-white/[0.02] flex flex-col items-center justify-center gap-1.5"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/[0.04] blur-sm" />
                    <span className="text-zinc-800 text-[8px] uppercase tracking-[0.15em]">Soon</span>
                  </div>
                ))}
              </div>

              {/* Partner CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl border border-white/[0.06] bg-white/[0.01]">
                <div>
                  <p className="text-white font-semibold text-sm">Building on Base?</p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    Drop to 10,000+ verified Base wallets. No bots. Every holder is real.
                  </p>
                </div>
                <a
                  href="https://x.com/basedidofficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  DM us on X
                </a>
              </div>
            </div>
          </FadeIn>
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
                <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-[2px] flex flex-col items-center justify-center z-10 rounded-2xl gap-2">
                  <span className="px-3 py-1 rounded-full border border-white/10 text-zinc-500 text-[10px] uppercase tracking-[0.2em]">Coming Soon</span>
                  <p className="text-zinc-700 text-[11px]">Activates with partner launch</p>
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
                <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-[2px] flex flex-col items-center justify-center z-10 rounded-2xl gap-2">
                  <span className="px-3 py-1 rounded-full border border-white/10 text-zinc-500 text-[10px] uppercase tracking-[0.2em]">Coming Soon</span>
                  <p className="text-zinc-700 text-[11px]">Activates with DAO launch</p>
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
                  Auctions begin around the 1,000 mint mark — starting from #100 and working down to #1.
                  Winners earn $BASED at the highest weight in both snapshots. The lower the number, the rarer it gets.
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
                  <span className="text-amber-500/80 text-[11px] uppercase tracking-[0.18em]">First auction before Snapshot #1 · Sep 30, 2026</span>
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
                    className="aspect-square rounded-md flex items-center justify-center bg-amber-950/40 border border-amber-800/30 text-amber-700/50 text-[7px] font-mono"
                  >
                    {n}
                  </div>
                ))}
              </div>
              <p className="text-zinc-700 text-[10px] mt-4 uppercase tracking-[0.15em]">100 of 100 slots locked · First auction before Sep 30, 2026</p>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── FOR PROJECTS ────────────────────────────────────────── */}
      <section className="border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 py-28 space-y-14">

          {/* Top — heading + comparison panel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left: heading */}
            <FadeIn className="space-y-6">
              <p className="text-zinc-600 text-[11px] uppercase tracking-[0.2em]">For Projects</p>
              <h2 style={D} className="text-[clamp(2.5rem,5vw,4rem)] font-bold tracking-tight leading-[0.95]">
                Drop to real<br />wallets.<br />
                <span style={GRAD}>Not bots.</span>
              </h2>
              <p style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }} className="text-zinc-400 text-base leading-relaxed max-w-sm">
                Every Based ID holder paid $2 and signed onchain. A small committed audience beats a massive noisy one every time.
              </p>
              <div className="flex items-center gap-4 pt-2">
                <a
                  href="https://x.com/basedidofficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Partner with us
                </a>
                <span className="text-zinc-700 text-xs">@basedidofficial</span>
              </div>
            </FadeIn>

            {/* Right: comparison table */}
            <FadeIn delay={0.1}>
              <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[1fr_100px_100px] border-b border-white/[0.06] bg-white/[0.02]">
                  <div className="px-5 py-3" />
                  <div className="px-4 py-3 text-center border-l border-white/[0.05]">
                    <p className="text-zinc-600 text-[10px] uppercase tracking-[0.15em]">Typical drop</p>
                  </div>
                  <div className="px-4 py-3 text-center border-l border-blue-900/30 bg-blue-950/20">
                    <p className="text-blue-400 text-[10px] uppercase tracking-[0.15em] font-semibold">Based ID</p>
                  </div>
                </div>
                {[
                  { label: "Wallet verification",  typical: "None",   based: "Onchain"  },
                  { label: "Entry cost per holder", typical: "$0",     based: "$2 USDC"  },
                  { label: "Bot exposure",          typical: "High",   based: "Zero"     },
                  { label: "Multi-wallet farmers",  typical: "Common", based: "Blocked"  },
                  { label: "Forms required",        typical: "Yes",    based: "None"     },
                  { label: "Holder commitment",     typical: "None",   based: "Paid in"  },
                ].map(({ label, typical, based }, i) => (
                  <div key={label} className={`grid grid-cols-[1fr_100px_100px] border-b border-white/[0.04] last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                    <div className="px-5 py-3.5">
                      <p className="text-zinc-400 text-xs">{label}</p>
                    </div>
                    <div className="px-4 py-3.5 text-center border-l border-white/[0.05]">
                      <p className="text-zinc-600 text-xs tabular-nums">{typical}</p>
                    </div>
                    <div className="px-4 py-3.5 text-center border-l border-blue-900/20 bg-blue-950/10">
                      <p className="text-blue-300 text-xs font-semibold tabular-nums">{based}</p>
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>

          {/* Stats + features combined row */}
          <FadeIn>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
                    </svg>
                  ),
                  value: "$2",
                  label: "Verified entry",
                  body: "Every holder paid $2 USDC and signed onchain. You can't fake a Based ID — wallets are real, committed, and on Base.",
                },
                {
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                    </svg>
                  ),
                  value: "4 tiers",
                  label: "Targeted reach",
                  body: "Reach Genesis, Founding, Pioneer, or Builder holders — or all of them. Every wallet and tier is verifiable onchain.",
                },
                {
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  ),
                  value: "DAO",
                  label: "Community-governed",
                  body: "The DAO votes to approve partners before any drop. Your project earns community trust — it's not just pushed to them.",
                },
              ].map(({ icon, value, label, body }) => (
                <SpotlightCard
                  key={label}
                  className="bg-background rounded-2xl border border-white/[0.06] p-6 space-y-5 h-full"
                  spotlightColor="rgba(37,99,235,0.07)"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/10 flex items-center justify-center text-blue-400 flex-shrink-0">
                      {icon}
                    </div>
                    <p className="text-[2rem] font-black leading-none" style={GRAD}>{value}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-white font-semibold text-sm">{label}</p>
                    <p className="text-zinc-500 text-xs leading-relaxed">{body}</p>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </FadeIn>

          {/* Partner CTA bar */}
          <FadeIn>
            <div className="relative rounded-2xl overflow-hidden border border-blue-900/20">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-950/40 via-background to-background" />
              <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center p-8">
                <div className="space-y-4">
                  <div>
                    <p style={D} className="text-white font-bold text-xl mb-1.5">Ready to partner?</p>
                    <p className="text-zinc-500 text-sm leading-relaxed max-w-lg">
                      We work with projects building real things on Base. DM us on X — we'll review your project and set up the drop if it's a fit.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {[
                      "Verifiable contracts",
                      "Accountable team",
                      "Real utility",
                      "Long-term mindset",
                    ].map((req) => (
                      <div key={req} className="flex items-center gap-1.5">
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-blue-500 flex-shrink-0">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="text-zinc-500 text-xs">{req}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <a
                  href="https://x.com/basedidofficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 flex items-center gap-2.5 px-7 py-4 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors justify-center"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  DM us on X
                </a>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── TOKENOMICS ──────────────────────────────────────────── */}
      <section className="border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 py-28 space-y-16">

          {/* Heading row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-end">
            <FadeIn>
              <p className="text-zinc-600 text-[11px] uppercase tracking-[0.2em] mb-4">Tokenomics</p>
              <h2 style={D} className="text-[clamp(2.5rem,5vw,4rem)] font-bold tracking-tight leading-tight">
                1,000,000,000<br /><span style={GRAD}>$BASED.</span>
              </h2>
              <p style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }} className="text-zinc-400 text-base mt-5 leading-relaxed max-w-sm">
                Fixed supply. 80% goes directly to the community — distributed by ID number. Earlier = more.
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              {/* Weight formula card */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-6 space-y-4">
                <p className="text-zinc-600 text-[10px] uppercase tracking-[0.2em]">Allocation formula</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1 rounded-xl bg-white/[0.03] border border-white/[0.06] px-5 py-4 text-center">
                    <p className="font-mono text-white text-lg font-bold tracking-wide">
                      weight = 1 ÷ √id
                    </p>
                    <p className="text-zinc-600 text-[10px] mt-1.5">Your share of each 400M pool</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { id: "#1",     w: "1.000×", color: "text-amber-400" },
                    { id: "#100",   w: "0.100×", color: "text-blue-400"  },
                    { id: "#1,000", w: "0.032×", color: "text-zinc-400"  },
                    { id: "#10K",   w: "0.010×", color: "text-zinc-600"  },
                  ].map(({ id, w, color }) => (
                    <div key={id} className="rounded-lg bg-white/[0.02] border border-white/[0.04] py-2.5 px-1">
                      <p className="text-zinc-600 text-[9px] font-mono mb-1">{id}</p>
                      <p className={`text-xs font-bold tabular-nums ${color}`}>{w}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Distribution bar */}
          <FadeIn>
            <div className="space-y-3">
              <p className="text-zinc-600 text-[10px] uppercase tracking-[0.2em]">Token distribution</p>
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                <div className="h-full rounded-l-full" style={{ width: "40%", background: "linear-gradient(90deg,#1d4ed8,#3b82f6)" }} />
                <div className="h-full"                style={{ width: "40%", background: "linear-gradient(90deg,#2563eb,#60a5fa)" }} />
                <div className="h-full"                style={{ width: "15%", background: "#27272a" }} />
                <div className="h-full rounded-r-full" style={{ width: "5%",  background: "#18181b" }} />
              </div>
              <div className="flex items-center gap-6 flex-wrap">
                {[
                  { color: "bg-blue-600",   label: "Community Snapshot #1 — 40%" },
                  { color: "bg-blue-400",   label: "Community Snapshot #2 — 40%" },
                  { color: "bg-zinc-700",   label: "Founder — 15%"               },
                  { color: "bg-zinc-800",   label: "Partners — 5%"               },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                    <span className="text-zinc-500 text-xs">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Allocation cards */}
          <FadeIn>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  pct: "40%",
                  tokens: "400M",
                  label: "Snapshot #1",
                  date: "Sep 30, 2026 UTC",
                  desc: "Distributed to all holders at first snapshot. Weight by ID number.",
                  badge: "Community",
                  badgeColor: "text-blue-400 bg-blue-900/20 border-blue-900/30",
                  blue: true,
                  locked: false,
                },
                {
                  pct: "40%",
                  tokens: "400M",
                  label: "Snapshot #2",
                  date: "Dec 31, 2026 UTC",
                  desc: "Second distribution. Hold through both snapshots to earn the full 800M.",
                  badge: "Community",
                  badgeColor: "text-blue-400 bg-blue-900/20 border-blue-900/30",
                  blue: true,
                  locked: false,
                },
                {
                  pct: "15%",
                  tokens: "150M",
                  label: "Founder",
                  date: "Locked until Dec 2026",
                  desc: "Vested alongside community. No early unlock — aligned with holder outcomes.",
                  badge: "Locked",
                  badgeColor: "text-zinc-500 bg-white/[0.03] border-white/[0.06]",
                  blue: false,
                  locked: true,
                },
                {
                  pct: "5%",
                  tokens: "50M",
                  label: "Partners",
                  date: "Ecosystem growth",
                  desc: "Reserved for vetted partner projects approved by the DAO.",
                  badge: "DAO-governed",
                  badgeColor: "text-zinc-500 bg-white/[0.03] border-white/[0.06]",
                  blue: false,
                  locked: false,
                },
              ].map(({ pct, tokens, label, date, desc, badge, badgeColor, blue, locked }) => (
                <SpotlightCard
                  key={label}
                  className="bg-background rounded-2xl border border-white/[0.05] p-6 flex flex-col gap-4"
                  spotlightColor={blue ? "rgba(37,99,235,0.08)" : "rgba(255,255,255,0.02)"}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[2.8rem] font-black leading-none" style={blue ? GRAD : { color: "#3f3f46" }}>{pct}</p>
                    <span className={`text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-[0.1em] border flex-shrink-0 mt-1 ${badgeColor}`}>
                      {badge}
                    </span>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className={`font-bold text-sm ${blue ? "text-white" : "text-zinc-500"}`}>{label}</p>
                    <p className={`text-[10px] uppercase tracking-[0.12em] ${blue ? "text-blue-400/70" : "text-zinc-700"}`}>{tokens} tokens</p>
                  </div>
                  <div className="pt-3 border-t border-white/[0.05] space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      {locked && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 flex-shrink-0">
                          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      )}
                      <p className={`text-[10px] ${locked ? "text-zinc-600" : "text-zinc-600"}`}>{date}</p>
                    </div>
                    <p className="text-zinc-600 text-[11px] leading-relaxed">{desc}</p>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </FadeIn>

          {/* Tier weight section */}
          <FadeIn>
            <div className="space-y-5">
              <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-zinc-600 text-[10px] uppercase tracking-[0.2em] mb-2">Airdrop weight by tier</p>
                  <p style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }} className="text-white font-bold text-lg">Lower number. Heavier weight. Larger share.</p>
                </div>
                <p className="text-zinc-700 text-xs max-w-xs text-right">Tier determined by your lowest-owned ID. Multiple IDs each earn separately.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { tier: "Genesis",  range: "#1 – #100",        example: "#1 = 1.000×",  bar: 100, color: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.15)", text: "text-amber-400" },
                  { tier: "Founding", range: "#101 – #1,000",    example: "#101 = 0.099×", bar: 10,  color: "#3b82f6", bg: "rgba(59,130,246,0.06)",  border: "rgba(59,130,246,0.15)",  text: "text-blue-400"  },
                  { tier: "Pioneer",  range: "#1,001 – #10,000", example: "#1K = 0.032×", bar: 3,   color: "#6b7280", bg: "rgba(107,114,128,0.04)", border: "rgba(107,114,128,0.1)",  text: "text-zinc-400"  },
                  { tier: "Builder",  range: "#10,001+",          example: "#10K = 0.010×",bar: 1,   color: "#3f3f46", bg: "rgba(63,63,70,0.04)",    border: "rgba(63,63,70,0.12)",    text: "text-zinc-600"  },
                ].map(({ tier, range, example, bar, color, bg, border, text }) => (
                  <div
                    key={tier}
                    className="rounded-2xl p-5 space-y-4"
                    style={{ backgroundColor: bg, border: `1px solid ${border}` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-sm ${text}`}>{tier}</span>
                      <span className="text-zinc-700 text-[10px] font-mono">{range}</span>
                    </div>
                    {/* Weight bar */}
                    <div className="space-y-1.5">
                      <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${bar}%`, backgroundColor: color, opacity: 0.7 }}
                        />
                      </div>
                      <p className="font-mono text-[11px] font-semibold" style={{ color }}>{example}</p>
                    </div>
                    <p className="text-zinc-600 text-[11px] leading-relaxed">
                      {tier === "Genesis"  && "Highest weight. Genesis holders earn the most per ID by far."}
                      {tier === "Founding" && "~10% the weight of #1. Still significantly ahead of later minters."}
                      {tier === "Pioneer"  && "Locked in early. Higher weight than the vast majority of holders."}
                      {tier === "Builder"  && "Base rate. Mint more IDs or lower numbers to increase your share."}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── ROADMAP ─────────────────────────────────────────────── */}
      <section id="roadmap" className="border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 py-28">
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-16 items-start">

            {/* Left — sticky heading */}
            <FadeIn className="lg:sticky lg:top-24 space-y-8">
              <div>
                <p className="text-zinc-600 text-[11px] uppercase tracking-[0.2em] mb-4">Timeline</p>
                <h2 style={D} className="text-[clamp(2.5rem,5vw,4rem)] font-bold tracking-tight leading-tight">
                  The roadmap.
                </h2>
                <p className="text-zinc-500 text-sm mt-4 leading-relaxed">
                  Milestone-driven. No vague quarters — just what's built, what's next, and what's coming.
                </p>
              </div>

              {/* Progress bar */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-700 text-[10px] uppercase tracking-[0.15em]">Progress</span>
                  <span className="text-green-500 text-[10px] uppercase tracking-[0.15em]">Phase 1 of 4</span>
                </div>
                <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full w-[12%] bg-gradient-to-r from-green-600 to-green-400 rounded-full" />
                </div>
              </div>

              {/* Phase legend */}
              <div className="space-y-2">
                {[
                  { dot: "bg-green-500",     label: "Live now"   },
                  { dot: "bg-blue-500/60",   label: "Upcoming"   },
                  { dot: "bg-zinc-700",      label: "Future"     },
                ].map(({ dot, label }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                    <span className="text-zinc-600 text-xs">{label}</span>
                  </div>
                ))}
              </div>
            </FadeIn>

            {/* Right — timeline cards */}
            <div className="relative">
              <div className="absolute left-[18px] top-3 bottom-3 w-px bg-white/[0.05]" />
              <div className="space-y-3">
                {[
                  {
                    date: "Now",
                    title: "Based ID launches",
                    body: "Public mint is open. $2 USDC flat. Permanent sequential IDs on Base — no expiry, no servers.",
                    status: "now" as const,
                  },
                  {
                    date: "~1,000 mints",
                    title: "First Genesis auction — ID #100",
                    body: "The rarest publicly-available slot goes to auction. Winner earns $BASED at the highest weight in both snapshots.",
                    status: "upcoming" as const,
                  },
                  {
                    date: "Sep 30, 2026 UTC",
                    title: "Snapshot #1",
                    body: "400M $BASED allocated proportionally by ID number. Lower number = higher weight = larger share.",
                    status: "upcoming" as const,
                  },
                  {
                    date: "Ongoing",
                    title: "Genesis auctions continue",
                    body: "IDs #99 down to #2 released one-by-one. Each number rarer than the last. Community events around each drop.",
                    status: "upcoming" as const,
                  },
                  {
                    date: "Dec 31, 2026 UTC",
                    title: "Snapshot #2",
                    body: "400M $BASED allocated. Every holder who made it through both snapshots earns from the full 800M pool.",
                    status: "upcoming" as const,
                  },
                  {
                    date: "January 2027",
                    title: "Claim $BASED",
                    body: "Claim button goes live in your dashboard. Every Based ID holder from both snapshots can claim their allocation.",
                    status: "upcoming" as const,
                  },
                  {
                    date: "2027",
                    title: "DAO voting launches",
                    body: "Community governs which projects join the ecosystem. Your $BASED weight = your governance power.",
                    status: "future" as const,
                  },
                  {
                    date: "2027+",
                    title: "Genesis ID #1 — the final auction",
                    body: "The rarest Based ID. One wallet wins it forever. The grand finale of the Genesis auction series.",
                    status: "future" as const,
                  },
                ].map((item, i) => (
                  <FadeIn key={i} delay={i * 0.06}>
                    <RoadmapCard {...item} />
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VS SECTION ──────────────────────────────────────────── */}
      <section className="py-24 border-t border-white/[0.05] relative">
        <div className="max-w-7xl mx-auto px-6 space-y-14">
          <FadeIn>
            <div className="space-y-3 max-w-xl">
              <p className="text-zinc-600 text-[11px] uppercase tracking-[0.2em]">Why Based ID</p>
              <h2 style={D} className="text-4xl font-bold tracking-tight leading-tight">
                Built different.<br />By design.
              </h2>
              <p className="text-zinc-500 text-sm leading-relaxed">
                One ID. Every partner drop, whitelist, and airdrop — auto-qualified.
                No forms. No bots. No expiry.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04] rounded-2xl overflow-hidden">
            {[
              {
                label: "Permanent",
                body: "Your ID is minted onchain and lives forever. No server can take it down. No company can revoke it.",
                accent: false,
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
              },
              {
                label: "Bot-proof",
                body: "Onchain by default. Wallet-verified. You can't fake a Based ID — every mint is a real wallet.",
                accent: false,
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>,
              },
              {
                label: "$2. Once.",
                body: "Flat price. No phases, no presale, no price hike. Every holder paid the same. Always.",
                accent: true,
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
              },
              {
                label: "Auto-qualify",
                body: "Hold your ID and you're in — every partner drop and whitelist lands in your dashboard automatically.",
                accent: false,
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
              },
              {
                label: "1B $BASED airdrop",
                body: "Lower number = more weight = larger share. Two snapshots. Claim January 2027.",
                accent: false,
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
              },
              {
                label: "Open source",
                body: "Every line of code is public on Basescan. No hidden permissions, no admin backdoor, no upgrade proxy.",
                accent: false,
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
              },
            ].map(({ label, body, accent, icon }) => (
              <FadeIn key={label}>
                <div className={`bg-background p-7 h-full space-y-4 ${accent ? "bg-blue-950/20" : ""}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? "bg-blue-500/10 text-blue-400" : "bg-white/[0.04] text-zinc-500"}`}>
                    {icon}
                  </div>
                  <div className="space-y-2">
                    <p className={`text-sm font-semibold ${accent ? "text-blue-400" : "text-white"}`}>{label}</p>
                    <p className="text-zinc-500 text-sm leading-relaxed">{body}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
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
            <div className="max-w-2xl divide-y divide-white/[0.05] rounded-2xl border border-white/[0.05] overflow-hidden">
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
                  a: "They're held back from public minting and will be auctioned one-by-one before Snapshot #1 (Sep 30, 2026), starting from #100 down to #1. Winners earn $BASED at the highest weight.",
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
                <FaqItem key={q} q={q} a={a} />
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────── */}
      <section className="border-t border-white/[0.05] py-32">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-8">
          <FadeIn>
            <p className="text-zinc-600 text-[11px] uppercase tracking-[0.2em]">Get started</p>
            <h2 style={D} className="text-[clamp(2.5rem,6vw,5rem)] font-bold tracking-tight leading-tight mt-4">
              Your number<br />is waiting.
            </h2>
            <p className="text-zinc-500 text-sm mt-6 max-w-sm mx-auto leading-relaxed">
              Mint once for $2. Keep it forever. Every benefit activates automatically.
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <a
                href="#mint"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("mint-card")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-8 py-4 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-100 transition-colors"
              >
                Mint Now — $2 USDC
              </a>
              <Link href="/dashboard" className="px-8 py-4 rounded-xl border border-white/[0.08] text-zinc-400 font-medium text-sm hover:text-white hover:border-white/[0.15] transition-colors">
                View Dashboard →
              </Link>
            </div>
            <p className="text-zinc-700 text-xs mt-6">Permanent · Onchain · No gas surprises</p>
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
              href="https://x.com/basedidofficial"
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
            <p className="text-zinc-700 text-[11px]">Minting open · No close date</p>
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
    const text = `Just minted Based ID #${id.toString()} on Base.\n\nLower number = earlier = bigger $BASED airdrop.\n$2 USDC flat. No phases. No price changes. Ever.\n\nMint yours → basedid.space\n\n@basedidofficial`;
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


function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      className="w-full text-left px-6 py-5 focus:outline-none group"
      onClick={() => setOpen((o) => !o)}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-white font-semibold text-sm leading-snug">{q}</p>
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          className={`text-zinc-600 flex-shrink-0 transition-transform duration-200 group-hover:text-zinc-400 ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 5l5 5 5-5"/>
        </svg>
      </div>
      {open && (
        <p className="text-zinc-500 text-xs leading-relaxed mt-3">{a}</p>
      )}
    </button>
  );
}

function RoadmapCard({ date, title, body, status }: {
  date: string; title: string; body: string; status: "now" | "upcoming" | "future";
}) {
  const isNow    = status === "now";
  const isFuture = status === "future";
  return (
    <div className={`relative flex gap-4 ${isFuture ? "opacity-40" : ""}`}>
      {/* Dot */}
      <div className="flex-shrink-0 w-9 flex justify-center pt-5 relative z-10">
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 relative ${
          isNow
            ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]"
            : isFuture
            ? "bg-zinc-800 border border-zinc-700"
            : "bg-blue-500/30 border border-blue-500/50"
        }`}>
          {isNow && (
            <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-30" />
          )}
        </div>
      </div>

      {/* Card */}
      <div className={`flex-1 mb-3 rounded-2xl border px-5 py-4 transition-colors ${
        isNow
          ? "border-green-900/30 bg-green-950/[0.08]"
          : isFuture
          ? "border-white/[0.03] bg-transparent"
          : "border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.025]"
      }`}>
        <div className="flex items-start justify-between gap-4 mb-2">
          <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${
            isNow ? "text-green-500" : isFuture ? "text-zinc-700" : "text-blue-400"
          }`}>{date}</p>
          <span className={`flex-shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.1em] ${
            isNow
              ? "bg-green-900/40 text-green-400 border border-green-800/40"
              : isFuture
              ? "bg-white/[0.02] text-zinc-700 border border-white/[0.04]"
              : "bg-blue-900/20 text-blue-400/80 border border-blue-900/20"
          }`}>
            {isNow ? "Live" : isFuture ? "Future" : "Upcoming"}
          </span>
        </div>
        <p className={`font-bold text-base leading-snug mb-1.5 ${isFuture ? "text-zinc-600" : "text-white"}`}>
          {title}
        </p>
        <p className="text-zinc-600 text-xs leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
