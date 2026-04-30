"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Squad, SquadMember } from "@/lib/supabase";

const D    = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const BODY = { fontFamily: "var(--font-sans), system-ui, sans-serif" };

export function SquadCard({ address }: { address: string }) {
  const [squad,  setSquad]  = useState<Squad | null>(null);
  const [member, setMember] = useState<SquadMember | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/hunters/squad?wallet=${address.toLowerCase()}`)
      .then(r => r.json())
      .then(d => { setSquad(d.squad ?? null); setMember(d.member ?? null); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [address]);

  if (!loaded) return (
    <div className="bg-white rounded-2xl p-6 h-32 animate-pulse"
      style={{ border: "1px solid rgba(0,0,0,0.06)" }} />
  );

  if (!squad) {
    return (
      <div className="bg-white rounded-2xl p-6 space-y-4"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}>
        <p className="text-black font-bold text-sm" style={D}>Squad</p>
        <div className="flex flex-col items-center justify-center py-6 space-y-3 text-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <p className="text-gray-400 text-xs" style={BODY}>Not in a squad</p>
          <Link href="/squads"
            className="text-xs font-bold text-black border border-black/[0.1] px-3 py-1.5 rounded-lg hover:bg-black/[0.03] transition-colors" style={BODY}>
            Browse Squads →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 space-y-4"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}>
      <p className="text-black font-bold text-sm" style={D}>Squad</p>
      <Link href={`/squads/${squad.id}`} className="flex items-center gap-3 group">
        <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-xl font-black overflow-hidden"
          style={{ background: "#f3f4f6", border: "1px solid rgba(0,0,0,0.07)", ...D }}>
          {squad.logo_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={squad.logo_url} alt={squad.name} className="w-full h-full object-cover" />
            : squad.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-black font-black text-base group-hover:text-blue-600 transition-colors truncate" style={D}>{squad.name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            {squad.region && <span className="text-gray-400 text-xs" style={BODY}>📍 {squad.region}</span>}
            <span className="text-gray-400 text-xs" style={BODY}>{squad.member_count} members</span>
          </div>
        </div>
      </Link>
      <div className="flex items-center justify-between pt-2 border-t border-black/[0.06]">
        <span className="text-gray-400 text-xs capitalize" style={BODY}>
          Role: <span className="text-black font-medium">{member?.role ?? "member"}</span>
        </span>
        <span className="text-xs font-bold tabular-nums" style={{ color: "#0052FF", ...BODY }}>
          {(member?.contribution_xp ?? 0).toLocaleString()} contribution XP
        </span>
      </div>
    </div>
  );
}
