"use client";

// Source: https://www.reactbits.dev/text-animations/shiny-text
// Simplified TypeScript port — CSS keyframe in globals.css, no external file needed.

import { CSSProperties } from "react";

interface ShinyTextProps {
  text: string;
  speed?: number;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
}

export default function ShinyText({
  text,
  speed = 5,
  className = "",
  style,
  disabled = false,
}: ShinyTextProps) {
  return (
    <span
      className={className}
      style={{
        backgroundImage:
          "linear-gradient(120deg, #52525b 0%, #52525b 38%, #d4d4d8 50%, #52525b 62%, #52525b 100%)",
        backgroundSize: "200% auto",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        animation: disabled ? undefined : `shiny-sweep ${speed}s linear infinite`,
        ...style,
      }}
    >
      {text}
    </span>
  );
}
