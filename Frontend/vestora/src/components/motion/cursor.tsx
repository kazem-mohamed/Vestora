"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";

/**
 * Custom cursor for the landing / showpiece pages: a small gold ring that
 * trails the pointer and expands over interactive elements. Elements with a
 * `data-cursor-text` attribute grow the ring into a labeled gold disc (e.g.
 * "View" over a project card). Desktop only — disabled where the primary
 * pointer is coarse (touch).
 */
export function CustomCursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.25 });
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.25 });
  const [hovering, setHovering] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    setEnabled(true);

    function move(e: MouseEvent) {
      x.set(e.clientX);
      y.set(e.clientY);
    }
    function over(e: MouseEvent) {
      const t = e.target as HTMLElement | null;
      const labelled = t?.closest<HTMLElement>("[data-cursor-text]");
      setLabel(labelled?.dataset.cursorText || null);
      setHovering(!!t?.closest("a, button, [data-cursor='hover']"));
    }

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseover", over);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over);
    };
  }, [x, y]);

  if (!enabled) return null;

  // Over a labelled target → big gold disc; over any clickable → a small filled
  // gold dot (a precise "press here"); otherwise → a hollow ring.
  const size = label ? 72 : hovering ? 10 : 24;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[100] hidden lg:block"
      style={{ x: sx, y: sy }}
    >
      <motion.div
        animate={{
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          backgroundColor:
            label || hovering ? "rgba(199,169,104,0.92)" : "rgba(199,169,104,0)",
          borderColor: hovering && !label ? "rgba(199,169,104,0)" : "rgba(199,169,104,1)",
        }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-center rounded-full border"
      >
        <AnimatePresence>
          {label && (
            <motion.span
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.18 }}
              className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1e140f]"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
