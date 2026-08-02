"use client";

import { motion, useReducedMotion } from "framer-motion";
import { compactUsd } from "@/lib/format/money";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

/**
 * How much of a round has been paid for, and how much is merely spoken for.
 *
 * Two layers on one rail, because they are two different facts. The headline
 * figure is settled money; the faint band behind it is approved commitments. The
 * card used to show commitments alone, which was honest while the platform moved
 * no money and became misleading the moment it did.
 *
 * When the two are equal the ghost band is omitted rather than drawn underneath —
 * a fully settled round should read as one clean bar.
 */
export function CommitmentRail({
  committed,
  funded,
  target,
  pct,
  committedPct,
  complete,
  size = "sm",
}: {
  committed: number;
  /** Settled money. The number the rail leads with. */
  funded: number;
  target: number;
  /** Percentage of the goal funded. */
  pct: number;
  /** Percentage committed. Always ≥ pct. */
  committedPct: number;
  complete: boolean;
  size?: "sm" | "lg";
}) {
  const { t, locale } = useLocale();
  const reduce = useReducedMotion() ?? false;
  // The rail must fill from the reading edge, so it grows the same direction the
  // eye travels in both scripts.
  const origin = locale === "ar" ? "right" : "left";
  const showGhost = committedPct - pct > 0.5;

  return (
    <div>
      <div
        className={cn(
          "flex items-baseline justify-between gap-2",
          size === "lg" ? "text-sm" : "text-xs"
        )}
      >
        <p className="min-w-0 truncate">
          <span className={cn("font-numeric text-bronze", size === "lg" && "text-lg")}>
            {compactUsd(funded)}
          </span>{" "}
          <span className="text-muted-foreground">
            {t("browse.rail.of")} {compactUsd(target)}
          </span>
        </p>
        <p
          className={cn(
            "font-numeric shrink-0",
            complete ? "text-primary" : "text-muted-foreground"
          )}
        >
          {pct}%
        </p>
      </div>

      <div
        className={cn(
          "relative mt-2 w-full overflow-hidden rounded-full bg-secondary",
          size === "lg" ? "h-1.5" : "h-1"
        )}
      >
        {showGhost && (
          <motion.div
            initial={reduce ? false : { scaleX: 0 }}
            whileInView={{ scaleX: committedPct / 100 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: origin }}
            className="absolute inset-0 h-full w-full rounded-full bg-bronze/35"
          />
        )}
        <motion.div
          initial={reduce ? false : { scaleX: 0 }}
          whileInView={{ scaleX: pct / 100 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: origin }}
          className={cn(
            "absolute inset-0 h-full w-full rounded-full",
            complete ? "bg-primary" : "bg-gradient-to-r from-bronze to-primary"
          )}
        />
      </div>

      <p
        className={cn(
          "mt-1.5 text-[11px] text-muted-foreground/80",
          size === "lg" && "text-xs"
        )}
      >
        {complete
          ? t("fund.status.Funded")
          : showGhost
            ? t("venture.committed.also").replace("{committed}", compactUsd(committed))
            : t("browse.rail.committed")}
      </p>
    </div>
  );
}
