import Link from "next/link";
import type { Metadata } from "next";
import { createServerClient, type Project } from "@/lib/supabase";
import { MobileNav } from "@/app/components/MobileNav";
import { Nav } from "@/app/components/Nav";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Projects — Based ID",
  description: "Browse all partner projects running drops for Based ID holders on Base.",
};

const DISPLAY = { fontFamily: "var(--font-display), system-ui, sans-serif" };

async function getProjects(): Promise<(Project & { drop_count: number })[]> {
  try {
    const db = createServerClient();
    const { data: projects } = await db.from("projects").select("*").order("created_at", { ascending: false });
    if (!projects?.length) return [];

    // Get active drop counts per project
    const { data: drops } = await db
      .from("drops")
      .select("partner_address")
      .in("status", ["active", "drawn"]);

    const countMap = new Map<string, number>();
    (drops ?? []).forEach((d) => {
      countMap.set(d.partner_address, (countMap.get(d.partner_address) ?? 0) + 1);
    });

    return projects.map((p) => ({ ...p, drop_count: countMap.get(p.address) ?? 0 }));
  } catch { return []; }
}

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav active="/projects" />
      <MobileNav />

      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 40% at 50% 0%, rgba(37,99,235,0.06), transparent 70%)" }} />

        <div className="relative max-w-7xl mx-auto px-6 pt-12 pb-20 space-y-8">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div className="space-y-2">
              <p className="text-blue-400 text-[11px] uppercase tracking-[0.2em]">Partner projects</p>
              <h1 style={DISPLAY} className="text-[clamp(2rem,4.5vw,3.5rem)] font-black tracking-tight leading-tight">
                {projects.length > 0 ? `${projects.length} projects on Based ID` : "Projects"}
              </h1>
              <p className="text-zinc-500 text-sm">Every project running drops for verified Based ID holders.</p>
            </div>
            <Link href="/partner/new" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors flex-shrink-0">
              Launch a drop →
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] px-8 py-20 text-center space-y-5">
              <p className="text-zinc-400 font-bold text-xl" style={DISPLAY}>First projects coming soon</p>
              <p className="text-zinc-600 text-sm max-w-sm mx-auto">
                Be among the first projects to run a drop on Based ID. Standard listings are free.
              </p>
              <Link href="/partner" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors">
                Become a partner →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Link key={project.address} href={`/projects/${project.address}`} className="group block">
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-6 flex items-start gap-4 hover:border-white/[0.14] hover:bg-white/[0.025] transition-all h-full">
                    {/* Logo */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-white/[0.08]">
                      {project.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={project.logo_url} alt={project.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-900/50 to-zinc-900 flex items-center justify-center">
                          <span className="text-white font-black text-lg" style={DISPLAY}>{project.name.slice(0, 1).toUpperCase()}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-white font-bold text-base group-hover:text-blue-200 transition-colors leading-tight truncate">
                          {project.name}
                        </h3>
                        {project.drop_count > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 flex-shrink-0">
                            {project.drop_count} live
                          </span>
                        )}
                      </div>
                      {project.description && (
                        <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2">{project.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-[10px] text-zinc-700">
                        {project.twitter && <span>@{project.twitter.replace("@", "")}</span>}
                        <span className="font-mono">{project.address.slice(0, 6)}…{project.address.slice(-4)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-white/[0.04] px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <span className="text-zinc-700 text-[11px]">Built on Base · 2026</span>
          <div className="flex items-center gap-5 text-[11px] text-zinc-700">
            <Link href="/drops" className="hover:text-zinc-400 transition-colors">Drops</Link>
            <Link href="/partner" className="hover:text-zinc-400 transition-colors">Partner</Link>
            <a href="https://x.com/basedidofficial" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">@basedidofficial</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
