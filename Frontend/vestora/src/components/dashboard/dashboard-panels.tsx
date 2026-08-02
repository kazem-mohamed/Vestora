"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Banknote,
  Crown,
  LineChart,
  MessageSquare,
  Rocket,
  UserPlus,
} from "lucide-react";
import { ProfileEmptyState } from "@/components/profile/profile-empty-state";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { DashboardActivity, TopVenture } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

function compactUsd(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
}

export function timeAgo(iso: string, nowLabel: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return nowLabel;
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

/* ============ Top ventures ============ */

export function TopVenturesTable({
  ventures,
  limit,
}: {
  ventures: TopVenture[];
  limit?: number;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const rows = limit ? ventures.slice(0, limit) : ventures;
  // Rows arrive sorted by raised desc — the first funded row is the top performer.
  const topId = ventures.length > 1 && ventures[0].raised > 0 ? ventures[0].id : null;

  if (rows.length === 0) {
    return (
      <ProfileEmptyState
        compact
        icon={Rocket}
        title={t("dash.ventures.empty")}
        body={t("mine.empty.body")}
        ctaLabel={t("mine.new")}
        ctaHref="/my-projects/new"
      />
    );
  }

  return (
    <div className="overflow-hidden">
      <div
        className={cn(
          "hidden grid-cols-[1.6fr_1.4fr_0.7fr_0.9fr] gap-3 px-3 pb-2 text-[11px] text-muted-foreground sm:grid",
          rtl ? "" : "uppercase tracking-[0.12em]"
        )}
      >
        <span>{t("dash.ventures.col.name")}</span>
        <span>{t("dash.ventures.col.funding")}</span>
        <span className="text-center">{t("dash.ventures.col.investors")}</span>
        <span className="text-end">{t("dash.ventures.col.status")}</span>
      </div>

      <ul className="divide-y divide-border/60">
        {rows.map((v, i) => {
          const funded = v.status === "Funded" || v.pct >= 100;
          return (
            <motion.li
              key={v.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.5, delay: (i % 6) * 0.05, ease: EASE }}
              className="grid grid-cols-1 gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-foreground/[0.03] sm:grid-cols-[1.6fr_1.4fr_0.7fr_0.9fr] sm:items-center"
            >
              <Link href={`/projects/${v.id}`} data-cursor="hover" className="group/name min-w-0">
                <span className="flex items-center gap-2">
                  <span className="block truncate font-semibold leading-tight transition-colors group-hover/name:text-primary">
                    {v.name}
                  </span>
                  {v.id === topId && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-primary/[0.08] px-2 py-0.5 text-[10px] text-primary">
                      <Crown className="size-3" />
                      {t("dash.top.badge")}
                    </span>
                  )}
                </span>
                {v.category && <span className="text-[11px] text-muted-foreground">{v.category}</span>}
              </Link>

              {/* Two layers on one track: settled money in front, commitments as
                  the faint band behind. A single bar showing approvals is what made
                  this column report intentions as capital. */}
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-numeric text-xs">
                    <span className="text-foreground">{compactUsd(v.raised)}</span>
                    <span className="text-muted-foreground"> / {compactUsd(v.goal)}</span>
                  </span>
                  <span className="font-numeric text-[11px] text-primary">{v.pct}%</span>
                </div>
                <div className="relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  {v.committedPct > v.pct && (
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${v.committedPct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.85, delay: 0.18 + (i % 6) * 0.05, ease: EASE }}
                      className="absolute inset-y-0 start-0 rounded-full bg-bronze/35"
                    />
                  )}
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${v.pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, delay: 0.25 + (i % 6) * 0.05, ease: EASE }}
                    className="absolute inset-y-0 start-0 rounded-full bg-gradient-to-r from-bronze to-primary"
                  />
                </div>
                {v.committed > v.raised && (
                  <p className="mt-1 text-[10.5px] text-muted-foreground/75">
                    {t("venture.committed.also").replace("{committed}", compactUsd(v.committed))}
                  </p>
                )}
              </div>

              <span className="font-numeric text-sm text-foreground sm:text-center">
                <span className="text-muted-foreground sm:hidden">{t("dash.ventures.col.investors")}: </span>
                {v.investors}
              </span>

              <span className="sm:text-end">
                <span
                  className={cn(
                    "inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px]",
                    funded ? "border-primary/40 text-primary" : "border-bronze/40 text-bronze"
                  )}
                >
                  {funded
                    ? t("fund.status.Funded")
                    : v.status === "Fully Committed"
                      ? t("fund.status.FullyCommitted")
                      : t("fund.status.Raising")}
                </span>
              </span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

/* ============ Activity timeline ============ */

const ACTIVITY_ICON: Record<string, typeof Banknote> = {
  investment: Banknote,
  comment: MessageSquare,
  follow: UserPlus,
  update: LineChart,
};

export function ActivityTimeline({
  items,
  limit,
}: {
  items: DashboardActivity[];
  limit?: number;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const rows = limit ? items.slice(0, limit) : items;

  if (rows.length === 0) {
    return (
      <ProfileEmptyState
        compact
        icon={LineChart}
        title={t("dash.activity.empty")}
        body={t("dash.activity.emptySub")}
      />
    );
  }

  return (
    <div className="relative">
      {/* the spine */}
      <span aria-hidden className="absolute bottom-3 start-[15px] top-3 w-px bg-gradient-to-b from-primary/50 via-border to-transparent" />
      <ol className="space-y-1.5">
        {rows.map((a, i) => {
          const Icon = ACTIVITY_ICON[a.type] ?? LineChart;
          const important = a.type === "investment";
          let text: React.ReactNode;
          if (a.type === "investment") {
            text = (
              <>
                <span className="font-numeric font-medium text-bronze">{compactUsd(a.amount ?? 0)}</span>{" "}
                {t("dash.activity.backed")}{" "}
                {a.projectId ? (
                  <Link href={`/projects/${a.projectId}`} data-cursor="hover" className="font-medium text-foreground transition-colors hover:text-primary">
                    {a.projectName}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{a.projectName}</span>
                )}
              </>
            );
          } else if (a.type === "comment") {
            text = (
              <>
                <span className="font-medium text-foreground">{a.actorName}</span>{" "}
                {t("dash.activity.commented")}{" "}
                <span className="font-medium text-foreground">{a.projectName}</span>
              </>
            );
          } else {
            text = (
              <>
                <span className="font-medium text-foreground">{a.actorName}</span>{" "}
                {t("dash.activity.followed")}
              </>
            );
          }

          return (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: rtl ? 14 : -14 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.5, delay: (i % 8) * 0.05, ease: EASE }}
              className={cn(
                "relative flex items-start gap-3.5 rounded-xl py-2.5 pe-3 ps-1 transition-colors",
                important ? "bg-primary/[0.04] ring-1 ring-primary/15" : "hover:bg-foreground/[0.03]"
              )}
            >
              <span
                className={cn(
                  "relative z-[1] grid size-[30px] shrink-0 place-items-center rounded-full border ring-4 ring-background",
                  important
                    ? "border-primary/50 bg-primary/[0.1] text-primary"
                    : "border-border bg-card text-muted-foreground"
                )}
              >
                <Icon className="size-3.5" strokeWidth={1.7} />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm leading-snug text-muted-foreground">{text}</p>
                {a.text && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground/70">“{a.text}”</p>}
              </div>
              <span className="shrink-0 pt-1 font-numeric text-[11px] text-muted-foreground/70">
                {timeAgo(a.date, t("time.now"))}
              </span>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

/* ============ Analytics teaser (links to the real F10 analytics page) ============ */

export function AnalyticsTeaser() {
  const { t, locale } = useLocale();
  return (
    <Link
      href="/dashboard/analytics"
      data-cursor="hover"
      className="group relative block overflow-hidden rounded-2xl border border-border/70 bg-card/40 p-6 transition-[border-color,transform] duration-500 hover:-translate-y-0.5 hover:border-primary/40"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(80% 60% at 100% 0%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 70%)",
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-x-6 bottom-4 flex items-end gap-2 opacity-[0.22]">
        {[40, 65, 50, 80, 60, 90, 72].map((h, i) => (
          <span key={i} className="flex-1 rounded-t bg-gradient-to-t from-bronze to-primary" style={{ height: h }} />
        ))}
      </div>
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/[0.06] px-3 py-1 text-[11px] text-primary">
          <LineChart className="size-3" />
          {t("dash.analytics.badge")}
        </span>
        <h3 className="mt-4 flex items-center gap-2 text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          {t("dash.analytics.title")}
          <ArrowUpRight className={cn("size-4 text-primary transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5", locale === "ar" && "-scale-x-100")} />
        </h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t("dash.analytics.body")}</p>
      </div>
    </Link>
  );
}
