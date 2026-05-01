import { createServerClient, type MemeWar, type MemeEntry } from "@/lib/supabase";
import { Nav } from "@/app/components/Nav";
import { MobileNav } from "@/app/components/MobileNav";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { VoteButton } from "./VoteButton";
import { SubmitEntry } from "./SubmitEntry";
import { SettleButton } from "./SettleButton";

export const revalidate = 10;

const D    = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const BODY = { fontFamily: "var(--font-sans), system-ui, sans-serif" };

const RANK_COLORS = ["#fbbf24", "#d1d5db", "#b87333"];

function shortAddr(a: string) { return `${a.slice(0, 6)}…${a.slice(-4)}`; }

function timeLeft(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  return d > 0 ? `${d}d ${h % 24}h` : `${h}h left`;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const db = createServerClient();
  const { data } = await db.from("meme_wars").select("title").eq("id", id).single();
  if (!data) return { title: "Meme War not found" };
  return { title: `${data.title} — Based ID Meme Wars` };
}

export default async function MemeWarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createServerClient();

  const [{ data: war }, { data: entries }] = await Promise.all([
    db.from("meme_wars").select("*").eq("id", id).single(),
    db.from("meme_entries").select("*").eq("meme_war_id", id).order("vote_count", { ascending: false }),
  ]);

  if (!war) notFound();

  const warEnded   = new Date(war.ends_at) <= new Date();
  const totalVotes = (entries ?? []).reduce((s, e) => s + e.vote_count, 0);

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <MobileNav />

      <div style={{ background: "#0a0a0a" }} className="text-white">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <Link href="/meme-wars" className="text-white/30 text-xs hover:text-white/60 transition-colors mb-6 inline-block" style={BODY}>
            ← Meme Wars
          </Link>
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="space-y-2">
              <h1 className="font-black text-4xl sm:text-5xl text-white" style={D}>{war.title}</h1>
              {war.theme && <p className="text-white/40 text-sm" style={BODY}>🎨 {war.theme}</p>}
            </div>
            <div className="flex gap-3 flex-wrap">
              {[
                { label: "Prize",  value: `$${war.prize_pool_usdc}`, color: "#0052FF" },
                { label: "Vote",   value: `$${war.vote_cost_usdc}`,  color: undefined  },
                { label: "Time",   value: timeLeft(war.ends_at),      color: undefined  },
                { label: "Votes",  value: totalVotes.toLocaleString(), color: undefined  },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white/[0.06] rounded-xl px-4 py-2.5 text-center">
                  <p className="text-white/30 text-[10px] uppercase tracking-wider" style={BODY}>{label}</p>
                  <p className="font-black text-lg text-white" style={{ ...D, color: color ?? "#fff" }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">

          {/* Entries */}
          <div className="space-y-5">
            <h2 className="font-black text-xl text-black" style={D}>
              Entries <span className="text-gray-300 font-medium text-base">{entries?.length ?? 0}</span>
            </h2>
            {entries && entries.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(entries as MemeEntry[]).map((entry, i) => {
                  const pct = totalVotes > 0 ? Math.round((entry.vote_count / totalVotes) * 100) : 0;
                  return (
                    <div key={entry.id} className="rounded-2xl border border-black/[0.07] overflow-hidden"
                      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={entry.media_url} alt={entry.caption ?? "Meme"}
                        className="w-full aspect-square object-cover" />
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {entry.caption && (
                              <p className="text-black text-sm font-medium truncate" style={BODY}>{entry.caption}</p>
                            )}
                            <p className="text-gray-400 text-xs font-mono" style={BODY}>{shortAddr(entry.hunter_wallet)}</p>
                          </div>
                          {i < 3 && (
                            <span className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black flex-shrink-0"
                              style={{ background: `${RANK_COLORS[i]}20`, color: RANK_COLORS[i], ...D }}>
                              {i + 1}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs" style={BODY}>
                            <span className="text-gray-400">{entry.vote_count} votes</span>
                            <span className="font-bold text-black">{pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                            <div className="h-full rounded-full bg-black" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        {(war as MemeWar).contract_war_id && (
                          <VoteButton
                            warId={war.id}
                            entryId={entry.id}
                            onChainWarId={(war as MemeWar).contract_war_id!}
                            onChainEntryId={entry.on_chain_id}
                            voteCostUsdc={Number((war as MemeWar).vote_cost_usdc)}
                            warEnded={warEnded}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-black/[0.07] bg-gray-50 px-8 py-16 text-center space-y-3">
                <p className="font-black text-xl text-black" style={D}>No entries yet</p>
                <p className="text-gray-400 text-sm" style={BODY}>Be the first to submit your meme!</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {warEnded && war.status === "active" && entries && entries.length > 0 && (
              <SettleButton
                warId={war.id}
                onChainWarId={(war as MemeWar).contract_war_id}
                entries={entries as MemeEntry[]}
                creatorWallet={war.creator_wallet}
              />
            )}
            {!warEnded && (
              <div className="rounded-2xl border border-black/[0.07] p-5 space-y-3"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <p className="text-black font-black text-base" style={D}>Submit Your Meme</p>
                <p className="text-gray-400 text-xs" style={BODY}>One entry per wallet · +10 XP</p>
                <SubmitEntry warId={war.id} warEnded={warEnded} onSubmitted={() => {}} />
              </div>
            )}
            <div className="rounded-2xl border border-black/[0.07] p-5 space-y-3"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <p className="text-black font-black text-base" style={D}>Prize Breakdown</p>
              <div className="space-y-2">
                {[
                  { place: "1st", desc: "70% vote pool + full prize" },
                  { place: "2nd", desc: "20% of vote pool" },
                  { place: "3rd", desc: "10% of vote pool" },
                ].map(({ place, desc }) => (
                  <div key={place} className="flex items-center justify-between text-sm">
                    <span className="font-bold text-black" style={BODY}>{place}</span>
                    <span className="text-gray-400 text-xs" style={BODY}>{desc}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-xs text-gray-300 pt-2 border-t border-black/[0.05]">
                  <span style={BODY}>Platform fee</span>
                  <span style={BODY}>5% of vote pool</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
