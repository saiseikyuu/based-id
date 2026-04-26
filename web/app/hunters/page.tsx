import type { Metadata } from "next";
import { Nav } from "@/app/components/Nav";
import { MobileNav } from "@/app/components/MobileNav";
import { HuntersHub } from "./HuntersHub";

export const metadata: Metadata = {
  title: "Hunters — Based ID",
  description: "Claim your Based Hunter NFT, earn XP, complete quests, and level up your rank on Base.",
};

export default function HuntersPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav active="/hunters" />
      <MobileNav />
      <HuntersHub />
    </div>
  );
}
