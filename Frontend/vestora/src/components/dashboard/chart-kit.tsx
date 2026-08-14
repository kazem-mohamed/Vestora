"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

/**
 * The one specification every chart in Vestora is drawn to.
 *
 * There were five chart components before this, and each carried its own copy of the
 * theme reader, its own tooltip, its own idea of whether an axis was worth showing and
 * its own empty state. They looked like a set only because one person wrote them in an
 * afternoon; the sixth chart, added to the revenue screen months later, already
 * disagreed with the other five.
 *
 * Three rules are enforced here rather than left to each caller:
 *
 * 1. **A money chart shows its scale.** Every chart on the founder dashboard hid the
 *    Y axis, which made them shapes rather than measurements — a reader could see that
 *    a line went up and had no way to learn by how much without hovering.
 * 2. **Colour encodes something or it is not used.** A bar filled with a bronze-to-gold
 *    gradient reads as if the colour means a stage of something. It meant the bar
 *    existed.
 * 3. **Two points are not a trend.** With fifty accounts and a few months of history,
 *    most series here are short. A line drawn through two points is a decoration that
 *    implies a slope nobody measured, so short series render as values instead.
 */

/* ---------- theme ---------- */

export interface ChartTheme {
  primary: string;
  bronze: string;
  foreground: string;
  muted: string;
  border: string;
  card: string;
}

const FALLBACK: ChartTheme = {
  primary: "#b08a3f",
  bronze: "#8b4f2a",
  foreground: "#0a0908",
  muted: "#8a8375",
  border: "#e5ddc8",
  card: "#fcfaf3",
};

function readVars(): ChartTheme {
  if (typeof window === "undefined") return FALLBACK;
  const s = getComputedStyle(document.documentElement);
  const v = (n: string, fallback: string) => s.getPropertyValue(n).trim() || fallback;
  return {
    primary: v("--primary", FALLBACK.primary),
    bronze: v("--bronze", FALLBACK.bronze),
    foreground: v("--foreground", FALLBACK.foreground),
    muted: v("--muted-foreground", FALLBACK.muted),
    border: v("--border", FALLBACK.border),
    card: v("--card", FALLBACK.card),
  };
}

/** Reads the live theme tokens and re-reads whenever the theme class flips. */
export function useChartTheme(): ChartTheme {
  const [c, setC] = useState<ChartTheme>(readVars);
  useEffect(() => {
    setC(readVars());
    const obs = new MutationObserver(() => setC(readVars()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return c;
}

/* ---------- formatting ---------- */

export function compactUsd(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
}

export function compactCount(v: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);
}

export function monthLabel(iso: string, locale: string): string {
  const [y, m] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", { month: "short" }).format(
    new Date(y, (m ?? 1) - 1, 1)
  );
}

export function dayLabel(iso: string, locale: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "short",
  }).format(new Date(y, (m ?? 1) - 1, d ?? 1));
}

/* ---------- shared axis and grid ---------- */

/**
 * Axis defaults. The value axis is visible on purpose — see rule 1 above — and both
 * axes drop their own line and ticks so the grid is the only ruling on the plot.
 */
export function axisProps(theme: ChartTheme) {
  return {
    axisLine: false as const,
    tickLine: false as const,
    tick: { fill: theme.muted, fontSize: 11 },
  };
}

export function gridProps(theme: ChartTheme) {
  return {
    stroke: theme.border,
    strokeDasharray: "2 4",
    vertical: false as const,
  };
}

/* ---------- tooltip ---------- */

/**
 * One tooltip for every chart, and the only one that names its series.
 *
 * The old one printed a bare value, which on the committed-versus-funded chart meant two
 * numbers stacked with nothing saying which was the promise and which was the money.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: { value?: number; name?: string; color?: string; dataKey?: string | number }[];
  label?: string;
  format: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-medium text-foreground">{label}</p>}
      <ul className="space-y-0.5">
        {payload.map((p, i) => (
          <li key={i} className="flex items-center gap-2">
            {p.color && <span className="size-2 shrink-0 rounded-full" style={{ background: p.color }} />}
            {p.name && <span className="text-muted-foreground">{p.name}</span>}
            <span className="ms-auto font-numeric text-foreground">{format(p.value ?? 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- states a chart can be in besides "drawn" ---------- */

/** No data at all. One definition, because this box was pasted into three files. */
export function ChartEmpty({ label, className }: { label?: string; className?: string }) {
  const { t } = useLocale();
  return (
    <div
      className={cn(
        "grid h-full place-items-center rounded-xl border border-dashed border-border/60 px-4 text-center text-sm text-muted-foreground",
        className
      )}
    >
      {label ?? t("dash.chart.noData")}
    </div>
  );
}

/**
 * Too few points to draw a shape.
 *
 * A young platform spends its first months here, and a line chart with two points
 * claims a trend that two observations cannot support. The values are shown instead —
 * the same information, without the implied slope.
 */
export function ChartSparse({
  points,
  format,
}: {
  points: { label: string; value: number }[];
  format: (v: number) => string;
}) {
  const { t } = useLocale();
  return (
    <div className="flex h-full flex-col justify-center gap-3 rounded-xl border border-dashed border-border/60 px-5 py-4">
      <p className="text-xs text-muted-foreground">{t("dash.chart.tooFewPoints")}</p>
      <ul className="space-y-1.5">
        {points.map((p) => (
          <li key={p.label} className="flex items-baseline justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{p.label}</span>
            <span className="font-numeric text-foreground">{format(p.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Below this a time series is a list of numbers, not a curve. */
export const MIN_POINTS_FOR_A_LINE = 3;

/* ---------- legend ---------- */

export function ChartLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
