import type { Metadata } from "next";
import { Nav } from "@/app/components/Nav";
import { MobileNav } from "@/app/components/MobileNav";
import { DropManagement } from "./DropManagement";

export const metadata: Metadata = {
  title: "Manage Drop — Based ID Partner",
};

export default async function PartnerDropPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav />
      <MobileNav />
      <DropManagement dropId={id} />
    </div>
  );
}
