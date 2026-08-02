"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Banknote, Clock3, Hourglass, Wallet } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import {
  EASE,
  SandboxBadge,
  compactMoney,
  money,
  useRelativeTime,
} from "@/components/funding/funding-primitives";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { AwaitingPayment, FounderKpis } from "@/lib/types/api";

/**
 * The founder's money, as a ladder rather than four equal tiles.
 *
 * Interest, committed, funded and net proceeds are not peers — they are the same
 * capital at four different distances from the founder's hands, and each rung is
 * a subset of the one before it. Rendering them as a KPI grid said they were
 * independent measurements, which is exactly the confusion that let a dashboard
 * show approvals and call them raised.
 *
 * So the rungs step: each one is drawn narrower and lit brighter than the last,
 * and the eye travels left-to-right through the funnel. The two figures that
 * describe money the founder can actually count on — funded and net — are the
 * ones that carry weight.
 */
export function FounderFundingLadder({ kpis, feeRateBps }: { kpis: FounderKpis; feeRateBps: number }) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;
  const rate = (feeRateBps / 100).toString().replace(/\.0$/, "");

  const rungs = [
    {
      key: "interest",
      icon: Clock3,
      label: t("dash.fund.interest"),
      sub: t("dash.fund.interestSub"),
      value: kpis.pendingRequestsAmount,
      weight: 0 as const,
    },
    {
      key: "committed",
      icon: Wallet,
      label: t("dash.fund.committed"),
      sub: t("dash.fund.committedSub"),
      value: kpis.totalCommitted,
      weight: 1 as const,
    },
    {
      key: "funded",
      icon: Banknote,
      label: t("dash.fund.funded"),
      sub: t("dash.fund.fundedSub"),
      value: kpis.totalFunded,
      weight: 3 as const,
    },
    {
      key: "net",
      icon: Banknote,
      label: t("dash.fund.net"),
      sub: t("dash.fund.netSub").replace("{rate}", rate),
      value: kpis.netProceeds,
      weight: 2 as const,
    },
  ];

  // The widest rung sets the scale, so the bars are honest about proportion
  // rather than each filling its own tile.
  const max = Math.max(...rungs.map((r) => r.value), 1);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/50 p-5 backdrop-blur-sm sm:p-6">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{t("dash.fund.chartBoth")}</h2>
        <SandboxBadge />
      </div>

      <div className="mt-5 space-y-3.5">
        {rungs.map((r, i) => {
          const pct = Math.max(2, (r.value / max) * 100);
          const strong = r.weight >= 2;
          return (
            <motion.div
              key={r.key}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: rtl ? 12 : -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: EASE }}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                  <r.icon
                    className={cn("size-3.5 shrink-0", strong ? "text-primary" : "text-muted-foreground/70")}
                    strokeWidth={1.8}
                  />
                  {r.label}
                </span>
                <AnimatedNumber
                  value={r.value}
                  format={money}
                  duration={1.2}
                  className={cn(
                    "font-numeric shrink-0 tabular-nums",
                    strong ? "text-lg text-bronze" : "text-sm text-foreground/85"
                  )}
                />
              </div>

              <div className="relative mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, delay: 0.15 + i * 0.08, ease: EASE }}
                  className={cn(
                    "absolute inset-y-0 start-0 rounded-full",
                    r.weight === 3
                      ? "bg-gradient-to-r from-bronze to-primary"
                      : r.weight === 2
                        ? "bg-primary/55"
                        : r.weight === 1
                          ? "bg-bronze/40"
                          : "bg-muted-foreground/25"
                  )}
                  style={
                    r.weight === 3 && !reduce
                      ? {
                          boxShadow:
                            "0 0 14px -2px color-mix(in oklab, var(--primary) 65%, transparent)",
                        }
                      : undefined
                  }
                />
              </div>

              <p className="mt-1 text-[10.5px] text-muted-foreground/75">{r.sub}</p>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-5 border-t border-border/60 pt-4 text-[11px] leading-relaxed text-muted-foreground/80">
        {t("dash.fund.gap")}
      </p>
    </section>
  );
}

/**
 * Requests the founder has sent that nobody has paid.
 *
 * The single most useful queue the funding system produces: a founder who has
 * asked five investors for money can see which two are stalling, how many times
 * they tried, and when the ask lapses.
 */
export function AwaitingPaymentQueue({ items }: { items: AwaitingPayment[] }) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const relative = useRelativeTime();

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-card/25 px-6 py-12 text-center">
        <Hourglass className="mx-auto size-6 text-muted-foreground/45" strokeWidth={1.4} />
        <p className="mt-3.5 text-sm font-medium">{t("dash.fund.awaitingEmpty")}</p>
        <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
          {t("dash.fund.awaitingEmptyBody")}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((r, i) => {
        const failed = r.lastAttemptStatus === "Failed";
        return (
          <motion.li
            key={r.fundingRequestId}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.5, delay: (i % 6) * 0.05, ease: EASE }}
            className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/40 p-4 transition-colors hover:border-primary/35"
          >
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-y-0 start-0 w-0.5",
                failed ? "bg-destructive/60" : "bg-primary/50"
              )}
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.projectName}</p>
                <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                  <Link
                    href={`/u/${r.investorId}`}
                    data-cursor="hover"
                    className="transition-colors hover:text-foreground"
                  >
                    {r.investorName}
                  </Link>
                  {" · "}
                  <span className="font-numeric">{r.reference}</span>
                </p>
                <p
                  className={cn(
                    "mt-1.5 text-[11px]",
                    failed ? "text-destructive/85" : "text-muted-foreground/80"
                  )}
                >
                  {failed
                    ? t("fund.open.lastFailed")
                    : r.attemptCount === 0
                      ? t("fund.open.noAttempts")
                      : t("fund.open.attempts").replace("{count}", String(r.attemptCount))}
                  {" · "}
                  {t("fund.open.expires").replace("{when}", relative(r.expiresAtUtc))}
                </p>
              </div>

              <div className="shrink-0 sm:text-end">
                <p className="font-numeric text-lg leading-none text-bronze">{money(r.amount)}</p>
                <p className="font-numeric mt-1 text-[11px] text-muted-foreground">
                  {compactMoney(r.netProceeds)} {t("fund.word.netProceeds")}
                </p>
              </div>

              <Link
                href={`/deals/${r.investmentId}`}
                data-cursor="hover"
                aria-label={t("dash.fund.openRequest")}
                className="group inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-border px-4 text-xs transition-colors hover:border-primary/50 hover:text-primary"
              >
                {t("dash.fund.openRequest")}
                <ArrowRight
                  className={cn(
                    "size-3.5 transition-transform duration-300 group-hover:translate-x-0.5",
                    rtl && "rotate-180 group-hover:-translate-x-0.5"
                  )}
                />
              </Link>
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}
