"use client";

import { useState, useRef } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import toast from "react-hot-toast";
import type { DropType, DropTier, TaskType } from "@/lib/supabase";

const D = { fontFamily: "var(--font-display), system-ui, sans-serif" };

type TaskDraft = { type: TaskType; params: Record<string, string> };

const DROP_TYPES: { value: DropType; label: string; desc: string; example: string; icon: string }[] = [
  { value: "raffle",     label: "Raffle",      desc: "Random draw from all entrants",          example: "e.g. 5 winners get a free NFT mint",        icon: "🎲" },
  { value: "whitelist",  label: "Whitelist",   desc: "Grant allowlist spots to winners",        example: "e.g. 100 WL spots for your upcoming mint",  icon: "📋" },
  { value: "nft_mint",   label: "NFT Mint",    desc: "Reserve free or discounted mint slots",   example: "e.g. Free mint for 50 Based ID holders",    icon: "🖼️" },
  { value: "token_drop", label: "Token Drop",  desc: "Distribute tokens to selected wallets",   example: "e.g. 1,000 $XYZ split among 20 winners",   icon: "🪙" },
];

const DURATION_PRESETS = [
  { label: "24h",    hours: 24  },
  { label: "48h",    hours: 48  },
  { label: "72h",    hours: 72  },
  { label: "1 week", hours: 168 },
];

const TASK_CONFIGS: { value: TaskType; label: string; desc: string }[] = [
  { value: "follow_x",    label: "Follow on X",     desc: "Users must follow your X account to enter" },
  { value: "join_discord", label: "Join Discord",   desc: "Users must join your Discord server" },
  { value: "hold_nft",    label: "Hold specific NFT", desc: "Users must hold at least 1 of your NFT" },
];

function FieldLabel({ label, hint, required }: { label: string; hint?: string; required?: boolean }) {
  return (
    <div className="space-y-0.5 mb-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-zinc-300 text-sm font-medium">{label}</span>
        {required && <span className="text-red-400 text-xs">*</span>}
      </div>
      {hint && <p className="text-zinc-600 text-[11px]">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, maxLength, className = "" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number; className?: string;
}) {
  return (
    <div className="relative">
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength}
        className={`w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 outline-none focus:border-blue-500/40 focus:bg-white/[0.05] transition-all ${className}`} />
      {maxLength && value.length > maxLength * 0.8 && (
        <span className="absolute right-3 top-3 text-[10px] text-zinc-600">{value.length}/{maxLength}</span>
      )}
    </div>
  );
}

function CardPreview({ title, type, winnerCount, endsAt, imageUrl, description }: {
  title: string; type: DropType; winnerCount: number; endsAt: string; imageUrl: string; description: string;
}) {
  const t = DROP_TYPES.find(d => d.value === type)!;
  const diff = endsAt ? new Date(endsAt).getTime() - Date.now() : 0;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const timeStr = diff <= 0 ? "—" : d > 0 ? `${d}d left` : `${h}h left`;

  const TYPE_COLORS: Record<string, string> = {
    whitelist: "text-violet-300 bg-violet-500/10 border-violet-500/20",
    raffle: "text-blue-300 bg-blue-500/10 border-blue-500/20",
    token_drop: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    nft_mint: "text-green-300 bg-green-500/10 border-green-500/20",
  };

  return (
    <div className="rounded-2xl border border-white/[0.1] overflow-hidden bg-zinc-950">
      {/* Banner */}
      <div className="relative aspect-[16/9] bg-zinc-900 overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl opacity-30">{t.icon}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <span className={`text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full border ${TYPE_COLORS[type] ?? "text-zinc-400 bg-zinc-500/10 border-zinc-500/20"}`}>
            {t.label}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/60 border border-white/[0.1] text-zinc-300">
            {timeStr}
          </span>
        </div>
      </div>
      {/* Body */}
      <div className="p-4 space-y-3">
        <p className="text-white font-bold text-[15px] leading-snug line-clamp-2">
          {title || <span className="text-zinc-600">Your drop title will appear here</span>}
        </p>
        {description && <p className="text-zinc-500 text-xs line-clamp-2">{description}</p>}
        <div className="flex items-center gap-3 text-[11px] text-zinc-500">
          <span>{winnerCount} winner{winnerCount !== 1 ? "s" : ""}</span>
        </div>
        <div className="w-full py-2.5 rounded-xl bg-white/[0.07] text-white text-sm font-bold text-center border border-white/[0.08]">
          Enter →
        </div>
      </div>
    </div>
  );
}

