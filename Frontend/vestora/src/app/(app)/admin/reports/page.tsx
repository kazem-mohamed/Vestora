"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Flag, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { DashPageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { ProfileEmptyState } from "@/components/profile/profile-empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { adminApi } from "@/lib/api/admin";
import { useAdminReports } from "@/lib/hooks/use-admin";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { Report } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;
const STATUSES = ["Open", "Resolved", "Dismissed", ""] as const;

const REASON_COLOR: Record<string, string> = {
  Scam: "border-destructive/40 text-destructive",
  Spam: "border-bronze/40 text-bronze",
  Copyright: "border-primary/40 text-primary",
  Offensive: "border-destructive/40 text-destructive",
  Duplicate: "border-border text-muted-foreground",
  Other: "border-border text-muted-foreground",
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useLocale();
  const map: Record<string, string> = {
    Open: "border-bronze/40 text-bronze",
    Resolved: "border-primary/40 text-primary",
    Dismissed: "border-border text-muted-foreground",
  };
  return (
    <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px]", map[status] ?? "border-border text-muted-foreground")}>
      {t(`admin.reports.status.${status.toLowerCase()}`)}
    </span>
  );
}

function ReportCard({ r, index }: { r: Report; index: number }) {
  const { t, locale } = useLocale();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
  };

  const resolve = useMutation({
    mutationFn: () => adminApi.resolveReport(r.id),
    onSuccess: (res) => {
      toast.success(res.message || t("admin.reports.resolved"));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const dismiss = useMutation({
    mutationFn: () => adminApi.dismissReport(r.id),
    onSuccess: (res) => {
      toast.success(res.message || t("admin.reports.dismissed"));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delProject = useMutation({
    mutationFn: () => adminApi.deleteProject(r.projectId),
    onSuccess: () => {
      toast.success(t("admin.ventures.deleted"));
      invalidate();
      qc.invalidateQueries({ queryKey: ["admin-analytics"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" });
  const busy = resolve.isPending || dismiss.isPending || delProject.isPending;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: locale === "ar" ? 20 : -20 }}
      transition={{ duration: 0.4, delay: (index % 12) * 0.04, ease: EASE }}
      className="rounded-2xl border border-border/70 bg-card/50 p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px]", REASON_COLOR[r.reason] ?? "border-border text-muted-foreground")}>
          <Flag className="size-3" />
          {t(`report.reason.${r.reason.toLowerCase()}`)}
        </span>
        <StatusBadge status={r.status} />
        <span className="ms-auto font-numeric text-[11px] text-muted-foreground">{dateFmt.format(new Date(r.createdAt))}</span>
      </div>

      <p className="mt-3 text-sm">
        <Link href={`/projects/${r.projectId}`} data-cursor="hover" className="font-semibold transition-colors hover:text-primary">
          {r.projectName}
        </Link>{" "}
        <span className="text-muted-foreground">— {t("admin.reports.by")} </span>
        <Link href={`/u/${r.reporterId}`} data-cursor="hover" className="text-foreground transition-colors hover:text-primary">
          {r.reporterName}
        </Link>
      </p>

      {r.details && (
        <p className="mt-2 rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-sm text-muted-foreground">“{r.details}”</p>
      )}

      {r.status === "Open" && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-cursor="hover"
            disabled={busy}
            onClick={() => resolve.mutate()}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Check className="size-3.5" />
            {t("admin.reports.resolve")}
          </button>
          <button
            type="button"
            data-cursor="hover"
            disabled={busy}
            onClick={() => dismiss.mutate()}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            <X className="size-3.5" />
            {t("admin.reports.dismiss")}
          </button>
          <AnimatePresence mode="wait" initial={false}>
            {confirmDelete ? (
              <motion.span key="c" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2 }} className="inline-flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("admin.reports.confirmDelete")}</span>
                <button type="button" data-cursor="hover" disabled={busy} onClick={() => delProject.mutate()} className="rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                  {t("admin.reports.deleteVenture")}
                </button>
                <button type="button" data-cursor="hover" onClick={() => setConfirmDelete(false)} className="text-xs text-muted-foreground hover:text-foreground">
                  {t("form.cancel")}
                </button>
              </motion.span>
            ) : (
              <button
                key="d"
                type="button"
                data-cursor="hover"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-4 py-2 text-xs text-destructive transition-colors hover:bg-destructive/[0.06] disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
                {t("admin.reports.deleteVenture")}
              </button>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.li>
  );
}

export default function AdminReportsPage() {
  const { t } = useLocale();
  const [status, setStatus] = useState<string>("Open");
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useAdminReports(status, page);
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <DashPageHeader title={t("admin.reports.title")} sub={t("admin.reports.sub")} eyebrowKey="admin.sidebar.label" />

      <div className="flex gap-2">
        {STATUSES.map((s) => (
          <button
            key={s || "all"}
            type="button"
            data-cursor="hover"
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={cn(
              "rounded-full border px-4 py-2 text-xs transition-colors",
              status === s ? "border-primary/50 bg-primary/[0.08] text-foreground" : "border-border/70 text-muted-foreground hover:text-foreground"
            )}
          >
            {s === "" ? t("proj.filter.all") : t(`admin.reports.status.${s.toLowerCase()}`)}
          </button>
        ))}
      </div>

      {isLoading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-32 rounded-2xl" />
          ))}
        </div>
      ) : isError && !data ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data || data.items.length === 0 ? (
        <Panel>
          <ProfileEmptyState icon={ShieldCheck} title={t("admin.reports.empty")} body={t("admin.reports.emptySub")} />
        </Panel>
      ) : (
        <>
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {data.items.map((r, i) => (
                <ReportCard key={r.id} r={r} index={i} />
              ))}
            </AnimatePresence>
          </ul>
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 pt-2 text-sm">
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
    </div>
  );
}
