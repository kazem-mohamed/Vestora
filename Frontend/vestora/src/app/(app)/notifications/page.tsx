"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Bell, CheckCheck } from "lucide-react";
import { NotificationRow } from "@/components/notifications/notification-row";
import { ErrorState } from "@/components/ui/error-state";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { laneOf, type Lane } from "@/lib/notifications/taxonomy";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

type Bucket = "today" | "yesterday" | "earlier";
type Filter = "all" | Lane;

function bucketOf(iso: string): Bucket {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = new Date(iso).getTime();
  if (t >= startToday) return "today";
  if (t >= startToday - 86_400_000) return "yesterday";
  return "earlier";
}

/**
 * The record.
 *
 * This page and the Action Centre are deliberately not the same surface, and the
 * difference is worth stating because it was the whole reason for the redesign. The
 * Action Centre answers "what is blocked on me right now" — live counts read straight
 * off the data, sitting on the workspace the viewer already opens every day, and it
 * disappears the moment nothing is owed. This page is the chronological record of
 * everything that happened, which stays readable long after it stops being urgent.
 *
 * They overlap in exactly one place: an obligation appears in both. That is intended,
 * not duplication — one is a count with a destination, the other is the individual
 * event with its own timestamp and, for support requests, the decision itself. What
 * would have been duplication is a second set of counts, so this page shows none:
 * the tab labels carry numbers only for the lanes, never a total that could disagree
 * with the band on the dashboard.
 */
