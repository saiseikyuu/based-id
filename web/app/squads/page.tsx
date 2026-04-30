import { createServerClient, type Squad } from "@/lib/supabase";
import { Nav } from "@/app/components/Nav";
import { MobileNav } from "@/app/components/MobileNav";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Squads — Based ID",
  description: "Join a squad, compete on regional leaderboards, and earn XP together.",
};

const D    = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const BODY = { fontFamily: "var(--font-sans), system-ui, sans-serif" };

const TYPE_LABELS: Record<string, string> = {
  general: "General", regional: "Regional", skill: "Skill", project: "Project",
};

function SquadCard({ squad, rank }: { squad: Squad; rank: number }) {
  const rankColors = ["#fbbf24", "#d1d5db", "#b87333"];
  return (
    <Link href={`/squads/${squad.id}`}
      className="block rounded-2xl border border-black/[0.07] bg-white p-5 hover:shadow-md transition-all hover:-translate-y-0.5"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div className="flex items-start gap-4">
        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-black text-base"
          style={{ ...D, color: rank <= 3 ? rankColors[rank - 1] : "#d1d5db", background: "rgba(0,0,0,0.03)" }}>
          {rank}
        </div>
        <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-xl font-black overflow-hidden"
          style={{ background: "#f3f4f6", border: "1px solid rgba(0,0,0,0.07)", ...D }}>
          {squad.logo_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={squad.logo_url} alt={squad.name} className="w-full h-full object-cover" />
            : squad.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-black font-black text-base truncate" style={D}>{squad.name}</p>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/[0.04] text-gray-500" style={BODY}>
              {TYPE_LABELS[squad.type] ?? squad.type}
            </span>
          </div>
          {squad.region && (
            <p className="text-gray-400 text-xs mt-0.5" style={BODY}>📍 {squad.region}</p>
          )}
          {squad.description && (
            <p className="text-gray-500 text-xs mt-1 line-clamp-1" style={BODY}>{squad.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2">
            <span className="text-[11px] text-gray-400" style={BODY}>
              <span className="font-bold text-black">{squad.member_count}</span> members
            </span>
            <span className="text-[11px] text-gray-400" style={BODY}>
              <span className="font-bold tabular-nums" style={{ color: "#0052FF" }}>{squad.total_xp.toLocaleString()}</span> XP
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

async function getSquads(): Promise<Squad[]> {
  try {
    const db = createServerClient();
    const { data } = await db.from("squads").select("*").order("total_xp", { ascending: false });
    return (data ?? []) as Squad[];
  } catch { return []; }
}

export default async function SquadsPage() {
  const squads = await getSquads();

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <MobileNav />

      {/* Hero */}
      <div className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="space-y-3 max-w-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/30" style={D}>Phase 2</p>
            <h1 className="font-black text-6xl sm:text-7xl uppercase tracking-tight leading-none" style={D}>Squads</h1>
            <p className="text-white/50 text-base leading-relaxed" style={BODY}>
              Join a squad, earn XP together, and compete on regional and global leaderboards.
            </p>
          </div>
          <div className="mt-8">
            <Link href="/squads/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-sm font-bold hover:bg-gray-100 transition-colors" style={BODY}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Create Squad
            </Link>
          </div>
        </div>
      </div>

      {/* Squad list */}
      <div className="max-w-7xl mx-auto px-6 py-12 pb-28 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-2xl text-black" style={D}>
            Global Leaderboard
            <span className="text-gray-300 font-medium text-lg ml-3">{squads.length}</span>
          </h2>
        </div>

        {squads.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {squads.map((squad, i) => (
              <SquadCard key={squad.id} squad={squad} rank={i + 1} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-black/[0.07] bg-gray-50 px-8 py-20 text-center space-y-4">
            <p className="font-black text-2xl text-black" style={D}>No squads yet</p>
            <p className="text-gray-400 text-sm" style={BODY}>Be the first to create a squad on Based ID.</p>
            <Link href="/squads/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white text-sm font-bold hover:bg-zinc-800 transition-colors" style={BODY}>
              Create the first squad →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
