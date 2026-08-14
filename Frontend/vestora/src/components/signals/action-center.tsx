"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Bell,
  FileQuestion,
  FileSignature,
  HelpCircle,
  Hourglass,
  Inbox,
  Sparkles,
  Stamp,
  TimerReset,
  UserCheck,
  Wallet,
} from "lucide-react";
import { signalsApi } from "@/lib/api/deals";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { ActionCenter as ActionCenterData } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * One item that is genuinely blocked on this person, with somewhere to go.
 * `href` matters as much as the count: a number with no destination is a nag.
 */
interface Item {
  key: keyof ActionCenterData;
  labelKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

// Ordered by urgency, and the order is the point: this is a list, not a grid. A grid of
// tiles says every item is equally important, which is exactly the reading that made the
// old band easy to skip past.
const FOUNDER_ITEMS: Item[] = [
  { key: "termSheetsAwaitingYou", labelKey: "act.termSheets", href: "/dashboard/requests", icon: FileSignature },
  { key: "requestsNearingExpiry", labelKey: "act.expiringRequests", href: "/dashboard/funding", icon: TimerReset },
  { key: "pendingRequests", labelKey: "act.pendingRequests", href: "/dashboard/requests", icon: Stamp },
  { key: "questionsToAnswer", labelKey: "act.questions", href: "/dashboard/requests", icon: HelpCircle },
  { key: "documentRequestsToFill", labelKey: "act.docRequests", href: "/dashboard/requests", icon: FileQuestion },
  { key: "approvedAwaitingContact", labelKey: "act.awaitingContact", href: "/dashboard/requests", icon: UserCheck },
];

const INVESTOR_ITEMS: Item[] = [
  { key: "paymentsDue", labelKey: "act.paymentsDue", href: "/invest/payments", icon: Wallet },
  { key: "termSheetsAwaitingYou", labelKey: "act.termSheets", href: "/invest/pipeline", icon: FileSignature },
  { key: "questionsToAnswer", labelKey: "act.questions", href: "/invest/pipeline", icon: HelpCircle },
  { key: "documentRequestsToFill", labelKey: "act.docRequests", href: "/invest/pipeline", icon: FileQuestion },
];

/**
 * What needs you, kept apart from what merely changed.
 *
 * Vestora had grown four parallel streams — notifications, activity, messages and the
 * pipeline — with nothing to say which mattered. A member could have three unread
 * marketing-ish notifications and one investor waiting a week on a decision, and both
 * arrived at the same visual weight. This band carries only items that are blocked on
 * the viewer and that nobody else can clear; the informational totals sit beneath it,
 * deliberately quieter.
 *
 * It renders nothing when nothing is owed. An empty obligation band that says "you're
 * all clear!" every day trains people to stop reading the one that isn't empty.
 */
export function ActionCenter() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const reduce = useReducedMotion() ?? false;
  const user = useAuthStore((s) => s.user);

