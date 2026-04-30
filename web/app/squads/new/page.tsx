"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Nav } from "@/app/components/Nav";
import { MobileNav } from "@/app/components/MobileNav";
import Link from "next/link";
import toast from "react-hot-toast";

const D    = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const BODY = { fontFamily: "var(--font-sans), system-ui, sans-serif" };

const SQUAD_TYPES = [
  { value: "general",  label: "General",  desc: "Open to all hunters" },
  { value: "regional", label: "Regional", desc: "City or country-based" },
  { value: "skill",    label: "Skill",    desc: "Focused on a specific skill" },
  { value: "project",  label: "Project",  desc: "Built around a project" },
];

function Input({ value, onChange, placeholder, maxLength }: {
  value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number;
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className="w-full border border-black/[0.1] rounded-xl px-4 py-3 text-black text-sm placeholder-gray-300 outline-none focus:border-black/30 transition-all"
      style={BODY}
    />
  );
}

export default function CreateSquadPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [region,      setRegion]      = useState("");
  const [type,        setType]        = useState("general");
  const [submitting,  setSubmitting]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address || !name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/squads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: address,
          name:           name.trim(),
          description:    description.trim() || undefined,
          region:         region.trim() || undefined,
          type,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Squad created!");
        router.push(`/squads/${data.squad.id}`);
      } else {
        toast.error(data.error ?? "Failed to create squad");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <MobileNav />

      <div className="max-w-lg mx-auto px-6 py-12 pb-28">
        <div className="mb-8">
          <Link href="/squads" className="text-gray-400 text-xs hover:text-black transition-colors" style={BODY}>
            ← Squads
          </Link>
          <h1 className="font-black text-4xl text-black mt-3" style={D}>Create Squad</h1>
          <p className="text-gray-400 text-sm mt-1" style={BODY}>Build a team, earn XP together, climb the leaderboard.</p>
        </div>

        {!isConnected ? (
          <div className="rounded-2xl border border-black/[0.07] p-10 text-center space-y-4">
            <p className="text-black font-semibold text-sm" style={BODY}>Connect your wallet to create a squad</p>
            <ConnectButton />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Squad type */}
            <div className="space-y-2">
              <label className="text-black text-sm font-semibold" style={BODY}>Squad type</label>
              <div className="grid grid-cols-2 gap-2">
                {SQUAD_TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => setType(t.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      type === t.value
                        ? "border-black bg-black text-white"
                        : "border-black/[0.1] hover:border-black/30"
                    }`}>
                    <p className="font-bold text-sm" style={D}>{t.label}</p>
                    <p className={`text-xs mt-0.5 ${type === t.value ? "text-white/60" : "text-gray-400"}`} style={BODY}>{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="text-black text-sm font-semibold" style={BODY}>
                Squad name <span className="text-red-400">*</span>
              </label>
              <Input value={name} onChange={setName} placeholder="e.g. Base Philippines" maxLength={40} />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-black text-sm font-semibold" style={BODY}>Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What is your squad about?"
                rows={3}
                maxLength={200}
                className="w-full border border-black/[0.1] rounded-xl px-4 py-3 text-black text-sm placeholder-gray-300 outline-none focus:border-black/30 transition-all resize-none"
                style={BODY}
              />
            </div>

            {/* Region */}
            <div className="space-y-2">
              <label className="text-black text-sm font-semibold" style={BODY}>Region</label>
              <Input value={region} onChange={setRegion} placeholder="e.g. Philippines, NYC, Southeast Asia" maxLength={50} />
            </div>

            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="w-full py-4 rounded-xl bg-black text-white font-black text-sm disabled:opacity-40 hover:bg-zinc-800 transition-colors"
              style={D}>
              {submitting ? "Creating…" : "Create Squad"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
