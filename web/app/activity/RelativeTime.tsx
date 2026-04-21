"use client";

import { useEffect, useState } from "react";

function relativeTime(ts: number): string {
  const diff = Math.floor((Date.now() / 1000) - ts);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function RelativeTime({ timestamp }: { timestamp: number }) {
  const [label, setLabel] = useState(relativeTime(timestamp));

  useEffect(() => {
    const id = setInterval(() => setLabel(relativeTime(timestamp)), 15000);
    return () => clearInterval(id);
  }, [timestamp]);

  return <span suppressHydrationWarning>{label}</span>;
}
