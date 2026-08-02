"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Check, Inbox, X } from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { ProfileEmptyState } from "@/components/profile/profile-empty-state";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { useAuthStore } from "@/lib/auth/store";
import { avatarUrl } from "@/lib/api/users";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { PendingApproval } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

function usd(v: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function initials(name: string): string {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function Row({ item }: { item: PendingApproval }) {
  const { t, locale } = useLocale();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const { approve, reject } = useNotifications();
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);

  const busy =
    (approve.isPending && approve.variables === item.notificationId) ||
    (reject.isPending && reject.variables === item.notificationId);

  const refetch = () =>
    qc.invalidateQueries({ queryKey: ["founder-dashboard", user?.id] });

  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "short",
  });

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: locale === "ar" ? 20 : -20 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-3.5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href={`/u/${item.investorId}`}
          data-cursor="hover"
          className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary ring-1 ring-border"
        >
          {!failed ? (
            <img src={avatarUrl(item.investorId)} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-primary" style={{ fontFamily: "var(--font-heading)" }}>
              {initials(item.investorName)}
            </span>
          )}
        </Link>
        <div className="min-w-0">
          <p className="truncate text-sm">
            <Link href={`/u/${item.investorId}`} data-cursor="hover" className="font-semibold transition-colors hover:text-primary">
              {item.investorName}
            </Link>{" "}
            <span className="text-muted-foreground">{t("dash.pending.wants")}</span>{" "}
            <Link href={`/projects/${item.projectId}`} data-cursor="hover" className="font-medium transition-colors hover:text-primary">
              {item.projectName}
            </Link>
          </p>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-numeric text-bronze">{usd(item.amount)}</span>
            <span aria-hidden>·</span>
            <span className="font-numeric">{dateFmt.format(new Date(item.date))}</span>
          </p>
          {item.contactInfo && (
            <p className="mt-1 truncate text-xs text-primary/90">{item.contactInfo}</p>
          )}
        </div>
      </div>

      {item.notificationId > 0 && (
        <div className="flex shrink-0 items-center gap-2">
          <AnimatePresence mode="wait" initial={false}>
            {confirming ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <span className="text-xs text-muted-foreground">{t("dash.pending.confirm")}</span>
                <button
                  type="button"
                  data-cursor="hover"
                  disabled={busy}
                  onClick={() => reject.mutate(item.notificationId, { onSuccess: refetch })}
                  className="rounded-full bg-destructive px-3.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {t("notif.reject")}
                </button>
                <button
                  type="button"
                  data-cursor="hover"
                  onClick={() => setConfirming(false)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("form.cancel")}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <PillButton
                  size="sm"
                  showArrow={false}
                  disabled={busy}
                  onClick={() => approve.mutate(item.notificationId, { onSuccess: refetch })}
                >
                  <Check className="size-3.5" />
                  {t("notif.approve")}
                </PillButton>
                <button
                  type="button"
                  data-cursor="hover"
                  aria-label={t("notif.reject")}
                  disabled={busy}
                  onClick={() => setConfirming(true)}
                  className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive disabled:opacity-50"
                >
                  <X className="size-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.li>
  );
}

export function PendingApprovals({
  items,
  limit,
  viewAllHref,
}: {
  items: PendingApproval[];
  /** Cap rows (overview preview); a "view all (N)" link renders when capped. */
  limit?: number;
  viewAllHref?: string;
}) {
  const { t, locale } = useLocale();
  const rows = limit ? items.slice(0, limit) : items;
  const remaining = items.length - rows.length;

  if (items.length === 0) {
    return (
      <ProfileEmptyState
        compact
        icon={Inbox}
        title={t("dash.pending.empty")}
        body={t("dash.pending.emptySub")}
      />
    );
  }

  return (
    <div>
      <ul className="space-y-2.5">
        <AnimatePresence initial={false}>
          {rows.map((item) => (
            <Row key={item.investmentId} item={item} />
          ))}
        </AnimatePresence>
      </ul>
      {remaining > 0 && viewAllHref && (
        <Link
          href={viewAllHref}
          data-cursor="hover"
          className="group mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/70 py-2.5 text-xs text-primary/80 transition-colors hover:border-primary/40 hover:text-primary"
        >
          {t("dash.requests.viewAll")} (+{remaining})
          <ArrowUpRight
            className={`size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
              locale === "ar" ? "-scale-x-100" : ""
            }`}
          />
        </Link>
      )}
    </div>
  );
}
