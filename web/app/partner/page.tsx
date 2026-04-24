import Link from "next/link";
import type { Metadata } from "next";
import { MobileNav } from "@/app/components/MobileNav";

export const metadata: Metadata = {
  title: "Partner with Based ID — Drop to a verified Base audience",
  description:
    "Launch your NFT drop, token airdrop, or whitelist through Based ID. Every holder paid $2 onchain. Bot-free audience. 50 USDC standard · 200 USDC featured.",
};

const DISPLAY = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const GRAD = {
  background: "linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
} as React.CSSProperties;

export default function PartnerPage() {
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
            <Link href="/drops"       className="text-[13px] text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5">Drops<span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /></Link>
            <Link href="/leaderboard" className="text-[13px] text-zinc-400 hover:text-white transition-colors">Leaderboard</Link>
            <Link href="/activity"    className="text-[13px] text-zinc-400 hover:text-white transition-colors">Activity</Link>
            <Link href="/dashboard"   className="text-[13px] text-zinc-400 hover:text-white transition-colors">Dashboard</Link>
          </nav>
          <div className="flex-shrink-0">
            <a
              href="https://x.com/basedidofficial"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white text-black text-[11px] font-bold hover:bg-zinc-100 transition-colors"
            >
              DM us
            </a>
          </div>
        </div>
      </header>

      <MobileNav />

      <div className="relative flex-1 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(37,99,235,0.08), transparent 70%)",
          }}
        />

        <div className="relative max-w-4xl mx-auto px-6 pt-14 pb-20 space-y-14">

          {/* Hero */}
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-900/40 bg-blue-950/30 text-[11px] uppercase tracking-[0.2em] text-blue-400">
              For Projects
            </div>

            <h1 style={DISPLAY} className="text-[clamp(2.5rem,6vw,4.25rem)] font-black tracking-tight leading-[1.02]">
              <span className="text-white">Drop to real wallets.</span><br />
              <span style={GRAD}>Not bots.</span>
            </h1>

            <p className="text-zinc-400 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
              Every Based ID holder paid $2 and signed onchain. Run your drop in front of a committed audience —
              no sybil farmers, no empty wallets, no bots.
            </p>
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Standard */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <p className="text-zinc-400 text-[10px] uppercase tracking-[0.2em] font-bold">Standard</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/[0.08] text-zinc-500 uppercase tracking-[0.1em]">One-time</span>
              </div>
              <div>
                <p className="text-white font-black text-4xl tabular-nums" style={DISPLAY}>50<span className="text-zinc-600 text-xl ml-1">USDC</span></p>
                <p className="text-zinc-500 text-sm mt-1">per drop</p>
              </div>
              <ul className="space-y-2.5 text-zinc-400 text-sm">
                <li className="flex items-start gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-zinc-500 mt-0.5 flex-shrink-0"><path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Listed in the public /drops grid
                </li>
                <li className="flex items-start gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-zinc-500 mt-0.5 flex-shrink-0"><path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Configurable tasks (follow X, join Discord, hold NFT)
                </li>
                <li className="flex items-start gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-zinc-500 mt-0.5 flex-shrink-0"><path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Partner dashboard with entries + disqualify power
                </li>
                <li className="flex items-start gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-zinc-500 mt-0.5 flex-shrink-0"><path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Auto-drawn winners + exportable wallet list
                </li>
              </ul>
            </div>

            {/* Featured */}
            <div className="rounded-2xl border border-blue-500/40 bg-gradient-to-br from-blue-950/30 to-transparent p-7 flex flex-col gap-5 relative overflow-hidden">
              <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
              <div className="relative flex items-center justify-between">
                <p className="text-blue-400 text-[10px] uppercase tracking-[0.2em] font-bold">Featured</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-blue-500/40 bg-blue-950/50 text-blue-300 uppercase tracking-[0.1em]">Recommended</span>
              </div>
              <div className="relative">
                <p className="text-white font-black text-4xl tabular-nums" style={DISPLAY}>200<span className="text-zinc-600 text-xl ml-1">USDC</span></p>
                <p className="text-zinc-400 text-sm mt-1">per drop · includes premium placement</p>
              </div>
              <ul className="relative space-y-2.5 text-zinc-300 text-sm">
                <li className="flex items-start gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-blue-400 mt-0.5 flex-shrink-0"><path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Everything in Standard
                </li>
                <li className="flex items-start gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-blue-400 mt-0.5 flex-shrink-0"><path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Top placement in /drops grid — appears above standard
                </li>
                <li className="flex items-start gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-blue-400 mt-0.5 flex-shrink-0"><path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Featured card on basedid.space landing page
                </li>
                <li className="flex items-start gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-blue-400 mt-0.5 flex-shrink-0"><path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  7-day boost + dedicated X announcement
                </li>
                <li className="flex items-start gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-blue-400 mt-0.5 flex-shrink-0"><path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  &ldquo;FEATURED&rdquo; badge on your drop card
                </li>
              </ul>
            </div>
          </div>

          {/* How it works */}
          <div className="space-y-5">
            <p className="text-zinc-600 text-[11px] uppercase tracking-[0.2em] text-center">How it works</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-0 rounded-2xl border border-white/[0.05] overflow-hidden">
              {[
                { n: "01", title: "Connect wallet", body: "Any wallet on Base. Sign in to prove ownership." },
                { n: "02", title: "Configure drop", body: "Title, prize, tasks, duration, winner count." },
                { n: "03", title: "Pay listing fee", body: "50 USDC standard or 200 USDC featured." },
                { n: "04", title: "Drop goes live", body: "Monitor entries, disqualify cheaters, auto-draw." },
              ].map((s, i) => (
                <div key={s.n} className={`bg-white/[0.01] p-6 flex flex-col gap-2 border-white/[0.05] ${i < 3 ? "border-b sm:border-b-0 sm:border-r" : ""}`}>
                  <span className="font-mono text-zinc-700 text-[11px]">{s.n}</span>
                  <p className="text-white font-bold text-sm">{s.title}</p>
                  <p className="text-zinc-500 text-xs leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Why Based ID for partners */}
          <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
            <div className="grid grid-cols-[1fr_70px_70px] sm:grid-cols-[1fr_100px_100px] border-b border-white/[0.06] bg-white/[0.02]">
              <div className="px-3 sm:px-5 py-3" />
              <div className="px-2 sm:px-4 py-3 text-center border-l border-white/[0.05]">
                <p className="text-zinc-600 text-[9px] sm:text-[10px] uppercase tracking-[0.12em] sm:tracking-[0.15em]">Typical</p>
              </div>
              <div className="px-2 sm:px-4 py-3 text-center border-l border-blue-900/30 bg-blue-950/20">
                <p className="text-blue-400 text-[9px] sm:text-[10px] uppercase tracking-[0.12em] sm:tracking-[0.15em] font-semibold">Based ID</p>
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
              <div key={label} className={`grid grid-cols-[1fr_70px_70px] sm:grid-cols-[1fr_100px_100px] border-b border-white/[0.04] last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                <div className="px-3 sm:px-5 py-3 sm:py-3.5">
                  <p className="text-zinc-400 text-[11px] sm:text-xs">{label}</p>
                </div>
                <div className="px-2 sm:px-4 py-3 sm:py-3.5 text-center border-l border-white/[0.05]">
                  <p className="text-zinc-600 text-[11px] sm:text-xs tabular-nums">{typical}</p>
                </div>
                <div className="px-2 sm:px-4 py-3 sm:py-3.5 text-center border-l border-blue-900/20 bg-blue-950/10">
                  <p className="text-blue-300 text-[11px] sm:text-xs font-semibold tabular-nums">{based}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Coming soon banner */}
          <div className="rounded-2xl border border-amber-900/30 bg-amber-950/[0.08] p-6 sm:p-8 flex items-center gap-4 flex-wrap justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
              <div>
                <p className="text-white font-bold text-sm">Self-serve portal opens May 15.</p>
                <p className="text-zinc-500 text-xs mt-1">Want to be one of the first 5 partners? DM us — we&apos;re offering free featured placement to launch partners.</p>
              </div>
            </div>
            <a
              href="https://x.com/basedidofficial"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 text-black text-sm font-bold hover:bg-amber-300 transition-colors flex-shrink-0"
            >
              DM for launch access →
            </a>
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
            <Link href="/drops" className="hover:text-zinc-400 transition-colors">Drops</Link>
            <Link href="/dashboard" className="hover:text-zinc-400 transition-colors">Dashboard</Link>
            <a href="https://x.com/basedidofficial" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">@basedidofficial</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
