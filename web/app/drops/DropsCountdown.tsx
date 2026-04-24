"use client";

import { useEffect, useState } from "react";
import { calcTimeLeft, pad } from "@/lib/countdown";

export function DropsCountdown({ target }: { target: number }) {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const tick = () => setT(calcTimeLeft(new Date(target)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const cells = [
    { v: t.d, l: "days" },
    { v: t.h, l: "hours" },
    { v: t.m, l: "mins" },
    { v: t.s, l: "secs" },
  ];

  return (
    <div className="inline-flex items-stretch gap-2 sm:gap-3 rounded-2xl">
      {cells.map(({ v, l }, i) => (
        <div
          key={l}
          className="flex flex-col items-center justify-center px-4 sm:px-6 py-3 sm:py-4 rounded-xl border border-white/[0.08] bg-white/[0.02] min-w-[72px] sm:min-w-[88px]"
        >
          <span className="text-white font-black text-2xl sm:text-3xl tabular-nums leading-none" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
            {mounted ? pad(v) : "--"}
          </span>
          <span className="text-zinc-600 text-[9px] sm:text-[10px] uppercase tracking-[0.15em] mt-1.5">
            {l}
          </span>
          {i < cells.length - 1 && null}
        </div>
      ))}
    </div>
  );
}
