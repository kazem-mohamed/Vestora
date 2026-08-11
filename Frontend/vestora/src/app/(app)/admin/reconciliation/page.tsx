"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, RefreshCw, Scale, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { DashPageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { ProfileEmptyState } from "@/components/profile/profile-empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { exactMoney } from "@/components/funding/funding-primitives";
import { revenueApi } from "@/lib/api/payments";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { ReconciliationEvent } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The queue nobody could see.
 *
 * Three code paths already knew that a confirmation could arrive and change nothing —
 * a resent webhook, an event landing on a row that had gone terminal, a provider
 * reporting a payment against an attempt Vestora had written off. Each of them wrote a
 * line to the server log and moved on, which meant the most serious financial state
 * the system can reach was visible only to whoever happened to be tailing stdout.
 *
 * Every one of those rows was already in PaymentEvents. This is the door.
 *
 * Conflicts lead, and they are styled as an alarm rather than a table row, because a
 * conflict is not an anomaly to note — it is money the provider believes moved and
 * Vestora does not.
 */
export default function AdminReconciliationPage() {
  const { t, locale } = useLocale();
  const qc = useQueryClient();
  const [includeReviewed, setIncludeReviewed] = useState(false);
  const [page, setPage] = useState(1);

  const q = useQuery({
    queryKey: ["admin-reconciliation", includeReviewed, page],
    queryFn: () => revenueApi.reconciliation({ includeReviewed, page, pageSize: 30 }),
    placeholderData: (prev) => prev,
  });

  const items = q.data?.items ?? [];
  const totalPages = q.data ? Math.max(1, Math.ceil(q.data.totalCount / q.data.pageSize)) : 1;

  const dtf = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-reconciliation"] });

  return (
    <div className="space-y-6">
      <DashPageHeader
        title={t("adm.recon.title")}
        sub={t("adm.recon.sub")}
        eyebrowKey="admin.sidebar.label"
      />

      {/* The one number that matters. Shown even at zero — "nothing is wrong" is a
          result, and an admin should be able to see it stated rather than infer it
          from an empty list. */}
      {q.data && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-3 rounded-2xl border px-5 py-4",
            q.data.openConflicts > 0
              ? "border-destructive/45 bg-destructive/[0.05]"
              : "border-primary/35 bg-primary/[0.04]"
          )}
        >
          {q.data.openConflicts > 0 ? (
            <AlertTriangle className="size-4 shrink-0 text-destructive" strokeWidth={1.9} />
          ) : (
            <ShieldCheck className="size-4 shrink-0 text-primary" strokeWidth={1.9} />
          )}
          <p className="text-sm text-foreground/90">
            {q.data.openConflicts > 0
              ? t("adm.recon.conflicts").replace("{n}", String(q.data.openConflicts))
              : t("adm.recon.clear")}
          </p>
        </div>
      )}

      <Panel elevated>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={includeReviewed}
              onChange={(e) => {
                setIncludeReviewed(e.target.checked);
                setPage(1);
              }}
              className="size-3.5 accent-[var(--primary)]"
            />
            {t("adm.recon.showReviewed")}
          </label>

          <button
            type="button"
            onClick={() => q.refetch()}
            data-cursor="hover"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <RefreshCw className={cn("size-3.5", q.isFetching && "animate-spin")} strokeWidth={1.9} />
            {t("adm.recon.refresh")}
          </button>
        </div>

        {q.isLoading && !q.data ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer h-20 rounded-xl" />
            ))}
          </div>
        ) : q.isError ? (
          <ErrorState onRetry={() => q.refetch()} />
        ) : items.length === 0 ? (
          <ProfileEmptyState
            compact
            icon={Scale}
            title={t("adm.recon.empty.title")}
            body={t("adm.recon.empty.body")}
          />
        ) : (
          <ul className="space-y-3">
            {items.map((e, i) => (
              <Row key={e.id} event={e} index={i} onDone={refresh} formatDate={dtf.format} />
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-full border border-border px-3.5 py-1.5 transition-colors hover:text-foreground disabled:opacity-40"
            >
              {t("proj.page.prev")}
            </button>
            <span className="font-numeric">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-full border border-border px-3.5 py-1.5 transition-colors hover:text-foreground disabled:opacity-40"
            >
              {t("proj.page.next")}
            </button>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ========================================================================== */

function Row({
  event,
  index,
  onDone,
  formatDate,
}: {
  event: ReconciliationEvent;
  index: number;
  onDone: () => void;
  formatDate: (d: Date) => string;
}) {
  const { t } = useLocale();
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);

  const reverify = useMutation({
    mutationFn: () => revenueApi.reverify(event.id),
    onSuccess: (tx) => {
      toast.success(t("adm.recon.reverified").replace("{status}", tx.status));
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const review = useMutation({
    mutationFn: () => revenueApi.reviewEvent(event.id, note.trim()),
    onSuccess: () => {
      toast.success(t("adm.recon.reviewed"));
      setOpen(false);
      setNote("");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = reverify.isPending || review.isPending;

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.03, ease: EASE }}
      className={cn(
        "rounded-2xl border p-4",
        event.isConflict
          ? "border-destructive/45 bg-destructive/[0.04]"
          : "border-border/60 bg-card/40",
        event.reviewedAtUtc && "opacity-70"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {event.isConflict ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/50 bg-destructive/[0.08] px-2.5 py-0.5 text-[11px] font-semibold text-destructive">
                <AlertTriangle className="size-3" strokeWidth={2} />
                {t("adm.recon.tag.conflict")}
              </span>
            ) : (
              <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground">
                {t("adm.recon.tag.noop")}
              </span>
            )}

            {event.reviewedAtUtc && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/[0.07] px-2.5 py-0.5 text-[11px] text-primary">
                <CheckCircle2 className="size-3" strokeWidth={2} />
                {t("adm.recon.tag.reviewed")}
              </span>
            )}

            <span className="font-numeric text-[11px] text-muted-foreground/80">
              {event.provider} · {event.source} · {event.eventType}
            </span>
          </div>

          {/* What the venture and the person are, so the row can be judged without
              opening the transaction. */}
          {event.projectName && (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm">
              <span className="font-medium text-foreground">{event.projectName}</span>
              {event.investorName && (
                <>
                  <span aria-hidden className="text-muted-foreground/50">
                    ·
                  </span>
                  <span className="text-muted-foreground">{event.investorName}</span>
                </>
              )}
              {event.amount != null && (
                <>
                  <span aria-hidden className="text-muted-foreground/50">
                    ·
                  </span>
                  <span className="font-numeric text-bronze">{exactMoney(event.amount)}</span>
                </>
              )}
            </p>
          )}

          <p className="font-numeric mt-1.5 text-[11px] text-muted-foreground/80">
            {event.transactionReference ?? event.providerEventId}
            {event.transactionStatus && ` · ${event.transactionStatus}`}
            {" · "}
            {formatDate(new Date(event.receivedAtUtc))}
          </p>

          {event.outcome && (
            <p
              className={cn(
                "mt-2 border-s-2 ps-3 text-xs leading-relaxed",
                event.isConflict
                  ? "border-destructive/40 text-destructive/90"
                  : "border-border/60 text-muted-foreground"
              )}
            >
              {event.outcome}
            </p>
          )}

          {event.reviewNote && (
            <p className="mt-2 border-s-2 border-primary/30 ps-3 text-xs leading-relaxed text-foreground/80">
              {event.reviewNote}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {event.investmentId != null && (
            <Link
              href={`/deals/${event.investmentId}`}
              data-cursor="hover"
              className="rounded-full border border-border px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              {t("deal.open")}
            </Link>
          )}

          {event.transactionId != null && (
            <button
              type="button"
              disabled={busy}
              onClick={() => reverify.mutate()}
              data-cursor="hover"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
            >
              <RefreshCw className={cn("size-3.5", reverify.isPending && "animate-spin")} strokeWidth={1.9} />
              {t("adm.recon.reverify")}
            </button>
          )}

          {!event.reviewedAtUtc && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen((v) => !v)}
              data-cursor="hover"
              className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {t("adm.recon.resolve")}
            </button>
          )}
        </div>
      </div>

      {/* Resolving requires saying what was found. An empty note clears the row and
          records nothing, which is how a queue becomes a place facts go to die. */}
      {open && (
        <div className="mt-4 border-t border-border/60 pt-4">
          <label className="text-[11px] text-muted-foreground" htmlFor={`note-${event.id}`}>
            {t("adm.recon.note.label")}
          </label>
          <textarea
            id={`note-${event.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            rows={3}
            placeholder={t("adm.recon.note.placeholder")}
            className="mt-2 w-full resize-none rounded-xl border border-input bg-background/40 px-3.5 py-2.5 text-sm outline-none transition-colors focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("form.cancel")}
            </button>
            <button
              type="button"
              disabled={busy || note.trim().length === 0}
              onClick={() => review.mutate()}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {t("adm.recon.note.save")}
            </button>
          </div>
        </div>
      )}
    </motion.li>
  );
}
