"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Banknote, Clock3, Eye, Sparkles, Radio, CheckCircle2 } from "lucide-react";
import { SIGNAL_LABEL_KEY, type VentureSignal } from "@/lib/browse/signals";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const ICON: Record<VentureSignal, typeof Clock3> = {
  funded: Banknote,
  closing: Clock3,
  committed: CheckCircle2,
  fresh: Sparkles,
  active: Radio,
  watched: Eye,
};

/**
 * Editorial marker on a venture. Each one states a fact the data supports —
 * "closing" means the round really is mostly spoken for. Deliberately restrained:
 * one per card, small, and only gold for the ones that carry weight.
 */
export function SignalMark({ signal }: { signal: VentureSignal }) {
  const { t } = useLocale();
  const reduce = useReducedMotion() ?? false;
  const Icon = ICON[signal];
  const accent = signal === "funded" || signal === "closing" || signal === "committed";

  return (
    <motion.span
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium backdrop-blur-sm",
        accent
          ? "bg-primary/85 text-primary-foreground"
          : "bg-black/40 text-[#e6dccb]"
      )}
    >
      <Icon className="size-3" strokeWidth={2} aria-hidden />
      {t(SIGNAL_LABEL_KEY[signal])}
    </motion.span>
  );
}
