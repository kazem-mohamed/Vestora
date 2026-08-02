"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, RotateCw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { NotificationRow } from "@/components/notifications/notification-row";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The bell.
 *
 * Two changes of substance beyond the styling. First, it no longer lies while it is
 * working: an empty array during the initial fetch used to render "You're all caught
 * up", so the honest answer to "do I have anything?" was a confident no until the
 * request landed — and a failed fetch looked exactly the same. Loading, failed and
 * empty are now three different things on screen.
 *
 * Second, the panel leads with what is owed. The badge still counts unread — that is
 * what a bell means — but a gold rule marks the obligations lane so five new followers
 * cannot bury one investor waiting on a decision.
 *
 * On a phone it becomes a bottom sheet. A 360px panel hanging off the end of a 375px
 * header had about 7px of margin and put its own content under the reader's thumb.
 */
export function NotificationsBell() {
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);
  const {
    lanes,
    unreadCount,
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
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!user) return null;

  // The panel is a preview, not the archive. Obligations are never truncated away;
  // the record fills whatever room is left.
  const owed = lanes.needsYou;
  const rest = [...lanes.outcome, ...lanes.activity].sort(
    (a, b) => +new Date(b.dateCreated) - +new Date(a.dateCreated)
  );
  const recent = rest.slice(0, Math.max(2, 6 - owed.length));
  const nothing = owed.length === 0 && rest.length === 0;

  function rows(list: Notification[], offset: number) {
    return list.map((n, i) => (
      <NotificationRow
        key={n.notificationId}
        n={n}
        approve={approve}
        reject={reject}
        markRead={markRead}
        index={offset + i}
        compact
      />
    ));
  }

  const panelBody = (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
        <p className="text-sm font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
          {t("notif.title")}
        </p>
        {clearableCount > 0 && (
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            data-cursor="hover"
            className="rounded-full px-2 py-1 text-xs text-muted-foreground outline-none transition-colors duration-300 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-50"
          >
            {t("notif.markAll")}
          </button>
        )}
      </div>

      <div className="max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain p-1.5">
        {isLoading ? (
          <div className="space-y-1.5 p-2" aria-busy>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer h-16 rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          /* Deliberately not the empty state: "nothing here" and "we could not ask"
             are opposite pieces of news, and only one of them is actionable. */
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-foreground">{t("notif.error")}</p>
            <button
              type="button"
              onClick={() => refetch()}
              data-cursor="hover"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs outline-none transition-colors duration-300 hover:border-primary/50 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/25"
            >
              <RotateCw className="size-3" />
              {t("state.error.retry")}
            </button>
          </div>
        ) : nothing ? (
          <div className="px-6 py-12 text-center">
            <span
              aria-hidden
              className="mx-auto grid size-11 place-items-center rounded-full border border-border/70 text-muted-foreground/70"
            >
              <Bell className="size-[18px]" strokeWidth={1.6} />
            </span>
            <p className="mt-3 text-sm text-foreground">{t("notif.empty")}</p>
            <p className="mx-auto mt-1 max-w-[15rem] text-xs leading-relaxed text-muted-foreground">
              {t("notif.emptyHint")}
            </p>
          </div>
        ) : (
          <>
            {owed.length > 0 && (
              <section aria-labelledby="bell-owed">
                <div className="flex items-center gap-2 px-3.5 pb-1 pt-2">
                  <span aria-hidden className="h-px flex-1 bg-primary/30" />
                  <p
                    id="bell-owed"
                    className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary"
                  >
                    {t("notif.lane.needsYou")}
                  </p>
                  <span aria-hidden className="h-px flex-1 bg-primary/30" />
                </div>
                {rows(owed, 0)}
              </section>
            )}

            {recent.length > 0 && (
              <section aria-labelledby="bell-record" className={cn(owed.length > 0 && "mt-2")}>
                {owed.length > 0 && (
                  <p
                    id="bell-record"
                    className="px-3.5 pb-1 pt-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80"
                  >
                    {t("notif.lane.record")}
                  </p>
                )}
                {rows(recent, owed.length)}
              </section>
            )}
          </>
        )}
      </div>

      <Link
        href="/notifications"
        onClick={() => setOpen(false)}
        data-cursor="hover"
        className="block border-t border-border/60 px-4 py-3 text-center text-sm text-primary outline-none transition-colors duration-300 hover:bg-primary/[0.06] focus-visible:ring-3 focus-visible:ring-ring/25"
      >
        {t("notif.viewAll")}
      </Link>
    </>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        data-cursor="hover"
        aria-label={t("notif.title")}
        aria-expanded={open}
        className={cn(
          "relative flex size-9 items-center justify-center rounded-full outline-none transition-colors duration-300",
          "hover:bg-foreground/[0.05] focus-visible:ring-3 focus-visible:ring-ring/25",
          open
            ? "bg-foreground/[0.06] text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Bell className="size-[18px]" />
        {unreadCount > 0 && (
          <>
            {/* The numeral is decorative; the count reaches assistive tech through the
                sr-only span, where the two languages pluralise differently. */}
            <span
              aria-hidden
              className={cn(
                "font-numeric absolute -end-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-4",
                // Something owed and something merely new are different news, so they
                // are different colours — gold only when the viewer is the blocker.
                owedCount > 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-foreground/70 text-background"
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
            <span className="sr-only">{unreadCount}</span>
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Mobile scrim. The sheet is a modal surface on a phone; on a pointer
                device the panel stays non-modal and click-outside handles it. */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm sm:hidden"
            />

            <motion.div
              role="dialog"
              aria-label={t("notif.title")}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.28, ease: EASE }}
              className={cn(
                "z-50 overflow-hidden border-border bg-popover shadow-xl ring-1 ring-foreground/5",
                // Phone: bottom sheet, full width, rounded at the top only.
                "fixed inset-x-0 bottom-0 max-h-[85svh] rounded-t-3xl border-t pb-[env(safe-area-inset-bottom)]",
                // Pointer: anchored panel.
                "sm:absolute sm:inset-x-auto sm:bottom-auto sm:end-0 sm:mt-2 sm:w-[380px] sm:max-w-[calc(100vw-2rem)] sm:rounded-2xl sm:border sm:pb-0"
              )}
            >
              {/* Sheet grabber — a phone affordance, meaningless on a desktop panel. */}
              <span
                aria-hidden
                className="mx-auto mb-1 mt-2.5 block h-1 w-9 rounded-full bg-border sm:hidden"
              />
              {panelBody}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
