"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Flag,
  Lightbulb,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Stamp,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Panel } from "@/components/dashboard/panel";
import { DashPageHeader } from "@/components/dashboard/page-header";
import { ViewsAreaChart } from "@/components/dashboard/dashboard-charts";
import { adminApi } from "@/lib/api/admin";
import {
  useAdminAnalytics,
  useAdminGrowth,
  useOpenReportsCount,
  usePendingProjectsCount,
} from "@/lib/hooks/use-admin";
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

function Stat({
  icon: Icon,
  label,
  value,
  format,
  accent,
  bronze,
  index,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  format: (v: number) => string;
  accent?: boolean;
  bronze?: boolean;
  index: number;
}) {
  const { locale } = useLocale();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: (index % 6) * 0.06, ease: EASE }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-5 backdrop-blur-sm transition-[border-color,box-shadow,transform] duration-500 hover:-translate-y-0.5",
        accent
          ? "border-primary/40 bg-card/70 shadow-[0_24px_60px_-38px_var(--primary)]"
          : "border-border/70 bg-card/55 hover:border-primary/40"
      )}
    >
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="flex items-center justify-between gap-3">
        <p className={cn("text-[11px] text-muted-foreground", locale === "ar" ? "" : "uppercase tracking-[0.14em]")}>{label}</p>
        <span className="grid size-8 place-items-center rounded-full border border-primary/25 text-primary transition-all duration-500 group-hover:scale-110 group-hover:border-primary/60 group-hover:bg-primary/[0.08]">
          <Icon className="size-4" strokeWidth={1.6} />
        </span>
      </div>
      <AnimatedNumber
        value={value}
        format={format}
        delay={(index % 6) * 0.06 + 0.1}
        className={cn("mt-3 block font-numeric text-3xl leading-none", bronze ? "text-bronze" : "text-foreground")}
      />
    </motion.div>
  );
}

function DistBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-numeric">
          <span className="text-foreground">{value}</span>
          <span className="text-muted-foreground/70"> · {pct}%</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, delay: 0.3, ease: EASE }}
          className={cn("h-full rounded-full", color)}
        />
      </div>
    </div>
  );
}

/**
 * Actionable tile: only rendered when it actually needs attention, so the row
 * stays empty on a healthy platform instead of showing reassuring zeros.
 */
function AttentionTile({
  href,
  icon: Icon,
  count,
  label,
  tone,
  index,
}: {
  href: string;
  icon: LucideIcon;
  count: number;
  label: string;
  tone: "danger" | "warn";
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: EASE }}
    >
      <Link
        href={href}
        data-cursor="hover"
        className={cn(
          "group flex items-center gap-3 rounded-2xl border p-4 transition-[border-color,transform] duration-500 hover:-translate-y-0.5",
          tone === "danger"
            ? "border-destructive/40 bg-destructive/[0.05] hover:border-destructive/60"
            : "border-bronze/40 bg-bronze/[0.05] hover:border-bronze/60"
        )}
      >
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full border",
            tone === "danger"
              ? "border-destructive/40 text-destructive"
              : "border-bronze/40 text-bronze"
          )}
        >
          <Icon className="size-4" strokeWidth={1.7} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block font-numeric text-2xl leading-none", tone === "danger" ? "text-destructive" : "text-bronze")}>
            {count}
          </span>
          <span className="mt-1 block truncate text-xs text-muted-foreground">{label}</span>
        </span>
        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:-scale-x-100" />
      </Link>
    </motion.div>
  );
}