  const { data } = useQuery({
    queryKey: ["action-center"],
    queryFn: () => signalsApi.actionCenter(),
    // Obligations change when someone else acts, so this is worth refetching on
    // return to the tab — unlike most of the app, which is read-mostly.
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  if (!data) return null;

  const isFounder = user?.userType === "Innovator";
  const items = (isFounder ? FOUNDER_ITEMS : INVESTOR_ITEMS).filter(
    (i) => (data[i.key] as number) > 0
  );

  const informational =
    data.unreadMessages + data.unreadNotifications + data.newFromSavedSearches;

  // Nothing owed, nothing gone quiet, nothing new: say nothing at all.
  if (items.length === 0 && data.stalledDeals === 0 && informational === 0) return null;

  return (
    <div className="space-y-3">
      {/* ================= NEEDS YOU ================= */}
      <AnimatePresence initial={false}>
        {(items.length > 0 || data.stalledDeals > 0) && (
          <motion.section
            key="needs"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            aria-labelledby="action-center-heading"
            className="relative overflow-hidden rounded-2xl border border-primary/30 bg-primary/[0.045]"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
            />

            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {/* A single quiet pulse. One moving dot is a signal; a row of
                    animated tiles is noise. */}
                <motion.span
                  aria-hidden
                  animate={reduce ? undefined : { opacity: [1, 0.35, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  className="size-1.5 rounded-full bg-primary"
                />
                <h2
                  id="action-center-heading"
                  className={cn(
                    "text-[11px] text-primary",
                    rtl ? "" : "uppercase tracking-[0.24em]"
                  )}
                >
                  {t("act.title")}
                </h2>
                <span className="font-numeric text-[11px] text-muted-foreground">
                  {t("act.count").replace("{n}", String(data.needsAction))}
                </span>
              </div>

              <ul className="mt-4 space-y-2">
                {items.map((item, i) => {
                  const count = data[item.key] as number;
                  const Icon = item.icon;
                  return (
                    <motion.li
                      key={item.key}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, x: rtl ? 10 : -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.08 + i * 0.06, ease: EASE }}
                    >
                      <Link
                        href={item.href}
                        data-cursor="hover"
                        className={cn(
                          "group/act flex min-h-12 items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 outline-none",
                          "transition-colors duration-300 hover:border-primary/45 hover:bg-primary/[0.05]",
                          "focus-visible:ring-3 focus-visible:ring-ring/25"
                        )}
                      >
                        <Icon
                          className="size-4 shrink-0 text-primary/80"
                          strokeWidth={1.8}
                        />
                        {/* The count is a numeral beside the label, not spliced into
                            the sentence. Interpolating it produced "1 support requests",
                            and Arabic plurals cannot be patched with an -s either — the
                            dictionary has no plural forms, so the grammar problem is
                            removed rather than worked around. */}
                        <span
                          className="font-numeric shrink-0 rounded-md bg-primary/15 px-1.5 py-0.5 text-xs text-primary"
                          aria-hidden
                        >
                          {count}
                        </span>
                        <span className="min-w-0 flex-1 text-sm text-foreground/90">
                          <span className="sr-only">{count} </span>
                          {t(item.labelKey)}
                        </span>
                        <Arrow
                          className={cn(
                            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-300",
                            rtl
                              ? "group-hover/act:-translate-x-0.5"
                              : "group-hover/act:translate-x-0.5"
                          )}
                        />
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>

              {/* Stalled sits below the obligations and outside the count. Nobody is
                  blocked on it — it is a relationship that has gone quiet, which is worth
                  knowing and is not a task. Folding it into the badge would inflate the
                  number with something that cannot be cleared by doing anything. */}
              {data.stalledDeals > 0 && (
                <Link
                  href={isFounder ? "/dashboard/requests" : "/invest/pipeline"}
                  data-cursor="hover"
                  className="mt-3 flex items-center gap-2.5 rounded-xl border border-bronze/30 bg-bronze/[0.04] px-4 py-2.5 text-sm transition-colors hover:border-bronze/50"
                >
                  <Hourglass className="size-4 shrink-0 text-bronze" strokeWidth={1.8} />
                  <span className="font-numeric shrink-0 text-xs text-bronze">{data.stalledDeals}</span>
                  <span className="min-w-0 flex-1 text-foreground/85">
                    {t("act.stalled").replace("{days}", String(data.stalledAfterDays))}
                  </span>
                  <Arrow className="size-3.5 shrink-0 text-muted-foreground" />
                </Link>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ================= WHAT CHANGED ================= */}
      {/* Same information the notification bell carries, stated in a lower register
          so it can never outshout an actual obligation. */}
      {informational > 0 && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12, ease: EASE }}
          className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1"
        >
          <span
            className={cn(
              "text-[10px] text-muted-foreground/70",
              rtl ? "" : "uppercase tracking-[0.2em]"
            )}
          >
            {t("act.changed")}
          </span>

          {data.unreadMessages > 0 && (
            <Quiet
              href="/messages"
              icon={Inbox}
              label={t("act.messages").replace("{n}", String(data.unreadMessages))}
            />
          )}
          {data.unreadNotifications > 0 && (
            <Quiet
              href="/notifications"
              icon={Bell}
              label={t("act.notifications").replace("{n}", String(data.unreadNotifications))}
            />
          )}
          {data.newFromSavedSearches > 0 && (
            /* Points at the register, not at unfiltered browse. The count is per saved
               search, so dropping someone onto /projects left them to guess which of
               their searches had moved — the number was real and the destination
               could not show it. */
            <Quiet
              href="/searches"
              icon={Sparkles}
              label={t("act.newMatches").replace("{n}", String(data.newFromSavedSearches))}
            />
          )}
        </motion.div>
      )}
    </div>
  );
}

/** An informational link: text weight only, no container, no colour claim. */
function Quiet({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      data-cursor="hover"
      className="link-underline inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      <Icon className="size-3.5" strokeWidth={1.7} />
      {label}
    </Link>
  );
}
