"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Drop, Project } from "@/lib/supabase";
import toast from "react-hot-toast";

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
  const [showProfileEditor, setShowProfileEditor] = useState(false);

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

      {/* Inline profile editor (kept for quick edits) */}
      {showProfileEditor && address && (
        <ProjectProfileEditor
          address={address}
          existing={project}
          onSaved={(updated) => { setProject(updated); setShowProfileEditor(false); }}
        />
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

function ProjectProfileEditor({
  address,
  existing,
  onSaved,
}: {
  address: string;
  existing: Project | null;
  onSaved: (p: Project) => void;
}) {
  const [name,        setName]      = useState(existing?.name ?? "");
  const [description, setDesc]      = useState(existing?.description ?? "");
  const [twitter,     setTwitter]   = useState(existing?.twitter ?? "");
  const [discord,     setDiscord]   = useState(existing?.discord ?? "");
  const [website,     setWebsite]   = useState(existing?.website ?? "");
  const [logoUrl,     setLogoUrl]   = useState(existing?.logo_url ?? "");
  const [bannerUrl,   setBannerUrl] = useState(existing?.banner_url ?? "");
  const [uploading,   setUploading] = useState<"logo" | "banner" | null>(null);
  const [saving,      setSaving]    = useState(false);
  const logoRef   = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "banner") {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(type);
    try {
      const form = new FormData();
      form.append("file", file);
      const res  = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) {
        if (type === "logo") setLogoUrl(data.url);
        else setBannerUrl(data.url);
        toast.success(`${type === "logo" ? "Logo" : "Banner"} uploaded`);
      } else toast.error(data.error ?? "Upload failed");
    } catch { toast.error("Upload failed"); }
    finally { setUploading(null); }
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("Project name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, name, description, twitter, discord, website, logo_url: logoUrl || null, banner_url: bannerUrl || null }),
      });
      const data = await res.json();
      if (res.ok) { toast.success("Profile saved"); onSaved(data); }
      else toast.error(data.error ?? "Save failed");
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] p-6 space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-white font-semibold text-sm">Project profile</p>
        <p className="text-zinc-600 text-xs">/projects/{address.slice(0, 6)}…</p>
      </div>

      {/* Banner upload */}
      <div className="space-y-2">
        <p className="text-zinc-500 text-xs font-medium">Banner image <span className="text-zinc-700">(1500×500px recommended)</span></p>
        <input ref={bannerRef} type="file" accept="image/*" onChange={e => handleUpload(e, "banner")} className="hidden" />
        <button type="button" onClick={() => bannerRef.current?.click()} disabled={uploading !== null}
          className="w-full h-32 rounded-xl border border-white/[0.08] overflow-hidden relative hover:border-white/[0.16] transition-colors disabled:opacity-50 group">
          {bannerUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs font-medium">Change banner</span>
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center gap-1.5">
              {uploading === "banner"
                ? <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                : <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span className="text-zinc-600 text-xs">Upload banner</span>
                  </>}
            </div>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[80px_1fr] gap-5 items-start">
        {/* Logo upload */}
        <div className="space-y-2">
          <p className="text-zinc-500 text-xs font-medium">Logo</p>
          <input ref={logoRef} type="file" accept="image/*" onChange={e => handleUpload(e, "logo")} className="hidden" />
          <button type="button" onClick={() => logoRef.current?.click()} disabled={uploading !== null}
            className="w-20 h-20 rounded-xl border border-white/[0.08] overflow-hidden hover:border-white/[0.2] transition-colors disabled:opacity-50 group relative">
            {logoUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
              </>
            ) : (
              <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
                {uploading === "logo"
                  ? <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}
              </div>
            )}
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Project name *", value: name,    onChange: setName,    placeholder: "Your project name" },
              { label: "Twitter / X",    value: twitter, onChange: setTwitter, placeholder: "@handle" },
              { label: "Discord invite", value: discord, onChange: setDiscord, placeholder: "https://discord.gg/…" },
              { label: "Website",        value: website, onChange: setWebsite, placeholder: "https://…" },
            ].map(f => (
              <div key={f.label} className="space-y-1">
                <label className="text-zinc-500 text-xs">{f.label}</label>
                <input value={f.value} onChange={e => f.onChange(e.target.value)} placeholder={f.placeholder}
                  className="w-full bg-white/[0.02] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-700 outline-none focus:border-white/20 transition-colors" />
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <label className="text-zinc-500 text-xs">Description</label>
            <textarea value={description} onChange={e => setDesc(e.target.value)} rows={2} placeholder="What does your project do?"
              className="w-full bg-white/[0.02] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-700 outline-none focus:border-white/20 transition-colors resize-none" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving || !name.trim()}
          className="px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors disabled:opacity-30">
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}
