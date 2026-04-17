import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base, baseSepolia } from "wagmi/chains";

const isMainnet = process.env.NEXT_PUBLIC_CHAIN_ID === "8453";

export const config = getDefaultConfig({
  appName: "Based ID",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
  chains: isMainnet ? [base] : [baseSepolia],
  ssr: true,
});
