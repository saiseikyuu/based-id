"use client";

/**
 * AnimatedBackground
 *
 * Aurora-style drifting gradient orbs + subtle dot-grid overlay.
 * Uses `motion` (already installed) — no extra packages needed.
 * Inspired by Aceternity UI / Linear / Vercel aurora patterns.
 *
 * Usage:
 *   <AnimatedBackground />          ← full page, fixed behind everything
 *   <AnimatedBackground section />  ← relative, fills parent section
 */

import { motion } from "motion/react";

interface Props {
  /** When true renders position:relative (section use). Default: fixed full-screen. */
  section?: boolean;
}

// Each orb: color, size, starting position, animation path
const ORBS = [
  {
    color: "radial-gradient(ellipse at center, #2563eb 0%, transparent 70%)",
    size: 900,
    x: ["10%", "55%", "20%", "10%"],
    y: ["15%", "60%", "80%", "15%"],
    duration: 28,
    opacity: 0.18,
  },
  {
    color: "radial-gradient(ellipse at center, #7c3aed 0%, transparent 70%)",
    size: 700,
    x: ["70%", "30%", "65%", "70%"],
    y: ["60%", "20%", "75%", "60%"],
    duration: 34,
    opacity: 0.14,
  },
  {
    color: "radial-gradient(ellipse at center, #0ea5e9 0%, transparent 70%)",
    size: 600,
    x: ["40%", "80%", "15%", "40%"],
    y: ["80%", "40%", "10%", "80%"],
    duration: 40,
    opacity: 0.12,
  },
  {
    color: "radial-gradient(ellipse at center, #6d28d9 0%, transparent 65%)",
    size: 500,
    x: ["80%", "10%", "60%", "80%"],
    y: ["10%", "70%", "35%", "10%"],
    duration: 45,
    opacity: 0.10,
  },
  {
    color: "radial-gradient(ellipse at center, #1d4ed8 0%, transparent 60%)",
    size: 400,
    x: ["20%", "65%", "45%", "20%"],
    y: ["45%", "15%", "65%", "45%"],
    duration: 36,
    opacity: 0.10,
  },
];

export default function AnimatedBackground({ section }: Props) {
  const posClass = section
    ? "absolute inset-0 overflow-hidden"
    : "fixed inset-0 overflow-hidden pointer-events-none";

  return (
    <div className={posClass} aria-hidden="true" style={{ zIndex: 0 }}>

      {/* ── Animated orbs ──────────────────────────────────────── */}
      {ORBS.map((orb, i) => (
        <motion.div
          key={i}
          animate={{ x: orb.x, y: orb.y }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: "easeInOut",
            repeatType: "loop",
          }}
          style={{
            position: "absolute",
            width: orb.size,
            height: orb.size,
            borderRadius: "50%",
            background: orb.color,
            opacity: orb.opacity,
            filter: "blur(80px)",
            // Start orb at first keyframe position
            left: `calc(${orb.x[0]} - ${orb.size / 2}px)`,
            top: `calc(${orb.y[0]} - ${orb.size / 2}px)`,
          }}
        />
      ))}

      {/* ── Dot grid overlay ──────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)",
        }}
      />

      {/* ── Vignette (darken edges so content stays readable) ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 120% 120% at 50% 0%, transparent 40%, rgba(10,10,10,0.85) 100%)",
        }}
      />
    </div>
  );
}
