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
import { NftCard } from "./NftCard";
import CountUp from "./components/CountUp";
import RotatingText from "./components/RotatingText";
import { motion } from "motion/react";

type MintState = "idle" | "approving" | "approved" | "minting" | "success";

const D: React.CSSProperties = { fontFamily: "var(--font-display), system-ui, sans-serif" };

function FadeIn({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

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
      const log = receipt.logs.find(
        (l) => l.address.toLowerCase() === BASED_ID_ADDRESS.toLowerCase() && l.topics.length === 3
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
  const resolvedNextId      = nextId !== undefined ? (nextId <= BigInt(100) ? BigInt(101) : nextId) : BigInt(101);
  const previewId           = mintState === "success" && mintedId !== null ? `#${mintedId.toString()}` : `#${resolvedNextId.toString()}`;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── NAV ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 hover:opacity-75 transition-opacity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Based ID" className="w-6 h-6 rounded-md" />
            <span style={D} className="font-bold text-sm text-white tracking-tight">Based ID</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/drops"       className="text-sm text-white font-medium hover:text-zinc-300 transition-colors">Drops</Link>
            <Link href="/projects"    className="text-sm text-zinc-400 hover:text-white transition-colors">Projects</Link>
            <Link href="/leaderboard" className="text-sm text-zinc-400 hover:text-white transition-colors">Leaderboard</Link>
            <Link href="/dashboard"   className="text-sm text-zinc-400 hover:text-white transition-colors">Dashboard</Link>
          </nav>

          <div className="flex items-center gap-3 flex-shrink-0">
            <ConnectButton showBalance={false} chainStatus="icon" />
            <button className="md:hidden p-1.5 text-zinc-500 hover:text-white transition-colors" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
              {menuOpen
                ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="2" y1="2" x2="14" y2="14"/><line x1="14" y1="2" x2="2" y2="14"/></svg>
                : <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></svg>}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-white/[0.05] bg-black">
            <nav className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-0.5">
              {[
                { href: "/drops",       label: "Drops" },
                { href: "/projects",    label: "Projects" },
                { href: "/leaderboard", label: "Leaderboard" },
                { href: "/activity",    label: "Activity" },
                { href: "/dashboard",   label: "Dashboard" },
              ].map(({ href, label }) => (
                <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-all">
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section id="mint" className="min-h-screen flex items-center pt-14">
        <div className="max-w-7xl mx-auto px-6 py-24 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* Left */}
          <div className="space-y-8">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-500 text-xs font-medium">Live on Base</span>
            </div>

            <div style={D} className="text-[clamp(3.5rem,7vw,6rem)] font-black tracking-tight leading-[0.9]">
              <div className="text-white">The base of</div>
              <RotatingText
                texts={["Airdrops.", "NFT Drops.", "Whitelists.", "Raffles."]}
                splitBy="words"
                elementLevelClassName="grad-text"
                rotationInterval={2500}
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
                initial={{ y: "110%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "-110%", opacity: 0 }}
                animatePresenceInitial
              />
            </div>

            <p className="text-zinc-400 text-lg leading-relaxed max-w-md">
              Every Base opportunity in one place. Mint a Based ID for $2 and auto-qualify for every drop on Base.
            </p>

            <div className="flex items-center gap-4 flex-wrap">
              <a href="#mint-card" onClick={e => { e.preventDefault(); document.getElementById("mint-card")?.scrollIntoView({ behavior: "smooth" }); }}
                className="px-6 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors">
                Mint Based ID — $2
              </a>
              <Link href="/drops" className="px-6 py-3 rounded-xl border border-white/[0.1] text-sm text-zinc-300 font-medium hover:border-white/20 hover:text-white transition-colors">
                Browse drops →
              </Link>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 pt-2">
              <div>
                <div className="text-2xl font-black text-white tabular-nums">
                  {totalMinted !== undefined
                    ? <CountUp to={Number(totalMinted)} duration={1.5} />
                    : "—"}
                </div>
                <p className="text-zinc-600 text-xs mt-0.5">IDs minted</p>
              </div>
              <div className="w-px h-8 bg-white/[0.06]" />
              <div>
                <div className="text-2xl font-black text-white">$2</div>
                <p className="text-zinc-600 text-xs mt-0.5">Flat price</p>
              </div>
              <div className="w-px h-8 bg-white/[0.06]" />
              <div>
                <div className="text-2xl font-black text-white">1B</div>
                <p className="text-zinc-600 text-xs mt-0.5">$BASED supply</p>
              </div>
            </div>
          </div>

          {/* Right — Mint card */}
          <div id="mint-card" className="relative">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">

              {/* Top bar */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-zinc-500">Minting open</span>
                </div>
                <span className="text-xs text-zinc-600 hidden sm:block">Snapshot #1 — Sep 30, 2026</span>
              </div>

              {/* NFT Card */}
              <div className="p-5 pb-4">
                <NftCard id={previewId} holder={address ?? "connect wallet to mint"} />
              </div>

              {/* Mint area */}
              <div className="px-5 pb-5 space-y-4">
                <div className="flex items-center justify-between text-xs text-zinc-700">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-blue-600 flex-shrink-0" />
                    <span className="truncate">Snapshot #1 — Sep 30, 2026</span>
                  </div>
                  <span className="text-zinc-500 font-medium flex-shrink-0 ml-2">$2 USDC</span>
                </div>

                {mintState === "success" && mintedId !== null ? (
                  <SuccessCard id={mintedId} onMintAnother={handleReset} />
                ) : !isConnected ? (
                  <div className="space-y-4">
                    <ConnectButton.Custom>
                      {({ openConnectModal }) => (
                        <button onClick={openConnectModal}
                          className="w-full py-4 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-100 transition-colors">
                          Connect Wallet
                        </button>
                      )}
                    </ConnectButton.Custom>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[{ n: "1", label: "Connect" }, { n: "2", label: "Approve" }, { n: "3", label: "Mint" }].map((s, i) => (
                        <div key={s.n} className={`flex items-center gap-1.5 rounded-lg border border-white/[0.05] bg-white/[0.01] px-2 py-2 ${i > 0 ? "opacity-40" : ""}`}>
                          <span className="w-4 h-4 rounded-full border border-white/[0.1] flex items-center justify-center text-[9px] font-bold text-zinc-500 flex-shrink-0">{s.n}</span>
                          <span className="text-zinc-500 text-[10px] font-medium truncate">{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : insufficientBalance ? (
                  <div className="rounded-xl border border-red-900/30 bg-red-950/10 p-4 text-center">
                    <p className="text-red-400 text-sm font-medium">You need $2 USDC on Base.</p>
                    <p className="text-red-800/70 text-xs mt-1">Bridge USDC to Base, then try again.</p>
                  </div>
                ) : !hasAllowance && mintState !== "approved" ? (
                  <MintAction
                    label="Approve $2 USDC" sub="Step 1 of 2"
                    btnLabel={isLoading && mintState === "approving" ? (isConfirming ? "Confirming…" : "Approving…") : "Approve $2 USDC"}
                    onClick={handleApprove} loading={isLoading && mintState === "approving"}
                  />
                ) : (
                  <MintAction
                    label="Mint your Based ID" sub="Step 2 of 2 — permanent" primary
                    btnLabel={isLoading && mintState === "minting" ? (isConfirming ? "Confirming…" : "Minting…") : "Mint Based ID"}
                    onClick={handleMint} loading={isLoading && mintState === "minting"}
                  />
                )}
                {errorMsg && <p className="text-red-400 text-xs text-center">{errorMsg}</p>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE DROPS ── */}
      <section className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-24 space-y-12">
          <FadeIn>
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <div className="space-y-3">
                <h2 style={D} className="text-4xl sm:text-5xl font-black tracking-tight text-white">Live drops</h2>
                <p className="text-zinc-500 text-base max-w-md">Airdrops, NFT mints, whitelists, raffles — all in one place. Your Based ID gets you in.</p>
              </div>
              <Link href="/drops" className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0">View all →</Link>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Token Drop",  title: "Airdrops",   desc: "New Base tokens drop to holders first." },
                { label: "Whitelist",   title: "WL Access",  desc: "Auto-qualify for partner launches." },
                { label: "Raffle",      title: "Raffles",    desc: "Enter with one click, onchain draw." },
              ].map(({ label, title, desc }) => (
                <Link key={title} href="/drops" className="group block rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 hover:border-white/[0.14] hover:bg-white/[0.03] transition-all">
                  <p className="text-xs text-zinc-600 font-medium mb-3">{label}</p>
                  <p className="text-white font-bold text-lg mb-1" style={D}>{title}</p>
                  <p className="text-zinc-500 text-sm">{desc}</p>
                  <p className="text-blue-400 text-xs mt-4 group-hover:text-blue-300 transition-colors">Browse {label}s →</p>
                </Link>
              ))}
            </div>
          </FadeIn>

          {/* Partner CTA */}
          <FadeIn delay={0.15}>
            <div className="flex items-center justify-between gap-4 flex-wrap rounded-2xl border border-white/[0.06] px-6 py-5">
              <p className="text-zinc-400 text-sm">Launching a project on Base? <span className="text-zinc-600">List your drop free.</span></p>
              <Link href="/partner" className="px-5 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors flex-shrink-0">
                Become a partner →
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-24 space-y-14">
          <FadeIn>
            <div className="space-y-3 max-w-xl">
              <h2 style={D} className="text-4xl sm:text-5xl font-black tracking-tight text-white">Mint in under a minute</h2>
              <p className="text-zinc-500 text-base">One wallet. One ID. Every drop on Base.</p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.06] rounded-2xl overflow-hidden">
            {[
              { n: "01", title: "Connect wallet", body: "Any Base wallet — Coinbase, MetaMask, Rainbow." },
              { n: "02", title: "Approve $2 USDC", body: "One-time approval. Exactly $2. Nothing hidden." },
              { n: "03", title: "Mint your ID",    body: "Your permanent number is onchain. Forever." },
            ].map(({ n, title, body }) => (
              <FadeIn key={n}>
                <div className="bg-black p-8 h-full">
                  <span className="font-mono text-zinc-700 text-xs mb-6 block">{n}</span>
                  <p className="text-white font-bold text-lg mb-2" style={D}>{title}</p>
                  <p className="text-zinc-500 text-sm leading-relaxed">{body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR PARTNERS ── */}
      <section className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeIn className="space-y-6">
              <h2 style={D} className="text-4xl sm:text-5xl font-black tracking-tight leading-[0.95] text-white">
                Drop to real wallets.<br />
                <span className="grad-text">Not bots.</span>
              </h2>
              <p className="text-zinc-400 text-base leading-relaxed max-w-md">
                Every Based ID holder paid $2 and signed onchain. A small committed audience beats a massive noisy one every time.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Link href="/partner/new" className="px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors">
                  Launch a drop →
                </Link>
                <a href="https://x.com/basedidofficial" target="_blank" rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl border border-white/[0.1] text-zinc-400 text-sm font-medium hover:text-white hover:border-white/20 transition-colors">
                  DM us on X
                </a>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
                <div className="grid grid-cols-[1fr_90px_90px] border-b border-white/[0.06] bg-white/[0.02]">
                  <div className="px-5 py-3" />
                  <div className="px-3 py-3 text-center border-l border-white/[0.05]">
                    <p className="text-zinc-600 text-xs">Typical</p>
                  </div>
                  <div className="px-3 py-3 text-center border-l border-blue-900/30 bg-blue-950/10">
                    <p className="text-blue-400 text-xs font-semibold">Based ID</p>
                  </div>
                </div>
                {[
                  { label: "Wallet verified",  a: "No",     b: "Onchain" },
                  { label: "Cost per entry",   a: "$0",     b: "$2 USDC" },
                  { label: "Bot exposure",      a: "High",   b: "Zero" },
                  { label: "Farmers blocked",   a: "No",     b: "Yes" },
                  { label: "Forms required",    a: "Yes",    b: "None" },
                ].map(({ label, a, b }, i) => (
                  <div key={label} className={`grid grid-cols-[1fr_90px_90px] border-b border-white/[0.04] last:border-0 ${i % 2 ? "bg-white/[0.01]" : ""}`}>
                    <div className="px-5 py-3.5"><p className="text-zinc-400 text-sm">{label}</p></div>
                    <div className="px-3 py-3.5 text-center border-l border-white/[0.05]"><p className="text-zinc-600 text-sm">{a}</p></div>
                    <div className="px-3 py-3.5 text-center border-l border-blue-900/20 bg-blue-950/10"><p className="text-blue-300 text-sm font-medium">{b}</p></div>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── $BASED ── */}
      <section className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-24 space-y-12">
          <FadeIn>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-end">
              <div className="space-y-4">
                <h2 style={D} className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                  1,000,000,000 $BASED
                </h2>
                <p className="text-zinc-400 text-base leading-relaxed max-w-md">
                  80% goes to holders. Earlier ID = larger share. Two snapshots — Sep 30 and Dec 31, 2026. Hold through both to earn the maximum allocation.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: "400M", label: "Snapshot #1", sub: "Sep 30, 2026", color: "text-blue-400" },
                  { value: "400M", label: "Snapshot #2", sub: "Dec 31, 2026", color: "text-blue-300" },
                  { value: "200M", label: "Team + Partners", sub: "Locked until 2027", color: "text-zinc-400" },
                ].map(({ value, label, sub, color }) => (
                  <div key={label} className="rounded-2xl border border-white/[0.08] p-5">
                    <p className={`${color} font-black text-2xl tabular-nums`} style={D}>{value}</p>
                    <p className="text-white text-xs font-semibold mt-2">{label}</p>
                    <p className="text-zinc-600 text-[11px] mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.01] p-6 sm:p-8">
              <p className="text-zinc-500 text-sm mb-3">Airdrop weight formula</p>
              <p className="font-mono text-white text-xl font-bold mb-4">weight = 1 ÷ √id</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: "#1",    w: "1.0000×", color: "text-amber-400" },
                  { id: "#100",  w: "0.1000×", color: "text-blue-400" },
                  { id: "#1K",   w: "0.0316×", color: "text-zinc-400" },
                  { id: "#10K",  w: "0.0100×", color: "text-zinc-600" },
                ].map(({ id, w, color }) => (
                  <div key={id} className="rounded-xl border border-white/[0.05] bg-white/[0.01] p-3 text-center">
                    <p className="text-zinc-600 text-xs font-mono mb-1">{id}</p>
                    <p className={`${color} text-sm font-bold tabular-nums`}>{w}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 py-24 space-y-10">
          <FadeIn>
            <h2 style={D} className="text-4xl font-black tracking-tight text-white">FAQ</h2>
          </FadeIn>
          <FadeIn delay={0.05}>
            <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] overflow-hidden">
              {[
                { q: "Can I mint more than one ID?", a: "Yes. No limit per wallet. Each ID earns $BASED separately — your lowest-numbered ID earns the most." },
                { q: "What happens if I sell before the snapshot?", a: "Whoever holds the ID at snapshot time earns the allocation. Sell before Sep 30 and the buyer gets Snapshot #1 rewards." },
                { q: "Is the $2 price permanent?", a: "Yes. The mint price is hardcoded in the contract at $2 USDC and cannot be changed — not even by us." },
                { q: "What are Genesis IDs (#1–#100)?", a: "Reserved for auctions, not public minting. Auctioned one-by-one starting from #100, before Snapshot #1. Winners earn $BASED at the highest weight." },
                { q: "Do I need to do anything to receive the airdrop?", a: "No action needed before January 2027. Hold your Based ID through both snapshots. A claim button will appear in your dashboard." },
              ].map(({ q, a }) => (
                <FaqItem key={q} q={q} a={a} />
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="border-t border-white/[0.06] py-32">
        <FadeIn>
          <div className="max-w-7xl mx-auto px-6 text-center space-y-6">
            <h2 style={D} className="text-[clamp(3rem,7vw,6rem)] font-black tracking-tight leading-[0.92] text-white">
              Your number<br />is waiting.
            </h2>
            <p className="text-zinc-500 text-base max-w-sm mx-auto">Mint once for $2. Keep it forever. Auto-qualify for every drop on Base.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <a href="#mint" onClick={e => { e.preventDefault(); document.getElementById("mint-card")?.scrollIntoView({ behavior: "smooth" }); }}
                className="px-8 py-4 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-100 transition-colors">
                Mint Now — $2 USDC
              </a>
              <Link href="/drops" className="px-8 py-4 rounded-xl border border-white/[0.08] text-zinc-400 text-sm font-medium hover:text-white hover:border-white/[0.15] transition-colors">
                Browse drops →
              </Link>
            </div>
            <p className="text-zinc-700 text-xs">Permanent · Onchain · Open source</p>
          </div>
        </FadeIn>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.06] py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <span style={D} className="font-bold text-sm text-white">Based ID</span>
              <p className="text-zinc-700 text-xs">Built on Base · 2026</p>
            </div>
            <div className="flex items-center gap-6 text-xs text-zinc-600 flex-wrap">
              <Link href="/drops"       className="hover:text-zinc-300 transition-colors">Drops</Link>
              <Link href="/projects"    className="hover:text-zinc-300 transition-colors">Projects</Link>
              <Link href="/leaderboard" className="hover:text-zinc-300 transition-colors">Leaderboard</Link>
              <Link href="/activity"    className="hover:text-zinc-300 transition-colors">Activity</Link>
              <Link href="/dashboard"   className="hover:text-zinc-300 transition-colors">Dashboard</Link>
              <Link href="/partner"     className="hover:text-zinc-300 transition-colors">Partners</Link>
              <a href="https://x.com/basedidofficial" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors">@basedidofficial</a>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-white/[0.05] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-zinc-700">
              <span>Contract:</span>
              <a href={`${BASESCAN_URL}/address/${BASED_ID_ADDRESS}`} target="_blank" rel="noopener noreferrer"
                className="font-mono hover:text-zinc-400 transition-colors">
                {BASED_ID_ADDRESS.slice(0,6)}…{BASED_ID_ADDRESS.slice(-4)}
              </a>
            </div>
            <p className="text-zinc-700 text-xs">Minting open · No close date · Fully open source</p>
          </div>
        </div>
      </footer>

    </div>
  );
}

// ─── Components ───────────────────────────────────────────────────────────────

function MintAction({ label, sub, btnLabel, onClick, loading, primary = false }: {
  label: string; sub: string; btnLabel: string; onClick: () => void; loading: boolean; primary?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-semibold text-sm">{label}</p>
          <p className="text-zinc-600 text-xs mt-0.5">{sub}</p>
        </div>
        {primary && <span className="text-[9px] px-2 py-1 rounded-full border border-green-900/40 bg-green-500/[0.06] text-green-400 font-medium">Final step</span>}
      </div>
      <button onClick={onClick} disabled={loading}
        className={`w-full py-4 rounded-xl font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
          primary
            ? "bg-white text-black hover:bg-zinc-100"
            : "bg-white/[0.05] border border-white/[0.08] text-white hover:bg-white/[0.09]"
        }`}>
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2"/>
              <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            {btnLabel}
          </span>
        ) : btnLabel}
      </button>
    </div>
  );
}

function SuccessCard({ id, onMintAnother }: { id: bigint; onMintAnother: () => void }) {
  function shareOnX() {
    const text = `Just minted Based ID #${id.toString()} on Base.\n\nLower number = earlier = bigger $BASED airdrop.\n$2 USDC flat.\n\nbasedid.space\n\n@basedidofficial`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  }
  return (
    <div className="rounded-xl border border-green-900/25 bg-green-950/[0.06] p-5 space-y-4">
      <div className="text-center space-y-1">
        <p className="text-green-400 text-sm font-bold">Minted ✓</p>
        <p className="text-zinc-400 text-xs">Based ID #{id.toString()} is yours forever.</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button onClick={shareOnX} className="py-2.5 rounded-lg border border-white/[0.08] text-zinc-300 text-xs font-medium hover:bg-white/[0.04] transition-colors">Share</button>
        <Link href="/dashboard" className="py-2.5 rounded-lg border border-white/[0.08] text-zinc-300 text-xs font-medium hover:bg-white/[0.04] transition-colors text-center">Dashboard</Link>
        <button onClick={onMintAnother} className="py-2.5 rounded-lg bg-white text-black text-xs font-bold hover:bg-zinc-100 transition-colors">Mint again</button>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button className="w-full text-left px-6 py-5 focus:outline-none group hover:bg-white/[0.02] transition-colors" onClick={() => setOpen(o => !o)}>
      <div className="flex items-start justify-between gap-6">
        <p className="text-white text-sm font-medium leading-snug flex-1">{q}</p>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          className={`text-zinc-600 flex-shrink-0 mt-0.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <path d="M3 5l5 5 5-5"/>
        </svg>
      </div>
      {open && <p className="text-zinc-500 text-sm leading-relaxed mt-3 pr-6">{a}</p>}
    </button>
  );
}
