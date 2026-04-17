"use client";

// Source: https://www.reactbits.dev/text-animations/blur-text
// Ported to TypeScript with added `style` and `tag` props.

import { motion } from "motion/react";
import { useEffect, useRef, useState, useMemo, CSSProperties } from "react";

interface KeyframeStep {
  filter?: string;
  opacity?: number;
  y?: number;
}

type EasingFn = (t: number) => number;

interface BlurTextProps {
  text?: string;
  delay?: number;
  className?: string;
  style?: CSSProperties;
  animateBy?: "words" | "chars";
  direction?: "top" | "bottom";
  threshold?: number;
  rootMargin?: string;
  animationFrom?: KeyframeStep;
  animationTo?: KeyframeStep[];
  easing?: EasingFn;
  onAnimationComplete?: () => void;
  stepDuration?: number;
}

function buildKeyframes(from: KeyframeStep, steps: KeyframeStep[]) {
  const keys = new Set([
    ...Object.keys(from),
    ...steps.flatMap((s) => Object.keys(s)),
  ]) as Set<keyof KeyframeStep>;
  const keyframes: Partial<Record<keyof KeyframeStep, (string | number | undefined)[]>> = {};
  keys.forEach((k) => {
    keyframes[k] = [from[k], ...steps.map((s) => s[k])];
  });
  return keyframes;
}

export default function BlurText({
  text = "",
  delay = 150,
  className = "",
  style,
  animateBy = "words",
  direction = "bottom",
  threshold = 0.1,
  rootMargin = "0px",
  animationFrom,
  animationTo,
  easing = (t) => t,
  onAnimationComplete,
  stepDuration = 0.35,
}: BlurTextProps) {
  const elements = animateBy === "words" ? text.split(" ") : text.split("");
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (ref.current) observer.unobserve(ref.current);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const defaultFrom = useMemo(
    () =>
      direction === "top"
        ? { filter: "blur(8px)", opacity: 0, y: -20 }
        : { filter: "blur(8px)", opacity: 0, y: 20 },
    [direction]
  );

  const defaultTo = useMemo(
    () => [
      { filter: "blur(4px)", opacity: 0.5, y: direction === "top" ? 4 : -4 },
      { filter: "blur(0px)", opacity: 1, y: 0 },
    ],
    [direction]
  );

  const fromSnapshot = animationFrom ?? defaultFrom;
  const toSnapshots = animationTo ?? defaultTo;
  const stepCount = toSnapshots.length + 1;
  const totalDuration = stepDuration * (stepCount - 1);
  const times = Array.from({ length: stepCount }, (_, i) =>
    stepCount === 1 ? 0 : i / (stepCount - 1)
  );

  return (
    <p
      ref={ref}
      className={className}
      style={{ display: "flex", flexWrap: "wrap", ...style }}
    >
      {elements.map((segment, index) => {
        const animateKeyframes = buildKeyframes(fromSnapshot, toSnapshots);
        return (
          <motion.span
            className="inline-block will-change-[transform,filter,opacity]"
            key={index}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initial={fromSnapshot as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            animate={(inView ? animateKeyframes : fromSnapshot) as any}
            transition={{
              duration: totalDuration,
              times,
              delay: (index * delay) / 1000,
              ease: easing,
            }}
            onAnimationComplete={
              index === elements.length - 1 ? onAnimationComplete : undefined
            }
          >
            {segment === " " ? "\u00A0" : segment}
            {animateBy === "words" && index < elements.length - 1 && "\u00A0"}
          </motion.span>
        );
      })}
    </p>
  );
}
