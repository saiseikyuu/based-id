"use client";

import { motion } from "motion/react";

export function LivePulse() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-green-500/20 bg-green-500/5"
    >
      <div className="relative flex items-center justify-center w-2 h-2">
        <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-60" />
        <div className="relative w-1.5 h-1.5 rounded-full bg-green-500" />
      </div>
      <span className="text-green-500 text-[10px] font-bold uppercase tracking-[0.2em]">Live</span>
    </motion.div>
  );
}
