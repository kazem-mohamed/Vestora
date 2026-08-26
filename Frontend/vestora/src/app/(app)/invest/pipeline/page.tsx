"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowUpRight, GitBranch, MessageSquare, NotebookPen, Save } from "lucide-react";
import { toast } from "sonner";
import { DashPageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { ProfileEmptyState } from "@/components/profile/profile-empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  EASE,
  STAGE_LABEL_KEY,
  STAGE_ORDER,
  StagePill,
  VentureThumb,
  compactUsd,
} from "@/components/invest/invest-primitives";
import { FundingStatePill } from "@/components/funding/funding-primitives";
import { pipelineApi } from "@/lib/api/dashboard";
import { useAuthStore } from "@/lib/auth/store";
import { categoryLabelKey } from "@/lib/config/categories";
import { useInvestorDashboard } from "@/lib/hooks/use-investor-dashboard";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { PipelineItem, PipelineStage } from "@/lib/types/api";

type Filter = "active" | "all" | "declined";

/** Progress rail: how far this relationship has travelled. */
function StageRail({ stage }: { stage: PipelineItem["stage"] }) {
  const idx = STAGE_ORDER.indexOf(stage);
  const ended = stage === "Declined";
  return (
    <div className="flex items-center gap-1" aria-hidden>
      {STAGE_ORDER.slice(0, 6).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors",
            ended ? "bg-destructive/25" : i <= idx ? "bg-gradient-to-r from-bronze to-primary" : "bg-secondary"
          )}
        />
      ))}
    </div>
  );
}

