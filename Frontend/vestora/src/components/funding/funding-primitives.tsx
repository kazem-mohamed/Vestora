"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FlaskConical,
  Hourglass,
  RotateCcw,
  Undo2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { FundingState, FundingStatus, PaymentStatus } from "@/lib/types/api";

export const EASE = [0.22, 1, 0.36, 1] as const;

/* ============================================================================
   Money
   ========================================================================== */

export function money(v: number, max = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: max,
  }).format(v ?? 0);
}

export function compactMoney(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v ?? 0);
}

/** Cents matter on a receipt and nowhere else. */
export function exactMoney(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v ?? 0);
}

/* ============================================================================
   The sandbox disclosure
   ========================================================================== */

/**
 * The one piece of chrome that appears on every money surface without exception.
 *
 * Vestora simulates payments. Saying so quietly and permanently is the difference
 * between a demonstration and a claim — and a badge that is always present is
 * read as a fact about the system rather than a warning about this screen.
 */
export function SandboxBadge({
  variant = "chip",
  className,
}: {
  variant?: "chip" | "line" | "panel";
  className?: string;
}) {
  const { t, locale } = useLocale();

  if (variant === "line") {
    return (
      <p className={cn("flex items-center gap-1.5 text-[11px] text-muted-foreground", className)}>
        <FlaskConical className="size-3 shrink-0 text-bronze" strokeWidth={1.7} />
        {t("fund.sandbox.note")}
      </p>
    );
  }

  if (variant === "panel") {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-bronze/30 bg-bronze/[0.05] px-4 py-3",
          className
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bronze/50 to-transparent"
        />
        <div className="flex items-start gap-2.5">
          <FlaskConical className="mt-0.5 size-3.5 shrink-0 text-bronze" strokeWidth={1.8} />
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-bronze">{t("fund.sandbox.short")}</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
              {t("fund.sandbox.long")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-bronze/40 bg-bronze/[0.07] px-2.5 py-0.5 text-[10.5px] text-bronze",
        locale === "ar" ? "" : "uppercase tracking-[0.14em]",
        className
      )}
    >
      <FlaskConical className="size-3" strokeWidth={1.9} />
      {t("fund.sandbox.badge")}
    </span>
  );
}

/* ============================================================================
   State vocabulary
   ========================================================================== */

type Tone = "gold" | "bronze" | "positive" | "negative" | "muted";

const TONE: Record<Tone, string> = {
  gold: "border-primary/40 bg-primary/[0.07] text-primary",
  bronze: "border-bronze/40 bg-bronze/[0.07] text-bronze",
  positive: "border-primary/45 bg-primary/[0.09] text-primary",
  negative: "border-destructive/40 bg-destructive/[0.06] text-destructive",
  muted: "border-border text-muted-foreground",
};

const FUNDING_STATE: Record<FundingState, { tone: Tone; icon: LucideIcon }> = {
  Requested: { tone: "muted", icon: Clock3 },
  Committed: { tone: "bronze", icon: CheckCircle2 },
  // The only state that is anyone's move. It wears the loudest tone in the set.
  PaymentDue: { tone: "gold", icon: Hourglass },
  Processing: { tone: "bronze", icon: RotateCcw },
  // Part of the commitment has arrived. Positive in tone but not the full mark —
  // money in hand, and money still owed, are both true at once.
  PartiallyFunded: { tone: "bronze", icon: CheckCircle2 },
  Funded: { tone: "positive", icon: CheckCircle2 },
  Refunded: { tone: "muted", icon: Undo2 },
  Declined: { tone: "negative", icon: XCircle },
  None: { tone: "muted", icon: Clock3 },
};

export function FundingStatePill({
  state,
  className,
  pulse,
}: {
  state: FundingState;
  className?: string;
  pulse?: boolean;
}) {
  const { t } = useLocale();
  const reduce = useReducedMotion() ?? false;
  const kind = FUNDING_STATE[state] ?? FUNDING_STATE.None;
  const Icon = kind.icon;

  // Only "payment due" breathes. A pulse everywhere is a pulse nowhere.
  const alive = pulse && state === "PaymentDue" && !reduce;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px]",
        TONE[kind.tone],
        className
      )}
    >
      {alive ? (
        <motion.span
          animate={{ opacity: [1, 0.35, 1] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
          className="grid place-items-center"
        >
          <Icon className="size-3" strokeWidth={1.9} />
        </motion.span>
      ) : (
        <Icon className="size-3" strokeWidth={1.9} />
      )}
      {t(`fund.state.${state}`)}
    </span>
  );
}

const PAYMENT_STATUS: Record<PaymentStatus, { tone: Tone; icon: LucideIcon }> = {
  Initiated: { tone: "muted", icon: Clock3 },
  Processing: { tone: "bronze", icon: RotateCcw },
  Succeeded: { tone: "positive", icon: CheckCircle2 },
  Failed: { tone: "negative", icon: AlertTriangle },
  Cancelled: { tone: "muted", icon: XCircle },
  Refunded: { tone: "bronze", icon: Undo2 },
};

export function PaymentStatusPill({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  const { t } = useLocale();
  const kind = PAYMENT_STATUS[status] ?? PAYMENT_STATUS.Initiated;
  const Icon = kind.icon;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px]",
        TONE[kind.tone],
        className
      )}
    >
      <Icon className="size-3" strokeWidth={1.9} />
      {t(`pay.status.${status}`)}
    </span>
  );
}

