import type { Metadata } from "next";
import { Nav } from "@/app/components/Nav";
import { MobileNav } from "@/app/components/MobileNav";
import { HuntersClaim } from "./HuntersClaim";

export const metadata: Metadata = {
  title: "Based Hunters — Rank up on Base",
  description: "Claim your free Based Hunter NFT. Soulbound rank that grows as you explore Base.",
};

export default function HuntersPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav active="/hunters" />
      <MobileNav />
      <HuntersClaim />
    </div>
  );
}
