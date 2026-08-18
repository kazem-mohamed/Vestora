"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Crown, Flag, Pencil, RefreshCw, Rocket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DashPageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { ProfileEmptyState } from "@/components/profile/profile-empty-state";
import { CloseRoundDialog } from "@/components/projects/close-round-dialog";
import { PillButton } from "@/components/ui/pill-button";
import { ErrorState } from "@/components/ui/error-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { projectsApi, projectImageUrl } from "@/lib/api/projects";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

function compactUsd(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
}

/** Moderation state pill — the founder must see why a venture isn't public yet. */
function ModerationBadge({ status }: { status: string }) {
  const { t } = useLocale();
  if (status === "PendingReview") {
    return (
      <span className="shrink-0 rounded-full border border-bronze/40 bg-bronze/[0.08] px-2.5 py-0.5 text-[10px] font-medium text-bronze">
        {t("mine.status.pending")}
      </span>
    );
  }
  if (status === "Rejected") {
    return (
      <span className="shrink-0 rounded-full border border-destructive/40 bg-destructive/[0.08] px-2.5 py-0.5 text-[10px] font-medium text-destructive">
        {t("mine.status.rejected")}
      </span>
    );
  }
  return null;
}

/** Paused/Closed only — Active is the default and needs no badge. */
function LifecycleBadge({ status }: { status: string }) {
  const { t } = useLocale();
  if (status !== "Paused" && status !== "Closed") return null;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium",
        status === "Paused"
          ? "border-bronze/40 bg-bronze/[0.08] text-bronze"
          : "border-border text-muted-foreground"
      )}
    >
      {t(status === "Paused" ? "life.paused" : "life.closed")}
    </span>
  );
}

