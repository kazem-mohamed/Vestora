"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Info, Send } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { capitalApi } from "@/lib/api/capital";
import { messagesApi } from "@/lib/api/messages";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { InvestorCard } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;
const MAX = 1200;

/**
 * A founder reaching out to an investor.
 *
 * The venture has to be chosen, not implied. A founder running three rounds sending
 * an unattributed "hello" is the worst version of this feature — the investor cannot
 * tell what they are being asked about, and the message lands in a thread with no
 * context. Picking the venture is what makes the conversation legible to both sides
 * and what lets the message carry a venture id at all.
 */
export function ApproachDialog({
  investor,
  open,
  onOpenChange,
}: {
  investor: InvestorCard | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useLocale();
  const reduce = useReducedMotion() ?? false;

  // `picked` is only the founder's explicit choice. Which venture is actually
  // selected is derived below, so a single eligible round is pre-chosen without an
  // effect copying that into state — and closing the dialog resets nothing here,
  // because the content is keyed per investor and remounts clean.
  const [picked, setPicked] = useState<number | null>(null);
  const [body, setBody] = useState("");

  const ventures = useQuery({
    queryKey: ["capital-my-ventures"],
    queryFn: () => capitalApi.myVentures(),
    enabled: open,
  });

  // Only approved rounds may be pitched: sending an investor to a listing they
  // cannot open would waste the one approach the founder gets.
  const eligible = useMemo(
    () => (ventures.data ?? []).filter((v) => v.moderationStatus === "Approved"),
    [ventures.data]
  );

  const ventureId = picked ?? (eligible.length === 1 ? eligible[0].id : null);

  const send = useMutation({
    mutationFn: () =>
      messagesApi.send(investor!.id, body.trim(), ventureId ?? undefined),
    onSuccess: () => {
      toast.success(t("cap.approach.sent"));
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ready = Boolean(investor) && ventureId != null && body.trim().length >= 20;

  return (
    <Dialog open={open} onOpenChange={(v) => !send.isPending && onOpenChange(v)}>
      <DialogContent key={investor?.id ?? "none"} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("cap.approach.title").replace("{name}", investor?.userName ?? "")}
          </DialogTitle>
          <DialogDescription>{t("cap.approach.body")}</DialogDescription>
        </DialogHeader>

        {/* The mandate, repeated here on purpose: it is what the founder should be
            writing against, and making them remember it from the previous screen is
            how generic messages get sent. */}
        {investor?.investmentThesis && (
          <div className="mt-1 rounded-xl border border-border/70 bg-background/40 px-4 py-3">
            <p className="text-[11px] text-primary">{t("cap.approach.theirMandate")}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {investor.investmentThesis}
            </p>
          </div>
        )}

        <div className="mt-4 space-y-4">
          {/* ---- Which venture ---- */}
          <div>
            <p className="mb-2 text-xs text-muted-foreground">{t("cap.approach.which")}</p>

            {ventures.isLoading ? (
              <div className="h-11 animate-pulse rounded-xl bg-secondary" />
            ) : eligible.length === 0 ? (
              <div className="flex gap-2.5 rounded-xl border border-dashed border-border px-4 py-3">
                <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.8} />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t("cap.approach.noVentures")}
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {eligible.map((v) => {
                  const active = ventureId === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      data-cursor="hover"
                      onClick={() => setPicked(v.id)}
                      aria-pressed={active}
                      className={cn(
                        "min-h-10 rounded-full border px-4 text-sm outline-none transition-all duration-300",
                        "focus-visible:ring-3 focus-visible:ring-ring/25",
                        active
                          ? "border-primary/60 bg-primary/[0.08] text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      {v.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ---- The message ---- */}
          <div>
            <label
              htmlFor="approach-body"
              className="mb-1.5 block text-xs text-muted-foreground"
            >
              {t("cap.approach.message")}
            </label>
            <textarea
              id="approach-body"
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, MAX))}
              rows={5}
              placeholder={t("cap.approach.placeholder")}
              className={cn(
                "w-full resize-none rounded-xl border border-input bg-card/60 px-4 py-3 text-sm outline-none backdrop-blur-sm",
                "transition-colors duration-300 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
              )}
            />
            <div className="mt-1.5 flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                {body.trim().length < 20
                  ? t("cap.approach.tooShort")
                  : t("cap.approach.goodLength")}
              </p>
              <p className="font-numeric text-[11px] text-muted-foreground/70">
                {body.length}/{MAX}
              </p>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {send.isError && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden text-xs text-destructive"
            >
              {send.error.message}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="mt-5 flex items-center gap-3"
        >
          <button
            type="button"
            data-cursor="hover"
            disabled={!ready || send.isPending}
            onClick={() => send.mutate()}
            className={cn(
              "gold-cta inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground",
              "transition-opacity duration-300 hover:opacity-90 disabled:opacity-40"
            )}
          >
            <Send className="size-4" strokeWidth={1.9} />
            {send.isPending ? t("cap.approach.sending") : t("cap.approach.send")}
          </button>
          <button
            type="button"
            data-cursor="hover"
            disabled={send.isPending}
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
