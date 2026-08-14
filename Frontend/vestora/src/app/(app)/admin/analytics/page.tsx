"use client";

import { useQuery } from "@tanstack/react-query";
import { Banknote, Clock, Filter, Rocket } from "lucide-react";
import { DashPageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { ChartEmpty, compactUsd } from "@/components/dashboard/chart-kit";
import { ErrorState } from "@/components/ui/error-state";
import { adminApi } from "@/lib/api/admin";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { AdminConversion, AdminFunnelStep } from "@/lib/types/api";

/**
 * Where relationships stop, how long each step takes, and what the platform earned.
 *
 * Counts lead everywhere and percentages are secondary, because the platform is small
 * enough that one decline moves a rate by several points. The API never sends a
 * percentage at all — it sends the two halves of each ratio, so this page cannot
 * accidentally present a derived figure as a measured one.
 */
export default function AdminAnalyticsPage() {
  const { t, locale } = useLocale();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-insights"],
    queryFn: () => adminApi.insights(),
  });

  if (isError) return <ErrorState className="mt-6" onRetry={() => refetch()} />;
  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <DashPageHeader title={t("admin.analytics.title")} sub={t("admin.analytics.sub")} eyebrowKey="admin.sidebar.label" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton-shimmer h-48 rounded-2xl" />
        ))}
      </div>
    );
  }

  const widest = Math.max(1, ...data.funnel.map((s) => s.count));

  return (
    <div className="space-y-6">
      <DashPageHeader
        title={t("admin.analytics.title")}
        sub={t("admin.analytics.sub")}
        eyebrowKey="admin.sidebar.label"
      />

      {/* ---- funnel ---- */}
      <Panel title={t("admin.analytics.funnel")} icon={<Filter className="size-4" strokeWidth={1.7} />} elevated>
        {data.totalRelationships === 0 ? (
          <ChartEmpty />
        ) : (
          <>
            <ul className="space-y-3">
              {data.funnel.map((step, i) => (
                <FunnelRow
                  key={step.stage}
                  step={step}
                  widest={widest}
                  previous={i > 0 ? data.funnel[i - 1] : null}
                />
              ))}
            </ul>
            {/* Declined sits outside the ladder — it is where relationships leave. */}
            <p className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              <span className="font-numeric text-foreground">{data.declined}</span>{" "}
              {t("admin.analytics.declined")}
            </p>
          </>
        )}
      </Panel>

      {/* ---- conversions ---- */}
      <Panel title={t("admin.analytics.conversion")} icon={<Rocket className="size-4" strokeWidth={1.7} />}>
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {data.conversions.map((c) => (
            <ConversionFact key={c.key} conversion={c} />
          ))}
        </dl>
      </Panel>

      {/* ---- time in stage ---- */}
      <Panel title={t("admin.analytics.dwell")} icon={<Clock className="size-4" strokeWidth={1.7} />}>
        {data.stageDwell.length === 0 ? (
          <ChartEmpty label={t("admin.analytics.noHistory")} />
        ) : (
          <>
            <ul className="divide-y divide-border/50">
              {data.stageDwell.map((d) => (
                <li key={d.stage} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 text-sm">
                  <span className="min-w-0 flex-1 font-medium">{d.stage}</span>
                  <span className="font-numeric">
                    {duration(d.medianMinutes, t)}
                    <span className="text-muted-foreground"> {t("admin.analytics.median")}</span>
                  </span>
                  <span className="font-numeric text-xs text-muted-foreground">
                    {t("admin.analytics.longest")} {duration(d.longestMinutes, t)}
                  </span>
                  {/* The sample size is never optional. A median over three moves is not
                      a fact about the platform, and printing it alone would imply it is. */}
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 font-numeric text-[11px] leading-5 text-muted-foreground">
                    n={d.samples}
                  </span>
                </li>
              ))}
            </ul>
            {data.relationshipsWithHistory < data.totalRelationships && (
              <p className="mt-3 text-xs text-muted-foreground">
                {t("admin.analytics.partialHistory")
                  .replace("{withHistory}", String(data.relationshipsWithHistory))
                  .replace("{total}", String(data.totalRelationships))}
              </p>
            )}
          </>
        )}
      </Panel>

      {/* ---- revenue ---- */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={t("admin.analytics.revenueByMonth")} icon={<Banknote className="size-4" strokeWidth={1.7} />}>
          {data.revenueByMonth.length === 0 ? (
            <ChartEmpty />
          ) : (
            <ul className="divide-y divide-border/50">
              {data.revenueByMonth.map((r) => (
                <li key={r.label} className="flex items-baseline gap-3 py-2.5 text-sm">
                  <span className="w-20 shrink-0 font-numeric text-muted-foreground">
                    {monthName(r.label, locale)}
                  </span>
                  <span className="font-numeric text-xs text-muted-foreground/70">
                    {r.transactions} {t("admin.analytics.transactions")}
                  </span>
                  <span className="ms-auto text-end font-numeric">
                    <span className="block text-primary">{compactUsd(r.fees)}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {t("admin.analytics.of")} {compactUsd(r.gross)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={t("admin.analytics.revenueByVenture")} icon={<Rocket className="size-4" strokeWidth={1.7} />}>
          {data.revenueByVenture.length === 0 ? (
            <ChartEmpty />
          ) : (
            <ul className="divide-y divide-border/50">
              {data.revenueByVenture.map((r) => (
                <li key={r.projectId} className="flex items-baseline gap-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  <span className="font-numeric text-xs text-muted-foreground/70">{r.transactions}</span>
                  <span className="shrink-0 font-numeric text-primary">{compactUsd(r.fees)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

/**
 * One rung. The bar is scaled against the widest step, and the drop-off from the step
 * above is stated as a count first.
 */
function FunnelRow({
  step,
  widest,
  previous,
}: {
  step: AdminFunnelStep;
  widest: number;
  previous: AdminFunnelStep | null;
}) {
  const { t } = useLocale();
  const width = Math.round((step.count / widest) * 100);
  const lost = previous ? previous.count - step.count : 0;

  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{step.stage}</span>
        <span className="flex items-baseline gap-2">
          <span className="font-numeric text-foreground">{step.count}</span>
          {lost > 0 && (
            <span className="font-numeric text-[11px] text-muted-foreground">
              −{lost} {t("admin.analytics.dropped")}
            </span>
          )}
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <span
          className={cn("block h-full rounded-full", step.stage === "Funded" ? "bg-primary" : "bg-bronze")}
          style={{ width: `${width}%` }}
        />
      </div>
    </li>
  );
}

/** The count is the headline. The percentage is the footnote, and only when it means anything. */
function ConversionFact({ conversion }: { conversion: AdminConversion }) {
  const { t } = useLocale();
  const { numerator, denominator } = conversion;
  const pct = denominator > 0 ? Math.round((numerator / denominator) * 100) : null;

  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {t(`admin.analytics.rate.${conversion.key}`)}
      </dt>
      <dd className="mt-1.5">
        <span className="font-numeric text-xl text-foreground">{numerator}</span>
        <span className="font-numeric text-sm text-muted-foreground"> / {denominator}</span>
        {pct !== null && (
          <span className="ms-2 font-numeric text-xs text-muted-foreground/70">{pct}%</span>
        )}
      </dd>
    </div>
  );
}

function duration(minutes: number, t: (k: string) => string): string {
  if (minutes < 60) return `${minutes}${t("admin.analytics.min")}`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}${t("admin.analytics.hr")}`;
  return `${Math.round(minutes / (60 * 24))}${t("admin.analytics.day")}`;
}

function monthName(iso: string, locale: string): string {
  const [y, m] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    month: "short",
    year: "2-digit",
  }).format(new Date(y, (m ?? 1) - 1, 1));
}
