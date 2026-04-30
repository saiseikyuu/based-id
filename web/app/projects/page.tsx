import Link from "next/link";
import type { Metadata } from "next";
import { createServerClient, type Project } from "@/lib/supabase";
import { MobileNav } from "@/app/components/MobileNav";
import { Nav } from "@/app/components/Nav";
import { ListProjectButton } from "./ListProjectButton";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Projects — Based ID",
  description: "Browse all partner projects running campaigns for Based ID holders on Base.",
};

const D    = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const BODY = { fontFamily: "var(--font-sans), system-ui, sans-serif" };

type ProjectWithStats = Project & { campaign_count: number; active_count: number };

async function getProjects(): Promise<ProjectWithStats[]> {
  try {
    const db = createServerClient();
    const { data: projects } = await db.from("projects").select("*").order("created_at", { ascending: false });
    if (!projects?.length) return [];

    const { data: campaigns } = await db
      .from("campaigns")
      .select("partner_address, status")
      .in("status", ["active", "ended", "drawn"]);
    const total:  Record<string, number> = {};
    const active: Record<string, number> = {};
    for (const c of campaigns ?? []) {
      total[c.partner_address]  = (total[c.partner_address]  ?? 0) + 1;
      if (c.status === "active") active[c.partner_address] = (active[c.partner_address] ?? 0) + 1;
    }
    return projects.map(p => ({
      ...p,
      campaign_count: total[p.address]  ?? 0,
      active_count:   active[p.address] ?? 0,
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
  const projects  = await getProjects();
  const liveTotal = projects.reduce((s, p) => s + p.active_count, 0);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#050508", ...BODY }}>
      <Nav active="/projects" />
      <MobileNav />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section
        style={{ background: "#050508" }}
        className="w-full px-6 pt-16 pb-14 border-b border-white/[0.06]"
      >
        <div className="max-w-6xl mx-auto flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            {/* Live pill */}
            <div className="inline-flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${liveTotal > 0 ? "bg-green-400 animate-pulse" : "bg-zinc-700"}`}
              />
              <span
                className="text-xs font-semibold tracking-wide"
                style={{ color: liveTotal > 0 ? "#4ade80" : "#52525b", ...BODY }}
              >
                {liveTotal > 0
                  ? `${liveTotal} campaign${liveTotal !== 1 ? "s" : ""} live`
                  : "No active campaigns"}
              </span>
            </div>

            {/* Headline */}
            <h1
              className="text-7xl sm:text-8xl font-black uppercase leading-none tracking-tight text-white"
              style={D}
            >
              Projects
            </h1>

            {/* Subtitle */}
            <p className="text-base text-zinc-400 max-w-md" style={BODY}>
              Discover teams building on Base.
            </p>
          </div>

          {/* CTA */}
          <ListProjectButton className="self-start sm:self-auto inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#0a0a10] text-sm font-bold hover:bg-zinc-100 transition-colors" />
        </div>
      </section>

      {/* ── Project grid (white bg) ───────────────────────────────────── */}
      <section className="flex-1 bg-white px-6 py-12">
        <div className="max-w-6xl mx-auto">
          {projects.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-28 gap-6 text-center">
              {/* Icon */}
              <div
                className="w-20 h-20 rounded-2xl border border-black/[0.08] bg-zinc-50 flex items-center justify-center"
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              </div>

              <div className="space-y-2">
                <p className="text-3xl font-black uppercase tracking-tight text-[#0a0a10]" style={D}>
                  No projects yet
                </p>
                <p className="text-sm text-gray-500 max-w-xs" style={BODY}>
                  Be the first to list your project. Campaigns are free to create.
                </p>
              </div>

              <ListProjectButton className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0052FF] text-white text-sm font-bold hover:bg-blue-700 transition-colors" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map(project => (
                <div
                  key={project.address}
                  className="bg-white border border-black/[0.07] rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all flex flex-col gap-4"
                >
                  {/* Top: logo + name + description */}
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-black/[0.08] bg-zinc-100 flex items-center justify-center flex-shrink-0">
                      {project.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={project.logo_url} alt={project.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[#0a0a10] font-black text-xl" style={D}>
                          {project.name.slice(0, 1)}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/projects/${project.address}`}
                        className="font-bold text-lg leading-tight text-[#0a0a10] hover:text-[#0052FF] transition-colors block truncate"
                        style={BODY}
                      >
                        {project.name}
                      </Link>
                      {project.description && (
                        <p
                          className="text-sm text-gray-500 mt-0.5 line-clamp-2"
                          style={BODY}
                        >
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Social links */}
                  <div className="flex items-center gap-3">
                    {project.twitter && (
                      <a
                        href={`https://x.com/${project.twitter.replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-[#0052FF] transition-colors"
                        aria-label="X / Twitter"
                      >
                        <SocialIcon type="x" />
                      </a>
                    )}
                    {project.discord && (
                      <a
                        href={project.discord}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-[#0052FF] transition-colors"
                        aria-label="Discord"
                      >
                        <SocialIcon type="discord" />
                      </a>
                    )}
                    {project.website && (
                      <a
                        href={project.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-[#0052FF] transition-colors"
                        aria-label="Website"
                      >
                        <SocialIcon type="website" />
                      </a>
                    )}
                    <span className="text-gray-300 text-[10px] font-mono ml-auto">
                      {project.address.slice(0, 6)}…{project.address.slice(-4)}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-black/[0.06]" />

                  {/* Stats + View button */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500" style={BODY}>
                        {project.campaign_count} campaign{project.campaign_count !== 1 ? "s" : ""}
                      </span>

                      {project.active_count > 0 && (
                        <span
                          className="bg-green-50 text-green-700 border border-green-200 text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={BODY}
                        >
                          {project.active_count} active
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/projects/${project.address}`}
                      className="border border-black/[0.10] text-sm px-4 py-2 rounded-xl text-[#0a0a10] hover:bg-black/[0.04] transition-colors font-medium flex-shrink-0"
                      style={BODY}
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Partner strip (blue) ─────────────────────────────────────── */}
      <section
        className="w-full px-6 py-14"
        style={{ background: "#0052FF" }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h2
              className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white"
              style={D}
            >
              Running a project on Base?
            </h2>
            <p className="text-blue-200 text-sm" style={BODY}>
              Campaigns are free.
            </p>
          </div>

          <ListProjectButton className="inline-flex items-center gap-2 bg-white text-[#0052FF] font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors text-sm flex-shrink-0" />
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer
        className="border-t border-white/[0.06] px-6 py-5"
        style={{ background: "#050508" }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <span className="text-zinc-600 text-xs" style={BODY}>Built on Base · 2026</span>
          <div className="flex items-center gap-5 text-xs text-zinc-600" style={BODY}>
            <Link href="/campaigns" className="hover:text-zinc-400 transition-colors">Campaigns</Link>
            <Link href="/hunters"   className="hover:text-zinc-400 transition-colors">Hunters</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
