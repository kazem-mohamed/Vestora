"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CircleAlert,
  Check,
  Info,
  ShieldAlert,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export type AlertTone = "info" | "success" | "warning" | "error" | "destructive";

/**
 * A toast and an alert answer different questions, so they are deliberately not the
 * same component and do not look interchangeable.
 *
 * A toast says *something just happened* — it arrives, it leaves, it never blocks, and
 * it is gone whether or not it was read. An alert says *this is true right now* — it
 * sits inside the layout, it stays as long as the condition holds, and it is allowed to
 * carry an explanation and an action. Confusing the two is how products end up
 * announcing permanent facts in a strip that vanishes after four seconds.
 *
 * What they share is the register: hairline rule, outlined glyph, gold as the house
 * accent. What differs is weight and geometry — a toast is a floating plate, an alert is
 * a ruled block that belongs to the column it sits in.
 *
 * `destructive` is separate from `error` on purpose. Error means something went wrong;
 * destructive means *you are about to break something*. They warrant different
 * prominence, and collapsing them is how a delete warning ends up looking like a failed
 * network request.
 */
const TONE: Record<
  AlertTone,
  { icon: LucideIcon; rule: string; glyph: string; surface: string; ring: string }
> = {
  info: {
    icon: Info,
    rule: "bg-border",
    glyph: "text-muted-foreground border-border",
    surface: "bg-card/45",
    ring: "border-border/70",
  },
  success: {
    icon: Check,
    rule: "bg-primary/60",
    glyph: "text-primary border-primary/35",
    surface: "bg-primary/[0.035]",
    ring: "border-primary/25",
  },
  warning: {
    icon: TriangleAlert,
    rule: "bg-bronze/60",
    glyph: "text-bronze border-bronze/35",
    surface: "bg-bronze/[0.04]",
    ring: "border-bronze/25",
  },
  error: {
    icon: CircleAlert,
    rule: "bg-destructive/60",
    glyph: "text-destructive border-destructive/35",
    surface: "bg-destructive/[0.035]",
    ring: "border-destructive/25",
  },
  destructive: {
    icon: ShieldAlert,
    rule: "bg-destructive",
    glyph: "text-destructive border-destructive/50",
    surface: "bg-destructive/[0.06]",
    ring: "border-destructive/40",
  },
};

export function Alert({
  tone = "info",
  title,
  children,
  action,
  onDismiss,
  dismissLabel,
  className,
  /** `assertive` for something that just failed; `polite` for standing context. */
  live,
}: {
  tone?: AlertTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
  live?: "polite" | "assertive";
}) {
  const reduce = useReducedMotion() ?? false;
  const t = TONE[tone];
  const Icon = t.icon;

  return (
    <motion.div
      // `alert` role only when it is announcing something new; a standing note that is
      // part of the page should not interrupt a screen reader every render.
      role={live === "assertive" ? "alert" : "status"}
      aria-live={live}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, height: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className={cn("overflow-hidden", className)}
    >
      <div
        className={cn(
          "relative flex gap-3 rounded-xl border px-3.5 py-3 backdrop-blur-sm",
          t.ring,
          t.surface
        )}
      >
        {/* Leading rule, logical so it flips in Arabic. This is the alert's tell —
            a toast has one too, but thinner and floating. */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-2.5 start-0 w-[2px] rounded-full",
            t.rule
          )}
        />

        <span
          aria-hidden
          className={cn(
            "mt-px grid size-6 shrink-0 place-items-center rounded-full border",
            t.glyph
          )}
        >
          <Icon className="size-3.5" strokeWidth={2} />
        </span>

        <div className="min-w-0 flex-1">
          {title && (
            <p
              className="text-[13px] font-semibold leading-snug"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {title}
            </p>
          )}
          {children && (
            <div
              className={cn(
                "text-[12.5px] leading-relaxed text-muted-foreground",
                title && "mt-1"
              )}
            >
              {children}
            </div>
          )}
          {action && <div className="mt-3 flex flex-wrap items-center gap-2">{action}</div>}
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            data-cursor="hover"
            aria-label={dismissLabel}
            className="-me-1 -mt-1 grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground/70 outline-none transition-colors duration-300 hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/25"
          >
            <X className="size-3.5" strokeWidth={2} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Wraps a conditional alert so it animates in and out instead of appearing and
 * disappearing between renders. `show` is separate from `children` so the exit
 * animation still has content to play against.
 */
export function AlertSlot({ show, children }: { show: boolean; children: React.ReactNode }) {
  return <AnimatePresence initial={false}>{show ? children : null}</AnimatePresence>;
}
