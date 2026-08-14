"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartEmpty,
  ChartLegend,
  ChartSparse,
  ChartTooltip,
  MIN_POINTS_FOR_A_LINE,
  axisProps,
  compactCount,
  compactUsd,
  dayLabel,
  gridProps,
  monthLabel,
  useChartTheme,
} from "@/components/dashboard/chart-kit";
import { useLocale } from "@/lib/i18n/locale";
import type { ApprovedVsPending, TimePoint, VentureFunding } from "@/lib/types/api";

// Every chart here is drawn to the spec in `chart-kit`. See the note at the top of that
// file for why the value axes are visible and why short series do not become lines.

/* ---------- 1. Funding over time (area) ---------- */

export function FundingAreaChart({ data, goal }: { data: TimePoint[]; goal?: number }) {
  const theme = useChartTheme();
  const { locale, t } = useLocale();

  if (data.length === 0) return <ChartEmpty />;
  if (data.length < MIN_POINTS_FOR_A_LINE) {
    return (
      <ChartSparse
        points={data.map((d) => ({ label: monthLabel(d.label, locale), value: d.value }))}
        format={compactUsd}
      />
    );
  }

  const rows = data.map((d) => ({ ...d, month: monthLabel(d.label, locale) }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="fundingFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.primary} stopOpacity={0.3} />
            <stop offset="100%" stopColor={theme.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps(theme)} />
        <XAxis dataKey="month" {...axisProps(theme)} dy={6} />
        <YAxis {...axisProps(theme)} width={52} tickFormatter={compactUsd} />
        {/* The target, drawn once, so "is this ahead or behind?" is answerable without
            reading the number off a KPI tile somewhere else on the page. */}
        {goal != null && goal > 0 && (
          <ReferenceLine
            y={goal}
            stroke={theme.muted}
            strokeDasharray="5 4"
            label={{ value: t("fund.word.goal"), position: "insideTopRight", fill: theme.muted, fontSize: 11 }}
          />
        )}
        <Tooltip cursor={{ stroke: theme.border }} content={<ChartTooltip format={compactUsd} />} />
        <Area
          type="monotone"
          name={t("fund.word.funded")}
          dataKey="value"
          stroke={theme.primary}
          strokeWidth={2}
          fill="url(#fundingFill)"
          dot={false}
          activeDot={{ r: 4, fill: theme.primary, stroke: theme.card, strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ---------- 1a. Committed vs funded (the gap chart) ---------- */

/**
 * Two cumulative curves on one grid: what was agreed, and what actually arrived.
 *
 * The gap between them is the most useful single reading a founder has — it is the money
 * that has been promised and not paid. One line could never show it, which is why the
 * old single "funding over time" chart was quietly misleading the moment payments became
 * possible.
 */
export function CommittedVsFundedChart({
  committed,
  funded,
  goal,
}: {
  committed: TimePoint[];
  funded: TimePoint[];
  goal?: number;
}) {
  const theme = useChartTheme();
  const { locale, t } = useLocale();

  // Union of both series' months, so a month with commitments and no payments still
  // plots a point rather than interpolating over the gap.
  const months = Array.from(
    new Set([...committed.map((p) => p.label), ...funded.map((p) => p.label)])
  ).sort();

  if (months.length === 0) return <ChartEmpty />;
  if (months.length < MIN_POINTS_FOR_A_LINE) {
    return (
      <ChartSparse
        points={months.flatMap((label) => [
          { label: `${monthLabel(label, locale)} · ${t("fund.word.committed")}`, value: lastAtOrBefore(committed, label) },
          { label: `${monthLabel(label, locale)} · ${t("fund.word.funded")}`, value: lastAtOrBefore(funded, label) },
        ])}
        format={compactUsd}
      />
    );
  }

  const rows = months.map((label) => ({
    month: monthLabel(label, locale),
    // Cumulative series: carry the last known value forward rather than dropping to zero
    // in a month with no new activity.
    committed: lastAtOrBefore(committed, label),
    funded: lastAtOrBefore(funded, label),
  }));

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="committedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.bronze} stopOpacity={0.18} />
                <stop offset="100%" stopColor={theme.bronze} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fundedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.primary} stopOpacity={0.35} />
                <stop offset="100%" stopColor={theme.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps(theme)} />
            <XAxis dataKey="month" {...axisProps(theme)} dy={6} />
            <YAxis {...axisProps(theme)} width={52} tickFormatter={compactUsd} />
            {goal != null && goal > 0 && (
              <ReferenceLine
                y={goal}
                stroke={theme.muted}
                strokeDasharray="5 4"
                label={{ value: t("fund.word.goal"), position: "insideTopRight", fill: theme.muted, fontSize: 11 }}
              />
            )}
            <Tooltip cursor={{ stroke: theme.border }} content={<ChartTooltip format={compactUsd} />} />
            {/* Committed behind, dashed — a promise drawn as a promise. */}
            <Area
              type="monotone"
              name={t("fund.word.committed")}
              dataKey="committed"
              stroke={theme.bronze}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              fill="url(#committedFill)"
              dot={false}
            />
            <Area
              type="monotone"
              name={t("fund.word.funded")}
              dataKey="funded"
              stroke={theme.primary}
              strokeWidth={2.5}
              fill="url(#fundedFill)"
              dot={false}
              activeDot={{ r: 4, fill: theme.primary, stroke: theme.card, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend
        items={[
          { color: theme.bronze, label: t("fund.word.committed") },
          { color: theme.primary, label: t("fund.word.funded") },
        ]}
      />
    </div>
  );
}

function lastAtOrBefore(series: TimePoint[], label: string): number {
  let value = 0;
  for (const p of series) {
    if (p.label <= label) value = p.value;
    else break;
  }
  return value;
}

/* ---------- 1b. Counts over time (daily area) ---------- */

export function ViewsAreaChart({ data }: { data: TimePoint[] }) {
  const theme = useChartTheme();
  const { locale } = useLocale();

  if (data.length === 0) return <ChartEmpty />;
  if (data.length < MIN_POINTS_FOR_A_LINE) {
    return (
      <ChartSparse
        points={data.map((d) => ({ label: dayLabel(d.label, locale), value: d.value }))}
        format={compactCount}
      />
    );
  }

  const rows = data.map((p) => ({ ...p, day: dayLabel(p.label, locale) }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.bronze} stopOpacity={0.3} />
            <stop offset="100%" stopColor={theme.bronze} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps(theme)} />
        <XAxis dataKey="day" {...axisProps(theme)} dy={6} minTickGap={24} />
        <YAxis {...axisProps(theme)} width={40} allowDecimals={false} tickFormatter={compactCount} />
        <Tooltip cursor={{ stroke: theme.border }} content={<ChartTooltip format={compactCount} />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={theme.bronze}
          strokeWidth={2}
          fill="url(#viewsFill)"
          dot={false}
          activeDot={{ r: 4, fill: theme.bronze, stroke: theme.card, strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ---------- 2. Funding by venture (horizontal bars) ---------- */

export function FundingByVentureChart({ data }: { data: VentureFunding[] }) {
  const theme = useChartTheme();

  if (data.length === 0) return <ChartEmpty />;

  // No truncation. Cutting a venture's name at fifteen characters made the labels
  // unreadable on precisely the ventures with descriptive names; the axis is given the
  // room instead.
  const rows = data.slice(0, 6).map((d) => ({ name: d.name, raised: d.raised }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 4 }}>
        <CartesianGrid {...gridProps(theme)} vertical horizontal={false} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          {...axisProps(theme)}
          width={148}
          interval={0}
        />
        <Tooltip cursor={{ fill: theme.primary + "12" }} content={<ChartTooltip format={compactUsd} />} />
        {/* One flat colour. The old bronze-to-gold gradient varied along each bar without
            standing for anything, which reads as a scale the reader then looks for. */}
        <Bar dataKey="raised" fill={theme.primary} radius={[0, 6, 6, 0]} barSize={16}>
          <LabelList
            dataKey="raised"
            position="right"
            formatter={(v: unknown) => (typeof v === "number" ? compactUsd(v) : "")}
            style={{ fill: theme.muted, fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- 3. Approved vs pending ---------- */

/**
 * One bar, two parts, both labelled.
 *
 * This was a doughnut. A doughnut for a two-part ratio is the weakest form available —
 * the reader compares two arcs by angle, which people are measurably bad at — and it
 * occupied a 176px square to say what a single bar says in a strip, beside a legend that
 * already printed both numbers in full.
 */
export function ApprovedPendingSplit({ data }: { data: ApprovedVsPending }) {
  const theme = useChartTheme();
  const { t } = useLocale();

  const total = data.approvedAmount + data.pendingAmount;
  if (total <= 0) return <ChartEmpty />;

  const approvedPct = (data.approvedAmount / total) * 100;

  return (
    <div>
      <p className="font-numeric text-2xl">{compactUsd(total)}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{t("dash.chart.total")}</p>

      <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-secondary">
        <span style={{ width: `${approvedPct}%`, background: theme.primary }} />
        <span style={{ width: `${100 - approvedPct}%`, background: theme.bronze }} />
      </div>

      <ul className="mt-4 space-y-2.5 text-sm">
        <SplitRow
          color={theme.primary}
          label={t("dash.chart.approved")}
          count={data.approvedCount}
          amount={data.approvedAmount}
        />
        <SplitRow
          color={theme.bronze}
          label={t("dash.chart.pending")}
          count={data.pendingCount}
          amount={data.pendingAmount}
        />
      </ul>
    </div>
  );
}

function SplitRow({
  color,
  label,
  count,
  amount,
}: {
  color: string;
  label: string;
  count: number;
  amount: number;
}) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ background: color }} />
        <span className="text-muted-foreground">{label}</span>
        <span className="font-numeric text-xs text-muted-foreground/70">({count})</span>
      </span>
      <span className="font-numeric text-foreground">{compactUsd(amount)}</span>
    </li>
  );
}
