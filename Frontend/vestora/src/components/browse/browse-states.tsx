"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Compass, TriangleAlert } from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { EASE, stepDelay } from "@/lib/browse/motion";
import { categoryLabelKey } from "@/lib/config/categories";
import { useLocale } from "@/lib/i18n/locale";
import type { FacetValue } from "@/lib/types/api";

/** Placeholder grid that matches the real card geometry exactly — plate on top,
 *  information block below — so nothing shifts when the data lands. */
export function BrowseSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-card/40"
        >
          <div className="skeleton-shimmer aspect-[16/10] w-full" />
          <div className="space-y-3 p-5">
            <div className="skeleton-shimmer h-5 w-2/3 rounded" />
            <div className="skeleton-shimmer h-3.5 w-full rounded" />
            <div className="skeleton-shimmer h-3.5 w-1/3 rounded" />
            <div className="skeleton-shimmer mt-4 h-1 w-full rounded-full" />
            <div className="skeleton-shimmer h-3 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * A dead end is a failure of the tool, not the user. When nothing matches we say
 * what was searched for and offer the nearest real routes out — sectors that DO
 * have ventures right now, straight from the facet counts.
 */
export function BrowseEmpty({
  suggestions,
  onPick,
  onClear,
}: {
  suggestions: FacetValue[];
  onPick: (sector: string) => void;
  onClear: () => void;
}) {
  const { t } = useLocale();
  const reduce = useReducedMotion() ?? false;

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="rounded-[1.5rem] border border-dashed border-border bg-card/30 px-6 py-16 text-center"
    >
      <Compass className="mx-auto size-8 text-primary/70" strokeWidth={1.4} aria-hidden />
      <h2
        className="mt-5 text-2xl font-bold"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {t("browse.empty.title")}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        {t("browse.empty.body")}
      </p>

      {suggestions.length > 0 && (
        <div className="mt-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
            {t("browse.empty.try")}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {suggestions.map((s, i) => (
              <motion.button
                key={s.value}
                type="button"
                data-cursor="hover"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 + stepDelay(i), ease: EASE }}
                onClick={() => onPick(s.value)}
                className="rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                {t(categoryLabelKey(s.value))}
                <span className="font-numeric ms-1.5 text-xs text-muted-foreground/60">
                  {s.count}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      <PillButton variant="outline" onClick={onClear} showArrow={false} className="mt-8">
        {t("browse.empty.reset")}
      </PillButton>
    </motion.div>
  );
}

export function BrowseError({ onRetry }: { onRetry: () => void }) {
  const { t } = useLocale();
  return (
    <div className="rounded-[1.5rem] border border-border bg-card/40 px-6 py-16 text-center">
      <TriangleAlert className="mx-auto size-8 text-destructive/80" strokeWidth={1.4} aria-hidden />
      <h2 className="mt-5 text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
        {t("browse.error.title")}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        {t("browse.error.body")}
      </p>
      <PillButton onClick={onRetry} className="mt-6">
        {t("browse.error.retry")}
      </PillButton>
    </div>
  );
}
