"use client";

import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Line-by-line masked reveal — the hero headline treatment, generalized.
 * `text` uses "|" as a line delimiter; each line rises out of an
 * overflow-hidden mask with a stagger once it scrolls into view.
 *
 * `loose` pads the mask vertically for scripts with tall flourishes
 * (Aref Ruqaa) that a tight mask would clip.
 */
export function MaskedLines({
  text,
  className,
  delay = 0,
  stagger = 0.14,
  loose = false,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  loose?: boolean;
}) {
  const reduce = useReducedMotion();
  const lines = text.split("|").map((l) => l.trim()).filter(Boolean);

  if (reduce) {
    return <p className={className}>{lines.join(" ")}</p>;
  }

  return (
    <p className={className}>
      <span className="sr-only">{lines.join(" ")}</span>
      {lines.map((line, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`block overflow-hidden ${loose ? "-my-3 py-3" : "pb-1"}`}
        >
          <motion.span
            className="block"
            initial={{ y: "115%" }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{
              duration: 0.95,
              delay: delay + i * stagger,
              ease: EASE,
            }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </p>
  );
}
