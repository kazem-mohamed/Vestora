"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Banknote,
  Bookmark,
  Briefcase,
  CheckCircle2,
  Send,
  Compass,
  Hourglass,
  TrendingUp,
} from "lucide-react";
import { Panel } from "@/components/dashboard/panel";
import { ActionCenter } from "@/components/signals/action-center";
import { CommittedVsFundedChart } from "@/components/dashboard/dashboard-charts";
import { ProfileEmptyState } from "@/components/profile/profile-empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PillButton } from "@/components/ui/pill-button";
import {
  AllocationBars,
  EASE,
  InvestKpi,
  StagePill,
  VentureThumb,
  compactUsd,
} from "@/components/invest/invest-primitives";
import { useInvestorDashboard } from "@/lib/hooks/use-investor-dashboard";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { InvestorDashboard, PipelineItem } from "@/lib/types/api";

/** Requests still waiting on a founder — the investor's "what's live" list. */
/**
 * Requests this investor has made that the founder has not answered.
 *
 * `New` and `Reviewing` are the founder's stages, not the investor's — so this panel is
 * information, not a task, and it was previously titled and placed as though it were one:
 * "awaiting", elevated, above the portfolio. What the investor is actually blocked on now
 * lives in the ActionCenter; this sits lower and says whose move it is.
 */
function AwaitingFounderPanel({ items }: { items: PipelineItem[] }) {
  const { t } = useLocale();
  const waiting = items.filter((i) => i.stage === "New" || i.stage === "Reviewing").slice(0, 4);
  if (waiting.length === 0) return null;

  return (
    <Panel title={t("inv.awaiting.title")} href="/invest/pipeline">
      <ul className="space-y-2">
        {waiting.map((i, idx) => (
          <motion.li
            key={i.investmentId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: idx * 0.05, ease: EASE }}
            className="flex items-center gap-3 rounded-xl border border-bronze/25 bg-bronze/[0.04] px-3 py-2.5"
          >
            <VentureThumb
              imageId={i.coverImageId}
              name={i.projectName}
              href={`/projects/${i.projectId}`}
              size="size-10"
            />
            <div className="min-w-0 flex-1">
              <Link
                href={`/projects/${i.projectId}`}
                data-cursor="hover"
                className="block truncate text-sm font-semibold transition-colors hover:text-primary"
              >
                {i.projectName}
              </Link>
              <p className="font-numeric text-[11px] text-muted-foreground">{compactUsd(i.amount)}</p>
            </div>
            <StagePill stage={i.stage} />
          </motion.li>
        ))}
      </ul>
    </Panel>
  );
}

