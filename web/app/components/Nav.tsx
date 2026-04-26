import Link from "next/link";

const DISPLAY = { fontFamily: "var(--font-display), system-ui, sans-serif" };

export function Nav({ active }: { active?: string }) {
  const links = [
    { href: "/drops",       label: "Drops"       },
    { href: "/quests",      label: "Quests"      },
    { href: "/calendar",    label: "Calendar"    },
    { href: "/projects",    label: "Projects"    },
    { href: "/hunters",     label: "Hunters"     },
    { href: "/dashboard",   label: "Dashboard"   },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0 hover:opacity-75 transition-opacity">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Based ID" className="w-6 h-6 rounded-md" />
          <span style={DISPLAY} className="font-bold text-sm text-white tracking-tight">Based ID</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {links.map(({ href, label }) => (
            <Link key={href} href={href}
              className={`text-sm transition-colors ${
                active === href ? "text-white font-medium" : "text-zinc-400 hover:text-white"
              }`}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Link href="/partner"
            className={`hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              active === "/partner"
                ? "border-blue-500/50 bg-blue-500/10 text-blue-300"
                : "border-white/[0.1] text-zinc-400 hover:border-white/[0.2] hover:text-white"
            }`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Partner
          </Link>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-zinc-600 text-xs">Live</span>
        </div>
      </div>
    </header>
  );
}
