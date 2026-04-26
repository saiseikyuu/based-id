import type { Metadata } from "next";
import { Nav } from "@/app/components/Nav";
import { MobileNav } from "@/app/components/MobileNav";
import { OwnerPanel } from "./OwnerPanel";

export const metadata: Metadata = {
  title: "Owner — Based ID",
};

export default function OwnerPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <MobileNav />
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center gap-2 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <p className="text-amber-400 text-xs font-bold uppercase tracking-[0.2em]">Owner Panel</p>
        </div>
        <OwnerPanel />
      </div>
    </div>
  );
}
