"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Banknote, Hourglass, Receipt, Undo2 } from "lucide-react";
import { DashPageHeader } from "@/components/dashboard/page-header";
import { ProfileEmptyState } from "@/components/profile/profile-empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  EASE,
  PaymentStatusPill,
  SandboxBadge,
  exactMoney,
  formatDate,
  money,
  useRelativeTime,
} from "@/components/funding/funding-primitives";
import { VentureThumb } from "@/components/invest/invest-primitives";
import { paymentsApi } from "@/lib/api/payments";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { FundingRequest, PaymentTransaction } from "@/lib/types/api";

/**
 * The investor's money.
 *
 * Structured as two things, not one ledger: what is waiting on them, and what has
 * already happened. The first band is the only part that is actionable, so it sits
 * on top and is the only part that carries a call to action — a transaction list
 * where the payable rows are mixed in with settled history is a list nobody reads
 * carefully enough.
 */
export default function InvestPaymentsPage() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const relative = useRelativeTime();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["investor-payments"],
    queryFn: () => paymentsApi.mine(),
  });

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <DashPageHeader
          title={t("pay.page.title")}
          sub={t("pay.page.sub")}
          eyebrowKey="pay.page.eyebrow"
        />
        <SandboxBadge className="mt-1" />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer h-28 rounded-2xl" />
            ))}
          </div>
          <div className="skeleton-shimmer h-64 rounded-2xl" />
        </div>
      ) : isError || !data ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          {/* ---- The four bands, in the order money travels through them ---- */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              icon={Banknote}
              label={t("pay.kpi.funded")}
              value={money(summary!.fundedTotal)}
              sub={t("pay.kpi.fundedSub").replace("{count}", String(summary!.fundedCount))}
              hero
              index={0}
            />
            <Kpi
              icon={Hourglass}
              label={t("pay.kpi.due")}
              value={money(summary!.paymentDueTotal)}
              sub={t("pay.kpi.dueSub").replace("{count}", String(summary!.paymentDueCount))}
              urgent={summary!.paymentDueCount > 0}
              index={1}
            />
            <Kpi
              icon={Receipt}
              label={t("pay.kpi.committed")}
              value={money(summary!.committedTotal)}
              sub={t("pay.kpi.committedSub")}
              index={2}
            />
            <Kpi
              icon={Undo2}
              label={t("pay.kpi.refunded")}
              value={money(summary!.refundedTotal)}
              sub={`${summary!.failedCount} · ${t("pay.status.Failed")}`}
              index={3}
            />
          </div>

          {/* ---- Waiting on you ---- */}
          {data.due.length > 0 && (
            <section>
              <h2
                className={cn("text-sm text-primary", rtl ? "" : "uppercase tracking-[0.18em]")}
              >
                {t("pay.due.heading")}
              </h2>
              <ul className="mt-4 space-y-3">
                {data.due.map((r, i) => (
                  <DueRow key={r.id} request={r} index={i} relative={relative} />
                ))}
              </ul>
            </section>
          )}

          {/* ---- History ---- */}
          <section>
            <h2
              className={cn(
                "text-sm text-muted-foreground",
                rtl ? "" : "uppercase tracking-[0.18em]"
              )}
            >
              {t("pay.history.heading")}
            </h2>

            {data.transactions.length === 0 ? (
              <ProfileEmptyState
                icon={Receipt}
                title={t("pay.history.empty")}
                body={t("pay.history.emptyBody")}
                ctaLabel={t("inv.quick.discover")}
                ctaHref="/projects"
              />
            ) : (
              <>
                {/* Cards on small screens, a table on large — a finance table squeezed
                    into 375px is unreadable, and stacking it is not a compromise. */}
                <ul className="mt-4 space-y-3 lg:hidden">
                  {data.transactions.map((tx, i) => (
                    <TransactionCard key={tx.id} tx={tx} index={i} />
                  ))}
                </ul>

                <div className="mt-4 hidden overflow-hidden rounded-2xl border border-border/70 bg-card/40 lg:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/70 text-[11px] text-muted-foreground">
                        <Th>{t("pay.col.venture")}</Th>
                        <Th align="end">{t("pay.col.amount")}</Th>
                        <Th>{t("pay.col.status")}</Th>
                        <Th>{t("pay.col.date")}</Th>
                        <Th>{t("pay.col.reference")}</Th>
                        <Th align="end" />
                      </tr>
                    </thead>
                    <tbody>
                      {data.transactions.map((tx, i) => (
                        <motion.tr
                          key={tx.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.4, delay: Math.min(i, 8) * 0.03 }}
                          className="border-b border-border/40 transition-colors last:border-0 hover:bg-foreground/[0.025]"
                        >
                          <td className="px-4 py-3.5">
                            <Link
                              href={`/projects/${tx.projectId}`}
                              data-cursor="hover"
                              className="font-medium transition-colors hover:text-primary"
                            >
                              {tx.projectName}
                            </Link>
                            {tx.attemptNumber > 1 && (
                              <span className="font-numeric ms-2 text-[11px] text-muted-foreground/70">
                                {t("pay.history.attempt").replace(
                                  "{n}",
                                  String(tx.attemptNumber)
                                )}
                              </span>
                            )}
                          </td>
                          <td className="font-numeric px-4 py-3.5 text-end tabular-nums">
                            {exactMoney(tx.amount)}
                          </td>
                          <td className="px-4 py-3.5">
                            <PaymentStatusPill status={tx.status} />
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground">
                            {formatDate(tx.succeededAtUtc ?? tx.createdAtUtc, locale)}
                          </td>
                          <td className="font-numeric px-4 py-3.5 text-[11.5px] text-muted-foreground/80">
                            {tx.reference}
                          </td>
                          <td className="px-4 py-3.5 text-end">
                            {tx.status === "Succeeded" || tx.status === "Refunded" ? (
                              <Link
                                href={`/invest/payments/${tx.id}`}
                                data-cursor="hover"
                                className="link-underline text-xs text-muted-foreground transition-colors hover:text-primary"
                              >
                                {t("pay.success.viewReceipt")}
                              </Link>
                            ) : null}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <SandboxBadge variant="panel" />
        </>
      )}
    </div>
  );
}

/* ========================================================================== */

function DueRow({
  request,
  index,
  relative,
}: {
  request: FundingRequest;
  index: number;
  relative: (iso: string) => string;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const lastFailed = request.attempts.at(-1)?.status === "Failed";

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: EASE }}
      className="relative overflow-hidden rounded-2xl border border-primary/35 bg-primary/[0.035] p-4 transition-colors hover:border-primary/55 sm:p-5"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 start-0 w-0.5 bg-primary/70"
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="font-numeric text-2xl leading-none text-bronze">
            {money(request.amount)}
          </p>
          <p className="mt-2 text-[12.5px] text-muted-foreground">
            {t("fund.due.expires").replace("{when}", relative(request.expiresAtUtc))}
          </p>
          {lastFailed && (
            <p className="mt-1.5 text-[12px] text-destructive/85">{t("pay.failed.canRetry")}</p>
          )}
        </div>

        <Link
          href={`/deals/${request.investmentId}`}
          data-cursor="hover"
          className={cn(
            "gold-cta group inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground",
            "transition-opacity duration-300 hover:opacity-90"
          )}
        >
          {lastFailed ? t("fund.due.retry") : t("fund.due.cta")}
          <ArrowRight
            className={cn(
              "size-4 transition-transform duration-300 group-hover:translate-x-0.5",
              rtl && "rotate-180 group-hover:-translate-x-0.5"
            )}
            strokeWidth={2}
          />
        </Link>
      </div>
    </motion.li>
  );
}

