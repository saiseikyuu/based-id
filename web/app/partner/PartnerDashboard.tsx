"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Drop } from "@/lib/supabase";

const DISPLAY = { fontFamily: "var(--font-display), system-ui, sans-serif" };

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  active:          "text-green-400 bg-green-500/10 border-green-500/20",
  ended:           "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
  drawn:           "text-blue-400 bg-blue-500/10 border-blue-500/20",
  cancelled:       "text-red-400 bg-red-500/10 border-red-500/20",
};

export function PartnerDashboard({ infoContent }: { infoContent: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const [drops,   setDrops]   = useState<Drop[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) { setDrops(null); return; }
    setLoading(true);
    fetch(`/api/drops?partner=${address}`)
      .then((r) => r.json())
      .then((d) => setDrops(Array.isArray(d) ? d : []))
      .catch(() => setDrops([]))
      .finally(() => setLoading(false));
  }, [address]);

  // Not connected — show info page
  if (!isConnected) return <>{infoContent}</>;

  // Loading
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Loading your drops…</p>
      </div>
    );
  }

  // Connected + no drops yet
  if (drops !== null && drops.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-12 h-12 rounded-2xl border border-white/[0.08] bg-white/[0.02] flex items-center justify-center mx-auto">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-white font-bold text-xl" style={DISPLAY}>No drops yet</h2>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Create your first drop and start reaching verified Based ID holders on Base.
            </p>
          </div>
          <Link href="/partner/new" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors">
            Create your first drop →
          </Link>
        </div>
      </div>
    );
  }

  // Connected + has drops — show dashboard
  return (
    <div className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-zinc-500 text-[11px] uppercase tracking-[0.2em] mb-1">Partner Dashboard</p>
          <h1 className="text-white font-black text-2xl sm:text-3xl" style={DISPLAY}>
            {drops?.length ?? 0} Drop{drops?.length !== 1 ? "s" : ""}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <ConnectButton showBalance={false} chainStatus="icon" />
          <Link href="/partner/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors">
            + New drop
          </Link>
        </div>
      </div>

      {/* Stats */}
      {drops && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total drops",  value: drops.length },
            { label: "Active",       value: drops.filter((d) => d.status === "active").length,   color: "text-green-400" },
            { label: "Drawn",        value: drops.filter((d) => d.status === "drawn").length,    color: "text-blue-400" },
            { label: "Pending",      value: drops.filter((d) => d.status === "pending_payment").length, color: "text-amber-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.01] px-4 py-3.5">
              <p className={`${color ?? "text-white"} font-bold text-2xl tabular-nums leading-none`}>{value}</p>
              <p className="text-zinc-600 text-[10px] uppercase tracking-[0.12em] mt-2">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Drop list */}
      <div className="space-y-3">
        {drops?.map((drop) => <PartnerDropRow key={drop.id} drop={drop} />)}
      </div>
    </div>
  );
}

function PartnerDropRow({ drop }: { drop: Drop }) {
  const statusColor = STATUS_COLORS[drop.status] ?? STATUS_COLORS.pending_payment;
  const endsAt = new Date(drop.ends_at);
  const isEnded = endsAt < new Date();

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.01] p-5 flex items-center gap-4 flex-wrap hover:border-white/[0.14] transition-colors">
      {/* Title + meta */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/drops/${drop.id}`} className="text-white font-bold text-sm hover:text-blue-300 transition-colors truncate">
            {drop.title}
          </Link>
          <span className={`text-[9px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full border ${statusColor}`}>
            {drop.status.replace("_", " ")}
          </span>
          {drop.tier === "featured" && (
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
              Featured
            </span>
          )}
        </div>
        <p className="text-zinc-600 text-xs">
          {drop.type.replace("_", " ")} · {drop.winner_count} winner{drop.winner_count !== 1 ? "s" : ""} ·
          {" "}{isEnded ? "Ended" : "Ends"} {endsAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {drop.status === "pending_payment" && (
          <Link href={`/partner/new?resume=${drop.id}`} className="text-amber-400 text-[11px] font-medium hover:text-amber-300 transition-colors">
            Pay fee →
          </Link>
        )}
        {(drop.status === "active" || drop.status === "ended") && isEnded && (
          <DrawButton dropId={drop.id} />
        )}
        <Link href={`/drops/${drop.id}`} className="text-zinc-500 text-[11px] hover:text-zinc-300 transition-colors">
          View
        </Link>
      </div>
    </div>
  );
}

function DrawButton({ dropId }: { dropId: string }) {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  async function handleDraw() {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/drops/${dropId}/draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_address: address }),
      });
      if (res.ok) setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) return <span className="text-green-400 text-[11px]">Winners drawn ✓</span>;
  return (
    <button onClick={handleDraw} disabled={loading}
      className="text-blue-400 text-[11px] font-medium hover:text-blue-300 transition-colors disabled:opacity-50">
      {loading ? "Drawing…" : "Draw winners"}
    </button>
  );
}
