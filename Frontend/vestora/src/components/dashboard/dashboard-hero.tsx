"use client";

import { motion, useReducedMotion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { Guilloche } from "@/components/auth/guilloche";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { PillButton } from "@/components/ui/pill-button";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { FounderKpis } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

const DOTS = [
  { l: "22%", t: "26%", s: 4, d: 8, delay: 0.4 },
  { l: "58%", t: "18%", s: 3, d: 9.5, delay: 1.4 },
  { l: "76%", t: "62%", s: 4, d: 7.5, delay: 0.9 },
  { l: "38%", t: "70%", s: 3, d: 10, delay: 2 },
];

function compactUsd(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
}

/** Inline hero stat — oversized numeral + quiet label (Crextio-style band). */
function HeroStat({
  value,
  format,
  label,
  bronze,
  delay,
}: {
  value: number;
  format: (v: number) => string;
  label: string;
  bronze?: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className="flex items-baseline gap-2.5"
    >
      <AnimatedNumber
        value={value}
        format={format}
        delay={delay + 0.15}
        className={cn(
          "font-numeric text-3xl leading-none sm:text-4xl",
          bronze ? "text-bronze" : "text-foreground"
        )}
      />
      <span className="max-w-[90px] text-xs leading-tight text-muted-foreground">{label}</span>
    </motion.div>
  );
}

/** Animated radial ring showing overall progress toward the combined goal. */
function FundingRing({ pct, reduce }: { pct: number; reduce: boolean }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const clamped = Math.min(100, Math.max(0, pct));

  return (
    <div className="relative size-36 shrink-0 sm:size-40">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--border)" strokeWidth="7" opacity={0.5} />
        <motion.circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - clamped / 100) }}
          transition={reduce ? { duration: 0 } : { duration: 1.6, delay: 0.5, ease: EASE }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--bronze)" />
            <stop offset="100%" stopColor="var(--primary)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <AnimatedNumber
            value={clamped}
            format={(v) => `${v}%`}
            delay={0.6}
            className="font-numeric text-2xl leading-none text-foreground"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * The control-room hero: a glass command band over a living background —
 * slow animated gradient, drifting ambient light, grain and faint guilloché —
 * with the founder's headline numbers and the overall funding ring.
 */
