"use client";

// Source: https://www.reactbits.dev/components/spotlight-card
// Ported to TypeScript; spotlight implemented via a div overlay
// instead of CSS ::before to avoid an external CSS file dependency.

import { useRef, useState, ReactNode, CSSProperties } from "react";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  spotlightColor?: string;
}

export default function SpotlightCard({
  children,
  className = "",
  style,
  spotlightColor = "rgba(37, 99, 235, 0.07)",
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: "50%", y: "50%" });
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPos({
      x: `${e.clientX - rect.left}px`,
      y: `${e.clientY - rect.top}px`,
    });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative overflow-hidden ${className}`}
      style={style}
    >
      {/* Spotlight layer */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: hovered ? 1 : 0,
          background: `radial-gradient(circle at ${pos.x} ${pos.y}, ${spotlightColor}, transparent 70%)`,
        }}
      />
      {children}
    </div>
  );
}
