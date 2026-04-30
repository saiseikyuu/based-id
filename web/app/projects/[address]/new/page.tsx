import type { Metadata } from "next";
import { CreateCampaignWizard } from "./CreateCampaignWizard";

export const metadata: Metadata = {
  title: "Create Campaign — Based ID",
  description: "Launch a quest or raffle for Based ID holders on Base.",
};

export default async function NewCampaignPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return <CreateCampaignWizard partnerAddress={address} />;
}
