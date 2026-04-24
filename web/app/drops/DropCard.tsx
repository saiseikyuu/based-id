import Link from "next/link";
import type { Drop } from "@/lib/supabase";

const TYPE_LABELS: Record<string, string> = {
  whitelist:  "Whitelist",
  raffle:     "Raffle",
  token_drop: "Token Drop",
  nft_mint:   "NFT Mint",
};

const TYPE_COLORS: Record<string, string> = {
  whitelist:  "text-green-400  border-green-900/30  bg-green-950/20",
  raffle:     "text-amber-400  border-amber-900/30  bg-amber-950/20",
  token_drop: "text-blue-400   border-blue-900/30   bg-blue-950/20",
  nft_mint:   "text-purple-300 border-purple-900/30 bg-purple-950/20",
};

function TimeLeft({ endsAt }: { endsAt: string }) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return <span className="text-zinc-600 text-[10px]">Ended</span>;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  if (d > 0) return <span className="text-zinc-400 text-[10px] tabular-nums">{d}d {h}h left</span>;
  const m = Math.floor((diff % 3600000) / 60000);
  return <span className="text-amber-400 text-[10px] tabular-nums">{h}h {m}m left</span>;
}

export function DropCard({ drop, featured = false }: { drop: Drop; featured?: boolean }) {
  const typeColor = TYPE_COLORS[drop.type] ?? TYPE_COLORS.raffle;
  const taskCount = drop.tasks?.length ?? 0;

  return (
    <Link href={`/drops/${drop.id}`} className="group block">
      <div className={`relative rounded-2xl border overflow-hidden transition-all duration-200 h-full flex flex-col
        ${featured
          ? "border-amber-500/25 bg-gradient-to-br from-amber-950/[0.12] to-transparent hover:border-amber-500/40"
          : "border-white/[0.07] bg-white/[0.015] hover:border-white/[0.14] hover:bg-white/[0.025]"
        }`}
      >
        {featured && (
          <div className="absolute top-3 right-3 z-10">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Featured
            </span>
          </div>
        )}

        {/* Image or gradient placeholder */}
        <div className="relative h-36 overflow-hidden flex-shrink-0">
          {drop.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={drop.image_url} alt={drop.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-950/50 via-zinc-900 to-zinc-950 flex items-center justify-center">
              <span className="text-zinc-700 text-5xl font-black" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
                {drop.title.slice(0, 1).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-3 flex-1">
          {/* Type badge + timer */}
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border ${typeColor}`}>
              {TYPE_LABELS[drop.type] ?? drop.type}
            </span>
            <TimeLeft endsAt={drop.ends_at} />
          </div>

          {/* Title */}
          <h3 className="text-white font-bold text-base leading-tight group-hover:text-blue-200 transition-colors" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
            {drop.title}
          </h3>

          {/* Description */}
          {drop.description && (
            <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2">{drop.description}</p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-white/[0.05]">
            <div className="flex items-center gap-3 text-[10px] text-zinc-600">
              <span>{drop.winner_count} winner{drop.winner_count !== 1 ? "s" : ""}</span>
              {taskCount > 0 && (
                <>
                  <span>·</span>
                  <span>{taskCount} task{taskCount !== 1 ? "s" : ""}</span>
                </>
              )}
            </div>
            <span className="text-blue-400 text-[11px] font-medium group-hover:text-blue-300 transition-colors">
              Enter →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
