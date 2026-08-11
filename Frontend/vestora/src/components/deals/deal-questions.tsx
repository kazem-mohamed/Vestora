"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CornerDownRight, HelpCircle, Send, X } from "lucide-react";
import { toast } from "sonner";
import { dealsApi } from "@/lib/api/deals";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { DealQuestion } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The questions this relationship produced, and their answers.
 *
 * Not a comment thread and not chat. A question asked during an evaluation needs to
 * still be findable next week, attributed, and paired with the answer it received —
 * which is precisely what a scrolling conversation destroys. Either side may ask;
 * whoever did not ask is the one who can answer.
 */
export function DealQuestions({
  investmentId,
  questions,
  canAsk,
}: {
  investmentId: number;
  questions: DealQuestion[];
  canAsk: boolean;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;
  const qc = useQueryClient();

  const [draft, setDraft] = useState("");
  const [answering, setAnswering] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [followingUp, setFollowingUp] = useState<number | null>(null);
  const [followUp, setFollowUp] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["deal", investmentId] });

  const ask = useMutation({
    mutationFn: () => dealsApi.ask(investmentId, draft.trim()),
    onSuccess: () => {
      toast.success(t("deal.q.sent"));
      setDraft("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Pushing back on an answer. Its own mutation rather than a flag on `ask`, because
  // the two have different empty states and different failure messages — "that answer
  // doesn't cover it" is not the same act as opening a new line of enquiry.
  const pushBack = useMutation({
    mutationFn: (parentId: number) => dealsApi.ask(investmentId, followUp.trim(), parentId),
    onSuccess: () => {
      toast.success(t("deal.q.followUpSent"));
      setFollowingUp(null);
      setFollowUp("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reply = useMutation({
    mutationFn: (id: number) => dealsApi.answer(id, answer.trim()),
    onSuccess: () => {
      toast.success(t("deal.q.answered"));
      setAnswering(null);
      setAnswer("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const withdraw = useMutation({
    mutationFn: (id: number) => dealsApi.withdrawQuestion(id),
    onSuccess: () => {
      toast.success(t("deal.q.withdrawn"));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const open = questions.filter((q) => !q.isWithdrawn);

  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    day: "numeric",
    month: "short",
  });

  return (
    <section>
      <div className="flex items-center gap-2.5">
        <HelpCircle className="size-4 text-primary" strokeWidth={1.8} />
        <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          {t("deal.q.title")}
        </h2>
        {open.length > 0 && (
          <span className="font-numeric text-xs text-muted-foreground">{open.length}</span>
        )}
      </div>

      {/* ---- Ask ---- */}
      {canAsk && (
        <div className="mt-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 1000))}
            rows={2}
            placeholder={t("deal.q.placeholder")}
            aria-label={t("deal.q.placeholder")}
            className={cn(
              "w-full resize-none rounded-xl border border-input bg-card/60 px-4 py-3 text-sm outline-none backdrop-blur-sm",
              "transition-colors duration-300 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
            )}
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="font-numeric text-[11px] text-muted-foreground/70">
              {draft.length}/1000
            </p>
            <button
              type="button"
              data-cursor="hover"
              disabled={draft.trim().length < 5 || ask.isPending}
              onClick={() => ask.mutate()}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-5 text-xs outline-none",
                "transition-colors duration-300 hover:border-primary/50 hover:text-primary",
                "focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-40"
              )}
            >
              <Send className="size-3.5" strokeWidth={1.9} />
              {ask.isPending ? t("deal.q.sending") : t("deal.q.ask")}
            </button>
          </div>
        </div>
      )}

      {/* ---- The record ---- */}
      {open.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">{t("deal.q.empty")}</p>
      ) : (
        <ul className="mt-6 space-y-5">
          <AnimatePresence initial={false}>
            {open.map((q, i) => (
              <motion.li
                key={q.id}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5, delay: Math.min(i, 5) * 0.04, ease: EASE }}
                className="rounded-2xl border border-border/70 bg-card/40 p-5"
              >
                {/* The question */}
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="text-xs font-medium text-foreground">{q.askedByName}</span>
                  <time
                    dateTime={q.createdAtUtc}
                    className="font-numeric text-[11px] text-muted-foreground"
                  >
                    {fmt.format(new Date(q.createdAtUtc))}
                  </time>
                  {!q.answer && (
                    <span className="rounded-full border border-bronze/40 bg-bronze/[0.06] px-2 py-0.5 text-[10px] text-bronze">
                      {t("deal.q.awaiting")}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground/90">{q.question}</p>

                {/* The answer, indented under it so the pairing is structural */}
                {q.answer ? (
                  <div
                    className={cn(
                      "mt-4 flex gap-3 border-s-2 border-primary/30 ps-4",
                      rtl && "flex-row-reverse text-right"
                    )}
                  >
                    <CornerDownRight
                      className="mt-0.5 size-3.5 shrink-0 text-primary/70 rtl:-scale-x-100"
                      strokeWidth={1.9}
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">{q.answeredByName}</p>
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground/85">
                        {q.answer}
                      </p>

                      {/* "Over what period?" — the sentence that used to send both
                          sides back to chat, which is the surface this replaces. */}
                      {q.canFollowUp && followingUp !== q.id && (
                        <button
                          type="button"
                          data-cursor="hover"
                          onClick={() => {
                            setFollowingUp(q.id);
                            setFollowUp("");
                          }}
                          className="link-underline mt-2.5 text-[11.5px] text-primary"
                        >
                          {t("deal.q.followUp")}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {q.canAnswer && answering !== q.id && (
                      <button
                        type="button"
                        data-cursor="hover"
                        onClick={() => {
                          setAnswering(q.id);
                          setAnswer("");
                        }}
                        className="link-underline text-xs text-primary"
                      >
                        {t("deal.q.answer")}
                      </button>
                    )}
                    {q.canWithdraw && (
                      <button
                        type="button"
                        data-cursor="hover"
                        disabled={withdraw.isPending}
                        onClick={() => withdraw.mutate(q.id)}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                      >
                        <X className="size-3" strokeWidth={2.2} />
                        {t("deal.q.withdraw")}
                      </button>
                    )}
                  </div>
                )}

                {/* Answer composer */}
                <AnimatePresence>
                  {answering === q.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <textarea
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value.slice(0, 4000))}
                        rows={3}
                        autoFocus
                        placeholder={t("deal.q.answerPlaceholder")}
                        aria-label={t("deal.q.answerPlaceholder")}
                        className={cn(
                          "mt-3 w-full resize-none rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none",
                          "transition-colors duration-300 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
                        )}
                      />
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          type="button"
                          data-cursor="hover"
                          disabled={answer.trim().length < 2 || reply.isPending}
                          onClick={() => reply.mutate(q.id)}
                          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                        >
                          {reply.isPending ? t("deal.q.sending") : t("deal.q.submitAnswer")}
                        </button>
                        <button
                          type="button"
                          data-cursor="hover"
                          onClick={() => setAnswering(null)}
                          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {t("form.cancel")}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ---- The thread ----
                    Follow-ups sit inside the question they clarify, one level deep.
                    Flat, they read as an unrelated question asked minutes later, which
                    is exactly how the answers used to get lost. */}
                {q.followUps.length > 0 && (
                  <ul className="mt-4 space-y-3 border-s border-border/60 ps-4">
                    {q.followUps.map((f) => (
                      <li key={f.id}>
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="text-[11px] font-medium text-foreground">
                            {f.askedByName}
                          </span>
                          <time
                            dateTime={f.createdAtUtc}
                            className="font-numeric text-[10.5px] text-muted-foreground"
                          >
                            {fmt.format(new Date(f.createdAtUtc))}
                          </time>
                          {!f.answer && (
                            <span className="rounded-full border border-bronze/40 bg-bronze/[0.06] px-1.5 py-0.5 text-[10px] text-bronze">
                              {t("deal.q.awaiting")}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[13px] leading-relaxed text-foreground/85">
                          {f.question}
                        </p>

                        {f.answer ? (
                          <p className="mt-2 border-s-2 border-primary/30 ps-3 text-[13px] leading-relaxed text-foreground/80">
                            {f.answer}
                          </p>
                        ) : f.canAnswer && answering !== f.id ? (
                          <button
                            type="button"
                            data-cursor="hover"
                            onClick={() => {
                              setAnswering(f.id);
                              setAnswer("");
                            }}
                            className="link-underline mt-1.5 text-[11.5px] text-primary"
                          >
                            {t("deal.q.answer")}
                          </button>
                        ) : null}

                        {answering === f.id && (
                          <div className="mt-2">
                            <textarea
                              value={answer}
                              onChange={(e) => setAnswer(e.target.value.slice(0, 4000))}
                              rows={2}
                              autoFocus
                              placeholder={t("deal.q.answerPlaceholder")}
                              aria-label={t("deal.q.answerPlaceholder")}
                              className="w-full resize-none rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-[13px] outline-none transition-colors focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
                            />
                            <div className="mt-2 flex items-center gap-3">
                              <button
                                type="button"
                                disabled={answer.trim().length < 2 || reply.isPending}
                                onClick={() => reply.mutate(f.id)}
                                className="inline-flex min-h-9 items-center rounded-full bg-primary px-4 text-[11.5px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                              >
                                {reply.isPending ? t("deal.q.sending") : t("deal.q.submitAnswer")}
                              </button>
                              <button
                                type="button"
                                onClick={() => setAnswering(null)}
                                className="text-[11.5px] text-muted-foreground transition-colors hover:text-foreground"
                              >
                                {t("form.cancel")}
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Follow-up composer */}
                <AnimatePresence>
                  {followingUp === q.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <textarea
                        value={followUp}
                        onChange={(e) => setFollowUp(e.target.value.slice(0, 1000))}
                        rows={2}
                        autoFocus
                        placeholder={t("deal.q.followUpPlaceholder")}
                        aria-label={t("deal.q.followUpPlaceholder")}
                        className="mt-3 w-full resize-none rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none transition-colors focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
                      />
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          type="button"
                          data-cursor="hover"
                          disabled={followUp.trim().length < 5 || pushBack.isPending}
                          onClick={() => pushBack.mutate(q.id)}
                          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                        >
                          <CornerDownRight className="size-3.5 rtl:-scale-x-100" strokeWidth={1.9} />
                          {pushBack.isPending ? t("deal.q.sending") : t("deal.q.followUpSend")}
                        </button>
                        <button
                          type="button"
                          data-cursor="hover"
                          onClick={() => setFollowingUp(null)}
                          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {t("form.cancel")}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
