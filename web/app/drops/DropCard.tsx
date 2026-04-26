import Link from "next/link";
import type { Drop } from "@/lib/supabase";

const TYPE_COLORS: Record<string, { label: string; cls: string }> = {
  whitelist:  { label: "Whitelist",   cls: "text-violet-300 bg-violet-500/10 border-violet-500/20" },
  raffle:     { label: "Raffle",      cls: "text-blue-300   bg-blue-500/10   border-blue-500/20"   },
  token_drop: { label: "Token Drop",  cls: "text-amber-300  bg-amber-500/10  border-amber-500/20"  },
  nft_mint:   { label: "NFT Mint",    cls: "text-green-300  bg-green-500/10  border-green-500/20"  },
};

function timeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return { label: "Ended", urgent: false, ended: true };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const d = Math.floor(h / 24);
  if (d > 1) return { label: `${d}d left`, urgent: false, ended: false };
  if (h >= 1) return { label: `${h}h ${m}m left`, urgent: h < 6, ended: false };
  return { label: `${m}m left`, urgent: true, ended: false };
}

export function DropCard({ drop, featured = false }: { drop: Drop; featured?: boolean }) {
  const taskCount = drop.tasks?.length ?? 0;
  const type      = TYPE_COLORS[drop.type] ?? { label: drop.type, cls: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20" };
  const time      = timeLeft(drop.ends_at);

  return (
    <Link href={`/drops/${drop.id}`} className="group block">
      <div className={`relative rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col h-full ${
        featured
          ? "border-amber-500/25 hover:border-amber-500/50 hover:shadow-[0_0_40px_-8px_rgba(245,158,11,0.15)]"
          : "border-white/[0.07] hover:border-white/[0.15] hover:shadow-[0_0_40px_-8px_rgba(255,255,255,0.06)]"
      }`}>

        {/* Banner */}
        <div className="relative aspect-[16/9] overflow-hidden bg-zinc-950 flex-shrink-0">
          {drop.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={drop.image_url}
              alt={drop.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950">
              <span className="text-zinc-700 font-black text-7xl select-none">
                {drop.title.slice(0, 1).toUpperCase()}
              </span>
            </div>
          )}

          {/* Bottom image gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

          {/* Top badges */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full border backdrop-blur-sm ${type.cls}`}>
              {type.label}
            </span>
            <div className="flex items-center gap-1.5">
              {featured && (
                <span className="text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full bg-amber-500/90 text-black backdrop-blur-sm">
                  Featured
                </span>
              )}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm border ${
                time.ended
                  ? "bg-zinc-900/80 border-zinc-700/50 text-zinc-500"
                  : time.urgent
                  ? "bg-red-900/70 border-red-500/30 text-red-300"
                  : "bg-black/60 border-white/[0.1] text-zinc-300"
              }`}>
                {time.label}
              </span>
            </div>
          </div>

          {/* Project logo — bottom left of image */}
          {drop.project && (
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg overflow-hidden border border-white/[0.15] bg-zinc-900 flex-shrink-0">
                {drop.project.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={drop.project.logo_url} alt={drop.project.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-zinc-400 font-bold text-xs">
                    {drop.project.name.slice(0, 1)}
                  </span>
                )}
              </div>
              <span className="text-white/70 text-[11px] font-medium drop-shadow-sm">{drop.project.name}</span>
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="p-4 flex flex-col gap-3 flex-1 bg-zinc-950/80">
          <h3 className="text-white font-bold text-[15px] leading-snug group-hover:text-zinc-100 transition-colors line-clamp-2">
            {drop.title}
          </h3>

          {/* Stats row */}
          <div className="flex items-center gap-3 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              {drop.winner_count} winner{drop.winner_count !== 1 ? "s" : ""}
            </span>
            {taskCount > 0 && (
              <>
                <span className="w-px h-3 bg-white/[0.08]" />
                <span className="flex items-center gap-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  {taskCount} task{taskCount !== 1 ? "s" : ""}
                </span>
              </>
            )}
            {(drop.entry_count ?? 0) > 0 && (
              <>
                <span className="w-px h-3 bg-white/[0.08]" />
                <span>{(drop.entry_count ?? 0).toLocaleString()} entries</span>
              </>
            )}
          </div>

          {/* Enter button */}
          <button className={`mt-auto w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
            time.ended
              ? "bg-white/[0.04] text-zinc-600 cursor-default"
              : featured
              ? "bg-amber-500/90 hover:bg-amber-400 text-black"
              : "bg-white/[0.07] hover:bg-white/[0.12] text-white border border-white/[0.08] hover:border-white/[0.16]"
          }`}>
            {time.ended ? "Ended" : "Enter →"}
          </button>
        </div>
      </div>
    </Link>
  );
}
