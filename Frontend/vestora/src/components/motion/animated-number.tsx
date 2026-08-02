"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Count-up number rendered through a MotionValue — framer writes the text
 * straight into the DOM node every frame, so React never re-renders during
 * the animation (the old useState-per-frame approach re-rendered 60×/s).
 *
 * The motion value starts at the REAL number, not at zero. A count-up is a
 * flourish on top of a fact, and the fact has to survive the flourish failing:
 * a backgrounded tab, a stalled frame loop or a delay that never gets its first
 * frame all leave the animation unstarted, and starting from zero meant the
 * number on screen was then wrong rather than merely still. On a funding panel
 * that read "$0" for a venture carrying real commitments.
 */
export function AnimatedNumber({
  value,
  format,
  active = true,
  duration = 1.5,
  delay = 0,
  className,
}: {
  value: number;
  format: (v: number) => string;
  /** Start the count-up (e.g. pass an inView flag). */
  active?: boolean;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion() ?? false;
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => format(Math.round(v)));

  useEffect(() => {
    // Anything that means "no count-up" resolves to the true number immediately.
    if (!active || reduce) {
      mv.set(value);
      return;
    }
    // A hidden document gets no animation frames, so a delayed animation would
    // never even start. Show the truth instead of an unstarted zero.
    if (typeof document !== "undefined" && document.hidden) {
      mv.set(value);
      return;
    }

    mv.set(0);
    const controls = animate(mv, value, { duration, delay, ease: EASE });
    return () => {
      controls.stop();
      // Never leave a half-counted number frozen on screen.
      mv.set(value);
    };
  }, [active, value, duration, delay, reduce, mv]);

  return <motion.span className={className}>{text}</motion.span>;
}
