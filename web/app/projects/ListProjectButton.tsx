"use client";

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";

export function ListProjectButton({ className }: { className?: string }) {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [showConnect, setShowConnect] = useState(false);

  function handleClick() {
    if (isConnected && address) {
      router.push(`/projects/${address}`);
    } else {
      setShowConnect(true);
    }
  }

  if (showConnect && !isConnected) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-zinc-500 text-xs">Connect wallet first:</span>
        <ConnectButton showBalance={false} chainStatus="none" accountStatus="address" />
      </div>
    );
  }

  return (
    <button onClick={handleClick} className={className}>
      + List your project
    </button>
  );
}
