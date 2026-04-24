import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base, baseSepolia } from "wagmi/chains";
import { http } from "wagmi";

const isMainnet = process.env.NEXT_PUBLIC_CHAIN_ID === "8453";
const chain = isMainnet ? base : baseSepolia;
const rpcUrl = isMainnet
  ? "https://mainnet.base.org"
  : "https://sepolia.base.org";

export const config = getDefaultConfig({
  appName: "Based ID",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
  chains: [chain],
  transports: {
    [chain.id]: http(rpcUrl),
  },
  ssr: true,
});
