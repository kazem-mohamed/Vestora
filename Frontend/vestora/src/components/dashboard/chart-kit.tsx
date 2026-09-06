"use client";

import { useEffect, useId, useState } from "react";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { TimePoint } from "@/lib/types/api";

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

/**
 * `variant="line"` draws each swatch as the stroke the chart actually uses, dashed
 * where the series is dashed.
 *
 * A dot cannot distinguish two line series that differ by dash pattern, so the
 * committed-versus-funded chart used to carry two legends: this one for the colours
 * and a second, hand-built one on the funding screen for the stroke styles. One legend
 * that shows both is the whole job.
 */
export function ChartLegend({
  items,
  variant = "dot",
}: {
  items: { color: string; label: string; dashed?: boolean }[];
  variant?: "dot" | "line";
}) {
  return (
    <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {variant === "line" ? (
            <span
              aria-hidden
              className="h-0.5 w-4 shrink-0 rounded-full"
              style={
                i.dashed
                  ? {
                      backgroundImage: `repeating-linear-gradient(90deg, ${i.color} 0 4px, transparent 4px 7px)`,
                    }
                  : { background: i.color }
              }
            />
          ) : (
            <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: i.color }} />
          )}
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/* ---------- derived series ---------- */

/**
 * Turns a cumulative series into per-period arrivals.
 *
 * A running total can only ever rise, so a line drawn from one is guaranteed to
 * slope up no matter what actually happened — a month where nothing was created
 * and a month with fifty new ventures both bend it upward. Differencing it gives
 * a figure that can fall, which is the only version worth plotting: the reader
 * can finally see a bad month as a bad month.
 *
 * The first point is dropped rather than reported as its own arrival count. The
 * series starts at whatever had already accumulated before the window opened,
 * and calling that "new this month" would invent a spike that never happened.
 */
export function toPerPeriod(points: TimePoint[]): TimePoint[] {
  if (points.length < 2) return [];
  const out: TimePoint[] = [];
  for (let i = 1; i < points.length; i++) {
    out.push({
      label: points[i].label,
      value: Math.max(0, points[i].value - points[i - 1].value),
    });
  }
  return out;
}

/**
 * A round number at or above `value`, for the top of a value axis.
 *
 * Recharts, left alone, ends the axis exactly at the largest number in the data.
 * That is the one place a line must never be drawn: it lands on the frame, where
 * it reads as the border rather than as a measurement. On the committed-versus-funded
 * chart the casualty was always the same series, because committed is by definition
 * the larger of the two — the founder's promised capital was the one line they could
 * not see.
 *
 * Anything a chart must be able to *show* rather than merely contain — a goal it has
 * not reached yet — has to be passed in here too, or the axis stops below it and the
 * reference line is silently dropped off the top.
 *
 * The ceiling is the next whole multiple of a round tick step, rather than the next
 * round number outright. Rounding $336K straight up to a 1/2/5 mantissa reaches $500K
 * and leaves the top third of the plot empty — headroom is meant to lift the highest
 * line off the frame, not to shrink the data into the lower half. Sizing the step for
 * roughly four gridlines and rounding up to a multiple of it gives $400K here: clean
 * ticks, and the data still fills the chart.
 */
export function niceCeil(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const step = niceStep(value / 4);
  return Math.ceil(value / step) * step;
}

/** The nearest round 1/2/2.5/5 × 10ⁿ step at or above `rough` — one gridline interval. */
function niceStep(rough: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const step = [1, 2, 2.5, 5, 10].find((s) => normalized <= s) ?? 10;
  return step * magnitude;
}

/** Mean of a series, for the reference line a bar chart needs to be readable. */
export function meanOf(points: TimePoint[]): number {
  if (points.length === 0) return 0;
  return points.reduce((s, p) => s + p.value, 0) / points.length;
}

/**
 * Change between the last two periods.
 *
 * A single figure cannot be judged — "29 users" is neither good nor bad until it
 * is placed against what came before. Returns null when there is nothing to
 * compare against, so the caller renders nothing rather than a fake "0%".
 */
export function periodDelta(points: TimePoint[]): { abs: number; pct: number | null } | null {
  if (points.length < 2) return null;
  const last = points[points.length - 1].value;
  const prev = points[points.length - 2].value;
  const abs = last - prev;
  return { abs, pct: prev === 0 ? null : (abs / prev) * 100 };
}

/** A signed change, coloured by direction and never by hue alone. */
export function DeltaBadge({
  delta,
  invert,
  suffix,
}: {
  delta: { abs: number; pct: number | null } | null;
  /** For figures where down is the good direction (time-to-close, drop-off). */
  invert?: boolean;
  suffix?: string;
}) {
  const { t } = useLocale();
  if (!delta || delta.abs === 0) {
    return <span className="text-xs text-muted-foreground">{t("chart.delta.flat")}</span>;
  }
  const up = delta.abs > 0;
  const good = invert ? !up : up;
  return (
    <span
      className={cn(
        "font-numeric inline-flex items-center gap-1 text-xs",
        good ? "text-primary" : "text-bronze"
      )}
    >
      {/* An arrow as well as the colour: direction must survive a colourblind
          reader and a greyscale print of the report. */}
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {up ? "+" : ""}
      {delta.pct != null ? `${Math.round(delta.pct)}%` : delta.abs}
      {suffix ? ` ${suffix}` : ""}
    </span>
  );
}
