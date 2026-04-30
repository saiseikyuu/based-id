"use client";

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { Nav } from "@/app/components/Nav";
import { MobileNav } from "@/app/components/MobileNav";

const D = { fontFamily: "var(--font-display), system-ui, sans-serif" };
const BODY = { fontFamily: "var(--font-sans), system-ui, sans-serif" };

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (isConnected && address) {
      router.push(`/profile/${address}`);
    }
  }, [isConnected, address, router]);

  return (
    <div className="min-h-screen bg-[#050508]">
      <Nav active="/profile" />
      <MobileNav />

      <div className="flex items-center justify-center min-h-[80vh] px-6 pb-20">
        <div className="text-center space-y-8 max-w-sm w-full">

          {/* Ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 50% 40% at 50% 40%, rgba(0,82,255,0.07), transparent 70%)",
            }}
          />

          {/* Hunter shield icon */}
          <div className="relative">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto relative"
              style={{
                background: "rgba(0,82,255,0.08)",
                border: "1px solid rgba(0,82,255,0.2)",
                boxShadow: "0 0 40px rgba(0,82,255,0.08)",
              }}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0052FF"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {/* Pulse ring */}
              <div
                className="absolute inset-0 rounded-3xl animate-ping opacity-10"
                style={{ background: "rgba(0,82,255,0.4)" }}
              />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2 relative">
            <h1
              style={D}
              className="text-white font-black text-5xl uppercase tracking-tight leading-none"
            >
              YOUR PROFILE
            </h1>
            <p style={BODY} className="text-zinc-500 text-sm leading-relaxed">
              Connect your wallet to view your hunter profile,
              <br />
              XP, rank, and campaign history.
            </p>
          </div>

          {/* Connect button */}
          <div className="flex justify-center relative">
            <ConnectButton />
          </div>

          {/* Subtle divider */}
          <div className="flex items-center gap-4 relative">
            <div className="flex-1 h-px bg-white/[0.05]" />
            <span className="text-zinc-700 text-xs uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-white/[0.05]" />
          </div>

          {/* Soft CTA */}
          <div className="space-y-3 relative">
            <Link
              href="/hunters"
              className="block text-zinc-600 text-xs hover:text-zinc-400 transition-colors"
            >
              Learn about Based Hunters &#8594;
            </Link>
            <Link
              href="/campaigns"
              className="block text-zinc-600 text-xs hover:text-zinc-400 transition-colors"
            >
              Browse campaigns without a wallet &#8594;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
