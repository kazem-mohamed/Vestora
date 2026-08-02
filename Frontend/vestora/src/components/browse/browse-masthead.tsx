"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { EASE, maskedLineVariants, stagger, staticVariants } from "@/lib/browse/motion";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { ProjectFacets } from "@/lib/types/api";

/**
 * A deliberately short opening.
 *
 * The old hero pushed the first venture 714px down the page — on a 1366×768
 * laptop the entire first screen was a title. This states what the room is, backs
 * it with the live inventory, and hands the screen over to the ventures.
 */
export function BrowseMasthead({ facets }: { facets?: ProjectFacets }) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;

  return (
    <motion.header
      variants={reduce ? staticVariants : stagger(0.07)}
      initial="hidden"
      animate="show"
      className="relative"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-10 -top-24 -z-10 h-72 opacity-80"
        style={{
          backgroundImage:
            "radial-gradient(55% 70% at 18% 0%, color-mix(in oklab, var(--primary) 13%, transparent), transparent 65%), radial-gradient(45% 60% at 92% 10%, color-mix(in oklab, var(--bronze) 11%, transparent), transparent 65%)",
        }}
      />

      <p className="overflow-hidden">
        <motion.span
          variants={reduce ? staticVariants : maskedLineVariants}
          className={cn(
            "block text-[11px] text-primary",
            rtl ? "" : "uppercase tracking-[0.32em]"
          )}
        >
          {t("browse.eyebrow")}
        </motion.span>
      </p>

      <h1 className="mt-4 overflow-hidden">
        <motion.span
          variants={reduce ? staticVariants : maskedLineVariants}
          className={cn(
            "block max-w-3xl text-4xl font-bold sm:text-5xl lg:text-6xl",
            rtl ? "leading-[1.35]" : "leading-[1.04] tracking-[-0.025em]"
          )}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {t("browse.title")}
        </motion.span>
      </h1>

      <motion.div
        variants={
          reduce
            ? staticVariants
            : {
                hidden: { opacity: 0, y: 14 },
                show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
              }
        }
        className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
      >
        <Stat value={facets?.total ?? 0} label={t("browse.stat.ventures")} />
        <span aria-hidden className="h-4 w-px bg-border" />
        <Stat value={facets?.open ?? 0} label={t("browse.stat.open")} />
        <span aria-hidden className="h-4 w-px bg-border" />
        <Stat value={facets?.fullyCommitted ?? 0} label={t("browse.stat.committed")} />
      </motion.div>
    </motion.header>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-numeric text-base text-foreground">
        <AnimatedNumber value={value} format={(v) => String(v)} duration={1.1} />
      </span>
      <span>{label}</span>
    </span>
  );
}
