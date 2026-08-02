"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UseMutationResult } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PillButton } from "@/components/ui/pill-button";
import { isResolvable, kindOf, TONE_DOT, TONE_RING } from "@/lib/notifications/taxonomy";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { ApiMessage, Notification } from "@/lib/types/api";

type Mut = UseMutationResult<ApiMessage, Error, number, unknown>;

const EASE = [0.22, 1, 0.36, 1] as const;

function timeAgo(iso: string, nowLabel: string, locale: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return nowLabel;
  const rtf = new Intl.RelativeTimeFormat(locale === "ar" ? "ar" : "en", {
    numeric: "auto",
    style: "narrow",
  });
  if (m < 60) return rtf.format(-m, "minute");
  const h = Math.floor(m / 60);
  if (h < 24) return rtf.format(-h, "hour");
  const d = Math.floor(h / 24);
  if (d < 7) return rtf.format(-d, "day");
  return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "short",
  });
}

/**
 * One notification.
 *
 * Two things changed from the row this replaces. The first is that the type is now
 * legible: a translated headline and its own glyph, so a document request and a new
 * follower are not the same grey dot with a sentence under it. The second is that the
 * whole row is a destination — every kind that has somewhere to go now goes there,
 * where before only three of the fourteen offered a link and the rest were dead text.
 *
 * The server's own sentence is kept verbatim as the detail line. It is English-only
 * and carries the specifics (which venture, how much), so translating the headline
 * client-side and leaving the specifics alone gets an Arabic reader a sentence they
 * can act on without inventing a translation layer over data the API owns.
 */
export function NotificationRow({
  n,
  approve,
  reject,
  markRead,
  compact,
  index = 0,
}: {
  n: Notification;
  approve: Mut;
  reject: Mut;
  markRead: Mut;
  compact?: boolean;
  index?: number;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const kind = kindOf(n);
  const Icon = kind.icon;
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const unread = !n.isRead;
  const resolvable = isResolvable(n);
  const href = kind.href(n);

  const approving = approve.isPending && approve.variables === n.notificationId;
  const rejecting = reject.isPending && reject.variables === n.notificationId;
  const busy = approving || rejecting;

  /**
   * Opening a row is what marks it read — except in the needs-you lane, where being
   * looked at is not the same as being dealt with.
   */
  function open() {
    if (unread && kind.lane !== "needsYou" && !markRead.isPending) {
      markRead.mutate(n.notificationId);
    }
    if (href) router.push(href);
  }

  const interactive = href != null || (unread && kind.lane !== "needsYou");

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.035, ease: EASE }}
      className={cn(
        "group/n relative flex gap-3.5 rounded-2xl px-3.5 py-3.5 transition-colors duration-300",
        unread && "bg-primary/[0.04]",
        interactive && "cursor-pointer hover:bg-foreground/[0.045]"
      )}
      onClick={interactive ? open : undefined}
    >
      {/* Unread mark: a gold hairline on the inline edge rather than a dot beside the
          glyph. Two circles side by side read as one smudge at this size. */}
      {unread && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-3 start-0 w-px bg-primary/70"
        />
      )}

      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid size-9 shrink-0 place-items-center rounded-full border transition-colors duration-300",
          unread ? TONE_RING[kind.tone] : "border-border",
          unread ? TONE_DOT[kind.tone] : "text-muted-foreground/70"
        )}
      >
        <Icon className="size-[17px]" strokeWidth={1.8} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p
            className={cn(
              "min-w-0 flex-1 text-[13.5px] font-medium leading-snug",
              unread ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {t(kind.titleKey)}
          </p>
          <span className="font-numeric mt-px shrink-0 text-[11px] text-muted-foreground/80">
            {timeAgo(n.dateCreated, t("time.now"), locale)}
          </span>
        </div>

        {/* The server's sentence. Muted, because the headline above already said what
            kind of event this is — this line is only here for the specifics. */}
        <p
          className={cn(
            "mt-1 text-[12.5px] leading-relaxed text-muted-foreground/85",
            compact && "line-clamp-2"
          )}
        >
          {n.content}
        </p>

        {resolvable ? (
          <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <PillButton
              size="sm"
              showArrow={false}
              disabled={busy}
              onClick={() => approve.mutate(n.notificationId)}
            >
              {approving ? t("notif.approving") : t("notif.approve")}
            </PillButton>
            <button
              type="button"
              data-cursor="hover"
              disabled={busy}
              onClick={() => setConfirmOpen(true)}
              className="rounded-full border border-border px-4 py-1.5 text-[0.8rem] font-medium text-muted-foreground outline-none transition-colors duration-300 hover:border-destructive/50 hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-50"
            >
              {rejecting ? t("notif.rejecting") : t("notif.reject")}
            </button>
            {href && (
              <Link
                href={href}
                onClick={(e) => e.stopPropagation()}
                data-cursor="hover"
                className="link-underline ms-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("notif.openContext")}
              </Link>
            )}
          </div>
        ) : (
          href && (
            <span
              aria-hidden
              className={cn(
                "mt-1.5 inline-flex items-center gap-1 text-[11px] text-primary/0 transition-colors duration-300",
                "group-hover/n:text-primary/80"
              )}
            >
              {t("notif.open")}
              <Arrow className="size-3" />
            </span>
          )
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={(o) => !rejecting && setConfirmOpen(o)}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{t("notif.reject.title")}</DialogTitle>
            <DialogDescription>{t("notif.reject.body")}</DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              data-cursor="hover"
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("form.cancel")}
            </button>
            <button
              type="button"
              disabled={rejecting}
              data-cursor="hover"
              onClick={() =>
                reject.mutate(n.notificationId, { onSuccess: () => setConfirmOpen(false) })
              }
              className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {t("notif.reject.confirm")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
