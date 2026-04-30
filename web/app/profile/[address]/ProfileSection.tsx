"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import type { HunterProfile } from "@/lib/supabase";
import { HUNTER_SKILLS, HUNTER_SKILL_LABELS } from "@/lib/supabase";

const D    = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const BODY = { fontFamily: "var(--font-sans), system-ui, sans-serif" };

function ProfileReadView({ profile }: { profile: HunterProfile | null }) {
  if (!profile || (!profile.skills.length && !profile.region && profile.availability === "not_looking")) {
    return <p className="text-gray-400 text-sm" style={BODY}>No profile info added yet.</p>;
  }
  return (
    <div className="space-y-3">
      {profile.availability !== "not_looking" && (
        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
          profile.availability === "available"
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-yellow-50 text-yellow-700 border border-yellow-200"
        }`} style={BODY}>
          {profile.availability === "available" ? "Open to work" : "Open to offers"}
        </span>
      )}
      {profile.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {profile.skills.map(s => (
            <span key={s} className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium" style={BODY}>
              {HUNTER_SKILL_LABELS[s as keyof typeof HUNTER_SKILL_LABELS] ?? s}
            </span>
          ))}
        </div>
      )}
      {profile.region && (
        <p className="text-gray-500 text-sm" style={BODY}>📍 {profile.region}</p>
      )}
      {profile.portfolio_links?.length > 0 && (
        <div className="space-y-1">
          {profile.portfolio_links.map(l => (
            <a key={l} href={l} target="_blank" rel="noopener noreferrer"
              className="block text-blue-600 text-xs hover:underline truncate" style={BODY}>
              {l}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileEditForm({
  profile, walletAddress, onSave, onCancel,
}: {
  profile: HunterProfile | null;
  walletAddress: string;
  onSave: (p: HunterProfile) => void;
  onCancel: () => void;
}) {
  const [skills,   setSkills]   = useState<string[]>(profile?.skills ?? []);
  const [avail,    setAvail]    = useState<"available" | "open_to_offers" | "not_looking">(profile?.availability ?? "not_looking");
  const [region,   setRegion]   = useState(profile?.region ?? "");
  const [links,    setLinks]    = useState<string[]>(
    profile?.portfolio_links?.length ? [...profile.portfolio_links, "", ""].slice(0, 3) : ["", "", ""]
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const toggleSkill = (s: string) =>
    setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/hunters/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address:  walletAddress,
          skills,
          availability:    avail,
          region:          region.trim() || null,
          portfolio_links: links.filter(l => l.trim().startsWith("http")),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Save failed"); return; }
      onSave(data.profile);
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Availability */}
      <div className="space-y-2">
        <label className="text-gray-500 text-xs font-medium uppercase tracking-wider" style={BODY}>Availability</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: "available",      l: "Open to work"   },
            { v: "open_to_offers", l: "Open to offers" },
            { v: "not_looking",    l: "Not looking"    },
          ].map(({ v, l }) => (
            <button key={v} type="button" onClick={() => setAvail(v as "available" | "open_to_offers" | "not_looking")}
              className={`py-2 rounded-xl border text-xs font-medium transition-all ${
                avail === v
                  ? "border-blue-400 bg-blue-50 text-blue-700"
                  : "border-black/[0.08] text-gray-500 hover:border-black/20"
              }`} style={BODY}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Skills */}
      <div className="space-y-2">
        <label className="text-gray-500 text-xs font-medium uppercase tracking-wider" style={BODY}>Skills</label>
        <div className="flex flex-wrap gap-1.5">
          {HUNTER_SKILLS.map(s => (
            <button key={s} type="button" onClick={() => toggleSkill(s)}
              className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
                skills.includes(s)
                  ? "border-blue-400 bg-blue-50 text-blue-700"
                  : "border-black/[0.08] text-gray-400 hover:border-black/20"
              }`} style={BODY}>
              {HUNTER_SKILL_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Region */}
      <div className="space-y-2">
        <label className="text-gray-500 text-xs font-medium uppercase tracking-wider" style={BODY}>Region</label>
        <input value={region} onChange={e => setRegion(e.target.value)}
          placeholder="e.g. Philippines, NYC, London"
          className="w-full border border-black/[0.08] rounded-xl px-4 py-2.5 text-black text-sm placeholder-gray-300 outline-none focus:border-blue-400 transition-all" />
      </div>

      {/* Portfolio links */}
      <div className="space-y-2">
        <label className="text-gray-500 text-xs font-medium uppercase tracking-wider" style={BODY}>Portfolio Links (up to 3)</label>
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <input key={i}
              value={links[i] ?? ""}
              onChange={e => setLinks(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
              placeholder="https://..."
              className="w-full border border-black/[0.08] rounded-xl px-4 py-2.5 text-black text-sm placeholder-gray-300 outline-none focus:border-blue-400 transition-all" />
          ))}
        </div>
      </div>

      {error && <p className="text-red-500 text-xs" style={BODY}>{error}</p>}

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-black text-white text-sm font-bold disabled:opacity-50 hover:bg-zinc-800 transition-colors" style={BODY}>
          {saving ? "Saving…" : "Save Profile"}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-black/[0.08] text-gray-500 text-sm hover:text-black hover:border-black/20 transition-colors" style={BODY}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function ProfileSection({
  address, initialProfile,
}: {
  address: string;
  initialProfile: HunterProfile | null;
}) {
  const { address: connectedAddress } = useAccount();
  const isOwner = connectedAddress?.toLowerCase() === address.toLowerCase();
  const [profile,  setProfile]  = useState<HunterProfile | null>(initialProfile);
  const [editing,  setEditing]  = useState(false);

  return (
    <div className="bg-white rounded-2xl p-6 space-y-4"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}>
      <div className="flex items-center justify-between">
        <p className="text-black font-bold text-sm" style={D}>Hunter Profile</p>
        {isOwner && !editing && (
          <button onClick={() => setEditing(true)}
            className="text-xs text-gray-400 hover:text-black transition-colors border border-black/[0.08] px-3 py-1.5 rounded-lg" style={BODY}>
            Edit
          </button>
        )}
      </div>

      {editing && isOwner ? (
        <ProfileEditForm
          profile={profile}
          walletAddress={address}
          onSave={p => { setProfile(p); setEditing(false); }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <ProfileReadView profile={profile} />
      )}
    </div>
  );
}
