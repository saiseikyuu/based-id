"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

const links = [
  { href: "/drops",       label: "Drops"       },
  { href: "/projects",    label: "Projects"    },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/dashboard",   label: "Dashboard"   },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <div className="md:hidden border-b border-white/[0.04] bg-black/90 sticky top-14 z-40">
      <div className="flex items-center gap-1 px-3 py-2">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 text-center py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              pathname === href
                ? "bg-white/[0.08] text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
