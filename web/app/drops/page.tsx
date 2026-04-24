import Link from "next/link";
import type { Metadata } from "next";
import { MobileNav } from "@/app/components/MobileNav";
import { DropsCountdown } from "./DropsCountdown";

export const metadata: Metadata = {
  title: "Drops — Launching soon · Based ID",
  description:
    "Airdrops, NFT drops, whitelists, raffles. The drops portal is launching soon. Hold a Based ID, auto-qualify.",
};

// Launch target: 3 weeks from repositioning (2026-05-15)
const LAUNCH_DATE = new Date("2026-05-15T00:00:00Z");

const DISPLAY = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const GRAD = {
  background: "linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
} as React.CSSProperties;

export default function DropsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/[0.04] bg-black/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Based ID" className="w-7 h-7 rounded-lg" />
            <div className="flex items-center gap-1">
              <span style={DISPLAY} className="font-bold text-sm text-white tracking-tight">Based</span>
              <span className="font-mono text-[11px] text-zinc-500 tracking-widest ml-0.5">ID</span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-7">
            <Link href="/drops"       className="text-[13px] text-white font-medium flex items-center gap-1.5">
              Drops
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            </Link>
            <Link href="/leaderboard" className="text-[13px] text-zinc-400 hover:text-white transition-colors">Leaderboard</Link>
            <Link href="/activity"    className="text-[13px] text-zinc-400 hover:text-white transition-colors">Activity</Link>
            <Link href="/dashboard"   className="text-[13px] text-zinc-400 hover:text-white transition-colors">Dashboard</Link>
          </nav>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-400/80 text-[11px] tracking-wide">Soon</span>
          </div>
        </div>
      </header>

      <MobileNav />

      {/* Ambient glow */}
      <div className="relative flex-1 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(37,99,235,0.08), transparent 70%)",
          }}
        />

        <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-20 space-y-14">

          {/* Hero */}
          <div className="text-center space-y-7">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-900/40 bg-blue-950/30 text-[11px] uppercase tracking-[0.2em] text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Launching soon
            </div>

            <h1 style={DISPLAY} className="text-[clamp(2.75rem,6vw,4.5rem)] font-black tracking-tight leading-[1.02]">
              <span className="text-white">The drops portal</span><br />
              <span style={GRAD}>goes live May 15.</span>
            </h1>

            <p className="text-zinc-400 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
              Every Base project drop, in one place. Airdrops. NFT mints. Whitelists. Raffles.
              Hold a Based ID, auto-qualify for every opportunity.
            </p>

            <DropsCountdown target={LAUNCH_DATE.getTime()} />

            <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
              <Link
                href="/#mint-card"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors"
              >
                Mint Based ID — $2 →
              </Link>
              <a
                href="https://x.com/basedidofficial"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] text-zinc-300 text-sm font-medium hover:bg-white/[0.05] transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Follow for launch
              </a>
            </div>
          </div>

          {/* What's coming grid */}
          <div className="space-y-5">
            <p className="text-zinc-600 text-[11px] uppercase tracking-[0.2em] text-center">What&apos;s launching</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  tag: "Airdrops",
                  title: "Token airdrops from Base projects",
                  desc: "New Base tokens drop to Based ID holders first. No farming. Hold an ID, get your share.",
                  color: "text-blue-400", border: "border-blue-900/35", bg: "bg-blue-950/[0.1]",
                },
                {
                  tag: "NFT Drops",
                  title: "Curated NFT mints",
                  desc: "Partner projects reserve mint allocations for Based ID holders. Lower IDs get better drops.",
                  color: "text-purple-300", border: "border-purple-900/30", bg: "bg-purple-950/[0.1]",
                },
                {
                  tag: "Whitelists",
                  title: "Auto-qualify for launches",
                  desc: "Projects gate their WLs with Based ID. You already qualify. No forms, no follow-backs.",
                  color: "text-green-400", border: "border-green-900/30", bg: "bg-green-950/[0.08]",
                },
                {
                  tag: "Raffles",
                  title: "Provably fair, onchain",
                  desc: "Enter with one click. Chainlink VRF draws winners. Your Hunter rank boosts your odds.",
                  color: "text-amber-400", border: "border-amber-900/35", bg: "bg-amber-950/[0.08]",
                },
              ].map((x) => (
                <div key={x.tag} className={`rounded-2xl border ${x.border} ${x.bg} p-6 space-y-2`}>
                  <p className={`${x.color} text-[10px] uppercase tracking-[0.2em] font-bold`}>{x.tag}</p>
                  <h3 className="text-white font-bold text-lg leading-tight" style={DISPLAY}>{x.title}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">{x.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Partner CTA */}
          <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-blue-950/[0.15] to-transparent p-8 sm:p-10 text-center space-y-4">
            <p className="text-blue-400 text-[11px] uppercase tracking-[0.2em]">For Projects</p>
            <h2 style={DISPLAY} className="text-white font-bold text-2xl sm:text-3xl leading-tight">
              Launching on Base? Drop to a verified audience.
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
              Every Based ID holder paid $2 and signed onchain. A small committed audience beats a massive noisy one.
              List your drop for 50 USDC standard or 200 USDC featured.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
              <Link
                href="/partner"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors"
              >
                Become a partner →
              </Link>
              <a
                href="https://x.com/basedidofficial"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-zinc-300 text-sm font-medium hover:bg-white/[0.05] transition-colors"
              >
                DM on X
              </a>
            </div>
          </div>

          {/* FAQ light */}
          <div className="space-y-4">
            <p className="text-zinc-600 text-[11px] uppercase tracking-[0.2em] text-center">Common questions</p>
            <div className="divide-y divide-white/[0.05] border border-white/[0.05] rounded-2xl overflow-hidden">
              {[
                {
                  q: "Do I need a Based ID to enter drops?",
                  a: "Yes — the $2 Based ID is the access pass. It filters out bots and farmers, so every entry is from a real, committed holder.",
                },
                {
                  q: "How are winners picked?",
                  a: "For raffles at launch, we use cryptographic randomness with public seed logs. Phase 3 upgrades to Chainlink VRF for provably-fair onchain draws.",
                },
                {
                  q: "Can my project list a drop?",
                  a: "Yes — the self-serve partner portal launches May 15. 50 USDC for a standard listing, 200 USDC for featured placement (homepage + top of /drops).",
                },
                {
                  q: "Is there a premium tier for holders?",
                  a: "No subscription. Instead, we're launching Based Hunters — a soulbound rank NFT that boosts your raffle odds. Higher rank = more entries per ticket.",
                },
              ].map((item, i) => (
                <details key={i} className="group px-5 py-4">
                  <summary className="flex items-center justify-between cursor-pointer list-none">
                    <span className="text-white text-sm font-medium pr-6">{item.q}</span>
                    <span className="text-zinc-500 text-lg group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="text-zinc-500 text-sm mt-3 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <svg width="16" height="16" viewBox="0 0 111 111" fill="none" className="opacity-40">
              <path d="M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6 85.359 0 54.921 0C26.0 0 2.0 22.0 0 50.354H72.943V59.68H0C2.0 88.0 26.0 110.034 54.921 110.034Z" fill="#0052FF"/>
            </svg>
            <span className="text-zinc-700 text-[11px]">Built on Base · 2026</span>
          </div>
          <div className="flex items-center gap-5 text-[11px] text-zinc-700">
            <Link href="/" className="hover:text-zinc-400 transition-colors">Home</Link>
            <Link href="/leaderboard" className="hover:text-zinc-400 transition-colors">Leaderboard</Link>
            <Link href="/dashboard" className="hover:text-zinc-400 transition-colors">Dashboard</Link>
            <a href="https://x.com/basedidofficial" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">@basedidofficial</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