export default function AdminOverviewPage() {
  const { t } = useLocale();
  const { data, isLoading } = useAdminAnalytics();
  const openReports = useOpenReportsCount();
  const pendingReview = usePendingProjectsCount();
  const growthQ = useAdminGrowth(6);
  const alertsQ = useQuery({
    queryKey: ["admin-alerts"],
    queryFn: () => adminApi.alerts(),
  });
  const alerts = alertsQ.data;
  const lockedAccounts = alerts?.lockedAccounts ?? 0;

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <DashPageHeader title={t("admin.overview.title")} sub={t("admin.overview.sub")} eyebrowKey="admin.sidebar.label" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  const fundedPct = data.totalProjects > 0 ? Math.round((data.fundedProjects / data.totalProjects) * 100) : 0;

  return (
    <div className="space-y-6">
      <DashPageHeader
        title={t("admin.overview.title")}
        sub={t("admin.overview.sub")}
        eyebrowKey="admin.sidebar.label"
        action={
          openReports > 0 ? (
            <Link
              href="/admin/reports"
              data-cursor="hover"
              className="inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/[0.06] px-4 py-2 text-sm text-destructive transition-colors hover:bg-destructive/[0.1]"
            >
              <Flag className="size-4" />
              {openReports} {t("admin.overview.openReports")}
            </Link>
          ) : undefined
        }
      />

      {/* Needs attention — rendered only when something actually does. */}
      {(pendingReview > 0 || openReports > 0 || lockedAccounts > 0) && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pendingReview > 0 && (
            <AttentionTile
              index={0}
              href="/admin/review"
              icon={Stamp}
              count={pendingReview}
              label={t("admin.attention.pendingReview")}
              tone="warn"
            />
          )}
          {openReports > 0 && (
            <AttentionTile
              index={1}
              href="/admin/reports"
              icon={Flag}
              count={openReports}
              label={t("admin.attention.openReports")}
              tone="danger"
            />
          )}
          {lockedAccounts > 0 && (
            <AttentionTile
              index={2}
              href="/admin/security"
              icon={ShieldAlert}
              count={lockedAccounts}
              label={t("admin.attention.lockedAccounts")}
              tone="danger"
            />
          )}
          {(alerts?.staleUnappliedEvents ?? 0) > 0 && (
            <AttentionTile
              index={3}
              href="/admin/reconciliation"
              icon={AlertTriangle}
              count={alerts!.staleUnappliedEvents}
              label={t("admin.attention.staleEvents").replace("{hours}", String(alerts!.staleEventHours))}
              tone="danger"
            />
          )}
          {(alerts?.recentFailedPayments ?? 0) > 0 && (
            <AttentionTile
              index={4}
              href="/admin/revenue"
              icon={Banknote}
              count={alerts!.recentFailedPayments}
              label={t("admin.attention.failedPayments").replace("{days}", String(alerts!.failedPaymentDays))}
              tone="warn"
            />
          )}
        </div>
      )}

      {/* Ventures carrying more than one open report.
          The threshold travels with the data and is printed, because "two people
          complained" is a fact and "this venture is a problem" would be a verdict. */}
      {(alerts?.heavilyReported.length ?? 0) > 0 && (
        <Panel
          title={t("admin.alerts.heavilyReported").replace("{n}", String(alerts!.reportThreshold))}
          icon={<Flag className="size-4" strokeWidth={1.7} />}
          href="/admin/reports"
        >
          <ul className="divide-y divide-border/50">
            {alerts!.heavilyReported.map((v) => (
              <li key={v.projectId} className="flex items-center gap-3 py-2.5 text-sm">
                <Link
                  href={`/projects/${v.projectId}`}
                  data-cursor="hover"
                  className="min-w-0 flex-1 truncate font-medium transition-colors hover:text-primary"
                >
                  {v.name}
                </Link>
                <span className="shrink-0 rounded-full border border-destructive/40 px-2.5 py-0.5 text-[11px] leading-5 text-destructive">
                  {v.openReports} {t("admin.u360.openReports")}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Stat index={0} icon={Users} label={t("admin.kpi.users")} value={data.totalUsers} format={(v) => String(v)} accent />
        {/* One icon per meaning. Entrepreneurs and Ventures were both Rocket, side by
            side in this row, so two different counts carried the same mark. */}
        <Stat index={1} icon={TrendingUp} label={t("admin.kpi.investors")} value={data.investors} format={(v) => String(v)} />
        <Stat index={2} icon={Lightbulb} label={t("admin.kpi.innovators")} value={data.innovators} format={(v) => String(v)} />
        <Stat index={3} icon={Rocket} label={t("admin.kpi.ventures")} value={data.totalProjects} format={(v) => String(v)} />
        <Stat index={4} icon={CheckCircle2} label={t("admin.kpi.funded")} value={data.fundedProjects} format={(v) => String(v)} />
        <Stat index={5} icon={Banknote} label={t("admin.kpi.invested")} value={data.totalInvestedAmount} format={compactUsd} bronze />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={t("admin.overview.distribution")} icon={<Users className="size-4" strokeWidth={1.7} />} elevated>
          <div className="space-y-4">
            {/* Three flat colours, one per group. The first of these used to be a
                bronze-to-gold gradient, which made one of three equal categories look
                like a scale of something. */}
            <DistBar label={t("admin.kpi.investors")} value={data.investors} total={data.totalUsers} color="bg-primary" />
            <DistBar label={t("admin.kpi.innovators")} value={data.innovators} total={data.totalUsers} color="bg-bronze" />
            <DistBar label={t("admin.kpi.admins")} value={data.admins} total={data.totalUsers} color="bg-muted-foreground/50" />
          </div>
        </Panel>

        <Panel title={t("admin.overview.health")} icon={<ShieldCheck className="size-4" strokeWidth={1.7} />}>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{t("admin.overview.fundedRate")}</p>
              <p className="mt-2 font-numeric text-2xl text-primary">{fundedPct}%</p>
              <p className="mt-1 font-numeric text-xs text-muted-foreground">
                {data.fundedProjects} / {data.totalProjects}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/40 p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{t("admin.kpi.investments")}</p>
              <p className="mt-2 font-numeric text-2xl">{data.totalInvestments}</p>
              <p className="mt-1 font-numeric text-xs text-muted-foreground">{compactUsd(data.totalInvestedAmount)}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <QuickLink href="/admin/users" label={t("admin.nav.users")} />
            <QuickLink href="/admin/ventures" label={t("admin.nav.ventures")} />
            <QuickLink href="/admin/audit" label={t("admin.nav.audit")} />
            <QuickLink href="/admin/security" label={t("admin.nav.security")} />
          </div>
        </Panel>
      </div>

      {/* Growth over time — derived from real signup / creation dates. */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={t("admin.growth.users")} icon={<Users className="size-4" strokeWidth={1.7} />} elevated>
          <div className="h-56">
            {growthQ.isLoading ? (
              <div className="skeleton-shimmer h-full rounded-xl" />
            ) : (growthQ.data?.userGrowth.length ?? 0) > 0 ? (
              <ViewsAreaChart data={growthQ.data!.userGrowth} />
            ) : (
              <div className="grid h-full place-items-center rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground">
                {t("dash.chart.noData")}
              </div>
            )}
          </div>
        </Panel>

        <Panel title={t("admin.growth.ventures")} icon={<Rocket className="size-4" strokeWidth={1.7} />}>
          <div className="h-56">
            {growthQ.isLoading ? (
              <div className="skeleton-shimmer h-full rounded-xl" />
            ) : (growthQ.data?.ventureGrowth.length ?? 0) > 0 ? (
              <ViewsAreaChart data={growthQ.data!.ventureGrowth} />
            ) : (
              <div className="grid h-full place-items-center rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground">
                {t("dash.chart.noData")}
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      data-cursor="hover"
      className="group inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
    >
      {label}
      <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:-scale-x-100" />
    </Link>
  );
}
