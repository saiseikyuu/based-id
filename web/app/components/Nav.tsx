import Link from "next/link";

const DISPLAY = { fontFamily: "var(--font-display), system-ui, sans-serif" };

export function Nav({ active }: { active?: string }) {
  const links = [
    { href: "/drops",       label: "Drops"       },
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

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-zinc-600 text-xs">Live</span>
        </div>
      </div>
    </header>
  );
}