function PortfolioPreview({ data }: { data: InvestorDashboard }) {
  const { t } = useLocale();
  const rows = data.portfolio.slice(0, 4);

  if (rows.length === 0) {
    return (
      <Panel title={t("inv.nav.portfolio")}>
        <ProfileEmptyState
          compact
          icon={Briefcase}
          title={t("inv.portfolio.empty")}
          body={t("inv.portfolio.emptySub")}
          ctaLabel={t("inv.quick.discover")}
          ctaHref="/projects"
        />
      </Panel>
    );
  }

  return (
    <Panel title={t("inv.nav.portfolio")} href="/invest/portfolio">
      <ul className="divide-y divide-border/60">
        {rows.map((p, i) => {
          // Two bands, not one. The bar used to fill to totalCommitted in a bronze-to-gold
          // gradient, which showed an investor a venture "progressing" on the strength of
          // promises. Funded is the solid part; committed-but-unpaid is the faint part
          // behind it, and the difference is visible rather than averaged away.
          const fundedPct = p.goal > 0 ? Math.min(100, Math.round((p.totalFunded / p.goal) * 100)) : 0;
          const committedPct = p.goal > 0 ? Math.min(100, Math.round((p.totalCommitted / p.goal) * 100)) : 0;
          return (
            <motion.li
              key={p.projectId}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.45, delay: (i % 4) * 0.05, ease: EASE }}
              className="flex items-center gap-3 py-3"
            >
              <VentureThumb
                imageId={p.coverImageId}
                name={p.projectName}
                href={`/projects/${p.projectId}`}
                size="size-11"
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/projects/${p.projectId}`}
                  data-cursor="hover"
                  className="block truncate text-sm font-semibold transition-colors hover:text-primary"
                >
                  {p.projectName}
                </Link>
                <p
                  className="relative mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary"
                  title={`${fundedPct}% ${t("fund.word.funded")} · ${committedPct}% ${t("fund.word.committed")}`}
                >
                  <span
                    className="absolute inset-y-0 start-0 rounded-full bg-bronze/35"
                    style={{ width: `${committedPct}%` }}
                  />
                  <span
                    className="absolute inset-y-0 start-0 rounded-full bg-primary"
                    style={{ width: `${fundedPct}%` }}
                  />
                </p>
              </div>
              <span className="shrink-0 text-end">
                <span className="block font-numeric text-sm text-bronze">{compactUsd(p.myCommitment)}</span>
                <span className="block text-[10px] text-muted-foreground">{t("inv.portfolio.mine")}</span>
              </span>
            </motion.li>
          );
        })}
      </ul>
    </Panel>
  );
}

export default function InvestOverviewPage() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, refetch } = useInvestorDashboard();

  const firstName = user?.userName?.trim().split(/\s+/)[0] ?? "";

  if (isError) return <ErrorState className="mt-6" onRetry={() => refetch()} />;
  if (isLoading || !data) return <OverviewSkeleton />;

  const k = data.kpis;
  const nothingYet = k.approvedCount === 0 && k.pendingCount === 0 && k.watchlistCount === 0;

  return (
    <div className="space-y-6">
      {/* ===== Hero ===== */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/60 p-6 backdrop-blur-sm sm:p-8"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              "radial-gradient(70% 90% at 100% 0%, color-mix(in oklab, var(--primary) 13%, transparent), transparent 65%), radial-gradient(60% 80% at 0% 100%, color-mix(in oklab, var(--bronze) 11%, transparent), transparent 65%)",
          }}
        />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className={cn("text-xs text-primary", rtl ? "" : "uppercase tracking-[0.3em]")}>
              {t("inv.sidebar.label")}
            </p>
            <h1
              className={cn("mt-3 text-3xl font-bold sm:text-4xl", rtl ? "leading-[1.4]" : "leading-[1.1]")}
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {firstName ? t("inv.hero.greeting").replace("{name}", firstName) : t("inv.nav.overview")}
            </h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("inv.hero.sub")}</p>
          </div>
          <PillButton href="/projects" size="lg">
            {t("inv.quick.discover")}
          </PillButton>
        </div>
      </motion.section>

      {/* Anything a founder is waiting on this investor for, above the portfolio
          figures. An investor's obligations are fewer than a founder's, so this is
          usually absent — which is exactly why it reads when it appears. */}
      <ActionCenter />

      {/* ===== KPIs =====
          Ordered by how close the money is to having moved: funded leads, then
          what is owed, then what was merely approved. "Approved commitments" used
          to occupy the hero slot, which told an investor they had invested capital
          they had not sent. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <InvestKpi
          index={0}
          hero
          icon={Banknote}
          label={t("fund.word.funded")}
          value={k.fundedAmount}
          format={compactUsd}
          sub={
            <span className="font-numeric">
              {t("pay.kpi.fundedSub").replace("{count}", String(k.fundedCount))}
            </span>
          }
          href="/invest/payments"
        />
        <InvestKpi
          index={1}
          icon={Hourglass}
          label={t("fund.word.paymentDue")}
          value={k.paymentDueAmount}
          format={compactUsd}
          sub={
            k.paymentDueCount > 0 ? (
              <>
                <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                <span className="font-numeric">
                  {t("pay.kpi.dueSub").replace("{count}", String(k.paymentDueCount))}
                </span>
              </>
            ) : (
              <span>{t("fund.due.none")}</span>
            )
          }
          href="/invest/payments"
        />
        <InvestKpi
          index={2}
          icon={CheckCircle2}
          label={t("inv.kpi.approved")}
          value={k.approvedAmount}
          format={compactUsd}
          sub={<span className="font-numeric">{k.approvedCount} {t("inv.kpi.commitments")}</span>}
          href="/invest/portfolio"
        />
        {/* Send, not Clock. Hourglass two tiles over already means "waiting", and at this
            size two waiting icons in one row are the same icon. This wait is different in
            kind: a request that has gone out and not come back. */}
        <InvestKpi
          index={3}
          icon={Send}
          label={t("inv.kpi.pending")}
          value={k.pendingAmount}
          format={compactUsd}
          sub={
            k.pendingCount > 0 ? (
              <>
                <span className="size-1.5 animate-pulse rounded-full bg-bronze" />
                <span className="font-numeric">{k.pendingCount} {t("inv.kpi.awaitingReply")}</span>
              </>
            ) : (
              <span>{t("inv.kpi.noPending")}</span>
            )
          }
          href="/invest/pipeline"
        />
        <InvestKpi
          index={4}
          icon={Briefcase}
          label={t("inv.kpi.ventures")}
          value={k.venturesBacked}
          format={(v) => String(v)}
          sub={
            <span>
              {k.venturesFunded > 0
                ? `${k.venturesFunded} ${t("fund.word.funded")}`
                : t("inv.kpi.venturesSub")}
            </span>
          }
          href="/invest/portfolio"
        />
      </div>

      {/* Two figures the API has always computed and this page threw away. Neither is
          shown unless it is non-zero: a permanent "0 failed payments" tile trains the
          reader to stop seeing the row it lives in. */}
      {(k.failedPaymentCount > 0 || k.refundedAmount > 0) && (
        <div className="flex flex-wrap gap-3">
          {k.failedPaymentCount > 0 && (
            <Link
              href="/invest/payments"
              data-cursor="hover"
              className="inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/[0.05] px-4 py-2 text-sm text-destructive transition-colors hover:bg-destructive/[0.09]"
            >
              <span className="font-numeric">{k.failedPaymentCount}</span>
              {t("inv.kpi.failedPayments")}
            </Link>
          )}
          {k.refundedAmount > 0 && (
            <span className="inline-flex items-center gap-2 rounded-full border border-bronze/40 bg-bronze/[0.05] px-4 py-2 text-sm text-bronze">
              <span className="font-numeric">{compactUsd(k.refundedAmount)}</span>
              {t("inv.kpi.refunded")}
            </span>
          )}
        </div>
      )}

      {/* ===== First-time investor ===== */}
      {nothingYet && (
        <Panel elevated>
          <ProfileEmptyState
            icon={Compass}
            title={t("inv.firstTime.title")}
            body={t("inv.firstTime.body")}
            ctaLabel={t("inv.quick.discover")}
            ctaHref="/projects"
          />
        </Panel>
      )}

      {/* ===== main + rail ===== */}
      {!nothingYet && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="min-w-0 space-y-5">
            <Panel title={t("dash.fund.chartBoth")} href="/invest/payments" elevated>
              <div className="h-64">
                {data.commitmentsOverTime.length > 0 || data.fundedOverTime.length > 0 ? (
                  <CommittedVsFundedChart
                    committed={data.commitmentsOverTime}
                    funded={data.fundedOverTime}
                  />
                ) : (
                  <div className="grid h-full place-items-center rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground">
                    {t("dash.chart.noData")}
                  </div>
                )}
              </div>
            </Panel>

            <PortfolioPreview data={data} />

            {/* Below the portfolio: whose move it is, not what to do. */}
            <AwaitingFounderPanel items={data.pipeline} />
          </div>

          <div className="space-y-5">
            {data.byIndustry.length > 0 && (
              <Panel title={t("inv.alloc.industry")} icon={<TrendingUp className="size-4" strokeWidth={1.7} />} elevated>
                <AllocationBars slices={data.byIndustry} />
              </Panel>
            )}
            {data.byStage.length > 0 && (
              <Panel title={t("inv.alloc.stage")}>
                <AllocationBars slices={data.byStage} />
              </Panel>
            )}
            <Link
              href="/invest/activity"
              data-cursor="hover"
              className="group flex items-center justify-between rounded-2xl border border-border/70 bg-card/40 p-5 transition-[border-color,transform] duration-500 hover:-translate-y-0.5 hover:border-primary/40"
            >
              <span>
                <span className="block text-sm font-semibold">{t("inv.nav.activity")}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{t("inv.activity.sub")}</span>
              </span>
              <ArrowUpRight
                className={cn(
                  "size-4 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
                  rtl && "-scale-x-100"
                )}
              />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton-shimmer h-44 rounded-[1.75rem]" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton-shimmer h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-5">
          <div className="skeleton-shimmer h-48 rounded-2xl" />
          <div className="skeleton-shimmer h-72 rounded-2xl" />
        </div>
        <div className="space-y-5">
          <div className="skeleton-shimmer h-56 rounded-2xl" />
          <div className="skeleton-shimmer h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
