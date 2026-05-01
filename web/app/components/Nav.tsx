"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const D = { fontFamily: "var(--font-display), system-ui, sans-serif" };

const links = [
  { href: "/campaigns",  label: "Campaigns"  },
  { href: "/meme-wars",  label: "Meme Wars"  },
  { href: "/squads",     label: "Squads"     },
  { href: "/hunters",    label: "Hunters"    },
  { href: "/projects",   label: "Projects"   },
  { href: "/profile",    label: "Profile"    },
];

export function Nav({ active }: { active?: string }) {
  const pathname = usePathname();
  const activePath = active ?? pathname;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-black/[0.07]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Based ID" className="w-7 h-7 rounded-lg group-hover:opacity-80 transition-opacity" />
          <span style={D} className="font-black text-sm text-black tracking-widest uppercase hidden sm:block">
            Based ID
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map(({ href, label }) => {
            const isActive = activePath === href || activePath.startsWith(href + "/");
            return (
              <Link key={href} href={href}
                className={`px-3.5 py-2 text-sm font-medium transition-colors rounded-lg ${
                  isActive
                    ? "text-black bg-black/[0.05]"
                    : "text-gray-500 hover:text-black hover:bg-black/[0.03]"
                }`}>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-gray-400 text-[11px] tracking-wide">Live on Base</span>
          </div>
          <ConnectButton showBalance={false} chainStatus="none" accountStatus="avatar" />
        </div>
      </div>
    </header>
  );
}
