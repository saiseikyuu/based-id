import Link from "next/link";

const D = { fontFamily: "var(--font-display), system-ui, sans-serif" };

export function Nav({ active }: { active?: string }) {
  const links = [
    { href: "/drops",     label: "Drops"     },
    { href: "/hunters",   label: "Hunters"   },
    { href: "/projects",  label: "Projects"  },
    { href: "/calendar",  label: "Calendar"  },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.05] bg-black/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-8">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Based ID" className="w-6 h-6 rounded-md group-hover:opacity-80 transition-opacity" />
          <span style={D} className="font-bold text-sm text-white tracking-tight hidden sm:block">Based ID</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map(({ href, label }) => (
            <Link key={href} href={href}
              className={`px-3.5 py-2 rounded-lg text-sm transition-colors ${
                active === href
                  ? "text-white bg-white/[0.07] font-medium"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}>
              {label}
            </Link>
          ))}
        </nav>

        {/* Right — Partner CTA + live dot */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-zinc-600 text-[11px]">Live</span>
          </div>
          <Link href="/partner"
            className={`hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              active === "/partner"
                ? "border-blue-500/50 bg-blue-500/10 text-blue-300"
                : "border-white/[0.1] text-zinc-300 hover:border-white/[0.2] hover:text-white"
            }`}>
            Partner
          </Link>
        </div>
      </div>
    </header>
  );
}
