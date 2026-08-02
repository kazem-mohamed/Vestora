"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Bookmark,
  Eye,
  Filter,
  MessageSquare,
  MousePointerClick,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { DashPageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { FundingAreaChart, ViewsAreaChart } from "@/components/dashboard/dashboard-charts";
import { InterestFunnel } from "@/components/dashboard/interest-funnel";
import { ProfileEmptyState } from "@/components/profile/profile-empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { engagementApi } from "@/lib/api/engagement";
import { insightsApi } from "@/lib/api/insights";
import { projectsApi } from "@/lib/api/projects";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import { Rocket } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

function compactUsd(v: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(v);
}

function Stat({ icon: Icon, label, value, format, accent, index }: { icon: LucideIcon; label: string; value: number; format: (v: number) => string; accent?: boolean; index: number }) {
  const { locale } = useLocale();
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: (index % 6) * 0.06, ease: EASE }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-4 backdrop-blur-sm transition-[border-color,transform] duration-500 hover:-translate-y-0.5",
        accent ? "border-primary/40 bg-card/70" : "border-border/70 bg-card/55 hover:border-primary/40"
      )}
    >
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="flex items-center justify-between gap-2">
        <p className={cn("text-[11px] text-muted-foreground", locale === "ar" ? "" : "uppercase tracking-[0.12em]")}>{label}</p>
        <Icon className="size-4 text-primary" strokeWidth={1.6} />
      </div>
      <AnimatedNumber value={value} format={format} delay={(index % 6) * 0.06 + 0.1} className="mt-2.5 block font-numeric text-2xl leading-none" />
    </motion.div>
  );
}

export default function DashboardAnalyticsPage() {
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);

  const venturesQ = useQuery({
    queryKey: ["my-projects", user?.id],
    queryFn: () => projectsApi.byOwner(user!.id),
    enabled: !!user,
  });
  const ventures = venturesQ.data ?? [];
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (selected == null && ventures.length > 0) setSelected(ventures[0].id);
  }, [ventures, selected]);

  const analyticsQ = useQuery({
    queryKey: ["analytics", selected],
    queryFn: () => engagementApi.analytics(selected!),
    enabled: selected != null,
  });

  // Owner-only on the server; the funnel and the stalled-relationship list both
  // come from here, so one query covers both.
  const insightsQ = useQuery({
    queryKey: ["venture-insights", selected],
    queryFn: () => insightsApi.venture(selected!),
    enabled: selected != null,
  });
  const a = analyticsQ.data;

  return (
    <div className="space-y-6">
      <DashPageHeader title={t("dash.page.analytics.title")} sub={t("dash.page.analytics.sub")} />

      {venturesQ.isLoading ? (
        <div className="skeleton-shimmer h-96 rounded-2xl" />
      ) : venturesQ.isError ? (
        <ErrorState onRetry={() => venturesQ.refetch()} />
      ) : ventures.length === 0 ? (
        <ProfileEmptyState icon={Rocket} title={t("mine.empty.title")} body={t("mine.empty.body")} ctaLabel={t("mine.new")} ctaHref="/my-projects/new" />
      ) : (
        <>
          {/* Venture selector */}
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            {ventures.map((v) => (
              <button
                key={v.id}
                type="button"
                data-cursor="hover"
                onClick={() => setSelected(v.id)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-sm transition-colors",
                  selected === v.id ? "border-primary/50 bg-primary/[0.08] text-foreground" : "border-border/70 text-muted-foreground hover:text-foreground"
                )}
              >
                {v.name}
              </button>
            ))}
          </div>

          {analyticsQ.isError ? (
            <ErrorState onRetry={() => analyticsQ.refetch()} />
          ) : !a ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton-shimmer h-24 rounded-2xl" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
                <Stat index={0} icon={Eye} label={t("analytics.views")} value={a.views} format={(v) => String(v)} accent />
                <Stat index={1} icon={Users} label={t("analytics.visitors")} value={a.uniqueVisitors} format={(v) => String(v)} />
                <Stat index={2} icon={MousePointerClick} label={t("analytics.conversion")} value={a.conversionRate} format={(v) => `${v}%`} />
                <Stat index={3} icon={Bookmark} label={t("analytics.saves")} value={a.saves} format={(v) => String(v)} />
                <Stat index={4} icon={MessageSquare} label={t("analytics.comments")} value={a.comments} format={(v) => String(v)} />
                <Stat index={5} icon={TrendingUp} label={t("dash.kpi.investors")} value={a.investors} format={(v) => String(v)} />
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <Panel title={t("analytics.viewsOverTime")} icon={<Eye className="size-4" strokeWidth={1.7} />} elevated>
                  <div className="h-64">
                    {a.viewsOverTime.length > 0 ? (
                      <ViewsAreaChart data={a.viewsOverTime} />
                    ) : (
                      <div className="grid h-full place-items-center rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground">
                        {t("dash.chart.noData")}
                      </div>
                    )}
                  </div>
                </Panel>

                <Panel title={t("dash.chart.fundingOverTime")} icon={<TrendingUp className="size-4" strokeWidth={1.7} />}>
                  <div className="h-64">
                    {a.fundingOverTime.length > 0 ? (
                      <FundingAreaChart data={a.fundingOverTime} />
                    ) : (
                      <div className="grid h-full place-items-center rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground">
                        {t("dash.chart.noData")}
                      </div>
                    )}
                  </div>
                  <p className="mt-3 font-numeric text-sm text-muted-foreground">
                    <span className="text-bronze">{compactUsd(a.raised)}</span> / {compactUsd(a.goal)}
                  </p>
                </Panel>
              </div>

              {/* The six figures above describe what happened; the funnel is the only
                  thing on this page that says where interest is being lost, so it sits
                  below them rather than competing for the same glance. */}
              {insightsQ.data && (
                <Panel
                  title={t("funnel.panel")}
                  icon={<Filter className="size-4" strokeWidth={1.7} />}
                  elevated
                >
                  <InterestFunnel
                    funnel={insightsQ.data.funnel}
                    declined={insightsQ.data.declined}
                    stalled={insightsQ.data.stalled}
                  />
                </Panel>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
