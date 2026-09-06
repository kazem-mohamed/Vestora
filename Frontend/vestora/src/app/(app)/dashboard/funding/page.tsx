"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { DashPageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import {
  ApprovedPendingSplit,
  CommittedVsFundedChart,
  FundingByVentureChart,
} from "@/components/dashboard/dashboard-charts";
import {
  AwaitingPaymentQueue,
  FounderFundingLadder,
} from "@/components/funding/founder-funding-ladder";
import { SandboxBadge } from "@/components/funding/funding-primitives";
import { usePaymentConfig } from "@/lib/hooks/use-payment-config";
import { useFounderDashboard } from "@/lib/hooks/use-dashboard";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

function compactUsd(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
}

export default function DashboardFundingPage() {
  const { t } = useLocale();
  const { data, isLoading } = useFounderDashboard();
  const feeRateBps = usePaymentConfig().data?.feeRateBps ?? 500;

  return (
    <div className="space-y-6">
      <DashPageHeader
        title={t("dash.page.funding.title")}
        sub={t("dash.page.funding.sub")}
        action={<SandboxBadge />}
      />

      {isLoading || !data ? (
        <div className="space-y-5">
          <div className="h-80 animate-pulse rounded-2xl bg-secondary" />
          <div className="h-56 animate-pulse rounded-2xl bg-secondary" />
        </div>
      ) : (
        <>
          {/* The four readings, as a ladder — each rung a subset of the one above. */}
          <FounderFundingLadder kpis={data.kpis} feeRateBps={feeRateBps} />

          {/* Requests sent and unpaid. The queue the founder can actually act on. */}
          <Panel title={t("dash.fund.awaiting")} elevated>
            <AwaitingPaymentQueue items={data.awaitingPayment} />
          </Panel>

          <Panel title={t("dash.fund.chartBoth")} elevated>
            <div className="h-80">
              {data.fundingOverTime.length > 0 || data.fundedOverTime.length > 0 ? (
                <CommittedVsFundedChart
                  committed={data.fundingOverTime}
                  funded={data.fundedOverTime}
                />
              ) : (
                <div className="grid h-full place-items-center rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground">
                  {t("dash.chart.noData")}
                </div>
              )}
            </div>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
            <Panel title={t("dash.chart.approvedVsPending")}>
              <ApprovedPendingSplit data={data.approvedVsPending} />
            </Panel>

            <Panel title={t("dash.chart.fundingByVenture")}>
              <div className="h-56">
                <FundingByVentureChart data={data.fundingByVenture} />
              </div>
            </Panel>
          </div>

          {/* Per-venture funding breakdown */}
          <Panel title={t("dash.funding.breakdown")}>
            <ul className="divide-y divide-border/60">
              {data.fundingByVenture.map((v, i) => {
                const pct = v.goal > 0 ? Math.min(100, Math.round((v.raised / v.goal) * 100)) : 0;
                const committedPct =
                  v.goal > 0 ? Math.min(100, Math.round((v.committed / v.goal) * 100)) : 0;
                return (
                  <motion.li
                    key={v.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-30px" }}
                    transition={{ duration: 0.5, delay: (i % 6) * 0.05, ease: EASE }}
                    className="flex flex-col gap-2 px-2 py-4 sm:flex-row sm:items-center sm:gap-6"
                  >
                    <Link
                      href={`/projects/${v.id}`}
                      data-cursor="hover"
                      className="min-w-0 flex-1 truncate font-semibold transition-colors hover:text-primary"
                    >
                      {v.name}
                    </Link>
                    <div className="flex-1">
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                        {committedPct > pct && (
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${committedPct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.85, delay: 0.12, ease: EASE }}
                            className="absolute inset-y-0 start-0 rounded-full bg-bronze/35"
                          />
                        )}
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
                          className="absolute inset-y-0 start-0 rounded-full bg-gradient-to-r from-bronze to-primary"
                        />
                      </div>
                    </div>
                    <span className="shrink-0 font-numeric text-sm">
                      <span className="text-bronze">{compactUsd(v.raised)}</span>
                      <span className="text-muted-foreground"> / {compactUsd(v.goal)}</span>
                      <span className={cn("ms-3 text-primary")}>{pct}%</span>
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </Panel>
        </>
      )}
    </div>
  );
}
