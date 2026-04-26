"use client";

import { useEffect, useRef } from "react";

// ── Full-page fixed background ───────────────────────────────────────────────
// Layers (back to front):
//  1. Base black
//  2. Dot grid overlay
//  3. Noise grain SVG texture
//  4. Five drifting gradient blobs (blue, purple, cyan, orange-accent, violet)
//  5. Radial vignette to darken edges
export function BackgroundEffects() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#030305]" aria-hidden="true">

      {/* ── 1. Dot grid ── */}
      <div className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.055) 1px, transparent 0)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* ── 2. SVG noise grain (adds tactility) ── */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.028] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <filter id="bg-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#bg-noise)" />
      </svg>

      {/* ── 3. Gradient blobs ── */}

      {/* Blue — primary brand, top-center */}
      <div className="blob-1 absolute -top-[30%] left-1/2 -translate-x-1/2"
        style={{
          width: "140vw", height: "80vh",
          background: "radial-gradient(ellipse, rgba(37,99,235,0.22) 0%, rgba(37,99,235,0.05) 40%, transparent 70%)",
          filter: "blur(2px)",
        }}
      />

      {/* Purple — right side, mid */}
      <div className="blob-2 absolute top-[20%] -right-[20%]"
        style={{
          width: "70vw", height: "70vh",
          background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, rgba(124,58,237,0.04) 45%, transparent 70%)",
          filter: "blur(2px)",
        }}
      />

      {/* Cyan — left side, lower */}
      <div className="blob-3 absolute top-[55%] -left-[15%]"
        style={{
          width: "55vw", height: "55vh",
          background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, rgba(6,182,212,0.03) 45%, transparent 70%)",
          filter: "blur(2px)",
        }}
      />

      {/* Orange accent — bottom-right (S-rank hunter color, very subtle) */}
      <div className="blob-1 absolute bottom-[5%] right-[10%]"
        style={{
          animationDelay: "-9s",
          width: "40vw", height: "40vh",
          background: "radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 65%)",
          filter: "blur(2px)",
        }}
      />

      {/* Violet — center, far back (depth layer) */}
      <div className="blob-2 absolute top-[40%] left-[40%]"
        style={{
          animationDelay: "-14s",
          width: "60vw", height: "50vh",
          background: "radial-gradient(ellipse, rgba(91,33,182,0.08) 0%, transparent 65%)",
          filter: "blur(4px)",
        }}
      />

      {/* ── 4. Edge vignette — darkens corners so content pops ── */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 85% 70% at 50% 45%, transparent 50%, rgba(0,0,0,0.65) 100%)",
        }}
      />
    </div>
  );
}

// ── Animated canvas particles (Aceternity-inspired Sparkles) ─────────────────
export function Particles({ count = 60 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    type Dot = { x: number; y: number; vx: number; vy: number; r: number; opacity: number; phase: number; speed: number };
    const dots: Dot[] = Array.from({ length: count }, () => ({
      x:       Math.random() * canvas.width,
      y:       Math.random() * canvas.height,
      vx:      (Math.random() - 0.5) * 0.15,
      vy:      (Math.random() - 0.5) * 0.15,
      r:       Math.random() * 1.2 + 0.3,
      opacity: Math.random() * 0.5 + 0.1,
      phase:   Math.random() * Math.PI * 2,
      speed:   Math.random() * 0.006 + 0.003,
    }));

    const COLORS = ["#60a5fa", "#a78bfa", "#22d3ee", "#f97316", "#fbbf24"];

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      dots.forEach((d, i) => {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0) d.x = canvas.width;
        if (d.x > canvas.width) d.x = 0;
        if (d.y < 0) d.y = canvas.height;
        if (d.y > canvas.height) d.y = 0;

        const pulse = Math.sin(frame * d.speed + d.phase) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = COLORS[i % COLORS.length];
        ctx.globalAlpha = d.opacity * pulse;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[1] pointer-events-none"
      style={{ opacity: 0.55 }}
    />
  );
}
