"use client";

import { useState, useRef } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import toast from "react-hot-toast";
import type { CampaignType, TaskType } from "@/lib/supabase";

const D = { fontFamily: "var(--font-display), system-ui, sans-serif" };

type TaskDraft = { type: TaskType; params: Record<string, string> };

const CAMPAIGN_TYPES: { value: CampaignType; label: string; desc: string; example: string; icon: string; color: string }[] = [
  { value: "quest",            label: "Quest",            desc: "Everyone who completes all tasks earns XP",         example: "e.g. Follow us + hold Based ID → earn 200 XP",      icon: "⚡", color: "green"  },
  { value: "raffle",           label: "Raffle",           desc: "Random draw from all qualified entrants",            example: "e.g. 5 winners get a free NFT mint",                icon: "🎲", color: "purple" },
  { value: "whitelist",        label: "Whitelist",        desc: "Grant allowlist spots to selected wallets",          example: "e.g. 100 WL spots for your upcoming mint",          icon: "📋", color: "blue"   },
  { value: "nft_mint",         label: "NFT Mint",         desc: "Reserve free or discounted mint slots",              example: "e.g. Free mint for 50 Based ID holders",            icon: "🖼️", color: "blue"   },
  { value: "token_drop",       label: "Token Drop",       desc: "Distribute tokens to selected wallets",              example: "e.g. 1,000 $XYZ split among 20 winners",            icon: "🪙", color: "blue"   },
  { value: "bounty",           label: "Bounty",           desc: "Users submit work — you review and reward the best", example: "e.g. Design a meme, write a thread, report a bug", icon: "🏆", color: "orange" },
  { value: "creator_campaign", label: "Creator Campaign", desc: "Influencer/creator campaign with full task suite",   example: "e.g. Share a cast, tag a friend, earn XP",          icon: "🎬", color: "pink"   },
];

const DURATION_PRESETS = [
  { label: "24h",    hours: 24  },
  { label: "48h",    hours: 48  },
  { label: "72h",    hours: 72  },
  { label: "1 week", hours: 168 },
];

const TASK_CONFIGS: { value: TaskType; label: string; desc: string }[] = [
  { value: "follow_x", label: "Follow on X",      desc: "Users must follow your X account to enter" },
  { value: "hold_nft", label: "Hold specific NFT", desc: "Users must hold at least 1 of a specific NFT" },
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

function Input({ value, onChange, placeholder, maxLength, type = "text", className = "" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number; type?: string; className?: string;
}) {
  return (
    <div className="relative">
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength}
        className={`w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 outline-none focus:border-blue-500/40 focus:bg-white/[0.05] transition-all ${className}`} />
      {maxLength && value.length > maxLength * 0.8 && (
        <span className="absolute right-3 top-3 text-[10px] text-zinc-600">{value.length}/{maxLength}</span>
      )}
    </div>
  );
}

