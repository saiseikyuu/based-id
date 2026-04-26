"use client";

// ── Aceternity UI — Aurora Background ────────────────────────────────────────
// Ported from https://ui.aceternity.com/components/aurora-background
// Adapted for Based ID dark theme with blue/indigo/violet palette
export function AuroraBackground() {
  return (
    <div
      className="fixed inset-0 z-0 bg-[#060608] overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* Aurora layer */}
      <div
        className={[
          // Aurora repeating gradient (brand colors: blue, indigo, violet, cyan)
          "[--aurora:repeating-linear-gradient(100deg,#1d4ed8_0%,#3730a3_15%,#4f46e5_25%,#0ea5e9_35%,#2563eb_45%,#6d28d9_55%,#1d4ed8_70%)]",
          // The base layer
          "[background-image:var(--aurora)]",
          "[background-size:300%_200%]",
          "[background-position:50%_50%]",
          // Animate
          "animate-aurora",
          // Blur and dim — key for the "aurora" softness
          "blur-[120px]",
          "opacity-[0.28]",
          // After pseudo: second aurora pass (offset animation gives depth)
          "after:content-[''] after:absolute after:inset-0",
          "after:[background-image:var(--aurora)]",
          "after:[background-size:200%_100%]",
          "after:[background-position:50%_50%]",
          "after:animate-aurora",
          "after:[animation-delay:-15s]",
          "after:blur-[80px]",
          "after:opacity-60",
          // Mask: visible at top, fades toward bottom — not everywhere
          "[mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black_30%,transparent_100%)]",
          // Position
          "absolute inset-0 will-change-transform",
        ].join(" ")}
      />

      {/* Subtle dot grid over the aurora */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Bottom fade — keeps lower sections dark and readable */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, transparent 35%, #060608 75%)",
        }}
      />
    </div>
  );
}
