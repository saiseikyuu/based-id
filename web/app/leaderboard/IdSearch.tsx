"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function IdSearch() {
  const [value, setValue] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(value.replace("#", "").trim());
    if (!isNaN(n) && n >= 1) {
      router.push(`/profile/${n}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs font-mono">#</span>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Look up any ID…"
          className="bg-white/[0.03] border border-white/[0.07] rounded-xl pl-7 pr-4 py-2 text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-white/[0.15] transition-colors w-44"
          suppressHydrationWarning
        />
      </div>
      <button
        type="submit"
        className="px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.07] text-zinc-400 text-xs hover:text-white hover:border-white/[0.15] transition-colors"
        suppressHydrationWarning
      >
        View →
      </button>
    </form>
  );
}
