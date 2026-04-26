"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import toast from "react-hot-toast";

const D = { fontFamily: "var(--font-display), system-ui, sans-serif" };

const TYPE_LABELS: Record<string, string> = {
  whitelist: "Whitelist", raffle: "Raffle", token_drop: "Token Drop", nft_mint: "NFT Mint",
};
const STATUS_COLORS: Record<string, string> = {
  pending_payment: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  active:          "text-green-400 bg-green-500/10 border-green-500/20",
  ended:           "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
  drawn:           "text-blue-400 bg-blue-500/10 border-blue-500/20",
  cancelled:       "text-red-400 bg-red-500/10 border-red-500/20",
};
const ENTRY_STATUS_COLORS: Record<string, string> = {
  entered:      "text-zinc-300",
  won:          "text-green-400",
  lost:         "text-zinc-600",
  disqualified: "text-red-400",
};

type Drop = {
  id: string; title: string; description: string; type: string; tier: string;
  status: string; winner_count: number; ends_at: string; entry_count?: number;
  tasks?: { id: string; type: string; params: Record<string, unknown> }[];
  winners?: string[];
};

type Entry = {
  id: string; wallet_address: string; status: string; created_at: string;
};

export function DropManagement({ dropId }: { dropId: string }) {
  const { address, isConnected } = useAccount();
  const [drop,    setDrop]    = useState<Drop | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [drawn,   setDrawn]   = useState(false);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState<"all" | "entered" | "won" | "disqualified">("all");
  const [copied,  setCopied]  = useState(false);
  const [editing, setEditing] = useState(false);

  // Load drop info
  const loadDrop = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/drops?partner=${address}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const found = data.find((d: Drop) => d.id === dropId);
        if (found) setDrop(found);
      }
    } catch { toast.error("Failed to load drop"); }
    finally { setLoading(false); }
  }, [address, dropId]);

  // Load entries
  const loadEntries = useCallback(async () => {
    if (!address) return;
    setLoadingEntries(true);
    try {
      const res = await fetch(`/api/drops/${dropId}/entries?partner=${address}`);
      const data = await res.json();
      if (Array.isArray(data)) setEntries(data);
    } catch { toast.error("Failed to load entries"); }
    finally { setLoadingEntries(false); }
  }, [address, dropId]);

  useEffect(() => { if (address) { loadDrop(); loadEntries(); } }, [address, loadDrop, loadEntries]);

  async function handleDraw() {
    if (!address || !drop) return;
    if (!confirm(`Draw ${drop.winner_count} winner${drop.winner_count !== 1 ? "s" : ""} from ${entries.filter(e => e.status === "entered").length} entries? This cannot be undone.`)) return;
    setDrawing(true);
    try {
      const res = await fetch(`/api/drops/${dropId}/draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_address: address }),
      });
      const data = await res.json();
      if (res.ok) {
        setDrawn(true);
        toast.success(`${data.winner_count} winner${data.winner_count !== 1 ? "s" : ""} drawn!`);
        loadDrop(); loadEntries();
      } else toast.error(data.error ?? "Draw failed");
    } catch { toast.error("Something went wrong"); }
    finally { setDrawing(false); }
  }

  async function handleDisqualify(entryId: string, wallet: string) {
    if (!address) return;
    if (!confirm(`Disqualify ${wallet.slice(0,6)}…${wallet.slice(-4)}?`)) return;
    try {
      const res = await fetch(`/api/drops/${dropId}/disqualify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_address: address, entry_id: entryId }),
      });
      if (res.ok) {
        setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: "disqualified" } : e));
        toast.success("Entry disqualified");
      } else toast.error("Failed to disqualify");
    } catch { toast.error("Something went wrong"); }
  }

  function copyWallets() {
    const wallets = entries
      .filter(e => e.status === "entered" || e.status === "won")
      .map(e => e.wallet_address)
      .join("\n");
    navigator.clipboard.writeText(wallets).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Filtered entries
  const filtered = entries.filter(e => {
    const matchFilter = filter === "all" || e.status === filter;
    const matchSearch = !search || e.wallet_address.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = {
    entered:      entries.filter(e => e.status === "entered").length,
    won:          entries.filter(e => e.status === "won").length,
    disqualified: entries.filter(e => e.status === "disqualified").length,
    lost:         entries.filter(e => e.status === "lost").length,
  };

  const isEnded   = drop ? (drop.status === "ended" || (drop.status === "active" && new Date(drop.ends_at) <= new Date())) : false;
  const canDraw   = drop && (isEnded || drop.status === "ended") && drop.status !== "drawn";
  const isDrawn   = drop?.status === "drawn";
  const endsAt    = drop ? new Date(drop.ends_at) : null;
  const timeLeft  = endsAt && endsAt > new Date()
    ? Math.ceil((endsAt.getTime() - Date.now()) / 3600000) + "h left"
    : "Ended";

  if (!isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-white font-bold" style={D}>Connect to manage this drop</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  if (!drop) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-zinc-400">Drop not found or you don&apos;t own it.</p>
          <Link href="/partner" className="text-blue-400 text-sm hover:text-blue-300 transition-colors">← Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-5xl mx-auto px-6 py-10 w-full space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <Link href="/partner" className="text-zinc-600 text-xs hover:text-zinc-400 transition-colors">
            ← Partner dashboard
          </Link>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <h1 className="text-white font-black text-2xl sm:text-3xl" style={D}>{drop.title}</h1>
            <span className={`text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full border ${STATUS_COLORS[drop.status] ?? STATUS_COLORS.pending_payment}`}>
              {drop.status.replace("_", " ")}
            </span>
            {drop.tier === "featured" && (
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Featured
              </span>
            )}
          </div>
          <p className="text-zinc-500 text-sm">
            {TYPE_LABELS[drop.type] ?? drop.type} · {drop.winner_count} winner{drop.winner_count !== 1 ? "s" : ""} · {timeLeft}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/drops/${drop.id}`} target="_blank"
            className="px-3.5 py-2 rounded-xl border border-white/[0.08] text-zinc-400 text-sm font-medium hover:bg-white/[0.04] hover:text-white transition-colors">
            Public page ↗
          </Link>
          {canDraw && (
            <button onClick={handleDraw} disabled={drawing || counts.entered === 0}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 disabled:opacity-40 transition-colors">
              {drawing ? "Drawing…" : `Draw ${drop.winner_count} winner${drop.winner_count !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total entries",  value: entries.length,      color: "text-white" },
          { label: "Eligible",       value: counts.entered,      color: "text-green-400" },
          { label: "Winners drawn",  value: counts.won,          color: "text-blue-400" },
          { label: "Disqualified",   value: counts.disqualified, color: "text-red-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.01] px-4 py-3.5">
            <p className={`${color} font-bold text-2xl tabular-nums leading-none`}>{value}</p>
            <p className="text-zinc-600 text-[10px] uppercase tracking-[0.12em] mt-2">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Winners if drawn ── */}
      {isDrawn && drop.winners && drop.winners.length > 0 && (
        <div className="rounded-2xl border border-blue-900/25 bg-blue-950/[0.06] p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-blue-400 text-sm font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Winners drawn
            </p>
            <button onClick={copyWallets} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              {copied ? "Copied ✓" : "Copy all addresses"}
            </button>
          </div>
          <div className="space-y-1">
            {drop.winners.map((w: string) => (
              <div key={w} className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                <span className="font-mono text-blue-300 text-sm">{w.slice(0,8)}…{w.slice(-6)}</span>
                <a href={`https://basescan.org/address/${w}`} target="_blank" rel="noopener noreferrer"
                  className="text-zinc-600 text-[10px] hover:text-zinc-400 transition-colors">
                  Basescan ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tasks ── */}
      {drop.tasks && drop.tasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-zinc-500 text-xs uppercase tracking-[0.2em]">Required tasks ({drop.tasks.length})</p>
          <div className="flex flex-wrap gap-2">
            {drop.tasks.map(task => (
              <div key={task.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.07] bg-white/[0.02]">
                <span className="text-zinc-500 text-xs capitalize">{task.type.replace("_", " ")}</span>
                {task.params.handle ? <span className="text-zinc-400 text-xs">@{String(task.params.handle)}</span> : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Entrant list ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-white font-bold text-lg" style={D}>
            Entrants <span className="text-zinc-600 font-normal text-base">({filtered.length})</span>
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search wallet…"
              className="w-48 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-xs placeholder-zinc-700 outline-none focus:border-white/20 transition-colors font-mono"
            />
            {/* Filter tabs */}
            <div className="flex items-center rounded-xl border border-white/[0.08] overflow-hidden">
              {(["all","entered","won","disqualified"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-2 text-xs font-medium transition-colors capitalize ${
                    filter === f ? "bg-white/[0.08] text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}>
                  {f === "all" ? `All ${entries.length}` : f === "entered" ? `Eligible ${counts.entered}` : f === "won" ? `Won ${counts.won}` : `DQ ${counts.disqualified}`}
                </button>
              ))}
            </div>
            {/* Copy */}
            <button onClick={copyWallets}
              className="px-3 py-2 rounded-xl border border-white/[0.08] text-zinc-400 text-xs font-medium hover:bg-white/[0.04] hover:text-white transition-colors">
              {copied ? "Copied ✓" : "Copy wallets"}
            </button>
          </div>
        </div>

        {loadingEntries ? (
          <div className="py-12 text-center"><div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] py-12 text-center">
            <p className="text-zinc-600 text-sm">{search ? "No entries match your search." : "No entries yet."}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_100px_140px_80px] gap-4 px-5 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
              {["Wallet", "Status", "Entered", "Actions"].map(h => (
                <span key={h} className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.15em]">{h}</span>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/[0.04]">
              {filtered.map(entry => (
                <div key={entry.id} className="grid grid-cols-[1fr_100px_140px_80px] gap-4 px-5 py-3 items-center hover:bg-white/[0.02] transition-colors">
                  {/* Wallet */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-zinc-300 text-sm truncate">
                      {entry.wallet_address.slice(0,8)}…{entry.wallet_address.slice(-6)}
                    </span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(entry.wallet_address); toast.success("Copied"); }}
                      className="text-zinc-700 hover:text-zinc-400 transition-colors flex-shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                  </div>

                  {/* Status */}
                  <span className={`text-xs font-medium capitalize ${ENTRY_STATUS_COLORS[entry.status] ?? "text-zinc-500"}`}>
                    {entry.status}
                  </span>

                  {/* Time */}
                  <span className="text-zinc-600 text-xs tabular-nums">
                    {new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <a href={`https://basescan.org/address/${entry.wallet_address}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-zinc-700 text-[10px] hover:text-zinc-400 transition-colors">↗</a>
                    {entry.status === "entered" && (
                      <button onClick={() => handleDisqualify(entry.id, entry.wallet_address)}
                        className="text-red-500/50 text-[10px] font-medium hover:text-red-400 transition-colors">
                        DQ
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer count */}
            <div className="px-5 py-3 border-t border-white/[0.05] bg-white/[0.01]">
              <p className="text-zinc-700 text-xs">{filtered.length} of {entries.length} entries shown</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
