"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { projectImageUrl } from "@/lib/api/projects";
import {
  STAGE_LABEL_KEY,
  STAGE_ORDER,
  stageLabelKey,
  stageTone,
} from "@/lib/deals/stages";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { AllocationSlice, PipelineStage } from "@/lib/types/api";

export const EASE = [0.22, 1, 0.36, 1] as const;

export function usd(v: number, max = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: max,
  }).format(v);
}

export function compactUsd(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
}

/* ============ Stage vocabulary ============ */
//
// The table itself now lives in `lib/deals/stages`. It is imported (so this file
// can use it) and re-exported (so the existing call sites keep working) —
// `export … from` alone would re-export without binding anything locally, which
// is precisely how StagePill would end up calling an undefined stageTone.

export { STAGE_ORDER, STAGE_LABEL_KEY, stageLabelKey, stageTone };

export function StagePill({ stage, className }: { stage: PipelineStage; className?: string }) {
  const { t } = useLocale();
  return (
    <span
      className={cn(
        "inline-block shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px]",
        stageTone(stage),
        className
      )}
    >
      {t(STAGE_LABEL_KEY[stage] ?? "stage.new")}
    </span>
  );
}

/* ============ KPI tile ============ */

/**
 * `hero` lifts the single most important number with layered depth — the one
 * deliberate 3D touch per screen, used to establish hierarchy, not decoration.
 */
export function InvestKpi({
  icon: Icon,
  label,
  value,
  format,
  sub,
  hero,
  index = 0,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  format: (v: number) => string;
  sub?: React.ReactNode;
  hero?: boolean;
  index?: number;
  href?: string;
}) {
  const { locale } = useLocale();
  const body = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: (index % 6) * 0.06, ease: EASE }}
      className={cn(
        "group relative h-full overflow-hidden rounded-2xl border p-5 backdrop-blur-sm transition-[border-color,box-shadow,transform] duration-500",
        hero
          ? "border-primary/40 bg-card/70 shadow-[0_24px_60px_-38px_var(--primary)] hover:-translate-y-1 hover:shadow-[0_30px_70px_-34px_var(--primary)]"
          : "border-border/70 bg-card/55 hover:-translate-y-0.5 hover:border-primary/40"
      )}
    >
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="flex items-center justify-between gap-3">
        <p className={cn("text-[11px] text-muted-foreground", locale === "ar" ? "" : "uppercase tracking-[0.14em]")}>
          {label}
        </p>
        <span
          className={cn(
            "grid size-8 place-items-center rounded-full border text-primary transition-all duration-500 group-hover:scale-110",
            hero ? "border-primary/50 bg-primary/[0.08]" : "border-primary/25 group-hover:border-primary/60"
          )}
        >
          <Icon className="size-4" strokeWidth={1.6} />
        </span>
      </div>
      <AnimatedNumber
        value={value}
        format={format}
        delay={(index % 6) * 0.06 + 0.1}
        className={cn(
          "mt-3 block font-numeric leading-none",
          hero ? "text-3xl text-bronze" : "text-2xl text-foreground"
        )}
      />
      {sub && <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">{sub}</p>}
    </motion.div>
  );

  return href ? (
    <Link href={href} data-cursor="hover" className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

/* ============ Allocation bars ============ */

/** The chart tokens the design system already defines, in reading order. */
const SLICE_TOKENS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/**
 * Where the money sits, as one whole rather than a stack of separate bars.
 *
 * This was a list of independent tracks, each drawn with the identical
 * bronze→gold gradient. Two things were wrong with that. The colour carried no
 * information, so nothing distinguished one holding from another except its
 * position in the list. And every bar was measured against its own empty track,
 * so a portfolio of six near-equal positions and one dominated by a single
 * position produced the same picture: a column of part-filled bars.
 *
 * A composition is a whole with parts, so it is drawn as one: a single full-width
 * bar segmented by holding, with the rows beneath acting as its legend. Answering
 * "am I concentrated?" now takes a glance instead of arithmetic.
 */
export function AllocationBars({ slices }: { slices: AllocationSlice[] }) {
  const total = slices.reduce((s, x) => s + x.amount, 0);
  if (total <= 0) return null;

  const shown = slices.slice(0, SLICE_TOKENS.length);
  const rest = slices.slice(SLICE_TOKENS.length);
  const restAmount = rest.reduce((s, x) => s + x.amount, 0);

  const parts = [
    ...shown.map((s, i) => ({ ...s, color: SLICE_TOKENS[i] })),
    // Beyond five, colour stops distinguishing anything — the tail becomes one
    // honest "other" band rather than five more shades nobody can tell apart.
    ...(restAmount > 0
      ? [{ label: "…", amount: restAmount, count: rest.length, color: "var(--muted-foreground)" }]
      : []),
  ];

  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-secondary"
        role="img"
        aria-label={parts
          .map((p) => `${p.label} ${Math.round((p.amount / total) * 100)}%`)
          .join(", ")}
      >
        {parts.map((p, i) => (
          <motion.span
            key={p.label}
            initial={{ width: 0 }}
            animate={{ width: `${(p.amount / total) * 100}%` }}
            transition={{ duration: 0.9, delay: 0.15 + i * 0.05, ease: EASE }}
            style={{ background: p.color }}
            className="block h-full first:rounded-s-full last:rounded-e-full"
          />
        ))}
      </div>

      <ul className="mt-4 space-y-2">
        {parts.map((p) => {
          const pct = Math.round((p.amount / total) * 100);
          return (
            <li key={p.label} className="flex items-baseline gap-2.5 text-sm">
              <span
                aria-hidden
                className="mt-1.5 size-2 shrink-0 rounded-full"
                style={{ background: p.color }}
              />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{p.label}</span>
              <span className="font-numeric shrink-0">
                <span className="text-foreground">{compactUsd(p.amount)}</span>
                <span className="text-muted-foreground/70"> · {pct}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ============ Venture thumb ============ */

export function VentureThumb({
  imageId,
  name,
  href,
  size = "size-14",
}: {
  imageId: number | null;
  name: string;
  href: string;
  size?: string;
}) {
  return (
    <Link
      href={href}
      data-cursor="hover"
      className={cn("relative shrink-0 overflow-hidden rounded-xl bg-secondary ring-1 ring-border", size)}
    >
      {imageId != null ? (
        <img src={projectImageUrl(imageId)} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span
          aria-hidden
          className="grid h-full w-full place-items-center text-lg text-primary/60"
          style={{
            fontFamily: "var(--font-heading)",
            backgroundImage:
              "radial-gradient(120% 120% at 20% 0%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 65%)",
          }}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </Link>
  );
}
