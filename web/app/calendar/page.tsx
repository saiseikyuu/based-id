import type { Metadata } from "next";
import { Nav } from "@/app/components/Nav";
import { MobileNav } from "@/app/components/MobileNav";
import { CalendarView } from "./CalendarView";

export const metadata: Metadata = {
  title: "Drop Calendar — Based ID",
  description: "See all Based ID drops by date. Never miss a Base opportunity.",
};

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav active="/calendar" />
      <MobileNav />
      <div className="flex-1">
        <CalendarView />
      </div>
    </div>
  );
}
