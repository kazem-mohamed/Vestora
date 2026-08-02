"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLocale } from "@/lib/i18n/locale";
import type { ApprovedVsPending, TimePoint, VentureFunding } from "@/lib/types/api";

/* ---------- theming ---------- */

interface ChartColors {
  primary: string;
  bronze: string;
  foreground: string;
  muted: string;
  border: string;
  card: string;
}

function readVars(): ChartColors {
  if (typeof window === "undefined") {
    return { primary: "#b08a3f", bronze: "#8b4f2a", foreground: "#0a0908", muted: "#8a8375", border: "#e5ddc8", card: "#fcfaf3" };
  }
  const s = getComputedStyle(document.documentElement);
  const v = (n: string, fallback: string) => s.getPropertyValue(n).trim() || fallback;
  return {
    primary: v("--primary", "#b08a3f"),
    bronze: v("--bronze", "#8b4f2a"),
    foreground: v("--foreground", "#0a0908"),
    muted: v("--muted-foreground", "#8a8375"),
    border: v("--border", "#e5ddc8"),
    card: v("--card", "#fcfaf3"),
  };
}

/** Reads the live theme tokens and re-reads whenever the theme class flips. */
export function useChartColors(): ChartColors {
  const [c, setC] = useState<ChartColors>(readVars);
  useEffect(() => {
    setC(readVars());
    const obs = new MutationObserver(() => setC(readVars()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return c;
}

/* ---------- formatting ---------- */

function compactUsd(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
}

function monthLabel(iso: string, locale: string): string {
  // iso = "yyyy-MM"
  const [y, m] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    month: "short",
  }).format(new Date(y, (m ?? 1) - 1, 1));
}

/* ---------- shared tooltip ---------- */

function ThemedTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: { value?: number; name?: string }[];
  label?: string;
  format: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md ring-1 ring-foreground/10">
      {label && <p className="mb-1 font-medium text-foreground">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-numeric text-muted-foreground">
          <span className="text-foreground">{format(p.value ?? 0)}</span>
        </p>
      ))}
    </div>
  );
}

/* ---------- 1. Funding over time (area) ---------- */

export function FundingAreaChart({ data }: { data: TimePoint[] }) {
  const c = useChartColors();
  const { locale } = useLocale();
  const rows = data.map((d) => ({ ...d, month: monthLabel(d.label, locale) }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="fundingFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.primary} stopOpacity={0.35} />
            <stop offset="100%" stopColor={c.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fill: c.muted, fontSize: 11 }}
          dy={6}
        />
        <YAxis hide domain={[0, "dataMax"]} />
        <Tooltip
          cursor={{ stroke: c.border }}
          content={<ThemedTooltip format={compactUsd} />}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={c.primary}
          strokeWidth={2}
          fill="url(#fundingFill)"
          dot={false}
          activeDot={{ r: 4, fill: c.primary, stroke: c.card, strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ---------- 1a. Committed vs funded (the gap chart) ---------- */

/**
 * Two cumulative curves on one grid: what was agreed, and what actually arrived.
 *
 * The gap between them is the most useful single reading a founder has — it is
 * the money that has been promised and not paid. One line could never show it,
 * which is why the old single "funding over time" chart was quietly misleading
 * the moment payments became possible.
 */
export function CommittedVsFundedChart({
  committed,
  funded,
}: {
  committed: TimePoint[];
  funded: TimePoint[];
}) {
  const c = useChartColors();
  const { locale } = useLocale();

  // Union of both series' months, so a month with commitments and no payments
  // still plots a point rather than interpolating over the gap.
  const months = Array.from(
    new Set([...committed.map((p) => p.label), ...funded.map((p) => p.label)])
  ).sort();

  const rows = months.map((label) => ({
    month: monthLabel(label, locale),
    // Cumulative series: carry the last known value forward rather than dropping
    // to zero in a month with no new activity.
    committed: lastAtOrBefore(committed, label),
    funded: lastAtOrBefore(funded, label),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="committedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.bronze} stopOpacity={0.22} />
            <stop offset="100%" stopColor={c.bronze} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fundedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.primary} stopOpacity={0.4} />
            <stop offset="100%" stopColor={c.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fill: c.muted, fontSize: 11 }}
          dy={6}
        />
        <YAxis hide domain={[0, "dataMax"]} />
        <Tooltip cursor={{ stroke: c.border }} content={<ThemedTooltip format={compactUsd} />} />
        {/* Committed behind, dashed — a promise drawn as a promise. */}
        <Area
          type="monotone"
          dataKey="committed"
          stroke={c.bronze}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          fill="url(#committedFill)"
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="funded"
          stroke={c.primary}
          strokeWidth={2.5}
          fill="url(#fundedFill)"
          dot={false}
          activeDot={{ r: 4, fill: c.primary, stroke: c.card, strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
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

/* ---------- 1b. Views over time (daily area) ---------- */

function dayLabel(iso: string, locale: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "short",
  }).format(new Date(y, (m ?? 1) - 1, d ?? 1));
}

export function ViewsAreaChart({ data }: { data: TimePoint[] }) {
  const c = useChartColors();
  const { locale } = useLocale();
  const rows = data.map((p) => ({ ...p, day: dayLabel(p.label, locale) }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.bronze} stopOpacity={0.35} />
            <stop offset="100%" stopColor={c.bronze} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: c.muted, fontSize: 11 }} dy={6} minTickGap={24} />
        <YAxis hide domain={[0, "dataMax"]} />
        <Tooltip cursor={{ stroke: c.border }} content={<ThemedTooltip format={(v) => String(v)} />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={c.bronze}
          strokeWidth={2}
          fill="url(#viewsFill)"
          dot={false}
          activeDot={{ r: 4, fill: c.bronze, stroke: c.card, strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ---------- 2. Funding by venture (horizontal bars) ---------- */

export function FundingByVentureChart({ data }: { data: VentureFunding[] }) {
  const c = useChartColors();
  const rows = data.slice(0, 6).map((d) => ({
    name: d.name.length > 16 ? d.name.slice(0, 15) + "…" : d.name,
    raised: d.raised,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          axisLine={false}
          tickLine={false}
          width={104}
          tick={{ fill: c.muted, fontSize: 11 }}
        />
        <Tooltip cursor={{ fill: c.primary + "12" }} content={<ThemedTooltip format={compactUsd} />} />
        <defs>
          <linearGradient id="barFill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={c.bronze} />
            <stop offset="100%" stopColor={c.primary} />
          </linearGradient>
        </defs>
        <Bar dataKey="raised" fill="url(#barFill)" radius={[0, 6, 6, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- 3. Approved vs pending (donut) ---------- */

export function ApprovedPendingDonut({ data }: { data: ApprovedVsPending }) {
  const c = useChartColors();
  const { t } = useLocale();
  const slices = [
    { name: t("dash.chart.approved"), value: data.approvedAmount, color: c.primary },
    { name: t("dash.chart.pending"), value: data.pendingAmount, color: c.bronze },
  ].filter((s) => s.value > 0);

  const total = data.approvedAmount + data.pendingAmount;
  const display = slices.length ? slices : [{ name: "", value: 1, color: c.border }];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={display}
          dataKey="value"
          nameKey="name"
          innerRadius="62%"
          outerRadius="90%"
          paddingAngle={slices.length > 1 ? 3 : 0}
          strokeWidth={0}
        >
          {display.map((s, i) => (
            <Cell key={i} fill={s.color} />
          ))}
        </Pie>
        {total > 0 && <Tooltip content={<ThemedTooltip format={compactUsd} />} />}
      </PieChart>
    </ResponsiveContainer>
  );
}
