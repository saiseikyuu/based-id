import Link from "next/link";
import type { Metadata } from "next";
import { MobileNav } from "@/app/components/MobileNav";
import { PartnerDashboard } from "./PartnerDashboard";

export const metadata: Metadata = {
  title: "Partner with Based ID — Drop to a verified Base audience",
  description: "Launch your NFT drop, token airdrop, or whitelist through Based ID. Every holder paid $2 onchain. Bot-free.",
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
          <Link href="/partner/new" className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white text-black text-[11px] font-bold hover:bg-zinc-100 transition-colors flex-shrink-0">
            + New drop
          </Link>
        </div>
      </header>

      <MobileNav />

      {/* Client section handles wallet state */}
      <PartnerDashboard
        infoContent={
          <div className="max-w-4xl mx-auto px-6 py-14 space-y-14">
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
                Every Based ID holder paid $2 and signed onchain.
                Run your drop in front of a committed audience — no sybil farmers, no empty wallets, no bots.
              </p>
              <Link href="/partner/new" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors">
                Launch a drop →
              </Link>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-zinc-400 text-[10px] uppercase tracking-[0.2em] font-bold">Standard</p>
                  <span className="text-[9px] px-2 py-0.5 rounded-full border border-green-900/30 bg-green-950/20 text-green-400 uppercase tracking-[0.1em]">Free</span>
                </div>
                <p className="text-white font-black text-4xl tabular-nums" style={DISPLAY}>$0 <span className="text-zinc-600 text-xl">always</span></p>
                <ul className="space-y-2 text-zinc-400 text-sm">
                  {["Listed in /drops grid","Configurable tasks (follow X, Discord, hold NFT)","Partner dashboard with live entries","Auto-drawn winners + exportable wallet list"].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-zinc-600 mt-0.5 flex-shrink-0"><path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-blue-500/40 bg-gradient-to-br from-blue-950/30 to-transparent p-7 space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-blue-400 text-[10px] uppercase tracking-[0.2em] font-bold">Featured</p>
                  <span className="text-[9px] px-2 py-0.5 rounded-full border border-blue-500/40 bg-blue-950/50 text-blue-300 uppercase tracking-[0.1em]">Recommended</span>
                </div>
                <p className="text-white font-black text-4xl tabular-nums" style={DISPLAY}>200 <span className="text-zinc-600 text-xl">USDC</span></p>
                <ul className="space-y-2 text-zinc-300 text-sm">
                  {["Everything in Standard","Top placement in /drops (above standard)","Featured on basedid.space landing","7-day boost + dedicated X announcement","\"FEATURED\" badge on drop card"].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-blue-400 mt-0.5 flex-shrink-0"><path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Launch CTA */}
            <div className="rounded-2xl border border-amber-900/30 bg-amber-950/[0.08] p-6 sm:p-8 flex items-center gap-4 flex-wrap justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                <div>
                  <p className="text-white font-bold text-sm">Self-serve portal is live.</p>
                  <p className="text-zinc-500 text-xs mt-0.5">Connect your wallet to create your first drop in under 5 minutes.</p>
                </div>
              </div>
              <Link href="/partner/new" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 text-black text-sm font-bold hover:bg-amber-300 transition-colors flex-shrink-0">
                Create a drop →
              </Link>
            </div>
          </div>
        }
      />

      {/* Footer */}
      <footer className="border-t border-white/[0.04] px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <span className="text-zinc-700 text-[11px]">Built on Base · 2026</span>
          <div className="flex items-center gap-5 text-[11px] text-zinc-700">
            <Link href="/drops" className="hover:text-zinc-400 transition-colors">Drops</Link>
            <Link href="/dashboard" className="hover:text-zinc-400 transition-colors">Dashboard</Link>
            <a href="https://x.com/basedidofficial" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">@basedidofficial</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
