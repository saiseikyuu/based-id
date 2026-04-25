import Link from "next/link";
import type { Drop } from "@/lib/supabase";

const TYPE_LABELS: Record<string, string> = {
  whitelist: "Whitelist", raffle: "Raffle", token_drop: "Token Drop", nft_mint: "NFT Mint",
};

function TimeLeft({ endsAt }: { endsAt: string }) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return <span className="text-zinc-600 text-xs">Ended</span>;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return <span className="text-zinc-400 text-xs tabular-nums">{d}d {h}h left</span>;
  return <span className="text-amber-400 text-xs tabular-nums">{h}h {m}m left</span>;
}

export function DropCard({ drop, featured = false }: { drop: Drop; featured?: boolean }) {
  const taskCount = drop.tasks?.length ?? 0;
  const DISPLAY   = { fontFamily: "var(--font-display), system-ui, sans-serif" };

  return (
    <Link href={`/drops/${drop.id}`} className="group block h-full">
      <div className={`rounded-2xl border overflow-hidden h-full flex flex-col transition-all duration-200 ${
        featured
          ? "border-amber-500/20 hover:border-amber-500/35"
          : "border-white/[0.08] hover:border-white/[0.14]"
      }`}>
        {/* Image — fixed aspect ratio so all cards match */}
        <div className="relative aspect-[16/9] overflow-hidden flex-shrink-0 bg-zinc-950">
          {drop.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={drop.image_url} alt={drop.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-zinc-800 font-black text-6xl" style={DISPLAY}>{drop.title.slice(0, 1).toUpperCase()}</span>
            </div>
          )}
          {featured && (
            <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-[0.12em] px-2 py-1 rounded-full bg-black/60 text-amber-300 border border-amber-500/30 backdrop-blur-sm">
              Featured
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-3 flex-1 bg-white/[0.01]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-zinc-500 font-medium">{TYPE_LABELS[drop.type] ?? drop.type}</span>
            <TimeLeft endsAt={drop.ends_at} />
          </div>
          <h3 className="text-white font-bold text-base leading-tight group-hover:text-zinc-200 transition-colors" style={DISPLAY}>
            {drop.title}
          </h3>
          {drop.description && <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2">{drop.description}</p>}
          <div className="mt-auto pt-3 border-t border-white/[0.05] space-y-2.5">
            {/* Project attribution */}
            {drop.project && (
              <div className="flex items-center gap-2">
                {drop.project.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={drop.project.logo_url} alt={drop.project.name} className="w-4 h-4 rounded-md object-cover flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-md bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <span className="text-zinc-500 text-[8px] font-bold">{drop.project.name.slice(0, 1).toUpperCase()}</span>
                  </div>
                )}
                <span className="text-zinc-500 text-xs truncate">{drop.project.name}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-zinc-600">
                <span>{drop.winner_count} winner{drop.winner_count !== 1 ? "s" : ""}</span>
                {taskCount > 0 && <><span>·</span><span>{taskCount} task{taskCount !== 1 ? "s" : ""}</span></>}
              </div>
              <span className="text-blue-400 text-xs font-medium group-hover:text-blue-300 transition-colors">Enter →</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