function PipelineRow({ item, index }: { item: PipelineItem; index: number }) {
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [note, setNote] = useState(item.investorNote ?? "");
  const [openNote, setOpenNote] = useState(false);
  const due = item.fundingState === "PaymentDue";

  const saveNote = useMutation({
    mutationFn: () => pipelineApi.setInvestorNote(item.investmentId, note),
    onSuccess: () => {
      toast.success(t("inv.note.saved"));
      setOpenNote(false);
      qc.invalidateQueries({ queryKey: ["investor-dashboard", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.5, delay: (index % 8) * 0.04, ease: EASE }}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 transition-colors",
        // A relationship that owes money is not one row among many. It gets the
        // lit border and the rail that says the next move is the investor's.
        due
          ? "border-primary/45 bg-primary/[0.04] hover:border-primary/65"
          : "border-border/60 bg-card/40 hover:border-primary/30"
      )}
    >
      {due && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 start-0 w-0.5 bg-primary/70"
        />
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <VentureThumb
          imageId={item.coverImageId}
          name={item.projectName}
          href={`/projects/${item.projectId}`}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/projects/${item.projectId}`}
              data-cursor="hover"
              className="truncate text-base font-bold transition-colors hover:text-primary"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {item.projectName}
            </Link>
            <StagePill stage={item.stage} />
            {/* Relationship stage and money state are two axes; the row shows both
                rather than blending them into one ambiguous status. */}
            <FundingStatePill state={item.fundingState} pulse />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <Link href={`/u/${item.founderId}`} data-cursor="hover" className="hover:text-foreground">
              {item.founderName}
            </Link>
            {item.category && (
              <>
                <span aria-hidden>·</span>
                <span>{t(categoryLabelKey(item.category))}</span>
              </>
            )}
            <span aria-hidden>·</span>
            {/* The pipeline shows where every relationship stands; the room is where
                one of them is actually worked. */}
            <Link
              href={`/deals/${item.investmentId}`}
              data-cursor="hover"
              className="link-underline inline-flex items-center gap-1 text-primary"
            >
              {t("deal.open")}
              <ArrowUpRight className="size-3" />
            </Link>
          </p>
          <div className="mt-3 max-w-xs">
            <StageRail stage={item.stage} />
          </div>
          {item.stage === "Declined" && item.declinedReason && (
            <p className="mt-2 text-xs text-destructive/90">
              {t("inv.pipeline.declinedReason")}: {item.declinedReason}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
          <span className="text-end">
            <span className="font-numeric block text-lg text-bronze">
              {compactUsd(item.fundedAmount ?? item.agreedAmount ?? item.amount)}
            </span>
            {/* When the agreed number differs from the opening ask, both are shown:
                a founder asking for less than requested is normal, and hiding the
                original would make the change look like an error. */}
            {item.agreedAmount != null && item.agreedAmount !== item.amount && (
              <span className="font-numeric block text-[10.5px] text-muted-foreground/70 line-through">
                {compactUsd(item.amount)}
              </span>
            )}
          </span>

          {due && (
            <Link
              href={`/deals/${item.investmentId}`}
              data-cursor="hover"
              className="gold-cta inline-flex min-h-10 items-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {item.canRetry ? t("fund.due.retry") : t("fund.due.cta")}
            </Link>
          )}

          <span className="flex items-center gap-1.5">
            <Link
              href={`/messages?to=${item.founderId}`}
              data-cursor="hover"
              aria-label={t("msg.messageFounder")}
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
                item.investorNote
                  ? "border-primary/50 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
              )}
            >
              <NotebookPen className="size-4" strokeWidth={1.7} />
            </button>
          </span>
        </div>
      </div>

      {openNote && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3, ease: EASE }}
          className="mt-4 overflow-hidden"
        >
          <label htmlFor={`note-${item.investmentId}`} className="text-xs text-muted-foreground">
            {t("inv.note.private")}
          </label>
          <textarea
            id={`note-${item.investmentId}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={t("inv.note.placeholder")}
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

/** The ladder, in order. Declined is a way out of it, not a rung. */
const FUNNEL_STAGES: PipelineStage[] = [
  "New",
  "Reviewing",
  "Approved",
  "Contacted",
  "InDiscussion",
  "Committed",
];

/**
 * This investor's own funnel, derived from the pipeline the page already has.
 *
 * Cumulative — "reached at least this far" — because a relationship that got to
 * Committed is not sitting in Reviewing, and a chart built from current stages would
 * read as if it had fallen out. Counts lead; the drop-off is a count too. No endpoint:
 * every number here is a group-by over data that was already fetched.
 */
function InvestorFunnel({ items }: { items: PipelineItem[] }) {
  const { t } = useLocale();

  const live = items.filter((i) => i.stage !== "Declined");
  const declined = items.length - live.length;

  const reachedAtLeast = (stage: PipelineStage) => {
    const target = FUNNEL_STAGES.indexOf(stage);
    return live.filter((i) => {
      // Closed means the relationship ran its course, so it topped the ladder.
      const ord = i.stage === "Closed" ? FUNNEL_STAGES.length - 1 : FUNNEL_STAGES.indexOf(i.stage);
      return ord >= target;
    }).length;
  };

  // "Funded" is a step in this funnel, not a PipelineStage — it has no entry in
  // STAGE_LABEL_KEY, so it carries its own label key rather than falling through
  // that lookup's "stage.new" default and silently mislabelling the last row.
  const steps: { stage: PipelineStage | "Funded"; count: number; labelKey?: string }[] =
    FUNNEL_STAGES.map((stage) => ({ stage, count: reachedAtLeast(stage) }));
  const funded = items.filter((i) => (i.fundedAmount ?? 0) > 0).length;
  steps.push({ stage: "Funded", count: funded, labelKey: "fund.word.funded" });

  const widest = Math.max(1, ...steps.map((s) => s.count));
  if (widest === 0) return null;

  return (
    <Panel title={t("inv.funnel.title")}>
      <ul className="space-y-3">
        {steps.map((s, i) => {
          const lost = i > 0 ? steps[i - 1].count - s.count : 0;
          return (
            <li key={s.stage}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">
                  {t(s.labelKey ?? STAGE_LABEL_KEY[s.stage as PipelineStage] ?? "stage.new")}
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="font-numeric text-foreground">{s.count}</span>
                  {lost > 0 && (
                    <span className="font-numeric text-[11px] text-muted-foreground">−{lost}</span>
                  )}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <span
                  className={cn(
                    "block h-full rounded-full",
                    s.stage === "Funded" ? "bg-primary" : "bg-bronze"
                  )}
                  style={{ width: `${Math.round((s.count / widest) * 100)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {declined > 0 && (
        <p className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <span className="font-numeric text-foreground">{declined}</span> {t("inv.funnel.declined")}
        </p>
      )}
    </Panel>
  );
}

export default function InvestPipelinePage() {
  const { t } = useLocale();
  const { data, isLoading, isError, refetch } = useInvestorDashboard();
  const [filter, setFilter] = useState<Filter>("active");

  const items = useMemo(() => {
    const all = data?.pipeline ?? [];
    if (filter === "all") return all;
    if (filter === "declined") return all.filter((i) => i.stage === "Declined");
    return all.filter((i) => i.stage !== "Declined" && i.stage !== "Closed");
  }, [data, filter]);

  const counts = useMemo(() => {
    const all = data?.pipeline ?? [];
    return {
      active: all.filter((i) => i.stage !== "Declined" && i.stage !== "Closed").length,
      all: all.length,
      declined: all.filter((i) => i.stage === "Declined").length,
    };
  }, [data]);

  const FILTERS: { key: Filter; labelKey: string }[] = [
    { key: "active", labelKey: "inv.filter.active" },
    { key: "all", labelKey: "inv.filter.all" },
    { key: "declined", labelKey: "inv.filter.declined" },
  ];

  return (
    <div className="space-y-6">
      <DashPageHeader title={t("inv.page.pipeline.title")} sub={t("inv.page.pipeline.sub")} eyebrowKey="inv.sidebar.label" />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-28 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (data?.pipeline.length ?? 0) === 0 ? (
        <ProfileEmptyState
          icon={GitBranch}
          title={t("inv.pipeline.empty")}
          body={t("inv.pipeline.emptySub")}
          ctaLabel={t("inv.quick.discover")}
          ctaHref="/projects"
        />
      ) : (
        <>
          {/* Performance before the list. The relationships are below either way; this
              says how the investor's own activity is converting. */}
          <InvestorFunnel items={data?.pipeline ?? []} />

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                data-cursor="hover"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-xs transition-colors",
                  filter === f.key
                    ? "border-primary/50 bg-primary/[0.08] text-foreground"
                    : "border-border/70 text-muted-foreground hover:text-foreground"
                )}
              >
                {t(f.labelKey)}
                <span className="font-numeric ms-1.5 text-muted-foreground/70">({counts[f.key]})</span>
              </button>
            ))}
          </div>

          {items.length === 0 ? (
            <Panel>
              <p className="py-8 text-center text-sm text-muted-foreground">{t("inv.pipeline.noneInFilter")}</p>
            </Panel>
          ) : (
            <ul className="space-y-3">
              {items.map((i, idx) => (
                <PipelineRow key={i.investmentId} item={i} index={idx} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
