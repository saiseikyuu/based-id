"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { Project } from "@/lib/supabase";

const DISPLAY = { fontFamily: "var(--font-display), system-ui, sans-serif" };

export function PartnerSettings() {
  const { address, isConnected } = useAccount();
  const [project,   setProject]  = useState<Project | null>(null);
  const [loading,   setLoading]  = useState(true);

  // Form state
  const [name,        setName]      = useState("");
  const [description, setDesc]      = useState("");
  const [twitter,     setTwitter]   = useState("");
  const [discord,     setDiscord]   = useState("");
  const [website,     setWebsite]   = useState("");
  const [logoUrl,     setLogoUrl]   = useState("");
  const [bannerUrl,   setBannerUrl] = useState("");
  const [uploading,   setUploading] = useState<"logo" | "banner" | null>(null);
  const [saving,      setSaving]    = useState(false);

  const logoRef   = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!address) { setLoading(false); return; }
    fetch(`/api/projects/${address}`)
      .then(r => r.ok ? r.json() : null)
      .then(p => {
        setProject(p);
        if (p) {
          setName(p.name ?? "");
          setDesc(p.description ?? "");
          setTwitter(p.twitter ?? "");
          setDiscord(p.discord ?? "");
          setWebsite(p.website ?? "");
          setLogoUrl(p.logo_url ?? "");
          setBannerUrl(p.banner_url ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [address]);

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
          address, name, description, twitter, discord, website,
          logo_url: logoUrl || null, banner_url: bannerUrl || null,
        }),
      });
      const data = await res.json();
      if (res.ok) { setProject(data); toast.success("Project profile saved"); }
      else toast.error(data.error ?? "Save failed");
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  }

  if (!isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-white font-bold text-xl" style={DISPLAY}>Connect your wallet</h1>
          <p className="text-zinc-500 text-sm">Connect to set up your project profile.</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-zinc-600 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <p className="text-zinc-500 text-xs">Partner · Project settings</p>
          <h1 className="text-white font-black text-3xl tracking-tight" style={DISPLAY}>
            {project ? project.name : "Set up your project"}
          </h1>
          {project && (
            <Link href={`/projects/${address?.toLowerCase()}`} className="text-blue-400 text-xs hover:text-blue-300 transition-colors">
              View public page →
            </Link>
          )}
        </div>
        <Link href="/partner" className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors">
          ← Dashboard
        </Link>
      </div>

      {/* Banner upload */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-white text-sm font-medium">Banner image</label>
          <span className="text-zinc-600 text-xs">1500 × 500px recommended</span>
        </div>
        <input ref={bannerRef} type="file" accept="image/*" onChange={e => handleUpload(e, "banner")} className="hidden" />
        <button type="button" onClick={() => bannerRef.current?.click()} disabled={uploading !== null}
          className="w-full h-40 rounded-2xl border border-white/[0.08] overflow-hidden relative hover:border-white/[0.16] transition-colors disabled:opacity-50 group">
          {bannerUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span className="text-white text-sm font-medium">Change banner</span>
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center gap-2">
              {uploading === "banner"
                ? <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                : <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span className="text-zinc-600 text-sm">Click to upload banner</span>
                  </>}
            </div>
          )}
        </button>
      </div>

      {/* Logo + fields */}
      <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-6 items-start">
        <div className="space-y-2">
          <label className="text-white text-sm font-medium block">Logo</label>
          <input ref={logoRef} type="file" accept="image/*" onChange={e => handleUpload(e, "logo")} className="hidden" />
          <button type="button" onClick={() => logoRef.current?.click()} disabled={uploading !== null}
            className="w-24 h-24 rounded-2xl border border-white/[0.08] overflow-hidden hover:border-white/[0.2] transition-colors disabled:opacity-50 group relative">
            {logoUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
              </>
            ) : (
              <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center gap-1">
                {uploading === "logo"
                  ? <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  : <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <span className="text-zinc-700 text-[10px]">Upload</span>
                    </>}
              </div>
            )}
          </button>
        </div>

        <div className="space-y-4">
          {[
            { label: "Project name *", value: name,    onChange: setName,    placeholder: "e.g. Base Colors" },
            { label: "Twitter / X",   value: twitter,  onChange: setTwitter, placeholder: "@yourhandle" },
            { label: "Discord",       value: discord,  onChange: setDiscord, placeholder: "https://discord.gg/…" },
            { label: "Website",       value: website,  onChange: setWebsite, placeholder: "https://yourproject.xyz" },
          ].map(f => (
            <div key={f.label} className="space-y-1.5">
              <label className="text-zinc-400 text-sm">{f.label}</label>
              <input value={f.value} onChange={e => f.onChange(e.target.value)} placeholder={f.placeholder}
                className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-700 outline-none focus:border-white/20 transition-colors" />
            </div>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-zinc-400 text-sm">Description</label>
        <textarea value={description} onChange={e => setDesc(e.target.value)} rows={3}
          placeholder="What does your project do? Who is it for?"
          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-700 outline-none focus:border-white/20 transition-colors resize-none" />
      </div>

      {/* Save */}
      <div className="flex items-center justify-between gap-4 pt-2 border-t border-white/[0.06]">
        <p className="text-zinc-600 text-xs">Wallet: <span className="font-mono">{address?.slice(0, 6)}…{address?.slice(-4)}</span></p>
        <button onClick={handleSave} disabled={saving || !name.trim()}
          className="px-6 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors disabled:opacity-30">
          {saving ? "Saving…" : project ? "Save changes" : "Create project profile"}
        </button>
      </div>
    </div>
  );
}
