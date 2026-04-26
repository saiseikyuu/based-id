import type { Metadata } from "next";
import { Nav } from "@/app/components/Nav";
import { MobileNav } from "@/app/components/MobileNav";
import { QuestsClient } from "./QuestsClient";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Quests — Based ID",
  description: "Complete quests to earn bonus XP and level up your Based Hunter rank.",
};

const D = { fontFamily: "var(--font-display), system-ui, sans-serif" };

export default function QuestsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav active="/quests" />
      <MobileNav />

      <div className="max-w-4xl mx-auto px-6 py-12 flex-1 w-full space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-400 text-xs font-medium uppercase tracking-[0.2em]">XP Rewards</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight" style={D}>
              Quests
            </h1>
            <p className="text-zinc-500 text-sm">Complete quests to earn bonus XP toward your Hunter rank.</p>
          </div>
          <Link href="/hunters"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] text-zinc-400 text-xs font-semibold hover:text-white hover:border-white/[0.16] transition-colors">
            <span>View Hunters →</span>
          </Link>
        </div>

        {/* XP sources explanation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { src: "Drops entered",  rate: "+10 XP",  color: "text-blue-400",   dot: "bg-blue-400" },
            { src: "Drops won",      rate: "+50 XP",  color: "text-green-400",  dot: "bg-green-400" },
            { src: "Daily check-in", rate: "+5 XP",   color: "text-amber-400",  dot: "bg-amber-400" },
          ].map(({ src, rate, color, dot }) => (
            <div key={src} className="rounded-xl border border-white/[0.06] bg-white/[0.01] px-4 py-3 flex items-center gap-3">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
              <span className="text-zinc-400 text-sm flex-1">{src}</span>
              <span className={`font-bold text-sm tabular-nums ${color}`}>{rate}</span>
            </div>
          ))}
        </div>

        <QuestsClient />

      </div>

      <footer className="border-t border-white/[0.06] px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <span className="text-zinc-700 text-xs">Built on Base · 2026</span>
          <div className="flex items-center gap-5 text-xs text-zinc-700">
            <Link href="/hunters" className="hover:text-zinc-400 transition-colors">Hunters</Link>
            <Link href="/drops"   className="hover:text-zinc-400 transition-colors">Drops</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
