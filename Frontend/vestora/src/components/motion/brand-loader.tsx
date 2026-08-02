"use client";

import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The Vestora loading moment — the mark draws itself in gold over a soft
 * pulsing aura, with a thin indeterminate rail beneath. Used wherever a full
 * region waits on data (route guard, page bootstraps), in place of a bare
 * spinner. Reduced-motion falls back to the static mark.
 */
export function BrandLoader({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div
      className={`flex min-h-[55vh] flex-1 flex-col items-center justify-center gap-8 ${className ?? ""}`}
      role="status"
      aria-live="polite"
      aria-label={label ?? "Loading"}
    >
      <div className="relative grid place-items-center">
        {/* Soft gold aura */}
        {!reduce && (
          <motion.div
            aria-hidden="true"
            className="absolute size-32 rounded-full"
            style={{
              background:
                "radial-gradient(50% 50% at 50% 50%, color-mix(in srgb, var(--primary) 18%, transparent) 0%, transparent 70%)",
            }}
            animate={{ opacity: [0.25, 0.65, 0.25], scale: [0.85, 1.1, 0.85] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* The mark, drawing itself */}
        <svg viewBox="430 247 340 340" className="relative size-16" aria-hidden="true">
          <motion.path
            d="M470 300 L600 530"
            stroke="var(--primary)"
            strokeWidth="26"
            strokeLinecap="round"
            fill="none"
            initial={reduce ? false : { pathLength: 0, opacity: 0.4 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              repeatType: "reverse",
              ease: EASE,
            }}
          />
          <motion.path
            d="M730 300 L600 530"
            stroke="var(--bronze)"
            strokeWidth="26"
            strokeLinecap="round"
            fill="none"
            initial={reduce ? false : { pathLength: 0, opacity: 0.4 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              duration: 1.1,
              delay: 0.12,
              repeat: Infinity,
              repeatType: "reverse",
              ease: EASE,
            }}
          />
          <motion.circle
            cx="600"
            cy="530"
            r="18"
            className="fill-foreground"
            animate={reduce ? undefined : { opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      </div>

      {/* Indeterminate gold rail */}
      <div className="h-px w-32 overflow-hidden bg-border/60">
        {reduce ? (
          <div className="h-full w-full bg-primary/40" />
        ) : (
          <motion.div
            className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent"
            animate={{ x: ["-120%", "360%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>

      {label && (
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          {label}
        </p>
      )}
    </div>
  );
}
