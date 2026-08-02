"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Archive, CheckCircle2, CircleSlash, Flag, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { projectsApi } from "@/lib/api/projects";
import { compactUsd } from "@/lib/format/money";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { RoundOutcome } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The three honest ways a round ends.
 *
 * The founder states which one; nothing is inferred from the numbers. A round that
 * reached 60% might be a deliberate close with the lead backer secured, or an
 * abandonment — and only the person who ran it knows which. Guessing would put a claim
 * in their mouth on a page investors read.
 */
const OUTCOMES: {
  value: RoundOutcome;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: "good" | "neutral" | "quiet";
}[] = [
  { value: "Completed", icon: CheckCircle2, tone: "good" },
  { value: "PartiallyRaised", icon: Flag, tone: "neutral" },
  { value: "Withdrawn", icon: CircleSlash, tone: "quiet" },
];

/**
 * Closing a fundraising round.
 *
 * Deliberately not a dropdown option. Closing concludes every live relationship on the
 * venture, notifies each backer, and takes the listing out of discovery — a one-way,
 * consequential act that was previously reachable by mis-clicking a select. The copy
 * states exactly what happens and, just as importantly, what does not: nothing is
 * deleted, the commitments still count, and the data room survives.
 */
export function CloseRoundDialog({
  projectId,
  projectName,
  committedAmount,
  goal,
  activeRelationships,
  pendingRequests,
  open,
  onOpenChange,
}: {
  projectId: number;
  projectName: string;
  committedAmount: number;
  goal: number;
  /** How many relationships will be concluded — stated before, not after. */
  activeRelationships?: number;
  /** Requests never reviewed. Closing declines these, so the founder must know. */
  pendingRequests?: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;
  const qc = useQueryClient();

  const [outcome, setOutcome] = useState<RoundOutcome | null>(null);
  const [note, setNote] = useState("");

  const pct = goal > 0 ? Math.min(100, Math.round((committedAmount / goal) * 100)) : 0;

  const close = useMutation({
    mutationFn: () => projectsApi.closeRound(projectId, outcome!, note.trim() || undefined),
    onSuccess: (r) => {
      toast.success(
        r.relationshipsConcluded > 0
          ? t("round.closed.withRelationships").replace(
              "{n}",
              String(r.relationshipsConcluded)
            )
          : t("round.closed.done")
      );
      // Everything that reads lifecycle, commitment totals or relationship state has
      // just changed. `my-projects` is the venture-management list this dialog is
      // usually opened from — omitting it left the "Close round" button on screen for a
      // round that was already closed.
      qc.invalidateQueries({ queryKey: ["my-projects"] });
      qc.invalidateQueries({ queryKey: ["founder-dashboard"] });
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["action-center"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !close.isPending && onOpenChange(v)}>
      {/* Keyed per venture so a second close never opens with the previous choice. */}
      <DialogContent key={projectId} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("round.close.title").replace("{name}", projectName)}</DialogTitle>
          <DialogDescription>{t("round.close.body")}</DialogDescription>
        </DialogHeader>

        {/* Where the round actually stands, so the choice below is made against the
            real number rather than memory. */}
        <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-xl border border-border/70 bg-background/40 px-4 py-3">
          <span className="font-numeric text-lg leading-none text-bronze">
            {compactUsd(committedAmount)}
          </span>
          <span className="font-numeric text-xs text-muted-foreground">
            / {compactUsd(goal)} · {pct}%
          </span>
          <span
            className={cn(
              "text-[10px] text-muted-foreground",
              rtl ? "" : "uppercase tracking-[0.18em]"
            )}
          >
            {t("round.close.committed")}
          </span>
        </div>

        {/* ---- Outcome ---- */}
        <fieldset className="mt-5">
          <legend className="mb-2.5 text-xs text-muted-foreground">
            {t("round.close.outcome")}
          </legend>

          <div className="space-y-2">
            {OUTCOMES.map((o) => {
              const active = outcome === o.value;
              const Icon = o.icon;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  data-cursor="hover"
                  onClick={() => setOutcome(o.value)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-4 text-start outline-none",
                    "transition-all duration-300 focus-visible:ring-3 focus-visible:ring-ring/25",
                    active
                      ? o.tone === "good"
                        ? "border-primary/60 bg-primary/[0.07]"
                        : o.tone === "neutral"
                          ? "border-bronze/55 bg-bronze/[0.06]"
                          : "border-border bg-secondary/60"
                      : "border-border/70 hover:border-primary/40 hover:bg-primary/[0.03]"
                  )}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 size-4 shrink-0 transition-colors",
                      active
                        ? o.tone === "good"
                          ? "text-primary"
                          : o.tone === "neutral"
                            ? "text-bronze"
                            : "text-muted-foreground"
                        : "text-muted-foreground"
                    )}
                    strokeWidth={1.9}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">
                      {t(`round.outcome.${o.value}`)}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      {t(`round.outcome.${o.value}.hint`)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* ---- A word to the backers ---- */}
        <div className="mt-5">
          <label htmlFor="round-note" className="mb-1.5 block text-xs text-muted-foreground">
            {t("round.close.note")}
          </label>
          <textarea
            id="round-note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 600))}
            rows={3}
            placeholder={t("round.close.notePlaceholder")}
            className={cn(
              "w-full resize-none rounded-xl border border-input bg-card/60 px-4 py-3 text-sm outline-none backdrop-blur-sm",
              "transition-colors duration-300 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
            )}
          />
          <p className="font-numeric mt-1.5 text-end text-[11px] text-muted-foreground/70">
            {note.length}/600
          </p>
        </div>

        {/* ---- What happens, and what does not. Both matter: the fear here is that
             closing deletes something, and it does not. ---- */}
        <div className="mt-5 space-y-3 rounded-xl border border-dashed border-border bg-background/40 px-4 py-3.5">
          <div className="flex gap-2.5">
            <Lock className="mt-0.5 size-3.5 shrink-0 text-bronze" strokeWidth={1.9} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {activeRelationships && activeRelationships > 0
                ? t("round.close.effect.relationships").replace(
                    "{n}",
                    String(activeRelationships)
                  )
                : t("round.close.effect.noRelationships")}
            </p>
          </div>

          {/* Requests never reviewed are declined by the close, not left hanging.
              Saying so here is the difference between an informed decision and a
              founder discovering later that they silently turned someone down. */}
          {pendingRequests != null && pendingRequests > 0 && (
            <div className="flex gap-2.5">
              <CircleSlash
                className="mt-0.5 size-3.5 shrink-0 text-bronze"
                strokeWidth={1.9}
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("round.close.effect.pending").replace("{n}", String(pendingRequests))}
              </p>
            </div>
          )}
          <div className="flex gap-2.5">
            <Archive className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.9} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("round.close.effect.kept")}
            </p>
          </div>
        </div>

        <AnimatePresence>
          {close.isError && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden text-xs text-destructive"
            >
              {close.error.message}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className={cn("mt-5 flex items-center gap-3", rtl && "flex-row-reverse")}
        >
          <button
            type="button"
            data-cursor="hover"
            disabled={outcome === null || close.isPending}
            onClick={() => close.mutate()}
            className={cn(
              "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-bronze px-5 text-sm font-semibold text-white",
              "transition-opacity duration-300 hover:opacity-90 disabled:opacity-40"
            )}
          >
            <Flag className="size-4" strokeWidth={1.9} />
            {close.isPending ? t("round.close.working") : t("round.close.confirm")}
          </button>
          <button
            type="button"
            data-cursor="hover"
            disabled={close.isPending}
            onClick={() => onOpenChange(false)}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            {t("form.cancel")}
          </button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