export function CreateDropWizard() {
  const { address, isConnected } = useAccount();
  const [step,    setStep]   = useState<1 | 2 | 3>(1);

  // Step 1 state
  const [title,       setTitle]       = useState("");
  const [description, setDesc]        = useState("");
  const [imageUrl,    setImageUrl]    = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [dropType,    setDropType]    = useState<DropType>("raffle");
  const [tier,        setTier]        = useState<DropTier>("standard");
  const [winnerCount, setWinnerCount] = useState(5);
  const [durationHours, setDurationHours] = useState(72);
  const [customDuration, setCustomDuration] = useState("");
  const [prizeDesc,   setPrizeDesc]   = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 state
  const [tasks, setTasks] = useState<TaskDraft[]>([]);

  // Step 3 state
  const [createdDropId, setCreatedDropId] = useState<string | null>(null);
  const [submitting,    setSubmitting]    = useState(false);
  const [done,          setDone]          = useState(false);

  const endsAt = (() => {
    const hrs = customDuration ? parseInt(customDuration) : durationHours;
    if (!hrs || isNaN(hrs)) return "";
    const d = new Date(Date.now() + hrs * 3600000);
    return d.toISOString();
  })();

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res  = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Upload failed"); return; }
      setImageUrl(data.url);
      toast.success("Image uploaded");
    } catch { toast.error("Upload failed"); }
    finally { setImageUploading(false); }
  }

  function addTask(type: TaskType) {
    if (tasks.some(t => t.type === type)) return;
    setTasks(prev => [...prev, { type, params: {} }]);
  }

  function removeTask(idx: number) { setTasks(prev => prev.filter((_, i) => i !== idx)); }

  function updateTaskParam(idx: number, key: string, val: string) {
    setTasks(prev => prev.map((t, i) => i === idx ? { ...t, params: { ...t.params, [key]: val } } : t));
  }

  async function handleSubmit() {
    if (!address || !endsAt) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/drops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_address: address,
          title: title.trim(),
          description: description.trim(),
          image_url: imageUrl || undefined,
          type: dropType,
          tier,
          prize_details: prizeDesc ? { description: prizeDesc } : {},
          winner_count: winnerCount,
          starts_at: new Date().toISOString(),
          ends_at: endsAt,
          tasks: [
            { type: "hold_based_id" as TaskType, params: {} },
            ...tasks,
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to create drop"); return; }
      setCreatedDropId(data.drop.id);

      if (tier === "featured") {
        // Featured: needs payment — for now show payment step
        setStep(3);
      } else {
        // Standard: submitted for review
        setDone(true);
      }
    } catch { toast.error("Something went wrong"); }
    finally { setSubmitting(false); }
  }

  const canProceedStep1 = title.trim().length >= 3 && (!!customDuration || durationHours > 0);

  if (!isConnected) return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center space-y-5 max-w-sm">
        <h1 className="text-white font-bold text-2xl" style={D}>Connect to submit a drop</h1>
        <p className="text-zinc-500 text-sm">Your wallet address identifies your project. You can submit from any wallet.</p>
        <ConnectButton />
        <p className="text-zinc-700 text-xs">Already submitted? <Link href="/partner" className="text-zinc-400 hover:text-white transition-colors">View your drops →</Link></p>
      </div>
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
            <path d="M12 8v4l3 3"/>
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-white font-black text-3xl" style={D}>Drop submitted!</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Your drop is under review. We typically review within 24 hours.
            Once approved, it goes live in <Link href="/drops" className="text-blue-400 hover:text-blue-300 transition-colors">/drops</Link>.
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left space-y-2">
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-[0.15em]">What happens next</p>
          {[
            "We review your drop for spam and quality",
            "You'll see it go live in the /drops page once approved",
            "Users can then enter and complete tasks",
            "After the end date, winners are drawn automatically",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="w-4 h-4 rounded-full bg-white/[0.06] text-zinc-600 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
              <span className="text-zinc-500 text-xs">{step}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link href="/drops" className="px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors">
            Browse drops →
          </Link>
          <button onClick={() => { setDone(false); setStep(1); setTitle(""); setDesc(""); setImageUrl(""); setTasks([]); setPrizeDesc(""); setCreatedDropId(null); }}
            className="px-5 py-2.5 rounded-xl border border-white/[0.1] text-zinc-300 text-sm font-medium hover:bg-white/[0.04] transition-colors">
            Submit another
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.05] bg-black/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/drops" className="text-zinc-500 text-sm hover:text-white transition-colors flex items-center gap-1.5">
            ← Back to drops
          </Link>
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {(["Details", "Tasks", "Review"] as const).map((label, i) => {
              const s = i + 1;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    step === s ? "bg-white text-black" : step > s ? "bg-green-600 text-white" : "bg-white/[0.06] text-zinc-500"
                  }`}>
                    {step > s ? "✓" : s}
                    <span className="hidden sm:inline">{label}</span>
                  </div>
                  {s < 3 && <div className={`w-6 h-px ${step > s ? "bg-green-600" : "bg-white/[0.08]"}`} />}
                </div>
              );
            })}
          </div>
          <div className="text-zinc-600 text-xs font-mono hidden sm:block">
            {address?.slice(0, 6)}…{address?.slice(-4)}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* ── STEP 1: Drop details ── */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 items-start">

            {/* Form */}
            <div className="space-y-8">
              <div>
                <h1 className="text-white font-black text-3xl" style={D}>Drop details</h1>
                <p className="text-zinc-500 text-sm mt-1">Tell us about your drop. Be specific — it helps people decide to enter.</p>
              </div>

              {/* Drop type */}
              <div className="space-y-2">
                <FieldLabel label="Drop type" hint="What are you giving away?" required />
                <div className="grid grid-cols-2 gap-2">
                  {DROP_TYPES.map(t => (
                    <button key={t.value} onClick={() => setDropType(t.value)}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        dropType === t.value
                          ? "border-blue-500/40 bg-blue-950/20"
                          : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14]"
                      }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{t.icon}</span>
                        <span className={`font-bold text-sm ${dropType === t.value ? "text-white" : "text-zinc-300"}`}>{t.label}</span>
                      </div>
                      <p className="text-zinc-600 text-[11px]">{t.desc}</p>
                      <p className="text-zinc-700 text-[10px] mt-1 italic">{t.example}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <FieldLabel label="Drop title" hint="Short and clear. What will people see in the drops grid?" required />
                <Input value={title} onChange={setTitle} maxLength={80}
                  placeholder={DROP_TYPES.find(t => t.value === dropType)?.example.replace("e.g. ", "") ?? "e.g. Early Holder Whitelist — 100 spots"} />
                {title.length < 10 && title.length > 0 && (
                  <p className="text-amber-600 text-[11px] mt-1">A bit short — try to be more descriptive.</p>
                )}
              </div>

              {/* Description */}
              <div>
                <FieldLabel label="Description" hint="What do winners receive? Any conditions? The more detail, the more trust." />
                <textarea value={description} onChange={e => setDesc(e.target.value)} rows={3}
                  placeholder="Describe exactly what winners get. Include any relevant dates, token amounts, or eligibility details. Example: '5 winners will each receive a free mint of our upcoming PFP collection (launching June 2026). Winners will be contacted via our Discord.'"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 outline-none focus:border-blue-500/40 focus:bg-white/[0.05] transition-all resize-none" />
              </div>

              {/* Prize summary */}
              <div>
                <FieldLabel label="Prize summary" hint="One-line summary shown in listings (e.g. '1,000 $XYZ tokens', '5 free mints')" />
                <Input value={prizeDesc} onChange={setPrizeDesc} maxLength={60}
                  placeholder="e.g. 1 free NFT mint per winner" />
              </div>

              {/* Image */}
              <div>
                <FieldLabel label="Drop image" hint="16:9 ratio works best. JPG, PNG, WebP or GIF. Max 5 MB." />
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageUpload} className="hidden" />
                {imageUrl ? (
                  <div className="relative rounded-xl overflow-hidden aspect-[16/9] group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Drop image" className="w-full h-full object-cover" />
                    <button onClick={() => { setImageUrl(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/80 text-white flex items-center justify-center hover:bg-black transition-colors opacity-0 group-hover:opacity-100 text-sm">
                      ×
                    </button>
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => fileInputRef.current?.click()} className="px-2.5 py-1 rounded-lg bg-black/80 text-white text-[11px] font-medium">
                        Replace
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()} disabled={imageUploading}
                    className="w-full aspect-[16/9] rounded-xl border-2 border-dashed border-white/[0.1] bg-white/[0.01] flex flex-col items-center justify-center gap-2 hover:border-white/[0.2] hover:bg-white/[0.03] transition-all disabled:opacity-50">
                    {imageUploading ? (
                      <><div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" /><span className="text-zinc-500 text-xs">Uploading…</span></>
                    ) : (
                      <>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        <span className="text-zinc-500 text-sm font-medium">Upload a banner image</span>
                        <span className="text-zinc-700 text-xs">Recommended: 1200 × 675px · JPG or PNG</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Winners + Duration */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <FieldLabel label="Number of winners" hint="How many wallets will be selected?" required />
                  <input type="number" min={1} max={10000} value={winnerCount}
                    onChange={e => setWinnerCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500/40 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  <p className="text-zinc-700 text-[10px] mt-1">Most drops use 1–100 winners</p>
                </div>

                <div>
                  <FieldLabel label="Duration" hint="How long will entries be open?" required />
                  <div className="flex gap-2 flex-wrap">
                    {DURATION_PRESETS.map(p => (
                      <button key={p.hours} onClick={() => { setDurationHours(p.hours); setCustomDuration(""); }}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                          durationHours === p.hours && !customDuration
                            ? "bg-white text-black"
                            : "bg-white/[0.05] text-zinc-400 hover:bg-white/[0.09] border border-white/[0.07]"
                        }`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 relative">
                    <input type="number" min={1} max={720} value={customDuration}
                      onChange={e => { setCustomDuration(e.target.value); setDurationHours(0); }}
                      placeholder="Custom hours"
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-4 pr-10 py-2.5 text-white text-sm placeholder-zinc-700 outline-none focus:border-blue-500/40 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <span className="absolute right-3 top-2.5 text-zinc-600 text-xs">hrs</span>
                  </div>
                  {endsAt && (
                    <p className="text-zinc-600 text-[11px] mt-1">
                      Ends {new Date(endsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} UTC
                    </p>
                  )}
                </div>
              </div>

              {/* Tier */}
              <div>
                <FieldLabel label="Listing tier" hint="Standard is free. Featured gets homepage placement and an X announcement from us." />
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "standard" as DropTier, label: "Standard", price: "Free", tag: "Most common",
                      features: ["Listed in /drops", "Partner dashboard + stats", "Auto winner draw", "Exportable wallet list"] },
                    { value: "featured" as DropTier, label: "Featured", price: "200 USDC", tag: "Recommended for launches",
                      features: ["Everything in Standard", "Top placement above all others", "Based ID homepage slot", "X announcement to our audience", "\"FEATURED\" badge"] },
                  ].map(t => (
                    <button key={t.value} onClick={() => setTier(t.value)}
                      className={`rounded-xl border p-4 text-left transition-all space-y-3 ${
                        tier === t.value
                          ? t.value === "featured" ? "border-amber-500/40 bg-amber-950/15" : "border-blue-500/30 bg-blue-950/15"
                          : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14]"
                      }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`font-bold text-sm ${tier === t.value ? "text-white" : "text-zinc-300"}`}>{t.label}</p>
                          <p className="text-zinc-600 text-[10px] mt-0.5">{t.tag}</p>
                        </div>
                        <p className={`font-bold text-sm flex-shrink-0 ${tier === t.value && t.value === "featured" ? "text-amber-400" : tier === t.value ? "text-green-400" : "text-zinc-500"}`}>
                          {t.price}
                        </p>
                      </div>
                      <ul className="space-y-1">
                        {t.features.map(f => (
                          <li key={f} className="flex items-start gap-1.5 text-zinc-500 text-[11px]">
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="mt-0.5 flex-shrink-0">
                              <path d="M2 5l2 2 4-4" stroke={tier === t.value ? (t.value === "featured" ? "#f59e0b" : "#60a5fa") : "#52525b"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => setStep(2)} disabled={!canProceedStep1}
                className="w-full py-4 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                Next: Entry requirements →
              </button>
            </div>

            {/* Live preview */}
            <div className="hidden lg:block sticky top-24 space-y-4">
              <p className="text-zinc-600 text-[11px] uppercase tracking-[0.2em]">Live preview</p>
              <CardPreview title={title} type={dropType} winnerCount={winnerCount} endsAt={endsAt} imageUrl={imageUrl} description={description} />
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.01] p-3 space-y-1.5">
                <p className="text-zinc-600 text-[10px] uppercase tracking-[0.15em]">Tips for more entries</p>
                {["Use a high-quality banner image — it's the first thing people see", "Be specific about the prize — vague drops get fewer entries", "Shorter durations (24–48h) create urgency", "More winners = higher perceived chance = more entries"].map(tip => (
                  <p key={tip} className="text-zinc-600 text-[11px] flex items-start gap-1.5">
                    <span className="text-zinc-700 mt-0.5">→</span>{tip}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Tasks ── */}
        {step === 2 && (
          <div className="max-w-2xl space-y-8">
            <div>
              <h1 className="text-white font-black text-3xl" style={D}>Entry requirements</h1>
              <p className="text-zinc-500 text-sm mt-1">Tasks users must complete to enter. Keep it simple — too many tasks reduce entries.</p>
            </div>

            {/* Always required */}
            <div className="rounded-xl border border-green-900/25 bg-green-950/[0.06] px-4 py-3 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5l2.5 2.5L9 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="flex-1">
                <p className="text-green-300 text-sm font-semibold">Hold a Based ID</p>
                <p className="text-zinc-600 text-xs">Automatically required for all drops — ensures bot-free entries</p>
              </div>
              <span className="text-zinc-700 text-[10px] flex-shrink-0">Always on</span>
            </div>

            {/* Optional tasks */}
            <div className="space-y-3">
              <p className="text-zinc-500 text-sm font-medium">Optional additional tasks</p>
              <p className="text-zinc-600 text-xs">Each task reduces entry count slightly. We recommend 1–2 max.</p>

              {/* Available tasks */}
              <div className="grid gap-2">
                {TASK_CONFIGS.filter(t => !tasks.some(added => added.type === t.value)).map(t => (
                  <button key={t.value} onClick={() => addTask(t.value)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04] transition-all text-left">
                    <span className="w-6 h-6 rounded-lg bg-white/[0.06] flex items-center justify-center text-zinc-400 font-bold text-sm flex-shrink-0">+</span>
                    <div>
                      <p className="text-zinc-200 text-sm font-medium">{t.label}</p>
                      <p className="text-zinc-600 text-xs">{t.desc}</p>
                    </div>
                  </button>
                ))}
                {TASK_CONFIGS.every(t => tasks.some(added => added.type === t.value)) && (
                  <p className="text-zinc-700 text-xs px-1">All available tasks added.</p>
                )}
              </div>

              {/* Added tasks */}
              {tasks.map((t, idx) => {
                const config = TASK_CONFIGS.find(c => c.value === t.type)!;
                return (
                  <div key={idx} className="rounded-xl border border-blue-500/20 bg-blue-950/10 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-blue-300 text-sm font-semibold">{config.label}</p>
                      <button onClick={() => removeTask(idx)} className="text-zinc-600 hover:text-red-400 transition-colors text-xs">Remove</button>
                    </div>
                    {t.type === "follow_x" && (
                      <div>
                        <FieldLabel label="X handle" hint="Without the @ symbol" required />
                        <Input value={t.params.handle ?? ""} onChange={v => updateTaskParam(idx, "handle", v)} placeholder="basedidofficial" />
                      </div>
                    )}
                    {t.type === "join_discord" && (
                      <div>
                        <FieldLabel label="Discord invite URL" hint="Use a permanent invite link (no expiry)" required />
                        <Input value={t.params.invite ?? ""} onChange={v => updateTaskParam(idx, "invite", v)} placeholder="https://discord.gg/yourserver" />
                      </div>
                    )}
                    {t.type === "hold_nft" && (
                      <div className="grid grid-cols-[1fr_120px] gap-3">
                        <div>
                          <FieldLabel label="NFT contract address" required />
                          <Input value={t.params.contract ?? ""} onChange={v => updateTaskParam(idx, "contract", v)} placeholder="0x…" />
                        </div>
                        <div>
                          <FieldLabel label="Min. count" />
                          <Input value={t.params.minCount ?? "1"} onChange={v => updateTaskParam(idx, "minCount", v)} placeholder="1" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(1)} className="px-6 py-3.5 rounded-xl border border-white/[0.08] text-zinc-400 text-sm font-medium hover:bg-white/[0.04] transition-colors">
                ← Back
              </button>
              <button onClick={() => setStep(3)} className="flex-1 py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-100 transition-colors">
                Review & submit →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Review & submit ── */}
        {step === 3 && (
          <div className="max-w-2xl space-y-8">
            <div>
              <h1 className="text-white font-black text-3xl" style={D}>Review & submit</h1>
              <p className="text-zinc-500 text-sm mt-1">Double-check everything before submitting. We'll review and approve within 24 hours.</p>
            </div>

            {/* Summary card */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] divide-y divide-white/[0.05]">
              {[
                { label: "Title",       value: title },
                { label: "Type",        value: DROP_TYPES.find(t => t.value === dropType)?.label ?? dropType },
                { label: "Tier",        value: tier === "featured" ? "Featured (200 USDC)" : "Standard (Free)" },
                { label: "Winners",     value: `${winnerCount}` },
                { label: "Duration",    value: endsAt ? `Until ${new Date(endsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} UTC` : "—" },
                { label: "Tasks",       value: `Hold Based ID${tasks.length > 0 ? ` + ${tasks.length} more` : ""}` },
                { label: "Prize",       value: prizeDesc || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3">
                  <span className="text-zinc-500 text-sm">{label}</span>
                  <span className="text-white text-sm font-medium">{value}</span>
                </div>
              ))}
            </div>

            {/* Drop preview */}
            <div className="space-y-2">
              <p className="text-zinc-600 text-[11px] uppercase tracking-[0.15em]">How it will look</p>
              <CardPreview title={title} type={dropType} winnerCount={winnerCount} endsAt={endsAt} imageUrl={imageUrl} description={description} />
            </div>

            {/* Notice */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4 flex items-start gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="text-zinc-500 text-xs leading-relaxed">
                {tier === "standard"
                  ? "Standard drops are free. Your drop will be reviewed before going live — usually within 24 hours. Spam or misleading drops will be rejected."
                  : "Featured drops cost 200 USDC. After submitting, you'll be prompted to pay. Your drop goes live after payment confirmation and our review."}
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-6 py-3.5 rounded-xl border border-white/[0.08] text-zinc-400 text-sm font-medium hover:bg-white/[0.04] transition-colors">
                ← Back
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                {submitting ? "Submitting…" : tier === "featured" ? "Submit & pay 200 USDC →" : "Submit drop for review →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
