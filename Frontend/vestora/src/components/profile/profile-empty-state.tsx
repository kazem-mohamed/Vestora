"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Shared, considered empty state: a haloed brand icon, a heading, one line of
 * guidance and an optional CTA. Used across the profile's ventures / backed
 * grids and the followers / following lists so no surface ever renders bare.
 */
export function ProfileEmptyState({
  icon: Icon,
  title,
  body,
  ctaLabel,
  ctaHref,
  compact,
  className,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  compact?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.7, ease: EASE }}
      className={cn(
        "relative flex flex-col items-center overflow-hidden rounded-2xl border border-dashed border-border/70 bg-card/30 text-center backdrop-blur-sm",
        compact ? "px-6 py-12" : "px-6 py-16 sm:py-20",
        className
      )}
    >
      {/* Soft brand glow behind the icon so the state never feels flat */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{
          backgroundImage:
            "radial-gradient(60% 100% at 50% 0%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 70%)",
        }}
      />
      <span className="relative grid size-14 place-items-center rounded-full border border-primary/25 bg-primary/[0.06] text-primary">
        {!reduce && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full ring-1 ring-primary/30"
            animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <Icon className="size-6" strokeWidth={1.5} />
      </span>
      <h3 className="relative mt-5 text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>
        {title}
      </h3>
      <p className="relative mt-2 max-w-xs text-sm text-muted-foreground">{body}</p>
      {ctaLabel && ctaHref && (
        <PillButton href={ctaHref} size="sm" className="relative mt-6">
          {ctaLabel}
        </PillButton>
      )}
    </motion.div>
  );
}
