"use client";

import { useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Real 3D, done with the compositor rather than a renderer.
 *
 * `DepthScene` opens a perspective camera; `DepthLayer` children sit at
 * different Z depths inside it and rotate as one body with the pointer. Because
 * the layers are genuinely separated in Z, the parallax between them is computed
 * by the browser — near layers sweep further than far ones — instead of being
 * faked with per-layer offsets that always drift out of agreement.
 *
 * The cost is a transform on a handful of composited elements: no WebGL context,
 * no geometry, no shaders, nothing added to the bundle. That matters on the two
 * pages that sit deepest in the funnel, where a 3D library would be the heaviest
 * thing on the page and the first thing to jank on a mid-range phone.
 *
 * Pointer-driven only, and only for pointers that hover — a finger dragging a
 * page is scrolling, not orbiting a scene, and reduced-motion users get the flat
 * composition with every layer still in its right place.
 */
export function DepthScene({
  children,
  className,
  intensity = 1,
  perspective = 1200,
}: {
  children: React.ReactNode;
  className?: string;
  /** Multiplier on the rotation range. 1 ≈ 7°, which is as far as this should go. */
  intensity?: number;
  perspective?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion() ?? false;

  // -0.5 … 0.5 across the element.
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  const spring = { stiffness: 70, damping: 22, mass: 0.7 };
  const sx = useSpring(px, spring);
  const sy = useSpring(py, spring);

  const rotateY = useTransform(sx, [-0.5, 0.5], [-7 * intensity, 7 * intensity]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [5 * intensity, -5 * intensity]);

  function onPointerMove(e: React.PointerEvent) {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }

  function reset() {
    px.set(0);
    py.set(0);
  }

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      className={cn("relative", className)}
      style={{ perspective: `${perspective}px` }}
    >
      <motion.div
        style={
          reduce
            ? undefined
            : { rotateX, rotateY, transformStyle: "preserve-3d" as const }
        }
        className="relative h-full w-full"
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * One plane inside a DepthScene. `z` is in pixels — negative sits behind the
 * page surface, positive floats in front of it.
 */
export function DepthLayer({
  z = 0,
  children,
  className,
  style,
}: {
  z?: number;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const reduce = useReducedMotion() ?? false;
  return (
    <div
      className={className}
      style={{
        ...style,
        transform: reduce ? undefined : `translateZ(${z}px)`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * A gold specular sweep that tracks the pointer, so the 3D tilt reads as a
 * surface catching light rather than a box being rotated. Give it the same
 * pointer coordinates as the scene it sits in.
 */
export function useSpecular(px: MotionValue<number>, py: MotionValue<number>) {
  const x = useTransform(px, [-0.5, 0.5], ["0%", "100%"]);
  const y = useTransform(py, [-0.5, 0.5], ["0%", "100%"]);
  return useMotionTemplate`radial-gradient(420px circle at ${x} ${y}, color-mix(in oklab, var(--primary) 12%, transparent), transparent 62%)`;
}