export default function NotificationsPage() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const reduce = useReducedMotion() ?? false;
  const user = useAuthStore((s) => s.user);
  const {
    notifications,
    lanes,
    owedCount,
    clearableCount,
    isLoading,
    isError,
    refetch,
    approve,
    reject,
    markRead,
    markAll,
  } = useNotifications();

  const [filter, setFilter] = useState<Filter>("all");

  const shown = useMemo<Notification[]>(
    () => (filter === "all" ? notifications : lanes[filter]),
    [filter, notifications, lanes]
  );

  /**
   * In the unfiltered view the owed lane is lifted out and pinned above the record.
   * Interleaving obligations by timestamp is what let a week-old decision sink under
   * an afternoon of follows.
   */
  const pinned = filter === "all" ? lanes.needsYou : [];
  const chronological = useMemo(
    () => (filter === "all" ? shown.filter((n) => laneOf(n) !== "needsYou" || n.isRead) : shown),
    [filter, shown]
  );

  const groups = useMemo(() => {
    const g: Record<Bucket, Notification[]> = { today: [], yesterday: [], earlier: [] };
    for (const n of chronological) g[bucketOf(n.dateCreated)].push(n);
    return g;
  }, [chronological]);

  const order: Bucket[] = ["today", "yesterday", "earlier"];
  const groupLabel: Record<Bucket, string> = {
    today: t("notif.group.today"),
    yesterday: t("notif.group.yesterday"),
    earlier: t("notif.group.earlier"),
  };

  const tabs: { id: Filter; label: string; count?: number }[] = [
    { id: "all", label: t("notif.filter.all") },
    { id: "needsYou", label: t("notif.lane.needsYou"), count: owedCount },
    { id: "outcome", label: t("notif.lane.outcomes") },
    { id: "activity", label: t("notif.lane.activity") },
  ];

  const nothingAtAll = pinned.length === 0 && chronological.length === 0;

  return (
    <div className="mx-auto max-w-2xl px-6 py-14 sm:py-20">
      {/* ================= MASTHEAD ================= */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <span className="block overflow-hidden pb-1">
            <motion.h1
              initial={reduce ? { opacity: 0 } : { y: "110%" }}
              animate={reduce ? { opacity: 1 } : { y: 0 }}
              transition={{ duration: 0.85, ease: EASE }}
              className={cn(
                "text-4xl font-bold sm:text-5xl",
                rtl ? "leading-[1.25]" : "leading-[1.05] tracking-[-0.02em]"
              )}
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {t("notif.title")}
            </motion.h1>
          </span>
          <motion.p
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
            className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground"
          >
            {t("notif.subtitle")}
          </motion.p>
        </div>

        {clearableCount > 0 && (
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            data-cursor="hover"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs outline-none transition-colors duration-300 hover:border-primary/50 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-50"
          >
            <CheckCheck className="size-3.5" strokeWidth={1.8} />
            {t("notif.markAll")}
          </button>
        )}
      </div>

      {/* ================= LANE TABS ================= */}
      <div
        role="tablist"
        aria-label={t("notif.title")}
        className="mt-9 flex flex-wrap items-center gap-1.5 border-b border-border/60 pb-4"
      >
        {tabs.map((tab) => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-cursor="hover"
              onClick={() => setFilter(tab.id)}
              className={cn(
                "relative inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium outline-none",
                "transition-colors duration-300 focus-visible:ring-3 focus-visible:ring-ring/25",
                active ? "text-background" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* The pill travels between tabs instead of appearing under each one —
                  the movement is what tells you where you came from. */}
              {active && (
                <motion.span
                  layoutId="notif-tab"
                  transition={
                    reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }
                  }
                  className="absolute inset-0 -z-10 rounded-full bg-foreground"
                />
              )}
              <span className="relative">{tab.label}</span>
              {tab.count != null && tab.count > 0 && (
                <span
                  className={cn(
                    "font-numeric relative rounded-full px-1.5 text-[11px] leading-4",
                    active ? "bg-background/20" : "bg-primary/15 text-primary"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ================= BODY ================= */}
      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer h-[86px] rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : nothingAtAll ? (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="relative overflow-hidden rounded-[1.6rem] border border-border bg-card/50 px-6 py-16 text-center backdrop-blur-sm"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
            />
            <span
              aria-hidden
              className="mx-auto grid size-12 place-items-center rounded-full border border-border/70 text-muted-foreground/70"
            >
              <Bell className="size-5" strokeWidth={1.6} />
            </span>
            <p
              className="mt-4 text-lg font-medium"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {filter === "all" ? t("notif.empty") : t("notif.empty.lane")}
            </p>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {filter === "all" ? t("notif.emptyHint") : t("notif.emptyHint.lane")}
            </p>
            {filter === "all" && user && (
              <Link
                href="/projects"
                data-cursor="hover"
                className="link-underline mt-5 inline-flex items-center gap-1.5 text-sm text-primary"
              >
                {t("notif.empty.cta")}
                <Arrow className="size-3.5" />
              </Link>
            )}
          </motion.div>
        ) : (
          <div className="space-y-10">
            {/* ---- Pinned obligations ---- */}
            <AnimatePresence initial={false}>
              {pinned.length > 0 && (
                <motion.section
                  key="owed"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  aria-labelledby="lane-owed"
                  className="relative overflow-hidden rounded-[1.4rem] border border-primary/25 bg-primary/[0.035] p-1.5 pt-0"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 pb-1 pt-4">
                    <h2
                      id="lane-owed"
                      className={cn(
                        "text-[11px] font-medium text-primary",
                        rtl ? "" : "uppercase tracking-[0.22em]"
                      )}
                    >
                      {t("notif.lane.needsYou")}
                    </h2>
                    <p className="text-[11px] text-muted-foreground">{t("notif.lane.needsYouHint")}</p>
                  </div>
                  {pinned.map((n, i) => (
                    <NotificationRow
                      key={n.notificationId}
                      n={n}
                      approve={approve}
                      reject={reject}
                      markRead={markRead}
                      index={i}
                    />
                  ))}
                </motion.section>
              )}
            </AnimatePresence>

            {/* ---- Chronological record ---- */}
            {order.map((b) =>
              groups[b].length === 0 ? null : (
                <section key={b} aria-labelledby={`bucket-${b}`}>
                  <div className="mb-2 flex items-center gap-3 px-3.5">
                    <h2
                      id={`bucket-${b}`}
                      className={cn(
                        "text-[11px] text-muted-foreground",
                        rtl ? "" : "uppercase tracking-[0.2em]"
                      )}
                    >
                      {groupLabel[b]}
                    </h2>
                    <span aria-hidden className="h-px flex-1 bg-border/60" />
                  </div>
                  <div className="space-y-1">
                    {groups[b].map((n, i) => (
                      <NotificationRow
                        key={n.notificationId}
                        n={n}
                        approve={approve}
                        reject={reject}
                        markRead={markRead}
                        index={i}
                      />
                    ))}
                  </div>
                </section>
              )
            )}
          </div>
        )}
      </div>

      {/* The boundary with the obligation band, said once, where someone comparing
          the two numbers will be looking for it. */}
      {!isLoading && !isError && owedCount > 0 && (
        <p className="mt-10 border-t border-border/50 pt-5 text-xs leading-relaxed text-muted-foreground">
          {t("notif.vsActionCenter")}{" "}
          <Link
            href={user?.userType === "Investor" ? "/invest" : "/dashboard"}
            data-cursor="hover"
            className="link-underline text-foreground transition-colors hover:text-primary"
          >
            {t("notif.vsActionCenter.link")}
          </Link>
        </p>
      )}
    </div>
  );
}
