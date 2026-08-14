"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Handshake, Send, Stamp } from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { ActionCenter } from "@/components/signals/action-center";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import {
  ApprovedPendingSplit,
  CommittedVsFundedChart,
  FundingByVentureChart,
} from "@/components/dashboard/dashboard-charts";
import { Panel } from "@/components/dashboard/panel";
import { ActivityTimeline, TopVenturesTable } from "@/components/dashboard/dashboard-panels";
import {
  ProfileCompletion,
  QuickActions,
  RecentMessagesWidget,
} from "@/components/dashboard/dashboard-widgets";
import { useFounderDashboard } from "@/lib/hooks/use-dashboard";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { ErrorState } from "@/components/ui/error-state";
import { cn } from "@/lib/utils";

function compactUsd(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
}

export default function DashboardOverviewPage() {
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, refetch } = useFounderDashboard();

  const firstName = user?.userName?.trim().split(/\s+/)[0] ?? "";

  if (isError) return <ErrorState className="mt-6" onRetry={() => refetch()} />;
  if (isLoading || !data) return <DashboardSkeleton />;

  // A founder with no listings has nothing to measure. Charts of zeros and empty
  // queues read as a broken dashboard rather than a new account, so the first run
  // is a single instruction instead of eight empty panels.
  if (data.kpis.venturesCount === 0) {
    return <FounderFirstRun firstName={firstName} />;
  }

  return (
    <div className="space-y-6">
      <DashboardHero kpis={data.kpis} firstName={firstName} />

      {/* Obligations before information. The metrics below describe how the round is
          going; this says what is currently stuck waiting on the founder, which is the
          only thing on the page they can act on right now. */}
      <ActionCenter />

      <KpiCards
        kpis={data.kpis}
        funding={data.fundingOverTime}
        funded={data.fundedOverTime}
        investors={data.investorGrowth}
      />

      {/* ===== main + rail ===== */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        {/* ---- main column ---- */}
        <div className="min-w-0 space-y-5">
          {/* Ventures first. A founder's own ventures were the fifth panel down, below
              three charts of aggregates about them — the page described the portfolio
              before showing what the portfolio was. Founder → ventures → deals is the
              order the work happens in. */}
          <Panel title={t("dash.nav.ventures")} href="/dashboard/ventures" elevated>
            <TopVenturesTable ventures={data.topVentures} limit={5} />
          </Panel>

          {/* The four money figures on one line, in the order the money moves. Committed
              is not funded and neither is the remainder — the words are the product's,
              and none of these is computed here. */}
          <Panel title={t("dash.fund.overview")} href="/dashboard/funding">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <MoneyFact label={t("fund.word.committed")} value={data.kpis.totalCommitted} tone="bronze" />
              <MoneyFact label={t("fund.word.paymentDue")} value={data.kpis.awaitingPayment} />
              <MoneyFact label={t("fund.word.funded")} value={data.kpis.totalFunded} tone="primary" />
              <MoneyFact
                label={t("fund.word.remaining")}
                value={Math.max(0, data.kpis.totalGoal - data.kpis.totalFunded)}
              />
            </dl>
          </Panel>

          {/* Two curves, not one: agreed and arrived. The distance between them is the
              founder's outstanding collection, read against the goal. */}
          <Panel title={t("dash.fund.chartBoth")} href="/dashboard/funding" elevated>
            <div className="h-72">
              <CommittedVsFundedChart
                committed={data.fundingOverTime}
                funded={data.fundedOverTime}
                goal={data.kpis.totalGoal}
              />
            </div>
          </Panel>

          {/* The pending-approvals and awaiting-payment queues used to live here as two
              more panels, and SuggestedActions as a third in the rail. Four regions of
              one page each said "something needs you", which is why none of them read as
              urgent. They are all counted by the ActionCenter above now; these lists have
              their own pages, reached from there. */}

          <Panel title={t("dash.chart.fundingByVenture")} href="/dashboard/funding">
            <div className="h-56">
              <FundingByVentureChart data={data.fundingByVenture} />
            </div>
          </Panel>

          <Panel title={t("dash.activity.title")} href="/dashboard/activity">
            <ActivityTimeline items={data.recentActivity} limit={5} />
          </Panel>
        </div>

        {/* ---- rail ----
             min-w-0 for the same reason the main column has it: a grid item defaults to
             min-width:auto, so a chart or a long unbroken label inside can force the
             track wider than the viewport. Without it this column pushed the dashboard
             47px past 375px. */}
        <div className="min-w-0 space-y-5">
          <Panel title={t("dash.chart.approvedVsPending")} elevated>
            <ApprovedPendingSplit data={data.approvedVsPending} />
          </Panel>

          {/* Three, not seven. The rail held QuickActions, SuggestedActions,
              ProfileCompletion, RecentNotifications, RecentMessages, FollowersPreview and
              AnalyticsTeaser stacked in a 330px column — nothing with priority over
              anything else, which is a drawer rather than a rail. SuggestedActions is now
              part of the ActionCenter's job, and AnalyticsTeaser was an advert for
              another page of the same product. */}
          <QuickActions />
          <ProfileCompletion />
          <RecentMessagesWidget />
        </div>
      </div>
    </div>
  );
}

/** One figure, named with the product's word for it and nothing else. */
function MoneyFact({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "bronze" | "primary";
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-1.5 font-numeric text-lg",
          tone === "bronze" && "text-bronze",
          tone === "primary" && "text-primary"
        )}
      >
        {compactUsd(value)}
      </dd>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="grid h-full place-items-center rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground">
      {label}
    </div>
  );
}

/**
 * First run for a founder who hasn't listed anything yet — one instruction and
 * the three things that happen after it, rather than a control room of zeros.
 */
function FounderFirstRun({ firstName }: { firstName: string }) {
  const { t } = useLocale();
  const reduce = useReducedMotion() ?? false;

  const steps = [
    { icon: Send, k: "how.fnd.1" },
    { icon: Stamp, k: "how.fnd.2" },
    { icon: Handshake, k: "how.fnd.4" },
  ];

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[1.5rem] border border-border bg-card/40 px-7 py-12 sm:px-12 sm:py-16"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            "radial-gradient(55% 80% at 20% 0%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 68%)",
        }}
      />
      <div className="relative max-w-xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-primary">
          {t("dash.first.eyebrow")}
        </p>
        <h1
          className="mt-4 text-3xl font-bold leading-tight sm:text-4xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {t("dash.first.title").replace("{name}", firstName)}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {t("dash.first.body")}
        </p>

        <ol className="mt-9 space-y-4">
          {steps.map((s, i) => (
            <motion.li
              key={s.k}
              initial={reduce ? false : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.15 + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-start gap-3.5"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-background text-primary">
                <s.icon className="size-4" strokeWidth={1.7} />
              </span>
              <div className="min-w-0 pt-1">
                <p className="text-sm font-semibold">{t(`${s.k}.t`)}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{t(`${s.k}.d`)}</p>
              </div>
            </motion.li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <PillButton href="/my-projects/new" size="lg">
            {t("onboard.founder.cta")}
          </PillButton>
          <Link
            href="/how-it-works"
            data-cursor="hover"
            className="link-underline text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("nav.how")}
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton-shimmer h-72 rounded-[1.75rem]" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton-shimmer h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-5">
          <div className="skeleton-shimmer h-72 rounded-2xl" />
          <div className="skeleton-shimmer h-48 rounded-2xl" />
        </div>
        <div className="space-y-5">
          <div className="skeleton-shimmer h-64 rounded-2xl" />
          <div className="skeleton-shimmer h-48 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