function TransactionCard({ tx, index }: { tx: PaymentTransaction; index: number }) {
  const { t, locale } = useLocale();
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.04, ease: EASE }}
      className="rounded-2xl border border-border/60 bg-card/40 p-4"
    >
      <div className="flex items-start gap-3">
        <VentureThumb
          imageId={tx.coverImageId}
          name={tx.projectName}
          href={`/projects/${tx.projectId}`}
          size="size-11"
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/projects/${tx.projectId}`}
            data-cursor="hover"
            className="block truncate text-sm font-medium transition-colors hover:text-primary"
          >
            {tx.projectName}
          </Link>
          <p className="font-numeric mt-1 text-lg leading-none text-bronze">
            {exactMoney(tx.amount)}
          </p>
        </div>
        <PaymentStatusPill status={tx.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
        <span className="font-numeric">{tx.reference}</span>
        <span>{formatDate(tx.succeededAtUtc ?? tx.createdAtUtc, locale)}</span>
        {(tx.status === "Succeeded" || tx.status === "Refunded") && (
          <Link
            href={`/invest/payments/${tx.id}`}
            data-cursor="hover"
            className="link-underline text-foreground/80 transition-colors hover:text-primary"
          >
            {t("pay.success.viewReceipt")}
          </Link>
        )}
      </div>
    </motion.li>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  hero,
  urgent,
  index,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  sub: string;
  hero?: boolean;
  urgent?: boolean;
  index: number;
}) {
  const { locale } = useLocale();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: index * 0.06, ease: EASE }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-5 backdrop-blur-sm transition-all duration-500",
        hero
          ? "border-primary/40 bg-card/70 shadow-[0_24px_60px_-38px_var(--primary)] hover:-translate-y-1"
          : urgent
            ? "border-primary/45 bg-primary/[0.05] hover:-translate-y-0.5"
            : "border-border/70 bg-card/50 hover:-translate-y-0.5 hover:border-primary/35"
      )}
    >
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
      <div className="flex items-center justify-between gap-3">
        <p
          className={cn(
            "text-[11px] text-muted-foreground",
            locale === "ar" ? "" : "uppercase tracking-[0.14em]"
          )}
        >
          {label}
        </p>
        <span className="grid size-8 place-items-center rounded-full border border-primary/25 text-primary transition-transform duration-500 group-hover:scale-110">
          <Icon className="size-4" strokeWidth={1.6} />
        </span>
      </div>
      <p
        className={cn(
          "font-numeric mt-3 leading-none",
          hero ? "text-3xl text-bronze" : "text-2xl text-foreground"
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-[11px] text-muted-foreground">{sub}</p>
    </motion.div>
  );
}

function Th({ children, align }: { children?: React.ReactNode; align?: "end" }) {
  const { locale } = useLocale();
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-3 font-normal",
        align === "end" ? "text-end" : "text-start",
        locale === "ar" ? "" : "uppercase tracking-[0.12em]"
      )}
    >
      {children}
    </th>
  );
}
