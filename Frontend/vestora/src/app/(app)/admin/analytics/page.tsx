"use client";

import { useQuery } from "@tanstack/react-query";
import { Banknote, Clock, Filter, Rocket } from "lucide-react";
import { DashPageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { ChartEmpty, compactUsd } from "@/components/dashboard/chart-kit";
import { RevenueByMonthChart } from "@/components/dashboard/dashboard-charts";
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

  // Measured against the first rung, so each bar reads as "share of everyone
  // who entered the funnel that got this far".
  const firstStep = data.funnel[0]?.count ?? 0;

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
                  first={firstStep}
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
            <ul className="space-y-3.5">
              {data.stageDwell.map((d) => (
                <DwellRow
                  key={d.stage}
                  dwell={d}
                  scale={Math.max(1, ...data.stageDwell.map((x) => x.longestMinutes))}
                />
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
            // Money over time was a list of rows, which is the one shape that
            // hides a trend: a reader had to hold six figures in their head to
            // notice a decline. Gross and the platform's own cut are drawn on
            // one pair of axes so the margin between them is visible directly.
            <div className="h-64">
              <RevenueByMonthChart data={data.revenueByMonth} />
            </div>
          )}
        </Panel>

        <Panel title={t("admin.analytics.revenueByVenture")} icon={<Rocket className="size-4" strokeWidth={1.7} />}>
          {data.revenueByVenture.length === 0 ? (
            <ChartEmpty />
          ) : (
            // A sorted list already ranks these correctly, but rank alone cannot
            // say whether the top venture earns twice the second or twenty times
            // it. The bar carries the magnitude the ordering leaves out.
            <ul className="space-y-2.5">
              {(() => {
                const top = Math.max(1, ...data.revenueByVenture.map((r) => r.fees));
                return data.revenueByVenture.map((r) => (
                  <li key={r.projectId} className="text-sm">
                    <div className="flex items-baseline gap-3">
                      <span className="min-w-0 flex-1 truncate">{r.name}</span>
                      <span className="font-numeric text-xs text-muted-foreground/70">
                        {r.transactions}
                      </span>
                      <span className="shrink-0 font-numeric text-primary">
                        {compactUsd(r.fees)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <span
                        className="block h-full rounded-full bg-primary/70"
                        style={{ width: `${(r.fees / top) * 100}%` }}
                      />
                    </div>
                  </li>
                ));
              })()}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

/**
 * One rung of the funnel, drawn so the leak is the thing you see.
 *
 * The previous version scaled every bar against the widest step, which made a
 * funnel of 110 → 92 → 88 → 77 → 75 → 71 → 52 render as seven bars of nearly
 * the same length: the shape a funnel exists to show was invisible, and the only
 * way to read a drop-off was the small "−18" caption beside it.
 *
 * Two changes fix that. The bar is measured against the FIRST step, so its
 * length is "share of everyone who started that got this far". And the people
 * lost at this step are drawn as their own dim segment immediately after the
 * survivors, in the same track — the gap between the two is the leak, at the
 * point in the ladder where it happened.
 */
function FunnelRow({
  step,
  first,
  previous,
}: {
  step: AdminFunnelStep;
  first: number;
  previous: AdminFunnelStep | null;
}) {
  const { t } = useLocale();
  const kept = first > 0 ? (step.count / first) * 100 : 0;
  const lost = previous ? Math.max(0, previous.count - step.count) : 0;
  const lostWidth = first > 0 ? (lost / first) * 100 : 0;
  // Step-to-step conversion is the number an operator acts on: "of the people
  // who reached the previous rung, how many took this one?"
  const conversion = previous && previous.count > 0
    ? Math.round((step.count / previous.count) * 100)
    : null;

  return (
    <li>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
        <span className="font-medium">{step.stage}</span>
        <span className="flex items-baseline gap-2">
          <span className="font-numeric text-foreground">{step.count}</span>
          {conversion != null && (
            <span className="font-numeric text-[11px] text-muted-foreground">
              {conversion}% {t("admin.analytics.ofPrevious")}
            </span>
          )}
          {lost > 0 && (
            <span className="font-numeric text-[11px] text-bronze">
              −{lost} {t("admin.analytics.dropped")}
            </span>
          )}
        </span>
      </div>
      <div className="mt-1.5 flex h-2.5 w-full overflow-hidden rounded-full bg-secondary">
        <span
          className={cn(
            "block h-full transition-[width] duration-700 ease-out",
            step.stage === "Funded" ? "bg-primary" : "bg-bronze"
          )}
          style={{ width: `${kept}%` }}
        />
        {/* The leak, in place. Striped rather than solid so it never reads as
            another cohort that is still in the funnel. */}
        {lostWidth > 0 && (
          <span
            className="block h-full opacity-45"
            style={{
              width: `${lostWidth}%`,
              backgroundImage:
                "repeating-linear-gradient(135deg, var(--bronze) 0 3px, transparent 3px 6px)",
            }}
          />
        )}
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

/**
 * How long one stage takes, drawn as a range rather than two numbers.
 *
 * Median and longest were printed side by side as text, which hid the thing an
 * operator is looking for: the gap between them. A stage with a median of two
 * days and a worst case of two days is running smoothly; a stage with the same
 * median and a worst case of three weeks has a queue nobody is watching. As text
 * those two read almost identically.
 *
 * Every row shares one scale — the longest wait anywhere in the pipeline — so
 * the bars are comparable across stages instead of each filling its own track.
 * The solid part is the median, the dim extension is the tail out to the worst
 * case, and a long dim tail is the bottleneck.
 */
function DwellRow({
  dwell,
  scale,
}: {
  dwell: { stage: string; medianMinutes: number; longestMinutes: number; samples: number };
  scale: number;
}) {
  const { t } = useLocale();
  const medianPct = Math.min(100, (dwell.medianMinutes / scale) * 100);
  const longestPct = Math.min(100, (dwell.longestMinutes / scale) * 100);
  const tailPct = Math.max(0, longestPct - medianPct);

  return (
    <li>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
        <span className="font-medium">{dwell.stage}</span>
        <span className="flex items-baseline gap-2">
          <span className="font-numeric text-foreground">{duration(dwell.medianMinutes, t)}</span>
          <span className="text-[11px] text-muted-foreground">{t("admin.analytics.median")}</span>
          <span className="font-numeric text-[11px] text-muted-foreground">
            {t("admin.analytics.longest")} {duration(dwell.longestMinutes, t)}
          </span>
          {/* The sample size is never optional. A median over three moves is not
              a fact about the platform, and printing it alone would imply it is. */}
          <span className="shrink-0 rounded-full border border-border px-2 py-0.5 font-numeric text-[11px] leading-5 text-muted-foreground">
            n={dwell.samples}
          </span>
        </span>
      </div>
      <div
        className="mt-1.5 flex h-2.5 w-full overflow-hidden rounded-full bg-secondary"
        role="img"
        aria-label={`${dwell.stage}: ${t("admin.analytics.median")} ${duration(dwell.medianMinutes, t)}, ${t("admin.analytics.longest")} ${duration(dwell.longestMinutes, t)}`}
      >
        <span className="block h-full bg-bronze" style={{ width: `${medianPct}%` }} />
        <span className="block h-full bg-bronze/25" style={{ width: `${tailPct}%` }} />
      </div>
    </li>
  );
}
