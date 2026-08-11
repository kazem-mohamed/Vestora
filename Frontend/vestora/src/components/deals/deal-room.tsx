"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Ban,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  NotebookPen,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { DealTimeline, StageDurations } from "@/components/deals/deal-timeline";
import { DealTerms } from "@/components/deals/deal-terms";
import { DealChat } from "@/components/deals/deal-chat";
import { DealQuestions } from "@/components/deals/deal-questions";
import { DealDocuments } from "@/components/deals/deal-documents";
import { DealFundingPanel } from "@/components/funding/deal-funding-panel";
import { FundingDial, FundingStatePill } from "@/components/funding/funding-primitives";
import { STAGE_LABEL_KEY } from "@/components/invest/invest-primitives";
import { dealsApi } from "@/lib/api/deals";
import { pipelineApi } from "@/lib/api/dashboard";
import { projectImageUrl } from "@/lib/api/projects";
import { compactUsd } from "@/lib/format/money";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { DealHealth, DealNextStep, PipelineStage } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Stages a founder may advance a live relationship into, in order. */
const FORWARD = ["Reviewing", "Approved", "Contacted", "InDiscussion", "Committed", "Closed"];

/**
 * The relationship workspace.
 *
 * Everything one deal is, on one surface: where it stands, what happened, what is
 * outstanding, and whose move it is. Built by joining systems that already existed
 * rather than replacing them — the pipeline stage, the data room, the messages and the
 * notifications are all the same records they were, finally shown together.
 *
 * The layout is deliberately not a KPI grid. A relationship is a narrative with a
 * current state, so it reads as a masthead (who, what, where it stands), a spine of
 * obligations, and a chronology.
 */
