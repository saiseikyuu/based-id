"use client";

// Source: https://www.reactbits.dev/text-animations/rotating-text
// TypeScript port — CSS helper classes (.text-rotate-*) live in globals.css.

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  CSSProperties,
} from "react";
import { motion, AnimatePresence } from "motion/react";

function cx(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export interface RotatingTextProps {
  texts: string[];
  transition?: object;
  initial?: object;
  animate?: object;
  exit?: object;
  animatePresenceMode?: "wait" | "sync" | "popLayout";
  animatePresenceInitial?: boolean;
  rotationInterval?: number;
  staggerDuration?: number;
  staggerFrom?: "first" | "last" | "center" | "random" | number;
  loop?: boolean;
  auto?: boolean;
  splitBy?: "characters" | "words" | "lines" | string;
  onNext?: (index: number) => void;
  mainClassName?: string;
  splitLevelClassName?: string;
  elementLevelClassName?: string;
  className?: string;
  style?: CSSProperties;
}

export interface RotatingTextRef {
  next: () => void;
  previous: () => void;
  jumpTo: (index: number) => void;
  reset: () => void;
}

const RotatingText = forwardRef<RotatingTextRef, RotatingTextProps>((props, ref) => {
  const {
    texts,
    transition = { type: "spring", damping: 25, stiffness: 300 },
    initial = { y: "100%", opacity: 0 },
    animate = { y: 0, opacity: 1 },
    exit = { y: "-120%", opacity: 0 },
    animatePresenceMode = "wait",
    animatePresenceInitial = false,
    rotationInterval = 2000,
    staggerDuration = 0,
    staggerFrom = "first",
    loop = true,
    auto = true,
    splitBy = "characters",
    onNext,
    mainClassName,
    splitLevelClassName,
    elementLevelClassName,
    style,
    className,
  } = props;

  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  function splitIntoCharacters(text: string): string[] {
    if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const segmenter = new (Intl as any).Segmenter("en", { granularity: "grapheme" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return Array.from(segmenter.segment(text), (s: any) => s.segment as string);
    }
    return Array.from(text);
  }

  const elements = useMemo(() => {
    const currentText = texts[currentTextIndex];
    if (splitBy === "characters") {
      return currentText.split(" ").map((word, i, arr) => ({
        characters: splitIntoCharacters(word),
        needsSpace: i !== arr.length - 1,
      }));
    }
    if (splitBy === "words") {
      return currentText.split(" ").map((word, i, arr) => ({
        characters: [word],
        needsSpace: i !== arr.length - 1,
      }));
    }
    if (splitBy === "lines") {
      return currentText.split("\n").map((line, i, arr) => ({
        characters: [line],
        needsSpace: i !== arr.length - 1,
      }));
    }
    return currentText.split(splitBy).map((part, i, arr) => ({
      characters: [part],
      needsSpace: i !== arr.length - 1,
    }));
  }, [texts, currentTextIndex, splitBy]);

  const getStaggerDelay = useCallback(
    (index: number, totalChars: number) => {
      if (staggerFrom === "first") return index * staggerDuration;
      if (staggerFrom === "last") return (totalChars - 1 - index) * staggerDuration;
      if (staggerFrom === "center") return Math.abs(Math.floor(totalChars / 2) - index) * staggerDuration;
      if (staggerFrom === "random") return Math.abs(Math.floor(Math.random() * totalChars) - index) * staggerDuration;
      return Math.abs((staggerFrom as number) - index) * staggerDuration;
    },
    [staggerFrom, staggerDuration]
  );

  const handleIndexChange = useCallback(
    (newIndex: number) => {
      setCurrentTextIndex(newIndex);
      if (onNext) onNext(newIndex);
    },
    [onNext]
  );

  const next = useCallback(() => {
    const nextIndex =
      currentTextIndex === texts.length - 1
        ? loop ? 0 : currentTextIndex
        : currentTextIndex + 1;
    if (nextIndex !== currentTextIndex) handleIndexChange(nextIndex);
  }, [currentTextIndex, texts.length, loop, handleIndexChange]);

  const previous = useCallback(() => {
    const prevIndex =
      currentTextIndex === 0
        ? loop ? texts.length - 1 : currentTextIndex
        : currentTextIndex - 1;
    if (prevIndex !== currentTextIndex) handleIndexChange(prevIndex);
  }, [currentTextIndex, texts.length, loop, handleIndexChange]);

  const jumpTo = useCallback(
    (index: number) => {
      const valid = Math.max(0, Math.min(index, texts.length - 1));
      if (valid !== currentTextIndex) handleIndexChange(valid);
    },
    [texts.length, currentTextIndex, handleIndexChange]
  );

  const reset = useCallback(() => {
    if (currentTextIndex !== 0) handleIndexChange(0);
  }, [currentTextIndex, handleIndexChange]);

  useImperativeHandle(ref, () => ({ next, previous, jumpTo, reset }), [
    next, previous, jumpTo, reset,
  ]);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(next, rotationInterval);
    return () => clearInterval(id);
  }, [next, rotationInterval, auto]);

  return (
    <motion.span
      className={cx("text-rotate", mainClassName, className)}
      style={style}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      layout transition={transition as any}
    >
      <span className="text-rotate-sr-only">{texts[currentTextIndex]}</span>
      <AnimatePresence mode={animatePresenceMode} initial={animatePresenceInitial}>
        <motion.span
          key={currentTextIndex}
          className={cx(splitBy === "lines" ? "text-rotate-lines" : "text-rotate")}
          layout
          aria-hidden="true"
        >
          {elements.map((wordObj, wordIndex, array) => {
            const prevCount = array
              .slice(0, wordIndex)
              .reduce((sum, w) => sum + w.characters.length, 0);
            const totalChars = array.reduce((sum, w) => sum + w.characters.length, 0);
            return (
              <span key={wordIndex} className={cx("text-rotate-word", splitLevelClassName)}>
                {wordObj.characters.map((char, charIndex) => (
                  <motion.span
                    key={charIndex}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    initial={initial as any}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    animate={animate as any}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    exit={exit as any}
                    transition={{
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      ...(transition as any),
                      delay: getStaggerDelay(prevCount + charIndex, totalChars),
                    }}
                    className={cx("text-rotate-element", elementLevelClassName)}
                  >
                    {char}
                  </motion.span>
                ))}
                {wordObj.needsSpace && (
                  <span className="text-rotate-space">&nbsp;</span>
                )}
              </span>
            );
          })}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
});

RotatingText.displayName = "RotatingText";
export default RotatingText;