export function CreateCampaignWizard({ partnerAddress }: { partnerAddress: string }) {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 state
  const [campaignType,   setCampaignType]   = useState<CampaignType>("quest");
  const [title,          setTitle]          = useState("");
  const [description,    setDesc]           = useState("");
  const [imageUrl,       setImageUrl]       = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [xpReward,       setXpReward]       = useState(100);
  const [winnerCount,    setWinnerCount]    = useState(5);
  const [prizeDesc,      setPrizeDesc]      = useState("");
  const [durationHours,   setDurationHours]   = useState(72);
  const [customDuration,  setCustomDuration]  = useState("");
  const [submissionType,  setSubmissionType]  = useState<"link" | "text" | "file">("link");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 state
  const [tasks, setTasks] = useState<TaskDraft[]>([]);

  // Step 3 state
  const [submitting, setSubmitting] = useState(false);

  const isQuest = campaignType === "quest";

  const endsAt = (() => {
    const hrs = customDuration ? parseInt(customDuration) : durationHours;
    if (!hrs || isNaN(hrs)) return "";
    return new Date(Date.now() + hrs * 3600000).toISOString();
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
    if (address.toLowerCase() !== partnerAddress.toLowerCase()) {
      toast.error("Connected wallet does not match this project");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_address: partnerAddress.toLowerCase(),
          title: title.trim(),
          description: description.trim(),
          image_url: imageUrl || undefined,
          campaign_type: campaignType,
          tier: "standard",
          xp_reward: xpReward,
          prize_details: campaignType === "bounty"
            ? { submission_type: submissionType, description: prizeDesc }
            : prizeDesc ? { description: prizeDesc } : {},
          winner_count: isQuest ? 0 : winnerCount,
          starts_at: new Date().toISOString(),
          ends_at: endsAt,
          tasks: [
            { type: "hold_based_id" as TaskType, params: {} },
            ...tasks,
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to create campaign"); return; }
      toast.success("Campaign created!");
      router.push(`/projects/${partnerAddress}`);
    } catch { toast.error("Something went wrong"); }
    finally { setSubmitting(false); }
  }

  const canProceedStep1 = title.trim().length >= 3 && (!!customDuration || durationHours > 0);

  if (!isConnected) return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center space-y-5 max-w-sm">
        <h1 className="text-white font-bold text-2xl" style={D}>Connect your wallet</h1>
        <p className="text-zinc-500 text-sm">Connect the wallet that owns this project to create campaigns.</p>
        <ConnectButton />
        <Link href={`/projects/${partnerAddress}`} className="block text-zinc-600 text-xs hover:text-zinc-400 transition-colors">← Back to project</Link>
      </div>
    </div>
  );

  if (address?.toLowerCase() !== partnerAddress.toLowerCase()) return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center space-y-4 max-w-sm">
        <h1 className="text-white font-bold text-xl" style={D}>Wrong wallet</h1>
        <p className="text-zinc-500 text-sm">Switch to the wallet that owns this project to create campaigns.</p>
        <p className="text-zinc-700 text-xs font-mono">{partnerAddress.slice(0, 6)}…{partnerAddress.slice(-4)}</p>
        <Link href={`/projects/${partnerAddress}`} className="block text-zinc-600 text-xs hover:text-zinc-400 transition-colors">← Back to project</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.05] bg-black/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href={`/projects/${partnerAddress}`} className="text-zinc-500 text-sm hover:text-white transition-colors">
            ← Back to project
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

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* ── STEP 1: Campaign details ── */}
        {step === 1 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-white font-black text-3xl" style={D}>Campaign details</h1>
              <p className="text-zinc-500 text-sm mt-1">Configure your campaign. It goes live immediately after creation.</p>
            </div>

            {/* Campaign type */}
            <div className="space-y-2">
              <FieldLabel label="Campaign type" required />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {CAMPAIGN_TYPES.map(t => {
                  const isSelected = campaignType === t.value;
                  const borderClass = isSelected
                    ? t.color === "green"  ? "border-green-500/40 bg-green-950/20"
                    : t.color === "purple" ? "border-purple-500/40 bg-purple-950/20"
                    : "border-blue-500/40 bg-blue-950/20"
                    : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14]";
                  return (
                    <button key={t.value} onClick={() => setCampaignType(t.value)}
                      className={`rounded-xl border p-4 text-left transition-all ${borderClass}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{t.icon}</span>
                        <span className={`font-bold text-sm ${isSelected ? "text-white" : "text-zinc-300"}`}>{t.label}</span>
                      </div>
                      <p className="text-zinc-600 text-[11px]">{t.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <FieldLabel label="Title" hint="Short and clear. Shown in the campaigns grid." required />
              <Input value={title} onChange={setTitle} maxLength={80}
                placeholder={CAMPAIGN_TYPES.find(t => t.value === campaignType)?.example.replace("e.g. ", "") ?? "Campaign title"} />
              {title.length < 10 && title.length > 0 && (
                <p className="text-amber-600 text-[11px] mt-1">A bit short — try to be more descriptive.</p>
              )}
            </div>

            {/* Description */}
            <div>
              <FieldLabel label="Description" hint="What do participants receive? Be specific — it builds trust." />
              <textarea value={description} onChange={e => setDesc(e.target.value)} rows={3}
                placeholder={isQuest
                  ? "Describe the quest. What tasks do users complete and what XP do they earn?"
                  : "Describe exactly what winners get, including any conditions or delivery timeline."}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 outline-none focus:border-blue-500/40 focus:bg-white/[0.05] transition-all resize-none" />
            </div>

            {/* Image */}
            <div>
              <FieldLabel label="Campaign image" hint="16:9 ratio works best. JPG, PNG, WebP or GIF. Max 5 MB." />
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageUpload} className="hidden" />
              {imageUrl ? (
                <div className="relative rounded-xl overflow-hidden aspect-[16/9] group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="Campaign image" className="w-full h-full object-cover" />
                  <button onClick={() => { setImageUrl(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/80 text-white flex items-center justify-center hover:bg-black transition-colors opacity-0 group-hover:opacity-100 text-sm">
                    ×
                  </button>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/80 text-white text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Replace
                  </button>
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

            {/* XP reward + (raffle: winner count + prize) */}
            <div className={`grid gap-6 ${isQuest ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
              <div>
                <FieldLabel label="XP reward" hint={isQuest ? "XP each completer earns" : "XP each entrant earns for participating"} required />
                <input type="number" min={0} max={10000} value={xpReward}
                  onChange={e => setXpReward(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500/40 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                <p className="text-zinc-700 text-[10px] mt-1">Multiplied by hunter rank (E=1× up to National=2.5×)</p>
              </div>

              {!isQuest && (
                <div>
                  <FieldLabel label="Number of winners" hint="How many wallets will be selected?" required />
                  <input type="number" min={1} max={10000} value={winnerCount}
                    onChange={e => setWinnerCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500/40 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                </div>
              )}
            </div>

            {campaignType === "bounty" && (
              <div>
                <FieldLabel label="Submission type" hint="What should hunters submit?" required />
                <div className="grid grid-cols-3 gap-2">
                  {([["link", "🔗 Link"], ["text", "📝 Text"], ["file", "📎 File"]] as const).map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setSubmissionType(v)}
                      className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        submissionType === v
                          ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
                          : "border-white/[0.08] text-zinc-400 hover:border-white/20"
                      }`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isQuest && (
              <div>
                <FieldLabel label="Prize summary" hint="One-line summary shown in listings (e.g. '1,000 $XYZ tokens', '5 free mints')" />
                <Input value={prizeDesc} onChange={setPrizeDesc} maxLength={60}
                  placeholder={campaignType === "bounty" ? "e.g. Best meme wins 500 XP" : "e.g. 1 free NFT mint per winner"} />
              </div>
            )}

            {/* Duration */}
            <div>
              <FieldLabel label="Duration" hint="How long will the campaign run?" required />
              <div className="flex gap-2 flex-wrap mb-2">
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
              <div className="relative max-w-xs">
                <input type="number" min={1} max={720} value={customDuration}
                  onChange={e => { setCustomDuration(e.target.value); setDurationHours(0); }}
                  placeholder="Custom hours"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-4 pr-10 py-2.5 text-white text-sm placeholder-zinc-700 outline-none focus:border-blue-500/40 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                <span className="absolute right-3 top-2.5 text-zinc-600 text-xs">hrs</span>
              </div>
              {endsAt && (
                <p className="text-zinc-600 text-[11px] mt-2">
                  Ends {new Date(endsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} UTC
                </p>
              )}
            </div>

            <button onClick={() => setStep(2)} disabled={!canProceedStep1}
              className="w-full py-4 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              Next: Entry requirements →
            </button>
          </div>
        )}

        {/* ── STEP 2: Tasks ── */}
        {step === 2 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-white font-black text-3xl" style={D}>Entry requirements</h1>
              <p className="text-zinc-500 text-sm mt-1">Tasks users must complete. Keep it simple — too many tasks reduce participation.</p>
            </div>

            {/* Always required */}
            <div className="rounded-xl border border-green-900/25 bg-green-950/[0.06] px-4 py-3 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5l2.5 2.5L9 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="flex-1">
                <p className="text-green-300 text-sm font-semibold">Hold a Based ID</p>
                <p className="text-zinc-600 text-xs">Automatically required — ensures all participants are verified Based ID holders</p>
              </div>
              <span className="text-zinc-700 text-[10px] flex-shrink-0">Always on</span>
            </div>

            {/* Optional tasks */}
            <div className="space-y-3">
              <p className="text-zinc-500 text-sm font-medium">Optional additional tasks</p>
              <p className="text-zinc-600 text-xs">Each task reduces participation slightly. 1–2 max is recommended.</p>

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
                Review & publish →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Review & publish ── */}
        {step === 3 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-white font-black text-3xl" style={D}>Review & publish</h1>
              <p className="text-zinc-500 text-sm mt-1">Your campaign goes live immediately after publishing.</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] divide-y divide-white/[0.05]">
              {[
                { label: "Title",       value: title },
                { label: "Type",        value: CAMPAIGN_TYPES.find(t => t.value === campaignType)?.label ?? campaignType },
                { label: "XP reward",   value: `${xpReward} XP (×rank multiplier)` },
                ...(!isQuest ? [
                  { label: "Winners",   value: `${winnerCount}` },
                  { label: "Prize",     value: prizeDesc || "—" },
                ] : []),
                { label: "Duration",    value: endsAt ? `Until ${new Date(endsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} UTC` : "—" },
                { label: "Tasks",       value: `Hold Based ID${tasks.length > 0 ? ` + ${tasks.length} more` : ""}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3">
                  <span className="text-zinc-500 text-sm">{label}</span>
                  <span className="text-white text-sm font-medium">{value}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-green-900/20 bg-green-950/[0.06] p-4 flex items-start gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Campaigns are free and go live immediately. They appear in <strong className="text-zinc-300">/campaigns</strong> and your project page. You can draw winners once the campaign ends.
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-6 py-3.5 rounded-xl border border-white/[0.08] text-zinc-400 text-sm font-medium hover:bg-white/[0.04] transition-colors">
                ← Back
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                {submitting ? "Publishing…" : "Publish campaign →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
