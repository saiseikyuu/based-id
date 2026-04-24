import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createServerClient, type Drop } from "@/lib/supabase";
import { MobileNav } from "@/app/components/MobileNav";
import { Nav } from "@/app/components/Nav";
import { DropCard } from "@/app/drops/DropCard";

export const revalidate = 60;

const DISPLAY = { fontFamily: "var(--font-display), system-ui, sans-serif" };

async function getProject(address: string) {
  try {
    const db = createServerClient();
    const { data } = await db.from("projects").select("*").eq("address", address.toLowerCase()).single();
    return data;
  } catch { return null; }
}

async function getProjectDrops(address: string): Promise<Drop[]> {
  try {
    const db = createServerClient();
    const { data } = await db
      .from("drops")
      .select("*, tasks(*)")
      .eq("partner_address", address.toLowerCase())
      .in("status", ["active", "ended", "drawn"])
      .order("created_at", { ascending: false });
    return (data ?? []) as Drop[];
  } catch { return []; }
}

export async function generateMetadata(
  { params }: { params: Promise<{ address: string }> }
): Promise<Metadata> {
  const { address } = await params;
  const project = await getProject(address);
  if (!project) return { title: "Project not found" };
  return {
    title: `${project.name} — Based ID Projects`,
    description: project.description || `${project.name} is running drops for Based ID holders on Base.`,
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const [project, drops] = await Promise.all([getProject(address), getProjectDrops(address)]);

  if (!project) notFound();

  const activeDrops = drops.filter((d) => d.status === "active");
  const pastDrops   = drops.filter((d) => d.status !== "active");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav active="/projects" />
      <MobileNav />

      <div className="flex-1">

        {/* ── Banner ── */}
        <div className="relative w-full h-48 sm:h-64 bg-zinc-950 border-b border-white/[0.06] overflow-hidden">
          {project.banner_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.banner_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-black" />
          )}
        </div>

        <div className="max-w-5xl mx-auto px-6 pb-20 space-y-8">

          {/* ── Logo + identity row ── */}
          <div className="flex items-end justify-between gap-4 flex-wrap -mt-10 relative z-10">
            {/* Logo (overlaps banner) */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-4 border-black flex-shrink-0 bg-zinc-950">
              {project.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={project.logo_url} alt={project.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                  <span className="text-white font-black text-3xl" style={DISPLAY}>{project.name.slice(0, 1).toUpperCase()}</span>
                </div>
              )}
            </div>

            {/* Social links — top right */}
            <div className="flex items-center gap-2 pb-1">
              {project.twitter && (
                <a href={`https://x.com/${project.twitter.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] text-zinc-400 text-xs hover:text-white hover:border-white/20 transition-colors">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  @{project.twitter.replace("@", "")}
                </a>
              )}
              {project.discord && (
                <a href={project.discord} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] text-zinc-400 text-xs hover:text-white hover:border-white/20 transition-colors">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                  Discord
                </a>
              )}
              {project.website && (
                <a href={project.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] text-zinc-400 text-xs hover:text-white hover:border-white/20 transition-colors">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  Website
                </a>
              )}
            </div>
          </div>

          {/* ── Project name + description ── */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-white font-black text-3xl sm:text-4xl tracking-tight" style={DISPLAY}>{project.name}</h1>
              {activeDrops.length > 0 && (
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                  {activeDrops.length} active
                </span>
              )}
            </div>
            {project.description && (
              <p className="text-zinc-400 text-sm leading-relaxed max-w-lg">{project.description}</p>
            )}
            <p className="text-zinc-700 text-xs font-mono">{project.address.slice(0, 6)}…{project.address.slice(-4)}</p>
          </div>

          {/* Active drops */}
          {activeDrops.length > 0 && (
            <section className="space-y-4">
              <p className="text-[11px] text-green-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Active drops
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeDrops.map((drop) => <DropCard key={drop.id} drop={drop} featured={drop.tier === "featured"} />)}
              </div>
            </section>
          )}

          {/* Past drops */}
          {pastDrops.length > 0 && (
            <section className="space-y-4">
              <p className="text-[11px] text-zinc-600 uppercase tracking-[0.2em]">Past drops</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastDrops.map((drop) => <DropCard key={drop.id} drop={drop} />)}
              </div>
            </section>
          )}

          {/* No drops yet */}
          {drops.length === 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] px-8 py-16 text-center space-y-3">
              <p className="text-zinc-400 font-medium">No drops yet</p>
              <p className="text-zinc-600 text-sm">This project hasn&apos;t launched any drops yet.</p>
            </div>
          )}

        </div>
      </div>

      <footer className="border-t border-white/[0.06] px-6 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <span className="text-zinc-700 text-xs">Built on Base · 2026</span>
          <Link href="/projects" className="text-zinc-600 text-xs hover:text-zinc-400 transition-colors">← All projects</Link>
        </div>
      </footer>
    </div>
  );
}
