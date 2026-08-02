"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Compass, Wallet } from "lucide-react";
import { compactUsd } from "@/lib/format/money";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { PublicProfileDetail } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * What this investor actually backs, and at what size.
 *
 * These three fields have been stored, returned by the API and typed on the
 * client since the investor-profile work — and rendered nowhere, so the form in
 * settings wrote into a void. They are the whole reason a founder opens an
 * investor's profile: thesis answers "would they even look at me", ticket range
 * answers "are we the right size for each other". Absent them, an investor
 * profile is a name and a follower count.
 *
 * Rendered only when there is something real to say. No placeholders, no
 * "not specified" rows — an empty mandate is silence, not a blank form.
 */
export function InvestmentMandate({ profile }: { profile: PublicProfileDetail }) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;

  const thesis = profile.investmentThesis?.trim();
  const { ticketMin, ticketMax } = profile;
  const hasTicket = ticketMin != null || ticketMax != null;

  if (!thesis && !hasTicket) return null;

  // Only the ends we actually know. A single-sided range reads as "from $50K"
  // rather than inventing the other bound.
  const ticket =
    ticketMin != null && ticketMax != null
      ? `${compactUsd(ticketMin)} – ${compactUsd(ticketMax)}`
      : ticketMin != null
        ? t("profile.mandate.from").replace("{v}", compactUsd(ticketMin))
        : t("profile.mandate.upTo").replace("{v}", compactUsd(ticketMax!));

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease: EASE }}
      className="mt-7 overflow-hidden rounded-2xl border border-border/70 bg-background/40 backdrop-blur-sm"
    >
      <span
        aria-hidden
        className="pointer-events-none block h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent"
      />
      <div className="grid gap-px bg-border/40 sm:grid-cols-[1.6fr_1fr]">
        {thesis && (
          <div className="bg-card/50 p-5 sm:p-6">
            <p className="flex items-center gap-2 text-[11px] text-primary">
              <Compass className="size-3.5" strokeWidth={1.8} />
              <span className={rtl ? "" : "uppercase tracking-[0.22em]"}>
                {t("profile.mandate.thesis")}
              </span>
            </p>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/85">
              {thesis}
            </p>
          </div>
        )}

        {hasTicket && (
          <div className={cn("bg-card/50 p-5 sm:p-6", !thesis && "sm:col-span-2")}>
            <p className="flex items-center gap-2 text-[11px] text-primary">
              <Wallet className="size-3.5" strokeWidth={1.8} />
              <span className={rtl ? "" : "uppercase tracking-[0.22em]"}>
                {t("profile.mandate.ticket")}
              </span>
            </p>
            <p className="font-numeric mt-3 text-xl text-foreground sm:text-2xl">{ticket}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {t("profile.mandate.ticketHint")}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