export function DealRoom({ investmentId }: { investmentId: number }) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const Back = rtl ? ArrowRight : ArrowLeft;
  const reduce = useReducedMotion() ?? false;
  const qc = useQueryClient();

  const { data: deal, isLoading, isError } = useQuery({
    queryKey: ["deal", investmentId],
    queryFn: () => dealsApi.get(investmentId),
    enabled: Number.isFinite(investmentId),
  });

  const [note, setNote] = useState<string | null>(null);

  // Pointer-driven depth on the masthead plate only. The rest of the page is reading
  // material and should stay still.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 70, damping: 24 });
  const sy = useSpring(py, { stiffness: 70, damping: 24 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-3.5, 3.5]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [2.5, -2.5]);

  const saveNote = useMutation({
    mutationFn: (v: string) => dealsApi.saveNote(investmentId, v),
    onSuccess: () => {
      toast.success(t("deal.note.saved"));
      qc.invalidateQueries({ queryKey: ["deal", investmentId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStage = useMutation({
    mutationFn: (stage: string) => pipelineApi.setStage(investmentId, stage),
    onSuccess: () => {
      toast.success(t("deal.stage.updated"));
      qc.invalidateQueries({ queryKey: ["deal", investmentId] });
      qc.invalidateQueries({ queryKey: ["deals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <DealSkeleton />;

  if (isError || !deal) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-32 text-center">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          {t("deal.notFound.title")}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("deal.notFound.body")}</p>
        <Link
          href="/dashboard/requests"
          data-cursor="hover"
          className="link-underline mt-8 inline-block text-sm text-foreground"
        >
          {t("deal.back")}
        </Link>
      </div>
    );
  }

  const isFounder = deal.viewerRole === "founder";
  const counterpart = isFounder ? deal.investorName : deal.founderName;
  const counterpartId = isFounder ? deal.investorId : deal.founderId;
  const terminal = deal.stage === "Closed" || deal.stage === "Declined";

  const currentIndex = FORWARD.indexOf(deal.stage);
  const nextStage = currentIndex >= 0 ? FORWARD[currentIndex + 1] : undefined;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-24 sm:px-10">
      {/* ---- Back ---- */}
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="pt-8"
      >
        <Link
          href={isFounder ? "/dashboard/requests" : "/invest/pipeline"}
          data-cursor="hover"
          className={cn(
            "link-underline inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground",
            rtl ? "" : "uppercase tracking-[0.2em]"
          )}
        >
          <Back className="size-3.5" />
          {t("deal.back")}
        </Link>
      </motion.div>

      {/* ================= MASTHEAD ================= */}
      <motion.section
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: EASE }}
        onPointerMove={(e) => {
          if (reduce || e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width - 0.5);
          py.set((e.clientY - r.top) / r.height - 0.5);
        }}
        onPointerLeave={() => {
          px.set(0);
          py.set(0);
        }}
        style={{ perspective: 1400 }}
        className="mt-6"
      >
        <motion.div
          style={reduce ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
          className="relative overflow-hidden rounded-[1.5rem] border border-border bg-card/50 backdrop-blur-sm"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
          />

          {/* The venture's own image, set deep so the plate has a floor. */}
          {deal.coverImageId != null && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.10]"
              style={{ transform: "translateZ(-50px)" }}
            >
              <img
                src={projectImageUrl(deal.coverImageId)}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/70 to-card/30" />
            </div>
          )}

          <div className="relative p-6 sm:p-8" style={{ transform: "translateZ(24px)" }}>
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-[11px] text-primary",
                    rtl ? "" : "uppercase tracking-[0.28em]"
                  )}
                >
                  {t("deal.eyebrow")}
                </p>

                {/* Who this relationship is with — the actual subject of the page. */}
                <h1
                  className={cn(
                    "mt-3 text-2xl font-bold sm:text-3xl",
                    rtl ? "leading-[1.35]" : "tracking-[-0.01em]"
                  )}
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {counterpart}
                </h1>

                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  <span>{isFounder ? t("deal.withInvestor") : t("deal.withFounder")}</span>
                  <span aria-hidden>·</span>
                  <Link
                    href={`/projects/${deal.projectId}`}
                    data-cursor="hover"
                    className="inline-flex items-center gap-1 text-foreground transition-colors hover:text-primary"
                  >
                    {deal.projectName}
                    <ExternalLink className="size-3" />
                  </Link>
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2">
                <StageBadge stage={deal.stage} />
                {/* The relationship's stage and its money are two different axes, so
                    they are stated as two marks rather than one blended status. */}
                <FundingStatePill state={deal.fundingState} pulse />
                {/* And a third: whether it is moving at all. Nobody maintains this —
                    it is read off silence, unanswered questions and unpaid asks. */}
                <HealthPill health={deal.health} />
              </div>
            </div>

            {/* ---- The money: what this deal is, and where the round stands. ---- */}
            <div className="mt-7 flex flex-wrap items-end gap-x-10 gap-y-5 border-t border-border/60 pt-6">
              <div>
                <p
                  className={cn(
                    "text-[10px] text-muted-foreground",
                    rtl ? "" : "uppercase tracking-[0.18em]"
                  )}
                >
                  {deal.fundingState === "Funded" ? t("fund.word.funded") : t("deal.amount")}
                </p>
                <p className="font-numeric mt-1.5 text-2xl leading-none text-bronze">
                  {compactUsd(deal.fundedThisDeal ?? deal.fundingRequest?.amount ?? deal.amount)}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <FundingDial
                  funded={deal.fundedAmount}
                  committed={deal.committedAmount}
                  goal={deal.investmentNeeded}
                  size={64}
                  stroke={5}
                />
                <div>
                  <p
                    className={cn(
                      "text-[10px] text-muted-foreground",
                      rtl ? "" : "uppercase tracking-[0.18em]"
                    )}
                  >
                    {t("deal.roundProgress")}
                  </p>
                  <p className="font-numeric mt-1.5 text-sm text-foreground">
                    {t("venture.funded.of")
                      .replace("{funded}", compactUsd(deal.fundedAmount))
                      .replace("{goal}", compactUsd(deal.investmentNeeded))}
                  </p>
                  {deal.committedAmount > deal.fundedAmount && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                      {t("venture.committed.also").replace(
                        "{committed}",
                        compactUsd(deal.committedAmount)
                      )}
                    </p>
                  )}
                </div>
              </div>

              {deal.contactInfo && (
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-[10px] text-muted-foreground",
                      rtl ? "" : "uppercase tracking-[0.18em]"
                    )}
                  >
                    {t("deal.contact")}
                  </p>
                  <p className="mt-1.5 truncate text-sm text-foreground">{deal.contactInfo}</p>
                </div>
              )}
            </div>

            {/* ---- Closed round notice ---- */}
            {deal.roundClosedAtUtc && (
              <div className="mt-6 flex gap-3 rounded-xl border border-bronze/35 bg-bronze/[0.05] px-4 py-3">
                <Clock className="mt-0.5 size-3.5 shrink-0 text-bronze" strokeWidth={1.9} />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t("deal.roundClosed")}
                </p>
              </div>
            )}

            {/* ---- Actions ---- */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href={`/messages?to=${counterpartId}&project=${deal.projectId}`}
                data-cursor="hover"
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm outline-none",
                  "transition-colors duration-300 hover:border-primary/50 hover:text-primary",
                  "focus-visible:ring-3 focus-visible:ring-ring/25"
                )}
              >
                <MessageSquare className="size-4" strokeWidth={1.8} />
                {t("deal.openChat")}
                {deal.unreadMessages > 0 && (
                  <span className="font-numeric ms-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                    {deal.unreadMessages}
                  </span>
                )}
              </Link>

              <Link
                href={`/u/${counterpartId}`}
                data-cursor="hover"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm transition-colors hover:border-primary/50 hover:text-primary"
              >
                <Users className="size-4" strokeWidth={1.8} />
                {t("deal.viewProfile")}
              </Link>

              {/* Only the founder advances the relationship, and only forward. */}
              {isFounder && !terminal && nextStage && (
                <button
                  type="button"
                  data-cursor="hover"
                  disabled={setStage.isPending}
                  onClick={() => setStage.mutate(nextStage)}
                  className={cn(
                    "gold-cta inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground",
                    "transition-opacity duration-300 hover:opacity-90 disabled:opacity-50"
                  )}
                >
                  <CheckCircle2 className="size-4" strokeWidth={1.9} />
                  {t("deal.advanceTo").replace("{stage}", t(STAGE_LABEL_KEY[nextStage as PipelineStage] ?? "stage.new"))}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* ================= WHOSE MOVE ================= */}
      {deal.nextSteps.length > 0 && (
        <NextSteps steps={deal.nextSteps} />
      )}

      {/* ================= BODY ================= */}
      <div className="mt-14 grid gap-12 lg:grid-cols-[1.55fr_1fr] lg:gap-14">
        <div className="min-w-0 space-y-14">
          {/* Funding sits above the diligence work on purpose: once there is money
              on the table it is the most consequential thing on the page, and when
              there isn't, the panel is a quiet one-line prompt. */}
          {/* Terms come before the money on purpose: the ask is a call on the
              agreement, so the agreement is the thing to read first. */}
          <DealTerms deal={deal} />

          {deal.viewerRole !== "admin" && <DealFundingPanel deal={deal} />}

          <DealQuestions
            investmentId={investmentId}
            questions={deal.questions}
            canAsk={!terminal && deal.viewerRole !== "admin"}
          />

          <DealDocuments
            investmentId={investmentId}
            documents={deal.documents}
            requests={deal.documentRequests}
            canRequest={
              deal.viewerRole !== "admin" && deal.status === "Approved" && !terminal
            }
            viewerRole={deal.viewerRole}
          />

          {/* The conversation, in the room it belongs to. The masthead counted these
              messages and then sent you elsewhere to read them — which is why every
              clarification ended up in chat and the structured record stayed empty. */}
          {deal.viewerRole !== "admin" && <DealChat deal={deal} />}
        </div>

        {/* ---- Aside: the chronology + the private note ---- */}
        <aside className="min-w-0 space-y-10 lg:sticky lg:top-24 lg:self-start">
          <section>
            <h2
              className="text-base font-bold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {t("deal.history")}
            </h2>
            <div className="mt-5 max-h-[32rem] overflow-y-auto pe-1">
              <DealTimeline events={deal.timeline} />
            </div>
          </section>

          {/* How the time was spent, next to what happened. Only shown once the
              relationship has moved at least once — a brand-new request has no
              shape to compare. */}
          {deal.stageDurations.length > 1 && (
            <StageDurations durations={deal.stageDurations} />
          )}

          {deal.viewerRole !== "admin" && (
            <section>
              <div className="flex items-center gap-2.5">
                <NotebookPen className="size-4 text-primary" strokeWidth={1.8} />
                <h2
                  className="text-base font-bold"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {t("deal.note.title")}
                </h2>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{t("deal.note.private")}</p>
              <textarea
                value={note ?? deal.myNote ?? ""}
                onChange={(e) => setNote(e.target.value.slice(0, 2000))}
                onBlur={() => {
                  if (note !== null && note !== (deal.myNote ?? "")) saveNote.mutate(note);
                }}
                rows={6}
                placeholder={t("deal.note.placeholder")}
                aria-label={t("deal.note.title")}
                className={cn(
                  "mt-3 w-full resize-none rounded-xl border border-input bg-card/50 px-4 py-3 text-sm outline-none backdrop-blur-sm",
                  "transition-colors duration-300 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
                )}
              />
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

/**
 * Whether the relationship is moving.
 *
 * A third axis beside stage and money, and the only one nobody maintains — it is read
 * off silence, unanswered questions and unpaid asks. That is precisely why it can be
 * trusted: a health field somebody has to keep current is permanently green.
 *
 * The reasons are listed rather than summarised. "Stalled" tells you nothing you can
 * act on; "unanswered questions, silent 2 weeks" tells you what to do next.
 */
function HealthPill({ health }: { health: DealHealth }) {
  const { t } = useLocale();

  if (health.status === "Concluded" || health.status === "Healthy") return null;

  const stalled = health.status === "Stalled";

  return (
    <span
      title={health.reasons.map((r) => t(`deal.health.reason.${r}`)).join(" · ")}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px]",
        stalled
          ? "border-destructive/45 bg-destructive/[0.06] text-destructive"
          : "border-bronze/45 bg-bronze/[0.06] text-bronze"
      )}
    >
      <Activity className="size-3" strokeWidth={2} />
      {t(`deal.health.${health.status}`)}
      {health.daysSinceActivity > 0 && (
        <span className="font-numeric opacity-70">
          {t("deal.health.idle").replace("{n}", String(health.daysSinceActivity))}
        </span>
      )}
    </span>
  );
}

