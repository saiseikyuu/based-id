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

type EntryRow = { id: string; wallet_address: string; status: string; created_at: string };

function PartnerDropRow({ drop }: { drop: Drop }) {
  const { address } = useAccount();
  const statusColor = STATUS_COLORS[drop.status] ?? STATUS_COLORS.pending_payment;
  const endsAt  = new Date(drop.ends_at);
  const isEnded = endsAt < new Date();
  const [expanded,  setExpanded]  = useState(false);
  const [entries,   setEntries]   = useState<EntryRow[] | null>(null);
  const [loadingE,  setLoadingE]  = useState(false);
  const [copied,    setCopied]    = useState(false);

  async function loadEntries() {
    if (entries !== null || !address) return;
    setLoadingE(true);
    try {
      const res = await fetch(`/api/drops/${drop.id}/entries?partner=${address}`);
      const d   = await res.json();
      setEntries(Array.isArray(d) ? d : []);
    } catch { setEntries([]); }
    finally { setLoadingE(false); }
  }

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (next) loadEntries();
  }

  function copyAll() {
    if (!entries?.length) return;
    const text = entries.filter(e => e.status === "entered" || e.status === "won").map(e => e.wallet_address).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const STATUS_ENTRY_COLORS: Record<string, string> = {
    entered:      "text-zinc-400",
    won:          "text-green-400",
    lost:         "text-zinc-600",
    disqualified: "text-red-400",
  };

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.01] overflow-hidden hover:border-white/[0.12] transition-colors">
      {/* Main row */}
      <div className="p-5 flex items-center gap-4 flex-wrap">
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
            {drop.entry_count !== undefined && <> · <span className="text-zinc-400">{drop.entry_count.toLocaleString()} entr{drop.entry_count !== 1 ? "ies" : "y"}</span></>}
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
          {(drop.status === "active" || drop.status === "ended" || drop.status === "drawn") && (
            <button onClick={toggle} className={`text-[11px] font-medium transition-colors ${expanded ? "text-zinc-300" : "text-zinc-500 hover:text-zinc-300"}`}>
              {expanded ? "Close" : "Entries ↓"}
            </button>
          )}
          <Link href={`/drops/${drop.id}`} className="text-zinc-500 text-[11px] hover:text-zinc-300 transition-colors">
            View
          </Link>
        </div>
      </div>

      {/* Expandable entries panel */}
      {expanded && (
        <div className="border-t border-white/[0.05] px-5 py-4 space-y-3">
          {/* Panel header */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-zinc-500 text-xs">
              {loadingE ? "Loading…" : entries ? `${entries.length} total entr${entries.length !== 1 ? "ies" : "y"}` : ""}
            </p>
            {entries && entries.length > 0 && (
              <button onClick={copyAll} className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors font-medium">
                {copied ? "Copied ✓" : "Copy wallets"}
              </button>
            )}
          </div>

          {/* Entrant list */}
          {loadingE ? (
            <div className="py-4 text-center"><div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin mx-auto" /></div>
          ) : entries && entries.length === 0 ? (
            <p className="text-zinc-700 text-xs py-2">No entries yet.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-xl border border-white/[0.05] divide-y divide-white/[0.03]">
              {entries?.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                  <span className="font-mono text-zinc-300 text-xs">{e.wallet_address.slice(0, 8)}…{e.wallet_address.slice(-6)}</span>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-[10px] font-medium capitalize ${STATUS_ENTRY_COLORS[e.status] ?? "text-zinc-500"}`}>{e.status}</span>
                    {e.status === "entered" && (
                      <DisqualifyButton dropId={drop.id} entryId={e.id} onDisqualified={() => {
                        setEntries(prev => prev ? prev.map(x => x.id === e.id ? { ...x, status: "disqualified" } : x) : prev);
                      }} />
                    )}
                    <a href={`https://basescan.org/address/${e.wallet_address}`} target="_blank" rel="noopener noreferrer"
                      className="text-zinc-700 text-[10px] hover:text-zinc-400 transition-colors">↗</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DisqualifyButton({ dropId, entryId, onDisqualified }: { dropId: string; entryId: string; onDisqualified: () => void }) {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);
  async function handle() {
    if (!address || !confirm("Disqualify this entry?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/drops/${dropId}/disqualify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_address: address, entry_id: entryId }),
      });
      if (res.ok) onDisqualified();
    } finally { setLoading(false); }
  }
  return (
    <button onClick={handle} disabled={loading}
      className="text-red-500/60 text-[10px] hover:text-red-400 transition-colors disabled:opacity-30">
      {loading ? "…" : "DQ"}
    </button>
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

