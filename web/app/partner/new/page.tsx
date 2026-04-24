import type { Metadata } from "next";
import { CreateDropWizard } from "./CreateDropWizard";

export const metadata: Metadata = {
  title: "Create a Drop — Based ID Partner",
  description: "Launch your NFT drop, token airdrop, or whitelist for Based ID holders.",
};

export default function NewDropPage() {
  return <CreateDropWizard />;
}