export default function DashboardVenturesPage() {
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [toDelete, setToDelete] = useState<Project | null>(null);
  const [closing, setClosing] = useState<Project | null>(null);

  const q = useQuery({
    queryKey: ["my-projects", user?.id],
    queryFn: () => projectsApi.byOwner(user!.id),
    enabled: !!user,
  });
  const projects = q.data ?? [];

  const lifecycle = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "Active" | "Paused" }) =>
      projectsApi.setLifecycle(id, status),
    onSuccess: () => {
      toast.success(t("life.updated"));
      qc.invalidateQueries({ queryKey: ["my-projects", user?.id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => projectsApi.remove(id),
    onSuccess: () => {
      toast.success(t("mine.deleted"));
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ["my-projects", user?.id] });
      // The founder dashboard aggregates these ventures — keep it in sync.
      qc.invalidateQueries({ queryKey: ["founder-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const topId =
    projects.length > 1
      ? [...projects].sort((a, b) => b.raisedAmount - a.raisedAmount)[0]?.id
      : null;

  return (
    <div className="space-y-6">
      <DashPageHeader
        title={t("dash.page.ventures.title")}
        sub={t("dash.page.ventures.sub")}
        action={
          <PillButton href="/my-projects/new" size="sm">
            {t("mine.new")}
          </PillButton>
        }
      />

      {q.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-24 rounded-2xl" />
          ))}
        </div>
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : projects.length === 0 ? (
        <ProfileEmptyState
          icon={Rocket}
          title={t("mine.empty.title")}
          body={t("mine.empty.body")}
          ctaLabel={t("mine.new")}
          ctaHref="/my-projects/new"
        />
      ) : (
        <Panel elevated>
          <ul className="divide-y divide-border/60">
            {projects.map((p, i) => {
              const pct =
                p.investmentNeeded > 0
                  ? Math.min(100, Math.round((p.raisedAmount / p.investmentNeeded) * 100))
                  : 0;
              const funded = p.status === "Completed" || pct >= 100;
              const cover = p.imageIds[0];
              return (
                <motion.li
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ duration: 0.5, delay: (i % 6) * 0.05, ease: EASE }}
                  className="flex flex-col gap-4 px-2 py-4 transition-colors hover:bg-foreground/[0.02] sm:flex-row sm:items-center"
                >
                  {/* Thumb */}
                  <Link
                    href={`/projects/${p.id}`}
                    data-cursor="hover"
                    className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-secondary ring-1 ring-border"
                  >
                    {cover != null ? (
                      <img src={projectImageUrl(cover)} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span
                        aria-hidden
                        className="grid h-full w-full place-items-center text-lg text-primary/60"
                        style={{
                          fontFamily: "var(--font-heading)",
                          backgroundImage:
                            "radial-gradient(120% 120% at 20% 0%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 65%)",
                        }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </Link>

                  {/* Name + meta */}
                  <div className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <Link
                        href={`/projects/${p.id}`}
                        data-cursor="hover"
                        className="truncate text-base font-bold transition-colors hover:text-primary"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {p.name}
                      </Link>
                      {p.id === topId && p.raisedAmount > 0 && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-primary/[0.08] px-2 py-0.5 text-[10px] text-primary">
                          <Crown className="size-3" />
                          {t("dash.top.badge")}
                        </span>
                      )}
                      <ModerationBadge status={p.moderationStatus} />
                      <LifecycleBadge status={p.lifecycleStatus} />
                    </span>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      {p.category && <span>{p.category}</span>}
                      {p.category && <span aria-hidden>·</span>}
                      <span className="font-numeric">
                        {p.numberOfInvestors} {t("proj.card.investors")}
                      </span>
                    </p>
                    {/* A rejected listing must say what to fix — and offer the
                        way to fix it. Editing puts it back in the review queue,
                        so the rejection is a step rather than an ending. */}
                    {p.moderationStatus === "Rejected" && (
                      <div className="mt-2.5 rounded-lg border border-destructive/30 bg-destructive/[0.05] px-3.5 py-3">
                        {p.moderationNote && (
                          <p className="text-xs leading-relaxed text-destructive">
                            <span className="font-medium">{t("mine.rejectedReason")}:</span>{" "}
                            {p.moderationNote}
                          </p>
                        )}
                        <Link
                          href={`/my-projects/${p.id}/edit`}
                          data-cursor="hover"
                          className="mt-2.5 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-destructive/40 px-3.5 text-xs text-destructive outline-none transition-colors hover:border-destructive hover:bg-destructive/[0.08] focus-visible:ring-3 focus-visible:ring-ring/25"
                        >
                          <RefreshCw className="size-3.5" strokeWidth={1.8} />
                          {t("mine.fixAndResubmit")}
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Funding */}
                  <div className="w-full sm:w-56">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-numeric text-xs">
                        <span className="text-bronze">{compactUsd(p.raisedAmount)}</span>
                        <span className="text-muted-foreground"> / {compactUsd(p.investmentNeeded)}</span>
                      </span>
                      <span className="font-numeric text-[11px] text-primary">{pct}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
                        className="h-full rounded-full bg-gradient-to-r from-bronze to-primary"
                      />
                    </div>
                  </div>

                  {/* Status + actions */}
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={cn(
                        "whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px]",
                        funded ? "border-primary/40 text-primary" : "border-bronze/40 text-bronze"
                      )}
                    >
                      {funded ? t("proj.card.completed") : t("proj.card.needs")}
                    </span>

                    {/* Lifecycle is only meaningful once the listing is public.
                        Active ↔ Paused stays a select: both are reversible and cost
                        nothing to get wrong. Closing does not — it concludes every live
                        relationship and notifies each backer — so it left this dropdown
                        and became a deliberate action with a confirmation. */}
                    {p.moderationStatus === "Approved" && !p.roundClosedAtUtc && (
                      <>
                        <Select
                          value={p.lifecycleStatus === "Paused" ? "Paused" : "Active"}
                          onValueChange={(v) =>
                            lifecycle.mutate({ id: p.id, status: v as "Active" | "Paused" })
                          }
                        >
                          <SelectTrigger
                            size="sm"
                            disabled={lifecycle.isPending}
                            aria-label={t("life.change")}
                            className="w-auto rounded-full px-3 text-xs"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Active">{t("life.active")}</SelectItem>
                            <SelectItem value="Paused">{t("life.paused")}</SelectItem>
                          </SelectContent>
                        </Select>

                        <button
                          type="button"
                          data-cursor="hover"
                          onClick={() => setClosing(p)}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-bronze/40 px-3 text-xs text-bronze outline-none transition-colors hover:bg-bronze/[0.07] focus-visible:ring-3 focus-visible:ring-ring/25"
                        >
                          <Flag className="size-3" strokeWidth={2} />
                          {t("round.close.action")}
                        </button>
                      </>
                    )}
                    <Link
                      href={`/my-projects/${p.id}/edit`}
                      data-cursor="hover"
                      aria-label={t("mine.edit")}
                      className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      <Pencil className="size-4" strokeWidth={1.7} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setToDelete(p)}
                      data-cursor="hover"
                      aria-label={t("mine.delete")}
                      className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
                    >
                      <Trash2 className="size-4" strokeWidth={1.7} />
                    </button>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </Panel>
      )}

      {closing && (
        <CloseRoundDialog
          projectId={closing.id}
          projectName={closing.name}
          committedAmount={closing.raisedAmount}
          goal={closing.investmentNeeded}
          activeRelationships={closing.numberOfInvestors}
          pendingRequests={closing.pendingRequestsCount}
          open
          onOpenChange={(v) => !v && setClosing(null)}
        />
      )}

      <Dialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("mine.delete.title")}</DialogTitle>
            <DialogDescription>{t("mine.delete.body")}</DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setToDelete(null)}
              data-cursor="hover"
              className="rounded-full border border-border px-5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("form.cancel")}
            </button>
            <button
              type="button"
              onClick={() => toDelete && deleteMutation.mutate(toDelete.id)}
              disabled={deleteMutation.isPending}
              data-cursor="hover"
              className="rounded-full bg-destructive px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {t("mine.delete.confirm")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
