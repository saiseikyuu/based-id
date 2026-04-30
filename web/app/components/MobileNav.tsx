"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

const D = { fontFamily: "var(--font-display), system-ui, sans-serif" };

const links = [
  {
    href: "/campaigns", label: "Campaigns",
    icon: (a: boolean) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>,
  },
  {
    href: "/squads", label: "Squads",
    icon: (a: boolean) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    href: "/hunters", label: "Hunters",
    icon: (a: boolean) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  },
  {
    href: "/projects", label: "Projects",
    icon: (a: boolean) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    href: "/profile", label: "Profile",
    icon: (a: boolean) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-black/[0.08]">
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {links.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all"
              style={{ color: active ? "#0052FF" : "#9ca3af" }}>
              {icon(active)}
              <span className="text-[9px] font-bold uppercase tracking-wider" style={D}>{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