export function DashboardHero({ kpis, firstName }: { kpis: FounderKpis; firstName: string }) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion();

  const goalPct = kpis.totalGoal > 0 ? Math.round((kpis.totalCommitted / kpis.totalGoal) * 100) : 0;
  const today = new Intl.DateTimeFormat(rtl ? "ar-EG" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.85, ease: EASE }}
      className="relative overflow-hidden rounded-[1.75rem] border border-border/70 shadow-[0_45px_110px_-55px_rgba(0,0,0,0.65)] ring-1 ring-white/5"
    >
      {/* ==== living background ==== */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(130% 130% at 8% 0%, color-mix(in oklab, var(--primary) 16%, var(--card)), var(--card) 62%), radial-gradient(90% 90% at 100% 100%, color-mix(in oklab, var(--bronze) 18%, transparent), transparent 60%)",
        }}
      />
      {/* Slow animated gradient sheen */}
      {!reduce && (
        <motion.div
          aria-hidden
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "linear-gradient(115deg, transparent 30%, color-mix(in oklab, var(--primary) 9%, transparent) 50%, transparent 70%)",
            backgroundSize: "220% 220%",
          }}
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
        />
      )}
      {/* Ambient light blobs */}
      {!reduce && (
        <>
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -left-10 top-0 h-[130%] w-[42%] rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--primary) 16%, transparent), transparent 70%)",
            }}
            animate={{ x: ["-4%", "10%", "-4%"], y: ["-6%", "8%", "-6%"] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            // Logical `-end-16`, not physical `-right-16`. In Arabic the physical form
            // still pushed rightward, escaping the hero and dragging the whole dashboard
            // into a 47px horizontal scroll at 375px — a decorative blur breaking the
            // page it was meant to sit behind.
            className="pointer-events-none absolute -end-16 bottom-0 h-[120%] w-[38%] rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--bronze) 15%, transparent), transparent 70%)",
            }}
            animate={{ x: ["4%", "-8%", "4%"], y: ["6%", "-6%", "6%"] }}
            transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
      {/* Faint rotating guilloché */}
      <motion.div
        aria-hidden
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 300, ease: "linear", repeat: Infinity }}
        className="pointer-events-none absolute -end-28 -top-40 h-[480px] w-[480px]"
      >
        <Guilloche className="h-full w-full text-primary/[0.10] dark:text-primary/[0.07]" />
      </motion.div>
      {/* Particles */}
      {!reduce &&
        DOTS.map((d, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="pointer-events-none absolute rounded-full bg-primary/40"
            style={{ left: d.l, top: d.t, width: d.s, height: d.s }}
            animate={{ y: [0, -14, 0], opacity: [0.15, 0.5, 0.15] }}
            transition={{ duration: d.d, repeat: Infinity, ease: "easeInOut", delay: d.delay }}
          />
        ))}
      {/* Grain */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      {/* ==== content ==== */}
      <div className="relative flex flex-col gap-8 p-6 sm:p-9 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <motion.p
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
            className={cn("text-[11px] text-primary", rtl ? "" : "uppercase tracking-[0.3em]")}
          >
            {t("dash.eyebrow")}
          </motion.p>

          <span className={cn("mt-3 block overflow-hidden", rtl && "-my-2 py-2")}>
            <motion.h1
              initial={reduce ? false : { y: "112%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.95, delay: 0.15, ease: EASE }}
              className={cn(
                "block text-3xl font-bold sm:text-[2.6rem]",
                rtl ? "leading-[1.3]" : "leading-[1.06] tracking-[-0.01em]"
              )}
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {t("dash.hello")}
              {firstName ? `${rtl ? "،" : ","} ${firstName}` : ""}
            </motion.h1>
          </span>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: EASE }}
            className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
          >
            <span>{t("dash.subtitle")}</span>
            <span aria-hidden>·</span>
            <span className="font-numeric">{today}</span>
          </motion.p>

          {/* Inline headline numbers */}
          <div className="mt-7 flex flex-wrap items-end gap-x-10 gap-y-5">
            <HeroStat
              value={kpis.totalCommitted}
              format={compactUsd}
              label={t("dash.kpi.raised")}
              bronze
              delay={0.45}
            />
            <HeroStat
              value={kpis.totalInvestors}
              format={(v) => String(v)}
              label={t("dash.kpi.investors")}
              delay={0.55}
            />
            <HeroStat
              value={kpis.venturesCount}
              format={(v) => String(v)}
              label={t("dash.kpi.ventures")}
              delay={0.65}
            />
          </div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.75, ease: EASE }}
            className="mt-7 flex flex-wrap items-center gap-3"
          >
            <PillButton href="/my-projects/new" size="sm">
              {t("mine.new")}
            </PillButton>
            <PillButton href="/messages" variant="outline" size="sm" showArrow={false}>
              <MessageSquare className="size-4" strokeWidth={1.75} />
              {t("msg.title")}
            </PillButton>
          </motion.div>
        </div>

        {/* Funding ring in a glass cell */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.35, ease: EASE }}
          className="flex shrink-0 items-center gap-5 self-start rounded-2xl border border-border/60 bg-card/55 p-5 shadow-[0_24px_60px_-35px_rgba(0,0,0,0.5)] ring-1 ring-white/5 backdrop-blur-xl lg:self-center"
        >
          <FundingRing pct={goalPct} reduce={!!reduce} />
          <div className="min-w-[7.5rem]">
            <p className={cn("text-[11px] text-muted-foreground", rtl ? "" : "uppercase tracking-[0.14em]")}>
              {t("dash.hero.goal")}
            </p>
            <p className="mt-2 font-numeric text-lg leading-tight">
              <span className="text-bronze">{compactUsd(kpis.totalCommitted)}</span>
            </p>
            <p className="font-numeric text-xs text-muted-foreground">
              {t("dash.kpi.ofGoal")} {compactUsd(kpis.totalGoal)}
            </p>
            {kpis.pendingRequestsCount > 0 && (
              <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-bronze/40 px-2.5 py-0.5 text-[11px] text-bronze">
                <span className="size-1.5 animate-pulse rounded-full bg-bronze" />
                {kpis.pendingRequestsCount} {t("dash.hero.awaiting")}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