export function FundingStatusPill({
  status,
  className,
}: {
  status: FundingStatus;
  className?: string;
}) {
  const { t } = useLocale();
  const key =
    status === "Funded"
      ? "fund.status.Funded"
      : status === "Fully Committed"
        ? "fund.status.FullyCommitted"
        : "fund.status.Raising";
  const tone: Tone = status === "Funded" ? "positive" : status === "Fully Committed" ? "bronze" : "muted";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px]",
        TONE[tone],
        className
      )}
    >
      {status !== "Raising" && <CheckCircle2 className="size-3" strokeWidth={1.9} />}
      {t(key)}
    </span>
  );
}

/* ============================================================================
   The funding dial
   ========================================================================== */

/**
 * Two arcs on one track: settled money in front, commitments behind it.
 *
 * This replaces a single bar that showed approvals and called them raised. The
 * layering is the argument — funded is drawn solid and lit, committed is drawn
 * as the fainter shape it always was, and the eye reads "most of the way agreed,
 * some of the way paid" before it reads a single figure. When the two are equal
 * the ghost arc disappears entirely rather than doubling the stroke, so a fully
 * settled round looks clean instead of thick.
 */
export function FundingDial({
  funded,
  committed,
  goal,
  size = 96,
  stroke = 6,
  className,
}: {
  funded: number;
  committed: number;
  goal: number;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const reduce = useReducedMotion() ?? false;

  const fundedPct = goal > 0 ? Math.min(100, (funded / goal) * 100) : 0;
  const committedPct = goal > 0 ? Math.min(100, (committed / goal) * 100) : 0;
  const showGhost = committedPct - fundedPct > 0.5;

  const r = 32;
  const c = 2 * Math.PI * r;
  const isFunded = goal > 0 && funded >= goal;

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden>
        {/* Track */}
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--secondary)" strokeWidth={stroke} />

        {/* Committed — the promise, sitting behind */}
        {showGhost && (
          <motion.circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="var(--bronze)"
            strokeOpacity={0.35}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={reduce ? { strokeDashoffset: c * (1 - committedPct / 100) } : { strokeDashoffset: c }}
            whileInView={{ strokeDashoffset: c * (1 - committedPct / 100) }}
            viewport={{ once: true }}
            transition={{ duration: reduce ? 0 : 1.2, ease: EASE }}
          />
        )}

        {/* Funded — the money, in front */}
        <motion.circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? { strokeDashoffset: c * (1 - fundedPct / 100) } : { strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: c * (1 - fundedPct / 100) }}
          viewport={{ once: true }}
          transition={{ duration: reduce ? 0 : 1.5, delay: reduce ? 0 : 0.15, ease: EASE }}
          style={
            isFunded
              ? { filter: "drop-shadow(0 0 6px color-mix(in oklab, var(--primary) 55%, transparent))" }
              : undefined
          }
        />
      </svg>

      <span className="absolute inset-0 grid place-items-center">
        <span className="font-numeric text-lg leading-none text-foreground">
          <AnimatedNumber value={Math.round(fundedPct)} format={(v) => `${v}%`} duration={1.5} />
        </span>
      </span>
    </div>
  );
}

/* ============================================================================
   Fee breakdown
   ========================================================================== */

/**
 * Gross → fee → net, stated the same way everywhere it appears.
 *
 * Both sides see it. Hiding the platform's cut from the person it is taken from
 * would be indefensible, and the investor needs to know the fee comes out of the
 * founder's side rather than being added to what they pay.
 */
export function FeeBreakdown({
  gross,
  feeRateBps,
  fee,
  net,
  className,
  emphasise = "net",
}: {
  gross: number;
  feeRateBps: number;
  fee: number;
  net: number;
  className?: string;
  emphasise?: "net" | "gross";
}) {
  const { t } = useLocale();
  const rate = (feeRateBps / 100).toString().replace(/\.0$/, "");

  return (
    <div className={cn("space-y-2.5 text-sm", className)}>
      <Row
        label={t("fund.word.gross")}
        value={exactMoney(gross)}
        strong={emphasise === "gross"}
      />
      <Row
        label={t("fund.request.feeLine").replace("{rate}", rate)}
        value={`− ${exactMoney(fee)}`}
        muted
      />
      <div className="h-px bg-border/70" />
      <Row
        label={t("fund.word.netProceeds")}
        value={exactMoney(net)}
        strong={emphasise === "net"}
      />
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={cn("min-w-0 truncate", muted ? "text-muted-foreground/80" : "text-muted-foreground")}>
        {label}
      </span>
      <span
        className={cn(
          "font-numeric shrink-0 tabular-nums",
          strong ? "text-base text-bronze" : muted ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* ============================================================================
   Relative time
   ========================================================================== */

/** "in 6 days" / "3 hours ago" — locale-aware, and honest about the past. */
export function useRelativeTime() {
  const { locale } = useLocale();
  return (iso: string): string => {
    const diffMs = new Date(iso).getTime() - Date.now();
    const rtf = new Intl.RelativeTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
      numeric: "auto",
    });
    const mins = Math.round(diffMs / 60_000);
    if (Math.abs(mins) < 60) return rtf.format(mins, "minute");
    const hours = Math.round(mins / 60);
    if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
    return rtf.format(Math.round(hours / 24), "day");
  };
}

export function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
