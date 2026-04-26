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

const D = { fontFamily: "var(--font-display), system-ui, sans-serif" };

type ProjectWithStats = Project & { drop_count: number; active_count: number };

async function getProjects(): Promise<ProjectWithStats[]> {
  try {
    const db = createServerClient();
    const { data: projects } = await db.from("projects").select("*").order("created_at", { ascending: false });
    if (!projects?.length) return [];

    const { data: drops } = await db.from("drops").select("partner_address, status").in("status", ["active", "ended", "drawn"]);
    const total: Record<string, number>  = {};
    const active: Record<string, number> = {};
    for (const d of drops ?? []) {
      total[d.partner_address]  = (total[d.partner_address]  ?? 0) + 1;
      if (d.status === "active") active[d.partner_address] = (active[d.partner_address] ?? 0) + 1;
    }
    return projects.map(p => ({
      ...p,
      drop_count:   total[p.address]  ?? 0,
      active_count: active[p.address] ?? 0,
    }));
  } catch { return []; }
}

function SocialIcon({ type }: { type: "x" | "discord" | "website" }) {
  if (type === "x") return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
  if (type === "discord") return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.11 18.1.127 18.115a19.879 19.879 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
    </svg>
  );
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}

export default async function ProjectsPage() {
  const projects = await getProjects();
  const liveTotal = projects.reduce((s, p) => s + p.active_count, 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav active="/projects" />
      <MobileNav />

      <div className="max-w-4xl mx-auto px-6 py-10 flex-1 w-full space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${liveTotal > 0 ? "bg-green-500 animate-pulse" : "bg-zinc-700"}`} />
              <span className={`text-xs font-medium ${liveTotal > 0 ? "text-green-400" : "text-zinc-600"}`}>
                {liveTotal > 0 ? `${liveTotal} drop${liveTotal !== 1 ? "s" : ""} live` : "No active drops"}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white" style={D}>Projects</h1>
          </div>
          <Link href="/partner"
            className="px-4 py-2 rounded-xl border border-white/[0.08] text-zinc-400 text-xs font-semibold hover:text-white hover:border-white/[0.16] transition-colors">
            + List your project
          </Link>
        </div>

        {/* List */}
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] px-8 py-20 text-center space-y-4">
            <p className="text-zinc-400 font-bold text-xl" style={D}>No projects yet</p>
            <p className="text-zinc-600 text-sm">Be the first to run a drop. Standard listings are free.</p>
            <Link href="/partner" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-zinc-100 transition-colors">
              Become a partner →
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_80px_80px_100px] gap-4 px-5 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
              {["Project", "Drops", "Active", ""].map(h => (
                <span key={h} className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.15em]">{h}</span>
              ))}
            </div>

            {/* Rows */}
            {projects.map(project => (
              <div key={project.address}
                className="grid grid-cols-[1fr_80px_80px_100px] gap-4 px-5 py-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors items-center last:border-0">

                {/* Logo + name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/[0.08] bg-zinc-900 flex items-center justify-center flex-shrink-0">
                    {project.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={project.logo_url} alt={project.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-black text-sm" style={D}>{project.name.slice(0,1)}</span>
                    )}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <Link href={`/projects/${project.address}`}
                      className="text-white text-sm font-semibold hover:text-zinc-200 transition-colors truncate block">
                      {project.name}
                    </Link>
                    {project.description && (
                      <p className="text-zinc-600 text-xs truncate">{project.description}</p>
                    )}
                    {/* Social links */}
                    <div className="flex items-center gap-2 pt-0.5">
                      {project.twitter && (
                        <a href={`https://x.com/${project.twitter.replace("@","")}`} target="_blank" rel="noopener noreferrer"
                          className="text-zinc-600 hover:text-zinc-300 transition-colors">
                          <SocialIcon type="x" />
                        </a>
                      )}
                      {project.discord && (
                        <a href={project.discord} target="_blank" rel="noopener noreferrer"
                          className="text-zinc-600 hover:text-zinc-300 transition-colors">
                          <SocialIcon type="discord" />
                        </a>
                      )}
                      {project.website && (
                        <a href={project.website} target="_blank" rel="noopener noreferrer"
                          className="text-zinc-600 hover:text-zinc-300 transition-colors">
                          <SocialIcon type="website" />
                        </a>
                      )}
                      <span className="text-zinc-700 text-[10px] font-mono">
                        {project.address.slice(0,6)}…{project.address.slice(-4)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total drops */}
                <div className="text-zinc-400 text-sm font-mono tabular-nums">{project.drop_count}</div>

                {/* Active drops */}
                <div>
                  {project.active_count > 0 ? (
                    <span className="text-green-400 text-sm font-mono tabular-nums">{project.active_count}</span>
                  ) : (
                    <span className="text-zinc-700 text-sm">—</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 justify-end">
                  <Link href={`/projects/${project.address}`}
                    className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-zinc-400 text-[11px] font-medium hover:bg-white/[0.05] hover:text-white transition-colors">
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Partner strip */}
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.06] px-5 py-4">
          <p className="text-zinc-500 text-sm">Running a project on Base? <span className="text-zinc-600">Drops are free to list.</span></p>
          <Link href="/partner" className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-zinc-100 transition-colors">
            Become a partner →
          </Link>
        </div>
      </div>

      <footer className="border-t border-white/[0.06] px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <span className="text-zinc-700 text-xs">Built on Base · 2026</span>
          <div className="flex items-center gap-5 text-xs text-zinc-700">
            <Link href="/drops" className="hover:text-zinc-400 transition-colors">Drops</Link>
            <Link href="/partner" className="hover:text-zinc-400 transition-colors">Partner</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
