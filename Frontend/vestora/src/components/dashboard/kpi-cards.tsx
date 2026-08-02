"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Banknote,
  Clock,
  Hourglass,
  Rocket,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { FounderKpis, TimePoint } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

function compactUsd(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
}

/** Last-month delta from a cumulative series (last point minus previous). */
function seriesDelta(series?: TimePoint[]): number {
  if (!series || series.length === 0) return 0;
  const last = series[series.length - 1].value;
  const prev = series.length > 1 ? series[series.length - 2].value : 0;
  return last - prev;
}

/** Tiny self-drawing trend line for the card footer. */
function MiniSparkline({ series, delay }: { series: number[]; delay: number }) {
  const gradId = useId();
  const reduce = useReducedMotion();
  const data = series.length >= 2 ? series : [0, ...series];
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const W = 110;
  const H = 26;
  const PAD = 2;
  const pts = data.map((v, i) => {
    const x = PAD + (i * (W - PAD * 2)) / (data.length - 1);
    const y = H - PAD - ((v - min) / span) * (H - PAD * 2);
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-7 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--bronze)" />
          <stop offset="100%" stopColor="var(--primary)" />
        </linearGradient>
      </defs>
      <motion.polyline
        points={pts.join(" ")}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.3, delay, ease: EASE }}
      />
    </svg>
  );
}

/** Segmented counter (funded / total) — the "780 / 1000" pill idea, on-brand. */
function Segments({ filled, total }: { filled: number; total: number }) {
  const cells = Math.max(total, 1);
  return (
    <div className="flex gap-1">
      {Array.from({ length: Math.min(cells, 10) }).map((_, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, scaleY: 0.4 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 0.4, delay: 0.5 + i * 0.06, ease: EASE }}
          className={cn(
            "h-5 flex-1 rounded-[5px]",
            i < filled
              ? "bg-gradient-to-b from-primary to-bronze"
              : "border border-dashed border-border bg-transparent"
          )}
        />
      ))}
    </div>
  );
}

function DeltaChip({ delta, format, label }: { delta: number; format: (v: number) => string; label: string }) {
  if (delta <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/[0.07] px-2 py-0.5 text-[10px] text-primary">
      <ArrowUpRight className="size-3" />
      <span className="font-numeric">+{format(delta)}</span>
      <span className="opacity-70">{label}</span>
    </span>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  format,
  sub,
  accent,
  bronze,
  index,
  series,
  deltaFormat,
  footer,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  format: (v: number) => string;
  sub?: React.ReactNode;
  accent?: boolean;
  bronze?: boolean;
  index: number;
  /** Cumulative series → sparkline + growth chip. */
  series?: TimePoint[];
  deltaFormat?: (v: number) => string;
  /** Custom footer (overrides sparkline). */
  footer?: React.ReactNode;
}) {
  const { t, locale } = useLocale();
  const delta = seriesDelta(series);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: (index % 6) * 0.06, ease: EASE }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border p-5 backdrop-blur-sm transition-[border-color,box-shadow,transform] duration-500 hover:-translate-y-1",
        accent
          ? "border-primary/40 bg-card/70 shadow-[0_28px_65px_-38px_var(--primary)]"
          : "border-border/70 bg-card/55 hover:border-primary/40 hover:shadow-[0_24px_55px_-38px_rgba(0,0,0,0.5)]"
      )}
    >
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      {/* soft corner glow on the accent card */}
      {accent && (
        <span
          aria-hidden
          className="pointer-events-none absolute -end-8 -top-8 size-28 rounded-full blur-2xl"
          style={{ background: "color-mix(in oklab, var(--primary) 22%, transparent)" }}
        />
      )}

      <div className="relative flex items-center justify-between gap-3">
        <p
          className={cn(
            "text-[11px] text-muted-foreground",
            locale === "ar" ? "" : "uppercase tracking-[0.14em]"
          )}
        >
          {label}
        </p>
        <span className="grid size-8 shrink-0 place-items-center rounded-full border border-primary/25 text-primary transition-all duration-500 group-hover:scale-110 group-hover:border-primary/60 group-hover:bg-primary/[0.08]">
          <Icon className="size-4" strokeWidth={1.6} />
        </span>
      </div>

      <div className="relative mt-3 flex flex-wrap items-center gap-2">
        <AnimatedNumber
          value={value}
          format={format}
          delay={(index % 6) * 0.06 + 0.1}
          className={cn(
            "block font-numeric text-3xl leading-none",
            bronze ? "text-bronze" : "text-foreground"
          )}
        />
        {series && deltaFormat && (
          <DeltaChip delta={delta} format={deltaFormat} label={t("dash.kpi.thisMonth")} />
        )}
      </div>

      {sub && <p className="relative mt-2 text-xs text-muted-foreground">{sub}</p>}

      <div className="relative mt-auto pt-3">
        {footer ??
          (series && series.length > 0 ? (
            <MiniSparkline series={series.map((p) => p.value)} delay={(index % 6) * 0.06 + 0.35} />
          ) : null)}
      </div>
    </motion.div>
  );
}

