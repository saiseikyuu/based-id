"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Drop, Project } from "@/lib/supabase";

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
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) { setDrops(null); setProject(null); return; }
    setLoading(true);
    Promise.all([
      fetch(`/api/drops?partner=${address}`).then((r) => r.json()),
      fetch(`/api/projects/${address}`).then((r) => r.ok ? r.json() : null),
    ])
      .then(([drops, proj]) => {
        setDrops(Array.isArray(drops) ? drops : []);
        setProject(proj);
      })
      .catch(() => { setDrops([]); setProject(null); })
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
      <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full space-y-8">
        {/* Profile setup prompt */}
        {!project && (
          <div className="rounded-2xl border border-amber-900/30 bg-amber-950/[0.06] p-6 flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-amber-400 text-sm font-bold">!</span>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-white font-semibold text-sm">Set up your project profile first</p>
                <p className="text-zinc-500 text-xs mt-0.5">Add your project name, logo, and banner before creating drops.</p>
              </div>
              <Link href="/partner/settings" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-zinc-100 transition-colors">
                Set up project profile →
              </Link>
            </div>
          </div>
        )}

        <div className="text-center space-y-6 py-8">
          <div className="space-y-2">
            <h2 className="text-white font-bold text-xl" style={DISPLAY}>No drops yet</h2>
            <p className="text-zinc-500 text-sm">Create your first drop to start reaching verified Based ID holders.</p>
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
        <div className="flex items-center gap-4">
          {/* Project logo */}
          {project?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.logo_url} alt={project.name} className="w-12 h-12 rounded-xl object-cover border border-white/[0.08] flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-900/50 to-zinc-900 flex items-center justify-center border border-white/[0.08] flex-shrink-0">
              <span className="text-white font-black text-lg" style={DISPLAY}>
                {(project?.name ?? address?.slice(2, 3) ?? "?").toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className="text-zinc-500 text-xs mb-0.5">Partner Dashboard</p>
            <h1 className="text-white font-black text-2xl sm:text-3xl" style={DISPLAY}>
              {project?.name || "Your Project"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/partner/settings"
            className="px-3.5 py-2 rounded-xl border border-white/[0.08] text-zinc-400 text-sm font-medium hover:bg-white/[0.04] hover:text-white transition-colors flex items-center gap-1.5"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Settings
          </Link>
          {project && (
            <Link href={`/projects/${address?.toLowerCase()}`} className="px-3.5 py-2 rounded-xl border border-white/[0.08] text-zinc-400 text-sm font-medium hover:bg-white/[0.04] hover:text-white transition-colors">
              Public page ↗
            </Link>
          )}
          <ConnectButton showBalance={false} chainStatus="icon" />
          <Link href="/partner/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors">
            + New drop
          </Link>
        </div>
      </div>

      {/* Profile setup prompt if no project yet */}
      {!project && (
        <div className="rounded-2xl border border-amber-900/30 bg-amber-950/[0.06] p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-amber-400 text-lg">!</span>
            <div>
              <p className="text-white text-sm font-semibold">Set up your project profile</p>
              <p className="text-zinc-500 text-xs">Add your name, logo, and banner so holders can find you.</p>
            </div>
          </div>
          <Link href="/partner/settings" className="px-4 py-2 rounded-xl bg-amber-400 text-black text-sm font-bold hover:bg-amber-300 transition-colors flex-shrink-0">
            Set up profile →
          </Link>
        </div>
      )}

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
  const endsAt  = new Date(drop.ends_at);
  const isEnded = endsAt < new Date();

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.01] p-5 flex items-center gap-4 flex-wrap hover:border-white/[0.12] transition-colors">
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-bold text-sm truncate">{drop.title}</span>
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
          {drop.entry_count !== undefined && <> · <span className="text-zinc-400">{drop.entry_count.toLocaleString()} entr{drop.entry_count !== 1 ? "ies" : "y"}</span></>}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {drop.status === "pending_payment" && (
          <Link href={`/partner/new?resume=${drop.id}`} className="text-amber-400 text-[11px] font-medium hover:text-amber-300 transition-colors">
            Pay fee →
          </Link>
        )}
        <Link href={`/drops/${drop.id}`} className="text-zinc-500 text-[11px] hover:text-zinc-300 transition-colors">
          Public
        </Link>
        <Link href={`/partner/drops/${drop.id}`}
          className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white text-[11px] font-semibold hover:bg-white/[0.08] transition-colors">
          Manage →
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

