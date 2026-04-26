"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

const links = [
  { href: "/drops",    label: "Drops",   icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  { href: "/hunters",  label: "Hunters", icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
  { href: "/projects", label: "Projects",icon: "M3 7h18M3 12h18M3 17h18" },
  { href: "/calendar", label: "Calendar",icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-black/95 backdrop-blur-xl">
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {links.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${
                active ? "text-white" : "text-zinc-600 hover:text-zinc-400"
              }`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d={icon} />
              </svg>
              <span className={`text-[10px] font-medium ${active ? "text-white" : "text-zinc-600"}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
