"use client";

import { useState, useRef } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import toast from "react-hot-toast";
import type { Campaign } from "@/lib/supabase";
import { AnalyticsTab } from "./AnalyticsTab";

const DISPLAY = { fontFamily: "var(--font-display), system-ui, sans-serif" };

function Input({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-700 outline-none focus:border-white/20 transition-colors"
    />
  );
}

function EditProfileSection({ projectAddress }: { projectAddress: string }) {
  const { address } = useAccount();
  const [open, setOpen] = useState(false);
  const [name,        setName]      = useState("");
  const [description, setDesc]      = useState("");
  const [logoUrl,     setLogoUrl]   = useState("");
  const [bannerUrl,   setBannerUrl] = useState("");
  const [website,     setWebsite]   = useState("");
  const [twitter,     setTwitter]   = useState("");
  const [email,       setEmail]     = useState("");
  const [saving,      setSaving]    = useState(false);
  const [uploading,   setUploading] = useState<"logo" | "banner" | null>(null);
  const [loaded,      setLoaded]    = useState(false);

  const logoRef   = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  async function loadProject() {
    if (loaded) { setOpen(o => !o); return; }
    const res = await fetch(`/api/projects/${projectAddress}`);
    if (res.ok) {
      const p = await res.json();
      setName(p.name ?? "");
      setDesc(p.description ?? "");
      setTwitter(p.twitter ?? "");
      setWebsite(p.website ?? "");
      setEmail(p.email ?? "");
      setLogoUrl(p.logo_url ?? "");
      setBannerUrl(p.banner_url ?? "");
    }
    setLoaded(true);
    setOpen(true);
  }

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
    if (!address) return;
    if (!name.trim()) { toast.error("Project name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          name,
          description,
          twitter,
          website,
          email: email || null,
          logo_url: logoUrl || null,
          banner_url: bannerUrl || null,
        }),
      });
      const data = await res.json();
      if (res.ok) { toast.success("Profile saved"); setOpen(false); }
      else toast.error(data.error ?? "Save failed");
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.01] overflow-hidden">
      <button
        onClick={loadProject}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <span className="text-white text-sm font-semibold">Edit Profile</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`text-zinc-600 transition-transform ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-white/[0.06]">
          <div className="pt-4 space-y-2">
            <label className="text-zinc-400 text-xs font-medium uppercase tracking-[0.12em]">Banner</label>
            <input ref={bannerRef} type="file" accept="image/*" onChange={e => handleUpload(e, "banner")} className="hidden" />
            <button type="button" onClick={() => bannerRef.current?.click()} disabled={uploading !== null}
              className="w-full h-28 rounded-xl border border-white/[0.08] overflow-hidden relative hover:border-white/[0.16] transition-colors disabled:opacity-50 group">
              {bannerUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-medium">Change banner</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
                  {uploading === "banner"
                    ? <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    : <span className="text-zinc-600 text-xs">Click to upload banner</span>}
                </div>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[80px_1fr] gap-4 items-start">
            <div className="space-y-1.5">
              <label className="text-zinc-400 text-xs font-medium uppercase tracking-[0.12em]">Logo</label>
              <input ref={logoRef} type="file" accept="image/*" onChange={e => handleUpload(e, "logo")} className="hidden" />
              <button type="button" onClick={() => logoRef.current?.click()} disabled={uploading !== null}
                className="w-20 h-20 rounded-xl border border-white/[0.08] overflow-hidden hover:border-white/[0.2] transition-colors disabled:opacity-50 group relative">
                {logoUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
                    {uploading === "logo"
                      ? <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      : <span className="text-zinc-700 text-[10px]">Upload</span>}
                  </div>
                )}
              </button>
            </div>

            <div className="space-y-3">
              {[
                { label: "Project name *", value: name,    onChange: setName,    placeholder: "e.g. Base Colors" },
                { label: "Twitter / X",   value: twitter,  onChange: setTwitter, placeholder: "@yourhandle" },
                { label: "Website",       value: website,  onChange: setWebsite, placeholder: "https://yourproject.xyz" },
                { label: "Email",         value: email,    onChange: setEmail,   placeholder: "you@project.xyz" },
              ].map(f => (
                <div key={f.label} className="space-y-1">
                  <label className="text-zinc-400 text-xs">{f.label}</label>
                  <Input value={f.value} onChange={f.onChange} placeholder={f.placeholder} />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-400 text-xs">Description</label>
            <textarea value={description} onChange={e => setDesc(e.target.value)} rows={3}
              placeholder="What does your project do? Who is it for?"
              className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-700 outline-none focus:border-white/20 transition-colors resize-none" />
          </div>

          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving || !name.trim()}
              className="px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors disabled:opacity-30">
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CampaignRow({ campaign, partnerAddress }: { campaign: Campaign; partnerAddress: string }) {
  const { address } = useAccount();
  const [drawing, setDrawing] = useState(false);

  const isEnded = new Date(campaign.ends_at) <= new Date();
  const canDraw = isEnded && (campaign.status === "active" || campaign.status === "ended");

  async function handleDraw() {
    if (!address) return;
    setDrawing(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_address: address }),
      });
      const data = await res.json();
      if (res.ok) toast.success(`Winners drawn — ${data.winner_count} winner${data.winner_count !== 1 ? "s" : ""}`);
      else toast.error(data.error ?? "Draw failed");
    } catch { toast.error("Something went wrong"); }
    finally { setDrawing(false); }
  }

  const STATUS_COLORS: Record<string, string> = {
    active:  "text-green-400 bg-green-500/10 border-green-500/20",
    ended:   "text-amber-400 bg-amber-500/10 border-amber-500/20",
    drawn:   "text-blue-400 bg-blue-500/10 border-blue-500/20",
    pending_review: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
  };

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.02] transition-colors flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUS_COLORS[campaign.status] ?? "text-zinc-500 bg-zinc-500/10 border-zinc-500/20"}`}>
          {campaign.status}
        </span>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">{campaign.title}</p>
          <p className="text-zinc-600 text-xs">{campaign.entry_count ?? 0} entries</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link href={`/campaigns/${campaign.id}`} className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-zinc-400 text-xs hover:text-white hover:border-white/20 transition-colors">
          View
        </Link>
        {canDraw && (
          <button onClick={handleDraw} disabled={drawing}
            className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors disabled:opacity-40">
            {drawing ? "Drawing…" : "Draw Winners"}
          </button>
        )}
        {campaign.status === "drawn" && (
          <span className="text-zinc-600 text-xs">
            {campaign.winners?.length ?? 0} winner{(campaign.winners?.length ?? 0) !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

export function OwnerControls({
  projectAddress,
  campaigns,
}: {
  projectAddress: string;
  campaigns: Campaign[];
}) {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<"campaigns" | "analytics">("campaigns");

  if (!isConnected) return null;
  if (address?.toLowerCase() !== projectAddress.toLowerCase()) return null;

  return (
    <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.01] p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-0.5">
          <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-semibold">Owner controls</p>
          <h2 className="text-white font-black text-xl tracking-tight" style={DISPLAY}>Manage project</h2>
        </div>
        <Link
          href={`/projects/${projectAddress}/new`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Create Campaign
        </Link>
      </div>

      <EditProfileSection projectAddress={projectAddress} />

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-white/[0.06] pb-0">
        {(["campaigns", "analytics"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors capitalize border-b-2 -mb-px ${
              activeTab === tab
                ? "text-white border-white"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "campaigns" && (
        <>
          {campaigns.length > 0 ? (
            <div className="space-y-2">
              <div className="space-y-2">
                {campaigns.map(c => (
                  <CampaignRow key={c.id} campaign={c} partnerAddress={projectAddress} />
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.01] px-5 py-8 text-center">
              <p className="text-zinc-500 text-sm">No campaigns yet.</p>
              <p className="text-zinc-700 text-xs mt-1">Create your first campaign to start collecting entries.</p>
            </div>
          )}
        </>
      )}

      {activeTab === "analytics" && (
        <AnalyticsTab address={projectAddress} />
      )}
    </section>
  );
}
