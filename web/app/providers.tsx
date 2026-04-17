"use client";

import { RainbowKitProvider, darkTheme, useChainModal } from "@rainbow-me/rainbowkit";
import { WagmiProvider, useAccount, useChainId } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { config } from "@/lib/wagmi";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

const EXPECTED_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532");

function WrongNetworkBanner() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { openChainModal } = useChainModal();

  if (!isConnected || chainId === EXPECTED_CHAIN_ID) return null;

  const expectedName = EXPECTED_CHAIN_ID === 8453 ? "Base" : "Base Sepolia";

  return (
    <div className="fixed top-14 inset-x-0 z-[200] flex justify-center px-4 pointer-events-none">
      <div
        className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border border-red-900/40 bg-red-950/90 backdrop-blur-sm shadow-xl max-w-sm w-full"
      >
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
        <p className="text-red-300 text-xs flex-1">
          Wrong network — switch to <span className="font-bold text-red-200">{expectedName}</span>
        </p>
        <button
          onClick={openChainModal}
          className="flex-shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-red-900/50 border border-red-700/40 text-red-300 hover:bg-red-900/80 transition-colors"
        >
          Switch
        </button>
      </div>
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#2563eb",
            accentColorForeground: "white",
            borderRadius: "medium",
          })}
        >
          <WrongNetworkBanner />
          {children}
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                background: "#0f172a",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#e2e8f0",
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 12,
                borderRadius: 12,
                padding: "12px 16px",
              },
              success: { iconTheme: { primary: "#22c55e", secondary: "#0f172a" } },
              error:   { iconTheme: { primary: "#ef4444", secondary: "#0f172a" } },
            }}
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
