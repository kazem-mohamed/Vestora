"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, Stamp, X } from "lucide-react";
import { toast } from "sonner";
import { DashPageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { ErrorState } from "@/components/ui/error-state";
import { adminApi } from "@/lib/api/admin";
import { projectImageUrl } from "@/lib/api/projects";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { PendingProject } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

function usd(v: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

/**
 * A completeness marker. Present reads as satisfied, absent reads as a gap —
 * so a reviewer can see at a glance whether a listing is worth publishing.
 */
function Completeness({ n, labelKey }: { n: number; labelKey: string }) {
  const { t } = useLocale();
  const has = n > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] transition-colors",
        has
          ? "border-primary/30 bg-primary/[0.06] text-foreground"
          : "border-dashed border-border text-muted-foreground/70"
      )}
    >
      <span className="font-numeric">{n}</span>
      {t(labelKey)}
    </span>
  );
}

function Row({ p, index }: { p: PendingProject; index: number }) {
  const { t } = useLocale();
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const refetch = () => {
    qc.invalidateQueries({ queryKey: ["admin-pending-projects"] });
    qc.invalidateQueries({ queryKey: ["admin-analytics"] });
  };

  const approve = useMutation({
    mutationFn: () => adminApi.approveProject(p.id),
    onSuccess: (r) => {
      toast.success(r.message || t("admin.review.approved"));
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: () => adminApi.rejectProject(p.id, reason.trim() || undefined),
    onSuccess: (r) => {
      toast.success(r.message || t("admin.review.rejected"));
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = approve.isPending || reject.isPending;

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: (index % 12) * 0.03, ease: EASE }}
      className="rounded-xl border border-border/60 bg-background/40 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-3.5">
          {/* The artwork is part of what is being reviewed — judging a listing
              without seeing it meant opening every venture in a new tab. */}
          <Link
            href={`/projects/${p.id}`}
            data-cursor="hover"
            className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-secondary ring-1 ring-border transition-colors hover:ring-primary/40"
          >
            {p.coverImageId != null ? (
              <img
                src={projectImageUrl(p.coverImageId)}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="grid h-full w-full place-items-center text-lg text-primary/50"
                style={{
                  fontFamily: "var(--font-heading)",
                  backgroundImage:
                    "radial-gradient(120% 120% at 20% 0%, color-mix(in oklab, var(--primary) 20%, transparent), transparent 65%)",
                }}
              >
                {p.name.charAt(0).toUpperCase()}
              </span>
            )}
          </Link>

          <div className="min-w-0 flex-1">
            <Link href={`/projects/${p.id}`} data-cursor="hover" className="text-sm font-semibold transition-colors hover:text-primary">
              {p.name}
            </Link>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              <Link href={`/u/${p.ownerId}`} data-cursor="hover" className="hover:text-foreground">
                {p.ownerName}
              </Link>
              {p.category && <span> · {p.category}</span>}
              {p.location && <span> · {p.location}</span>}
              {p.stage && <span> · {p.stage}</span>}
            </p>

            {/* The deal being proposed, at a glance. */}
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
              <span className="font-numeric text-bronze">{usd(p.investmentNeeded)}</span>
              {p.equityOffered != null && (
                <>
                  <span aria-hidden className="text-muted-foreground/50">·</span>
                  <span className="font-numeric text-muted-foreground">
                    {p.equityOffered}% {t("browse.card.equity")}
                  </span>
                </>
              )}
              {p.valuation != null && (
                <>
                  <span aria-hidden className="text-muted-foreground/50">·</span>
                  <span className="font-numeric text-muted-foreground">
                    {usd(p.valuation)} {t("admin.review.valuation")}
                  </span>
                </>
              )}
            </p>

            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground/90">
              {p.topic || p.description}
            </p>

            {/* Completeness — the single most common reason to send one back. */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Completeness n={p.imageCount} labelKey="admin.review.images" />
              <Completeness n={p.teamCount} labelKey="admin.review.team" />
              <Completeness n={p.milestoneCount} labelKey="admin.review.milestones" />
              <Completeness n={p.documentCount} labelKey="admin.review.docs" />
            </div>
          </div>
        </div>

        {!rejecting && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              data-cursor="hover"
              disabled={busy}
              onClick={() => approve.mutate()}
              className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Check className="size-3.5" />
              {t("admin.review.approve")}
            </button>
            <button
              type="button"
              data-cursor="hover"
              aria-label={t("admin.review.reject")}
              disabled={busy}
              onClick={() => setRejecting(true)}
              className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive disabled:opacity-50"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
      </div>

      {rejecting && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3 sm:flex-row sm:items-center">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("admin.review.reasonPh")}
            className="h-9 flex-1 rounded-lg border border-input bg-card/60 px-3 text-xs outline-none focus-visible:border-primary/60"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-cursor="hover"
              disabled={busy}
              onClick={() => reject.mutate()}
              className="rounded-full bg-destructive px-3.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {t("admin.review.reject")}
            </button>
            <button
              type="button"
              data-cursor="hover"
              onClick={() => setRejecting(false)}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("form.cancel")}
            </button>
          </div>
        </div>
      )}
    </motion.li>
  );
}

export default function AdminReviewPage() {
  const { t } = useLocale();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-pending-projects", page],
    queryFn: () => adminApi.pendingProjects({ page, pageSize: 12 }),
    placeholderData: (prev) => prev,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <DashPageHeader title={t("admin.review.title")} sub={t("admin.review.sub")} eyebrowKey="admin.sidebar.label" />

      <Panel elevated>
        {isLoading && !data ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer h-24 rounded-xl" />
            ))}
          </div>
        ) : isError && !data ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full border border-primary/25 text-primary">
              <Stamp className="size-5" strokeWidth={1.5} />
            </span>
            <p className="text-sm text-muted-foreground">{t("admin.review.empty")}</p>
          </div>
        ) : (
          <>
            <ul className="space-y-2.5">
              {data.items.map((p, i) => (
                <Row key={p.id} p={p} index={i} />
              ))}
            </ul>
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-4 text-sm">
                <button type="button" data-cursor="hover" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-full border border-border px-4 py-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40">
                  {t("proj.page.prev")}
                </button>
                <span className="font-numeric text-xs text-muted-foreground">{t("proj.page.label")} {page} {t("proj.page.of")} {totalPages}</span>
                <button type="button" data-cursor="hover" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded-full border border-border px-4 py-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40">
                  {t("proj.page.next")}
                </button>
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
