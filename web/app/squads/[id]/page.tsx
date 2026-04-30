import { createServerClient } from "@/lib/supabase";
import { Nav } from "@/app/components/Nav";
import { MobileNav } from "@/app/components/MobileNav";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { SquadActions } from "./SquadActions";

export const revalidate = 30;

const D    = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const BODY = { fontFamily: "var(--font-sans), system-ui, sans-serif" };

const RANK_COLORS = ["#94a3b8","#a3e635","#34d399","#60a5fa","#c084fc","#f97316","#fcd34d"];
const RANK_LABELS = ["E","D","C","B","A","S","N"];
const THRESHOLDS  = [0, 300, 800, 2000, 5000, 12000, 30000];

function getRankIdx(xp: number) {
  let r = 0;
  for (let i = THRESHOLDS.length - 1; i >= 0; i--) { if (xp >= THRESHOLDS[i]) { r = i; break; } }
  return r;
}

function shortAddr(a: string) { return `${a.slice(0, 6)}…${a.slice(-4)}`; }

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const db = createServerClient();
  const { data } = await db.from("squads").select("name, description").eq("id", id).single();
  if (!data) return { title: "Squad not found" };
  return { title: `${data.name} — Based ID Squads`, description: data.description ?? "" };
}

export default async function SquadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createServerClient();

  const [{ data: squad }, { data: members }, { data: xpRows }] = await Promise.all([
    db.from("squads").select("*").eq("id", id).single(),
    db.from("squad_members").select("*").eq("squad_id", id).order("contribution_xp", { ascending: false }),
    db.from("hunter_xp").select("wallet_address, total_xp"),
  ]);

  if (!squad) notFound();

  const xpMap = Object.fromEntries((xpRows ?? []).map(r => [r.wallet_address, r.total_xp]));
  const membersWithXp = (members ?? []).map(m => ({
    ...m,
    total_xp: xpMap[m.wallet_address] ?? 0,
  }));
  const memberWallets = (members ?? []).map(m => m.wallet_address);

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <MobileNav />

      {/* Hero */}
      <div className="bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <Link href="/squads" className="text-white/30 text-xs hover:text-white/60 transition-colors mb-6 inline-block" style={BODY}>
            ← Squads
          </Link>
          <div className="flex items-start gap-6 flex-wrap">
            <div className="w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl font-black overflow-hidden"
              style={{ background: "rgba(255,255,255,0.08)", ...D }}>
              {squad.logo_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={squad.logo_url} alt={squad.name} className="w-full h-full object-cover" />
                : squad.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <h1 className="font-black text-4xl text-white" style={D}>{squad.name}</h1>
              <div className="flex items-center gap-3 flex-wrap text-sm">
                <span className="text-white/40 capitalize" style={BODY}>{squad.type}</span>
                {squad.region && <span className="text-white/40" style={BODY}>📍 {squad.region}</span>}
                <span className="font-bold tabular-nums" style={{ color: "#0052FF", ...BODY }}>{squad.total_xp.toLocaleString()} XP</span>
                <span className="text-white/40" style={BODY}>{squad.member_count} members</span>
              </div>
              {squad.description && (
                <p className="text-white/50 text-sm leading-relaxed max-w-lg" style={BODY}>{squad.description}</p>
              )}
            </div>
            <div className="flex-shrink-0">
              <SquadActions squadId={squad.id} ownerWallet={squad.owner_wallet} memberWallets={memberWallets} />
            </div>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="max-w-4xl mx-auto px-6 py-10 pb-28 space-y-6">
        <h2 className="font-black text-xl text-black" style={D}>
          Members <span className="text-gray-300 font-medium text-lg">{squad.member_count}</span>
        </h2>

        <div className="rounded-2xl border border-black/[0.07] overflow-hidden"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          {membersWithXp.length > 0 ? membersWithXp.map((m, i) => {
            const rankIdx = getRankIdx(m.total_xp);
            return (
              <Link key={m.wallet_address} href={`/profile/${m.wallet_address}`}
                className={`flex items-center gap-4 px-5 py-4 hover:bg-black/[0.02] transition-colors ${i > 0 ? "border-t border-black/[0.05]" : ""}`}>
                <span className="text-gray-300 text-sm font-bold w-6 tabular-nums text-right flex-shrink-0" style={D}>{i + 1}</span>
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-black"
                  style={{ background: `${RANK_COLORS[rankIdx]}15`, border: `1px solid ${RANK_COLORS[rankIdx]}30`, color: RANK_COLORS[rankIdx], ...D }}>
                  {RANK_LABELS[rankIdx]}
                </div>
                <span className="flex-1 text-black text-sm font-mono truncate" style={BODY}>
                  {shortAddr(m.wallet_address)}
                </span>
                {m.role !== "member" && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/[0.04] text-gray-400" style={BODY}>
                    {m.role}
                  </span>
                )}
                <span className="text-xs font-bold tabular-nums flex-shrink-0" style={{ color: "#0052FF", ...BODY }}>
                  {m.contribution_xp.toLocaleString()} XP
                </span>
              </Link>
            );
          }) : (
            <div className="px-5 py-10 text-center text-gray-400 text-sm" style={BODY}>No members yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
