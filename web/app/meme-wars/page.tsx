import { createServerClient, type MemeWar } from "@/lib/supabase";
import { Nav } from "@/app/components/Nav";
import { MobileNav } from "@/app/components/MobileNav";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 30;
export const metadata: Metadata = {
  title: "Meme Wars — Based ID",
  description: "Submit memes, vote with USDC, win prizes.",
};

const D    = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const BODY = { fontFamily: "var(--font-sans), system-ui, sans-serif" };

function timeLeft(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  return d > 0 ? `${d}d left` : `${h}h left`;
}

function WarCard({ war }: { war: MemeWar }) {
  const ended = new Date(war.ends_at) <= new Date();
  return (
    <Link href={`/meme-wars/${war.id}`}
      className="block rounded-2xl border border-black/[0.07] bg-white p-5 hover:shadow-md transition-all hover:-translate-y-0.5"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-black font-black text-lg truncate" style={D}>{war.title}</p>
          {war.theme && <p className="text-gray-400 text-xs truncate" style={BODY}>🎨 {war.theme}</p>}
        </div>
        <span className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
          ended
            ? "bg-gray-100 text-gray-400"
            : "bg-green-50 text-green-700 border border-green-200"
        }`} style={BODY}>
          {ended ? "Ended" : "Live"}
        </span>
      </div>
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-black/[0.05]">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider" style={BODY}>Prize Pool</p>
          <p className="font-black text-base" style={{ ...D, color: "#0052FF" }}>${war.prize_pool_usdc} USDC</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider" style={BODY}>Vote Cost</p>
          <p className="font-black text-base text-black" style={D}>${war.vote_cost_usdc}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider" style={BODY}>Time</p>
          <p className="font-bold text-sm text-black" style={BODY}>{timeLeft(war.ends_at)}</p>
        </div>
      </div>
    </Link>
  );
}

async function getWars(status: string): Promise<MemeWar[]> {
  try {
    const db = createServerClient();
    const { data } = await db.from("meme_wars").select("*").eq("status", status).order("created_at", { ascending: false });
    return (data ?? []) as MemeWar[];
  } catch { return []; }
}

export default async function MemeWarsPage() {
  const [activeWars, settledWars] = await Promise.all([getWars("active"), getWars("settled")]);

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <MobileNav />

      <div style={{ background: "#0a0a0a" }} className="text-white">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="space-y-3 max-w-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/30" style={D}>Phase 2</p>
            <h1 className="font-black text-6xl sm:text-7xl uppercase tracking-tight leading-none" style={D}>Meme Wars</h1>
            <p className="text-white/50 text-base leading-relaxed" style={BODY}>
              Submit your best meme. Vote with USDC. Top hunters split the prize pool.
            </p>
          </div>
          <div className="flex items-center gap-4 mt-8 flex-wrap">
            <div className="bg-white/[0.06] rounded-xl px-4 py-2.5">
              <p className="text-white/30 text-[10px] uppercase tracking-wider" style={BODY}>Payout split</p>
              <p className="text-white font-bold text-sm" style={D}>1st 70% · 2nd 20% · 3rd 10%</p>
            </div>
            <div className="bg-white/[0.06] rounded-xl px-4 py-2.5">
              <p className="text-white/30 text-[10px] uppercase tracking-wider" style={BODY}>Platform fee</p>
              <p className="text-white font-bold text-sm" style={D}>5% of vote pool</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 pb-28 space-y-12">
        <div className="space-y-4">
          <h2 className="font-black text-2xl text-black" style={D}>
            Active Wars <span className="text-gray-300 font-medium text-lg">{activeWars.length}</span>
          </h2>
          {activeWars.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeWars.map(war => <WarCard key={war.id} war={war} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-black/[0.07] bg-gray-50 px-8 py-16 text-center space-y-3">
              <p className="font-black text-2xl text-black" style={D}>No active wars</p>
              <p className="text-gray-400 text-sm" style={BODY}>Check back soon — wars are created by projects and the platform.</p>
            </div>
          )}
        </div>

        {settledWars.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-black text-xl text-black" style={D}>
              Past Wars <span className="text-gray-300 font-medium text-base">{settledWars.length}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {settledWars.map(war => <WarCard key={war.id} war={war} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
