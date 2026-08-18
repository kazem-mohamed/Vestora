"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowUpRight, Check, GitBranch, MessageSquare, NotebookPen, Save, X } from "lucide-react";
import { toast } from "sonner";
import { DashPageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { ProfileEmptyState } from "@/components/profile/profile-empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  EASE,
  STAGE_LABEL_KEY,
  STAGE_ORDER,
  StagePill,
  compactUsd,
} from "@/components/invest/invest-primitives";
import { pipelineApi } from "@/lib/api/dashboard";
import { useFounderDashboard } from "@/lib/hooks/use-dashboard";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { FounderPipelineItem, PipelineStage } from "@/lib/types/api";

type Filter = "needsAction" | "active" | "all" | "declined";

function RelationshipRow({ item, index }: { item: FounderPipelineItem; index: number }) {
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const [note, setNote] = useState(item.founderNote ?? "");
  const [openNote, setOpenNote] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["founder-dashboard", user?.id] });
    qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
    qc.invalidateQueries({ queryKey: ["action-center"] });
  };

  // Addressed by the relationship, not by the notification that announced it.
  // This board reads the pipeline, so a founder whose notification has been
  // cleared or paged out can still decide — which the notification-keyed
  // version could not, and silently disabled both buttons instead.
  const approve = useMutation({
    mutationFn: () => pipelineApi.approveSupport(item.investmentId),
    onSuccess: () => {
      toast.success(t("notif.approved.toast"));
      refresh();
      qc.invalidateQueries({ queryKey: ["project"] });
      qc.invalidateQueries({ queryKey: ["my-projects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: () => pipelineApi.rejectSupport(item.investmentId),
    onSuccess: () => {
      toast.success(t("notif.rejected.toast"));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStage = useMutation({
    mutationFn: (stage: PipelineStage) => pipelineApi.setStage(item.investmentId, stage),
    onSuccess: () => {
      toast.success(t("pipe.stageUpdated"));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveNote = useMutation({
    mutationFn: () => pipelineApi.setFounderNote(item.investmentId, note),
    onSuccess: () => {
      toast.success(t("inv.note.saved"));
      setOpenNote(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // A brand-new request still needs the accept/decline decision; anything past
  // that is moved along the pipeline instead.
  const needsDecision = item.status === "Pending";
  const busy = setStage.isPending || approve.isPending || reject.isPending;

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.5, delay: (index % 8) * 0.04, ease: EASE }}
      className={cn(
        "rounded-2xl border p-4 transition-colors",
        needsDecision
          ? "border-bronze/40 bg-bronze/[0.04]"
          : "border-border/60 bg-card/40 hover:border-primary/30"
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/u/${item.investorId}`}
              data-cursor="hover"
              className="truncate text-base font-bold transition-colors hover:text-primary"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {item.investorName || t("pipe.unknownInvestor")}
            </Link>
            <StagePill stage={item.stage} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span className="font-numeric text-bronze">{compactUsd(item.amount)}</span>
            <span aria-hidden>·</span>
            <Link href={`/projects/${item.projectId}`} data-cursor="hover" className="hover:text-foreground">
              {item.projectName}
            </Link>
            <span aria-hidden>·</span>
            {/* Into the relationship itself. This board is for triaging many requests;
                everything about one of them lives in its own room. */}
            <Link
              href={`/deals/${item.investmentId}`}
              data-cursor="hover"
              className="link-underline inline-flex items-center gap-1 text-primary"
            >
              {t("deal.open")}
              <ArrowUpRight className="size-3" />
            </Link>
          </p>
          {item.contactInfo && (
            <p className="mt-2 inline-block rounded-full border border-primary/25 bg-primary/[0.06] px-3 py-1 text-xs text-foreground">
              {item.contactInfo}
            </p>
          )}

          {/* Who is asking. Deciding whether to open a conversation used to mean
              a name and an email; this is the investor in their own words. */}
          {(item.investorThesis || item.investorIndustries || item.investorTicketMin != null || item.investorTicketMax != null) && (
            <div className="mt-2.5 rounded-xl border border-border/60 bg-background/40 px-3.5 py-2.5">
              {item.investorThesis && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  “{item.investorThesis}”
                </p>
              )}
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground/85">
                {(item.investorTicketMin != null || item.investorTicketMax != null) && (
                  <span className="font-numeric text-foreground">
                    {item.investorTicketMin != null && item.investorTicketMax != null
                      ? `${compactUsd(item.investorTicketMin)}–${compactUsd(item.investorTicketMax)}`
                      : item.investorTicketMin != null
                        ? `${compactUsd(item.investorTicketMin)}+`
                        : `${t("pipe.upTo")} ${compactUsd(item.investorTicketMax!)}`}
                    <span className="ms-1 text-muted-foreground">{t("pipe.typicalTicket")}</span>
                  </span>
                )}
                {item.investorIndustries && (
                  <>
                    {(item.investorTicketMin != null || item.investorTicketMax != null) && (
                      <span aria-hidden className="text-muted-foreground/50">·</span>
                    )}
                    <span className="truncate">{item.investorIndustries}</span>
                  </>
                )}
              </p>
            </div>
          )}
          {item.stage === "Declined" && item.declinedReason && (
            <p className="mt-2 text-xs text-destructive/90">
              {t("inv.pipeline.declinedReason")}: {item.declinedReason}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {needsDecision ? (
            <>
              <button
                type="button"
                data-cursor="hover"
                disabled={busy}
                onClick={() => approve.mutate()}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Check className="size-3.5" />
                {t("notif.approve")}
              </button>
              <button
                type="button"
                data-cursor="hover"
                disabled={busy}
                onClick={() => reject.mutate()}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive disabled:opacity-50"
              >
                <X className="size-3.5" />
                {t("notif.reject")}
              </button>
            </>
          ) : (
            <Select
              value={item.stage}
              onValueChange={(v) => setStage.mutate(v as PipelineStage)}
            >
              <SelectTrigger
                size="sm"
                disabled={busy}
                aria-label={t("pipe.moveStage")}
                className="w-auto rounded-full px-3 text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGE_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(STAGE_LABEL_KEY[s])}
                  </SelectItem>
                ))}
                <SelectItem value="Declined">{t("stage.declined")}</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Link
            href={`/messages?to=${item.investorId}`}
            data-cursor="hover"
            aria-label={t("pipe.message")}
            className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <MessageSquare className="size-4" strokeWidth={1.7} />
          </Link>
          <button
            type="button"
            data-cursor="hover"
            aria-label={t("inv.note.add")}
            onClick={() => setOpenNote((v) => !v)}
            className={cn(
              "grid size-9 place-items-center rounded-full border transition-colors",
              item.founderNote
                ? "border-primary/50 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
            )}
          >
            <NotebookPen className="size-4" strokeWidth={1.7} />
          </button>
        </div>
      </div>

      {openNote && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3, ease: EASE }}
          className="mt-4 overflow-hidden"
        >
          <label htmlFor={`fnote-${item.investmentId}`} className="text-xs text-muted-foreground">
            {t("inv.note.private")}
          </label>
          <textarea
            id={`fnote-${item.investmentId}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={t("pipe.note.placeholder")}
            className="mt-2 w-full resize-y rounded-xl border border-input bg-card/60 p-3 text-sm outline-none backdrop-blur-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/20"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              data-cursor="hover"
              disabled={saveNote.isPending}
              onClick={() => saveNote.mutate()}
              className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/[0.08] px-4 py-1.5 text-xs text-primary transition-colors hover:bg-primary/[0.14] disabled:opacity-60"
            >
              <Save className="size-3.5" />
              {saveNote.isPending ? t("inv.note.saving") : t("inv.note.save")}
            </button>
          </div>
        </motion.div>
      )}
    </motion.li>
  );
}

export default function DashboardPipelinePage() {
  const { t } = useLocale();
  const { data, isLoading, isError, refetch } = useFounderDashboard();
  const [filter, setFilter] = useState<Filter | null>(null);

  const all = useMemo(() => data?.pipeline ?? [], [data]);

  const groups = useMemo(
    () => ({
      needsAction: all.filter((i) => i.status === "Pending"),
      active: all.filter((i) => i.stage !== "Declined" && i.stage !== "Closed"),
      all,
      declined: all.filter((i) => i.stage === "Declined"),
    }),
    [all]
  );

  // Land on "Needs action" only when something actually does; otherwise show
  // the active relationships rather than an empty screen.
  const effectiveFilter: Filter = filter ?? (groups.needsAction.length > 0 ? "needsAction" : "active");
  const items = groups[effectiveFilter];

  const FILTERS: { key: Filter; labelKey: string }[] = [
    { key: "needsAction", labelKey: "pipe.filter.needsAction" },
    { key: "active", labelKey: "inv.filter.active" },
    { key: "all", labelKey: "inv.filter.all" },
    { key: "declined", labelKey: "inv.filter.declined" },
  ];

  return (
    <div className="space-y-6">
      <DashPageHeader title={t("pipe.page.title")} sub={t("pipe.page.sub")} />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-28 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : all.length === 0 ? (
        <ProfileEmptyState
          icon={GitBranch}
          title={t("pipe.empty")}
          body={t("pipe.emptySub")}
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                data-cursor="hover"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-xs transition-colors",
                  effectiveFilter === f.key
                    ? "border-primary/50 bg-primary/[0.08] text-foreground"
                    : "border-border/70 text-muted-foreground hover:text-foreground"
                )}
              >
                {t(f.labelKey)}
                <span className="font-numeric ms-1.5 text-muted-foreground/70">({groups[f.key].length})</span>
              </button>
            ))}
          </div>

          {items.length === 0 ? (
            <Panel>
              <p className="py-8 text-center text-sm text-muted-foreground">{t("pipe.noneInFilter")}</p>
            </Panel>
          ) : (
            <ul className="space-y-3">
              {items.map((i, idx) => (
                <RelationshipRow key={i.investmentId} item={i} index={idx} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