/** The relationship's current state, worn as a single mark. */
function StageBadge({ stage }: { stage: string }) {
  const { t } = useLocale();
  const tone =
    stage === "Declined"
      ? "border-destructive/40 bg-destructive/[0.06] text-destructive"
      : stage === "Closed"
        ? "border-border bg-secondary text-muted-foreground"
        : stage === "New" || stage === "Reviewing"
          ? "border-bronze/45 bg-bronze/[0.06] text-bronze"
          : "border-primary/50 bg-primary/[0.08] text-primary";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-xs",
        tone
      )}
    >
      {stage === "Declined" ? (
        <Ban className="size-3" strokeWidth={2.2} />
      ) : (
        <span className="size-1.5 rounded-full bg-current" />
      )}
      {t(STAGE_LABEL_KEY[stage as PipelineStage] ?? "stage.new")}
    </span>
  );
}

/**
 * Whose move it is.
 *
 * Derived server-side from real state, so it cannot drift from what is actually
 * outstanding — and deliberately phrased as obligations rather than suggestions,
 * because a relationship stalls when neither side knows who is holding it.
 */
function NextSteps({ steps }: { steps: DealNextStep[] }) {
  const { t } = useLocale();
  const reduce = useReducedMotion() ?? false;

  return (
    <motion.section
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.15, ease: EASE }}
      className="mt-8 overflow-hidden rounded-2xl border border-primary/25 bg-primary/[0.04]"
    >
      <div className="p-5 sm:p-6">
        <p className="text-[11px] text-primary">{t("deal.next.title")}</p>
        <ul className="mt-3 space-y-2">
          {steps.map((s) => (
            <li key={s} className="flex gap-2.5 text-sm text-foreground/90">
              <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary" />
              {t(`deal.next.${s}`)}
            </li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}

function DealSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-16 sm:px-10">
      <div className="skeleton-shimmer h-56 rounded-[1.5rem]" />
      <div className="mt-8 h-24 rounded-2xl bg-secondary/60" />
      <div className="mt-14 grid gap-12 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-4">
          <div className="h-32 rounded-2xl bg-secondary/60" />
          <div className="h-32 rounded-2xl bg-secondary/40" />
        </div>
        <div className="h-64 rounded-2xl bg-secondary/40" />
      </div>
    </div>
  );
}
