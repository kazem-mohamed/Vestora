"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { ReasonDialog } from "@/components/admin/reason-dialog";
import { DashPageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { ErrorState } from "@/components/ui/error-state";
import { PillButton } from "@/components/ui/pill-button";
import { SectionLabel } from "@/components/ui/section-label";
import { adminApi } from "@/lib/api/admin";
import { projectsApi, projectImageUrl } from "@/lib/api/projects";
import { categoryLabelKey } from "@/lib/config/categories";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { PendingProject, ProjectCard } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

function compactUsd(v: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(v);
}

/** One listing awaiting review — approve makes it public, reject keeps it hidden. */
function PendingRow({ p, index }: { p: PendingProject; index: number }) {
  const { t } = useLocale();
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-pending-projects"] });
    qc.invalidateQueries({ queryKey: ["admin-ventures"] });
  };

  const approve = useMutation({
    mutationFn: () => adminApi.approveProject(p.id),
    onSuccess: () => {
      toast.success(t("admin.pending.approved"));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: (reason: string) => adminApi.rejectProject(p.id, reason),
    onSuccess: () => {
      toast.success(t("admin.pending.rejected"));
      setRejecting(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: (index % 12) * 0.03, ease: EASE }}
      className="flex flex-col gap-3 rounded-xl px-2 py-2.5 sm:flex-row sm:items-center"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{p.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          <Link href={`/u/${p.ownerId}`} data-cursor="hover" className="hover:text-foreground">{p.ownerName}</Link>
          {p.category && <span> · {t(categoryLabelKey(p.category))}</span>}
          {p.stage && <span> · {p.stage}</span>}
          <span> · {compactUsd(p.investmentNeeded)}</span>
        </p>
      </div>

      <span className="flex shrink-0 items-center gap-1.5">
        <PillButton
          size="sm"
          showArrow={false}
          disabled={approve.isPending || reject.isPending}
          onClick={() => approve.mutate()}
        >
          <Check className="size-3.5" />
          {t("admin.pending.approve")}
        </PillButton>
        {
          <button
            type="button"
            data-cursor="hover"
            aria-label={t("admin.pending.reject")}
            disabled={approve.isPending}
            onClick={() => setRejecting(true)}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
          >
            <X className="size-4" />
          </button>
        }
      </span>

      <ReasonDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title={t("admin.reason.rejectProject.title")}
        body={t("admin.reason.rejectProject.body")}
        confirmLabel={t("admin.pending.confirmReject")}
        pending={reject.isPending}
        onConfirm={(reason) => reject.mutate(reason)}
      />
    </motion.li>
  );
}

function PendingReviewPanel() {
  const { t } = useLocale();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-pending-projects"],
    queryFn: () => adminApi.pendingProjects({ page: 1, pageSize: 20 }),
  });

  if (!isLoading && (!data || data.items.length === 0)) return null;

  return (
    <div>
      <SectionLabel index={0}>
        {t("admin.pending.title")}
        {data ? ` (${data.totalCount})` : ""}
      </SectionLabel>
      <Panel elevated className="mt-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer h-14 rounded-xl" />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {data!.items.map((p, i) => (
              <PendingRow key={p.id} p={p} index={i} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Row({ p, index }: { p: ProjectCard; index: number }) {
  const { t } = useLocale();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const cover = p.coverImageId;
  const pct = p.investmentNeeded > 0 ? Math.min(100, Math.round((p.committedAmount / p.investmentNeeded) * 100)) : 0;

  const del = useMutation({
    mutationFn: (reason: string) => adminApi.deleteProject(p.id, reason),
    onSuccess: (r) => {
      toast.success(r.message || t("admin.ventures.deleted"));
      setConfirming(false);
      qc.invalidateQueries({ queryKey: ["admin-ventures"] });
      qc.invalidateQueries({ queryKey: ["admin-analytics"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: (index % 12) * 0.03, ease: EASE }}
      className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-foreground/[0.03]"
    >
      <Link href={`/projects/${p.id}`} data-cursor="hover" className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-secondary ring-1 ring-border">
        {cover != null ? (
          <img src={projectImageUrl(cover)} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden className="grid h-full w-full place-items-center text-sm text-primary/60" style={{ fontFamily: "var(--font-heading)" }}>
            {p.name.charAt(0).toUpperCase()}
          </span>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link href={`/projects/${p.id}`} data-cursor="hover" className="block truncate text-sm font-semibold transition-colors hover:text-primary">
          {p.name}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          <Link href={`/u/${p.ownerId}`} data-cursor="hover" className="hover:text-foreground">{p.ownerName}</Link>
          {p.category && <span> · {t(categoryLabelKey(p.category))}</span>}
        </p>
      </div>

      <span className="hidden shrink-0 text-end font-numeric text-xs sm:block">
        <span className="text-bronze">{compactUsd(p.committedAmount)}</span>
        <span className="text-muted-foreground/70"> · {pct}%</span>
      </span>

      <button
        type="button"
        data-cursor="hover"
        aria-label={t("mine.delete")}
        onClick={() => setConfirming(true)}
        className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </button>

      <ReasonDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t("admin.reason.deleteProject.title")}
        body={t("admin.reason.deleteProject.body")}
        confirmLabel={t("admin.reason.deleteProject.confirm")}
        pending={del.isPending}
        onConfirm={(reason) => del.mutate(reason)}
      />
    </motion.li>
  );
}

export default function AdminVenturesPage() {
  const { t } = useLocale();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search, 300);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-ventures", debounced, page],
    queryFn: () => projectsApi.list({ search: debounced, page, pageSize: 12 }),
    placeholderData: (prev) => prev,
  });
  const totalPages = data ? Math.max(1, data.totalPages) : 1;

  return (
    <div className="space-y-6">
      <DashPageHeader title={t("admin.ventures.title")} sub={t("admin.ventures.sub")} eyebrowKey="admin.sidebar.label" />

      <PendingReviewPanel />

      <div className="relative">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t("admin.ventures.search")}
          className="w-full rounded-full border border-input bg-card/60 py-2.5 ps-10 pe-4 text-sm outline-none backdrop-blur-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
        />
      </div>

      <Panel elevated>
        {isLoading && !data ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer h-16 rounded-xl" />
            ))}
          </div>
        ) : isError && !data ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data || data.items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("proj.empty.title")}</p>
        ) : (
          <>
            <ul className="divide-y divide-border/50">
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
