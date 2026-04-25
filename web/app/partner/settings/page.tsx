import type { Metadata } from "next";
import { PartnerSettings } from "./PartnerSettings";
import { Nav } from "@/app/components/Nav";
import { MobileNav } from "@/app/components/MobileNav";

export const metadata: Metadata = {
  title: "Project Settings — Based ID Partner",
  description: "Set up your project profile on Based ID.",
};

export default function PartnerSettingsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav />
      <MobileNav />
      <PartnerSettings />
    </div>
  );
}
