"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Hourglass,
  Percent,
  Search,
  TrendingUp,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { DashPageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { ErrorState } from "@/components/ui/error-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EASE,
  PaymentStatusPill,
  SandboxBadge,
  compactMoney,
  exactMoney,
  formatDate,
  money,
} from "@/components/funding/funding-primitives";
import { revenueApi } from "@/lib/api/payments";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { AdminTransactionRow, PaymentStatus } from "@/lib/types/api";

const STATUSES: PaymentStatus[] = [
  "Succeeded",
  "Failed",
  "Cancelled",
  "Refunded",
  "Processing",
  "Initiated",
];

/**
 * Vestora's own economics — the first surface in the product that answers
 * "how does this platform make money", with real rows behind every figure.
 *
 * Two halves. The top is the read: what the platform earned, how reliably
 * payments succeed, and what has been reversed. The bottom is the ledger, where
 * an admin can find one transaction and act on it. Deliberately not a wall of
 * metric tiles — every number here is either something the owner would report or
 * something they would act on.
 */
export default function AdminRevenuePage() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;
  const qc = useQueryClient();

  const [status, setStatus] = useState<PaymentStatus | "">("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [refundTarget, setRefundTarget] = useState<AdminTransactionRow | null>(null);
  const [refundReason, setRefundReason] = useState("");

  const overview = useQuery({
    queryKey: ["admin-revenue"],
    queryFn: () => revenueApi.overview(),
  });

  const ledger = useQuery({
    queryKey: ["admin-transactions", status, q, page],
    queryFn: () => revenueApi.transactions({ status, q, page, pageSize: 20 }),
    placeholderData: keepPreviousData,
  });

  const refund = useMutation({
    mutationFn: () => revenueApi.refund(refundTarget!.id, refundReason.trim() || undefined),
    onSuccess: () => {
      toast.success(t("adm.rev.refunded"));
      setRefundTarget(null);
      setRefundReason("");
      qc.invalidateQueries({ queryKey: ["admin-revenue"] });
      qc.invalidateQueries({ queryKey: ["admin-transactions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const k = overview.data?.kpis;
  const rate = ((overview.data?.feeRateBps ?? 0) / 100).toString().replace(/\.0$/, "");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <DashPageHeader
          title={t("adm.rev.title")}
          sub={t("adm.rev.sub")}
          eyebrowKey="adm.rev.eyebrow"
        />
        <SandboxBadge className="mt-1" />
      </div>

      {overview.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-28 rounded-2xl" />
          ))}
        </div>
      ) : overview.isError || !k ? (
        <ErrorState onRetry={() => overview.refetch()} />
      ) : (
        <>
          {/* ---- The headline: what Vestora earned ---- */}
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE }}
              className="relative overflow-hidden rounded-2xl border border-primary/40 bg-card/70 p-6 backdrop-blur-md"
              style={{
                boxShadow:
                  "0 34px 80px -55px color-mix(in oklab, var(--primary) 85%, transparent)",
              }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(110% 80% at 20% 0%, color-mix(in oklab, var(--primary) 11%, transparent), transparent 60%)",
                }}
              />
              <div className="relative">
                <p
                  className={cn(
                    "text-[11px] text-primary",
                    rtl ? "" : "uppercase tracking-[0.2em]"
                  )}
                >
                  {t("adm.rev.revenue")}
                </p>
                <p className="font-numeric mt-3 text-5xl leading-none text-bronze">
                  {money(k.platformRevenue)}
                </p>
                <p className="mt-2.5 text-xs text-muted-foreground">
                  {t("adm.rev.revenueSub").replace("{rate}", rate)}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border/60 pt-5">
                  <MiniStat label={t("adm.rev.gtv")} value={money(k.grossTransactionVolume)} />
                  <MiniStat label={t("adm.rev.net")} value={money(k.netToFounders)} />
                </div>
              </div>
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Kpi
                icon={Percent}
                label={t("adm.rev.successRate")}
                value={`${k.successRate}%`}
                sub={t("adm.rev.successRateSub")
                  .replace("{ok}", String(k.succeededCount))
                  .replace("{failed}", String(k.failedCount))}
                index={0}
              />
              <Kpi
                icon={Undo2}
                label={t("adm.rev.refunds")}
                value={money(k.refundedAmount)}
                sub={t("adm.rev.refundsSub").replace("{count}", String(k.refundedCount))}
                index={1}
              />
              <Kpi
                icon={Hourglass}
                label={t("adm.rev.open")}
                value={money(k.openFundingAmount)}
                sub={t("adm.rev.openSub").replace("{count}", String(k.openFundingRequests))}
                index={2}
              />
              <Kpi
                icon={AlertTriangle}
                label={t("adm.rev.stuck")}
                value={String(k.stuckCount)}
                sub={t("adm.rev.stuckSub")}
                warn={k.stuckCount > 0}
                index={3}
              />
            </div>
          </div>

          {/* ---- Revenue over time ---- */}
          {overview.data!.revenueOverTime.length > 0 && (
            <Panel title={t("adm.rev.chart")} icon={<TrendingUp className="size-4" />} elevated>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={overview.data!.revenueOverTime}
                    margin={{ top: 8, right: 8, bottom: 0, left: rtl ? 8 : 0 }}
                  >
                    <defs>
                      <linearGradient id="grossFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--bronze)" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="var(--bronze)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      reversed={rtl}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                      orientation={rtl ? "right" : "left"}
                      tickFormatter={(v) => compactMoney(Number(v))}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v, name) => [
                        exactMoney(Number(v ?? 0)),
                        name === "gross" ? t("adm.rev.chartGross") : t("adm.rev.chartRevenue"),
                      ]}
                    />
                    {/* Gross behind, revenue in front — the same layering the funding
                        dial uses, so "the big number and the platform's slice of it"
                        reads the same way everywhere in the product. */}
                    <Area
                      type="monotone"
                      dataKey="gross"
                      stroke="var(--bronze)"
                      strokeWidth={1.5}
                      fill="url(#grossFill)"
                      isAnimationActive={!reduce}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      fill="url(#revFill)"
                      isAnimationActive={!reduce}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <Legend />
            </Panel>
          )}

          {/* ---- Top earning ventures ---- */}
          {overview.data!.topVentures.length > 0 && (
            <Panel title={t("adm.rev.topVentures")}>
              <ul className="space-y-2.5">
                {overview.data!.topVentures.map((v) => (
                  <li
                    key={v.projectId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 px-3.5 py-2.5 text-sm transition-colors hover:border-primary/30"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/projects/${v.projectId}`}
                        data-cursor="hover"
                        className="block truncate font-medium transition-colors hover:text-primary"
                      >
                        {v.projectName}
                      </Link>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {v.founderName} · {v.transactions}
                      </p>
                    </div>
                    <div className="shrink-0 text-end">
                      <p className="font-numeric text-sm text-bronze">{money(v.revenue)}</p>
                      <p className="font-numeric text-[11px] text-muted-foreground">
                        {compactMoney(v.gross)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}

      {/* ================= LEDGER ================= */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            className={cn("text-sm text-muted-foreground", rtl ? "" : "uppercase tracking-[0.18em]")}
          >
            {t("adm.rev.ledger")}
          </h2>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search
                className={cn(
                  "pointer-events-none absolute inset-y-0 my-auto size-3.5 text-muted-foreground",
                  rtl ? "end-3" : "start-3"
                )}
              />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder={t("adm.rev.search")}
                aria-label={t("adm.rev.search")}
                className={cn(
                  "min-h-10 w-64 max-w-full rounded-full border border-input bg-card/50 text-xs outline-none transition-colors",
                  "focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25",
                  rtl ? "pe-9 ps-4" : "ps-9 pe-4"
                )}
              />
            </div>

            <Select
              value={status}
              onValueChange={(v) => {
                setStatus((v as PaymentStatus | "") ?? "");
                setPage(1);
              }}
            >
              <SelectTrigger aria-label={t("pay.col.status")} className="min-h-10 w-auto rounded-full px-4 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t("adm.rev.filterAll")}</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`pay.status.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {ledger.isLoading ? (
          <div className="skeleton-shimmer mt-4 h-72 rounded-2xl" />
        ) : ledger.isError ? (
          <ErrorState onRetry={() => ledger.refetch()} />
        ) : (ledger.data?.items.length ?? 0) === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-card/25 px-6 py-14 text-center">
            <Banknote className="mx-auto size-7 text-muted-foreground/50" strokeWidth={1.4} />
            <p className="mt-4 text-sm font-medium">{t("adm.rev.empty")}</p>
            <p className="mx-auto mt-1.5 max-w-sm text-xs text-muted-foreground">
              {t("adm.rev.emptyBody")}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: stacked cards. A nine-column finance table at 375px is not a table. */}
            <ul className="mt-4 space-y-3 xl:hidden">
              {ledger.data!.items.map((tx) => (
                <li key={tx.id} className="rounded-2xl border border-border/60 bg-card/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{tx.projectName}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {tx.investorName} → {tx.founderName}
                      </p>
                    </div>
                    <PaymentStatusPill status={tx.status} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/50 pt-3 text-center">
                    <Cell label={t("pay.col.amount")} value={exactMoney(tx.amount)} />
                    <Cell label={t("pay.col.fee")} value={exactMoney(tx.feeAmount)} />
                    <Cell label={t("pay.col.net")} value={exactMoney(tx.netToFounder)} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span className="font-numeric">{tx.reference}</span>
                    <span>{formatDate(tx.succeededAtUtc ?? tx.createdAtUtc, locale)}</span>
                    {tx.status === "Succeeded" && (
                      <button
                        type="button"
                        onClick={() => setRefundTarget(tx)}
                        data-cursor="hover"
                        className="link-underline text-destructive/85 transition-colors hover:text-destructive"
                      >
                        {t("adm.rev.refund")}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-border/70 bg-card/40 xl:block">
              <table className="w-full min-w-[62rem] text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-[11px] text-muted-foreground">
                    <Th>{t("pay.col.reference")}</Th>
                    <Th>{t("pay.col.venture")}</Th>
                    <Th>{t("pay.col.investor")}</Th>
                    <Th align="end">{t("pay.col.amount")}</Th>
                    <Th align="end">{t("pay.col.fee")}</Th>
                    <Th align="end">{t("pay.col.net")}</Th>
                    <Th>{t("pay.col.status")}</Th>
                    <Th>{t("pay.col.date")}</Th>
                    <Th align="end" />
                  </tr>
                </thead>
                <tbody>
                  {ledger.data!.items.map((tx, i) => (
                    <motion.tr
                      key={tx.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.35, delay: Math.min(i, 10) * 0.02 }}
                      className="border-b border-border/40 transition-colors last:border-0 hover:bg-foreground/[0.025]"
                    >
                      <td className="font-numeric whitespace-nowrap px-4 py-3.5 text-[11.5px] text-muted-foreground/85">
                        {tx.reference}
                      </td>
                      <td className="max-w-[14rem] px-4 py-3.5">
                        <Link
                          href={`/projects/${tx.projectId}`}
                          data-cursor="hover"
                          className="block truncate transition-colors hover:text-primary"
                        >
                          {tx.projectName}
                        </Link>
                      </td>
                      <td className="max-w-[11rem] px-4 py-3.5">
                        <Link
                          href={`/u/${tx.investorId}`}
                          data-cursor="hover"
                          className="block truncate text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {tx.investorName}
                        </Link>
                      </td>
                      <td className="font-numeric whitespace-nowrap px-4 py-3.5 text-end tabular-nums">
                        {exactMoney(tx.amount)}
                      </td>
                      <td className="font-numeric whitespace-nowrap px-4 py-3.5 text-end tabular-nums text-primary">
                        {exactMoney(tx.feeAmount)}
                      </td>
                      <td className="font-numeric whitespace-nowrap px-4 py-3.5 text-end tabular-nums text-muted-foreground">
                        {exactMoney(tx.netToFounder)}
                      </td>
                      <td className="px-4 py-3.5">
                        <PaymentStatusPill status={tx.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-muted-foreground">
                        {formatDate(tx.succeededAtUtc ?? tx.createdAtUtc, locale)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-end">
                        {tx.status === "Succeeded" && (
                          <button
                            type="button"
                            onClick={() => setRefundTarget(tx)}
                            data-cursor="hover"
                            className="link-underline text-xs text-destructive/85 transition-colors hover:text-destructive"
                          >
                            {t("adm.rev.refund")}
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {(ledger.data?.totalCount ?? 0) > 20 && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <PageBtn
                  dir="prev"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                />
                <span className="font-numeric text-xs text-muted-foreground">
                  {page} / {Math.ceil((ledger.data?.totalCount ?? 0) / 20)}
                </span>
                <PageBtn
                  dir="next"
                  disabled={page >= Math.ceil((ledger.data?.totalCount ?? 0) / 20)}
                  onClick={() => setPage((p) => p + 1)}
                />
              </div>
            )}
          </>
        )}
      </section>

      <SandboxBadge variant="panel" />

      {/* ---- Refund: destructive, financial, and irreversible. It asks properly. ---- */}
      <Dialog
        open={refundTarget != null}
        onOpenChange={(v) => !refund.isPending && !v && setRefundTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("adm.rev.refundTitle")}</DialogTitle>
            <DialogDescription>
              {refundTarget &&
                t("adm.rev.refundBody")
                  .replace("{amount}", exactMoney(refundTarget.amount))
                  .replace("{fee}", exactMoney(refundTarget.feeAmount))}
            </DialogDescription>
          </DialogHeader>

          {refundTarget && (
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-border/70 bg-secondary/30 p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{t("pay.col.venture")}</span>
                  <span className="truncate">{refundTarget.projectName}</span>
                </div>
                <div className="mt-2 flex justify-between gap-4">
                  <span className="text-muted-foreground">{t("pay.col.investor")}</span>
                  <span className="truncate">{refundTarget.investorName}</span>
                </div>
                <div className="mt-2 flex justify-between gap-4">
                  <span className="text-muted-foreground">{t("pay.col.reference")}</span>
                  <span className="font-numeric text-[12px]">{refundTarget.reference}</span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="refund-reason"
                  className="block text-[11px] text-muted-foreground"
                >
                  {t("adm.rev.refundReason")}
                </label>
                <textarea
                  id="refund-reason"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value.slice(0, 300))}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-xl border border-input bg-card/60 px-4 py-3 text-sm outline-none transition-colors focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setRefundTarget(null)}
              disabled={refund.isPending}
              data-cursor="hover"
              className="min-h-11 rounded-full border border-border px-5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("form.cancel")}
            </button>
            <button
              type="button"
              disabled={refund.isPending}
              onClick={() => refund.mutate()}
              data-cursor="hover"
              className="min-h-11 rounded-full bg-destructive px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {refund.isPending
                ? t("adm.rev.refunding")
                : refundTarget
                  ? t("adm.rev.refundConfirm").replace(
                      "{amount}",
                      exactMoney(refundTarget.amount)
                    )
                  : ""}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ========================================================================== */

function Legend() {
  const { t } = useLocale();
  return (
    <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded-full bg-bronze" />
        {t("adm.rev.chartGross")}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded-full bg-primary" />
        {t("adm.rev.chartRevenue")}
      </span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10.5px] text-muted-foreground">{label}</p>
      <p className="font-numeric mt-1 text-lg text-foreground">{value}</p>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  warn,
  index,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  sub: string;
  warn?: boolean;
  index: number;
}) {
  const { locale } = useLocale();
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 + index * 0.06, ease: EASE }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-5 backdrop-blur-sm transition-all duration-500 hover:-translate-y-0.5",
        warn
          ? "border-destructive/40 bg-destructive/[0.04]"
          : "border-border/70 bg-card/50 hover:border-primary/35"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className={cn(
            "text-[11px] text-muted-foreground",
            locale === "ar" ? "" : "uppercase tracking-[0.14em]"
          )}
        >
          {label}
        </p>
        <Icon
          className={cn("size-4 shrink-0", warn ? "text-destructive" : "text-primary")}
          strokeWidth={1.6}
        />
      </div>
      <p className="font-numeric mt-3 text-2xl leading-none text-foreground">{value}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">{sub}</p>
    </motion.div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="font-numeric mt-0.5 text-[12.5px]">{value}</p>
    </div>
  );
}

function Th({ children, align }: { children?: React.ReactNode; align?: "end" }) {
  const { locale } = useLocale();
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap px-4 py-3 font-normal",
        align === "end" ? "text-end" : "text-start",
        locale === "ar" ? "" : "uppercase tracking-[0.12em]"
      )}
    >
      {children}
    </th>
  );
}

function PageBtn({
  dir,
  disabled,
  onClick,
}: {
  dir: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const { locale } = useLocale();
  const rtl = locale === "ar";
  const forward = dir === "next";
  const Icon = (rtl ? !forward : forward) ? ChevronRight : ChevronLeft;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-cursor="hover"
      aria-label={dir}
      className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-35"
    >
      <Icon className="size-4" />
    </button>
  );
}
