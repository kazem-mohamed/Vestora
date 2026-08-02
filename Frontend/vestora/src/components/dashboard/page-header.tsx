"use client";

import { motion } from "framer-motion";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Shared header for the control-room sub-pages. */
export function DashPageHeader({
  title,
  sub,
  action,
  eyebrowKey = "dash.eyebrow",
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
  eyebrowKey?: string;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        <p className={cn("text-[11px] text-primary", rtl ? "" : "uppercase tracking-[0.28em]")}>
          {t(eyebrowKey)}
        </p>
        <h1
          className={cn("mt-2 text-2xl font-bold sm:text-3xl", rtl ? "leading-[1.3]" : "leading-[1.08]")}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {title}
        </h1>
        {sub && <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </motion.div>
  );
}