/**
 * The founder's six headline readings.
 *
 * Reordered so money leads: funded, then committed, then what has been asked for
 * and not paid. The row used to open with "Raised", carrying the sum of
 * approvals — the largest number on the page and the least true one. Followers
 * and unread messages lost their tiles to make room; both are already a glance
 * away in the header and the activity rail, and neither is a funding figure.
 */
export function KpiCards({
  kpis,
  funding,
  funded,
  investors,
}: {
  kpis: FounderKpis;
  /** Cumulative committed capital — the promises curve. */
  funding: TimePoint[];
  /** Cumulative settled capital — the money curve. */
  funded: TimePoint[];
  investors: TimePoint[];
}) {
  const { t } = useLocale();
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
      {/* The lead card is now settled money, not the sum of approvals. It was
          previously labelled "raised" while carrying commitments, which made the
          single largest number on the founder's screen the least true one. */}
      <KpiCard
        index={0}
        icon={Banknote}
        label={t("dash.fund.funded")}
        value={kpis.totalFunded}
        format={compactUsd}
        bronze
        accent
        series={funded}
        deltaFormat={compactUsd}
        sub={
          <>
            {t("dash.kpi.ofGoal")}{" "}
            <span className="font-numeric text-foreground">{compactUsd(kpis.totalGoal)}</span>
          </>
        }
      />
      {/* Commitments keep their place — one rung back, and named for what they are. */}
      <KpiCard
        index={1}
        icon={Wallet}
        label={t("dash.fund.committed")}
        value={kpis.totalCommitted}
        format={compactUsd}
        series={funding}
        deltaFormat={compactUsd}
        sub={t("dash.fund.committedSub")}
      />
      <KpiCard
        index={2}
        icon={Hourglass}
        label={t("dash.fund.awaiting")}
        value={kpis.awaitingPayment}
        format={compactUsd}
        accent={kpis.awaitingPaymentCount > 0}
        sub={t("dash.fund.awaitingSub").replace("{count}", String(kpis.awaitingPaymentCount))}
      />
      <KpiCard
        index={3}
        icon={Rocket}
        label={t("dash.kpi.ventures")}
        value={kpis.venturesCount}
        format={(v) => String(v)}
        sub={
          <>
            <span className="font-numeric text-foreground">{kpis.fundedVenturesCount}</span>{" "}
            {t("dash.kpi.funded")}
          </>
        }
        footer={<Segments filled={kpis.fundedVenturesCount} total={kpis.venturesCount} />}
      />
      <KpiCard
        index={4}
        icon={Clock}
        label={t("dash.kpi.pending")}
        value={kpis.pendingRequestsCount}
        format={(v) => String(v)}
        accent={kpis.pendingRequestsCount > 0}
        sub={
          kpis.pendingRequestsAmount > 0 ? (
            <span className="font-numeric text-bronze">{compactUsd(kpis.pendingRequestsAmount)}</span>
          ) : (
            t("dash.kpi.noPending")
          )
        }
      />
      <KpiCard
        index={5}
        icon={Users}
        label={t("dash.kpi.investors")}
        value={kpis.totalInvestors}
        format={(v) => String(v)}
        series={investors}
        deltaFormat={(v) => String(v)}
        sub={
          kpis.fundedInvestors > 0 ? (
            <>
              <span className="font-numeric text-foreground">{kpis.fundedInvestors}</span>{" "}
              {t("dash.kpi.funded")}
            </>
          ) : (
            t("dash.kpi.investorsSub")
          )
        }
      />
    </div>
  );
}
