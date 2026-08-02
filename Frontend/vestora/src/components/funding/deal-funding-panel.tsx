"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Banknote, CheckCircle2, Clock3, Undo2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EASE,
  FeeBreakdown,
  PaymentStatusPill,
  SandboxBadge,
  exactMoney,
  formatDate,
  money,
  useRelativeTime,
} from "@/components/funding/funding-primitives";
import { RequestFundsDialog } from "@/components/funding/request-funds-dialog";
import { paymentsApi } from "@/lib/api/payments";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { DealRoom } from "@/lib/types/api";

/**
 * The money, inside the relationship rather than beside it.
 *
 * A deal room is where terms get agreed, so it is where the founder asks for the
 * agreed number and where the investor answers. Putting payment on its own screen
 * would have created a second place to understand one relationship — and the room
 * already carries the questions, the documents and the chronology that produced
 * the number.
 *
 * The panel has exactly one job at any moment: show whose move it is. It renders
 * a different face for each state rather than one face with disabled controls.
 */
export function DealFundingPanel({ deal }: { deal: DealRoom }) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;
  const router = useRouter();
  const qc = useQueryClient();
  const relative = useRelativeTime();

  const [askOpen, setAskOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const isFounder = deal.viewerRole === "founder";
  const request = deal.fundingRequest;
  const attempts = request?.attempts ?? [];
  const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;

  const checkout = useMutation({
    mutationFn: () => paymentsApi.createCheckout(request!.id),
    onSuccess: (session) => {
      if (session.resumed) toast.info(t("fund.due.resumed"));
      // Leaving the app is the point: the provider owns the card form, and Vestora
      // never sees it.
      window.location.href = session.checkoutUrl;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const withdraw = useMutation({
    mutationFn: () => paymentsApi.cancelFundingRequest(request!.id),
    onSuccess: () => {
      toast.success(t("fund.open.withdrawn"));
      setWithdrawOpen(false);
      qc.invalidateQueries({ queryKey: ["deal", deal.investmentId] });
      qc.invalidateQueries({ queryKey: ["founder-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const funded = deal.fundingState === "Funded";
  const refunded = deal.fundingState === "Refunded";
  const due = request?.status === "Open";

  return (
    <motion.section
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
      className={cn(
        "relative overflow-hidden rounded-2xl border backdrop-blur-sm transition-colors duration-500",
        funded
          ? "border-primary/45 bg-primary/[0.045]"
          : due
            ? "border-primary/35 bg-card/60"
            : "border-border/70 bg-card/45"
      )}
      style={
        funded && !reduce
          ? { boxShadow: "0 28px 70px -50px color-mix(in oklab, var(--primary) 80%, transparent)" }
          : undefined
      }
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
          funded ? "via-primary/70" : due ? "via-primary/50" : "via-border"
        )}
      />

      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Banknote className="size-4 text-primary" strokeWidth={1.8} />
            <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-heading)" }}>
              {t("deal.funding.heading")}
            </h2>
          </div>
          <SandboxBadge />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {/* ---------- Funded: the outcome ---------- */}
          {funded && (
            <motion.div
              key="funded"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="mt-5"
            >
              <div className="flex items-baseline gap-3">
                <CheckCircle2 className="size-5 shrink-0 translate-y-1 text-primary" strokeWidth={1.9} />
                <div className="min-w-0">
                  <p className="font-numeric text-3xl leading-none text-bronze">
                    {money(deal.fundedThisDeal ?? 0)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("deal.funding.fundedOn").replace(
                      "{date}",
                      formatDate(deal.fundedAtUtc, locale)
                    )}
                  </p>
                </div>
              </div>

              {isFounder && lastAttempt && (
                <div className="mt-5 rounded-xl border border-border/70 bg-secondary/30 p-4">
                  <FeeBreakdown
                    gross={lastAttempt.amount}
                    feeRateBps={lastAttempt.feeRateBps}
                    fee={lastAttempt.feeAmount}
                    net={lastAttempt.netToFounder}
                  />
                </div>
              )}

              {lastAttempt && (
                <ReceiptLink transactionId={lastAttempt.id} reference={lastAttempt.reference} />
              )}
            </motion.div>
          )}

          {/* ---------- Payment due ---------- */}
          {!funded && due && request && (
            <motion.div
              key="due"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="mt-5"
            >
              <p className="font-numeric text-3xl leading-none text-bronze">
                {money(request.amount)}
              </p>

              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {isFounder
                  ? t("fund.open.sub")
                      .replace("{investor}", deal.investorName)
                      .replace("{amount}", money(request.amount))
                  : t("fund.due.sub")
                      .replace("{founder}", deal.founderName)
                      .replace("{amount}", money(request.amount))
                      .replace("{venture}", deal.projectName)}
              </p>

              {request.note && (
                <p className="mt-3 border-s-2 border-primary/40 ps-3 text-[13px] italic leading-relaxed text-muted-foreground">
                  {request.note}
                </p>
              )}

              <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted-foreground/85">
                <Clock3 className="size-3" strokeWidth={1.9} />
                {isFounder
                  ? t("fund.open.expires").replace("{when}", relative(request.expiresAtUtc))
                  : t("fund.due.expires").replace("{when}", relative(request.expiresAtUtc))}
              </p>

              {/* The founder's view: proceeds and where the investor has got to. */}
              {isFounder ? (
                <>
                  <div className="mt-5 rounded-xl border border-border/70 bg-secondary/30 p-4">
                    <FeeBreakdown
                      gross={request.amount}
                      feeRateBps={request.feeRateBps}
                      fee={request.estimatedFee}
                      net={request.estimatedNetProceeds}
                    />
                  </div>

                  <p className="mt-4 text-xs text-muted-foreground">
                    {attempts.length === 0
                      ? t("fund.open.noAttempts")
                      : lastAttempt?.status === "Failed"
                        ? t("fund.open.lastFailed")
                        : t("fund.open.attempts").replace("{count}", String(attempts.length))}
                  </p>

                  <button
                    type="button"
                    onClick={() => setWithdrawOpen(true)}
                    data-cursor="hover"
                    className="link-underline mt-4 text-xs text-muted-foreground transition-colors hover:text-destructive"
                  >
                    {t("fund.open.withdraw")}
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-4 text-[11.5px] leading-relaxed text-muted-foreground/85">
                    {t("fund.due.feeNote")}
                  </p>

                  <button
                    type="button"
                    disabled={checkout.isPending}
                    onClick={() => checkout.mutate()}
                    data-cursor="hover"
                    className={cn(
                      "gold-cta group mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground",
                      "transition-opacity duration-300 hover:opacity-90 disabled:opacity-50"
                    )}
                  >
                    {checkout.isPending ? (
                      <>
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="size-3.5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                        />
                        {t("fund.due.opening")}
                      </>
                    ) : (
                      <>
                        {lastAttempt?.status === "Failed" ? t("fund.due.retry") : t("fund.due.cta")}
                        <ArrowRight
                          className={cn(
                            "size-4 transition-transform duration-300 group-hover:translate-x-0.5",
                            rtl && "rotate-180 group-hover:-translate-x-0.5"
                          )}
                          strokeWidth={2}
                        />
                      </>
                    )}
                  </button>

                  <p className="mt-2.5 text-center text-[11px] text-muted-foreground/75">
                    {t("fund.due.leaving")}
                  </p>
                </>
              )}
            </motion.div>
          )}

          {/* ---------- Refunded ---------- */}
          {refunded && !funded && (
            <motion.div
              key="refunded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="mt-5 flex gap-3 rounded-xl border border-bronze/35 bg-bronze/[0.05] p-4"
            >
              <Undo2 className="mt-0.5 size-4 shrink-0 text-bronze" strokeWidth={1.9} />
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {t("fund.state.Refunded")}
              </p>
            </motion.div>
          )}

          {/* ---------- Nothing asked for yet ---------- */}
          {!funded && !due && !refunded && (
            <motion.div
              key="idle"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="mt-5"
            >
              <p className="text-sm text-foreground/90">{t("deal.funding.notYet")}</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                {deal.roundClosedAtUtc
                  ? t("deal.funding.roundClosed")
                  : isFounder
                    ? deal.status !== "Approved"
                      ? t("deal.funding.needsApproval")
                      : t("deal.funding.notYetFounder")
                    : t("deal.funding.notYetInvestor")}
              </p>

              {deal.canRequestFunds && (
                <button
                  type="button"
                  onClick={() => setAskOpen(true)}
                  data-cursor="hover"
                  className={cn(
                    "gold-cta group mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground",
                    "transition-opacity duration-300 hover:opacity-90"
                  )}
                >
                  {t("fund.request.cta")}
                  <ArrowRight
                    className={cn(
                      "size-4 transition-transform duration-300 group-hover:translate-x-0.5",
                      rtl && "rotate-180 group-hover:-translate-x-0.5"
                    )}
                    strokeWidth={2}
                  />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- Attempt history ----------
            Shown only when there is something a single line cannot say: more than
            one attempt, or one that did not succeed. A clean first-time payment
            does not need a table underneath it. */}
        {attempts.length > 0 &&
          (attempts.length > 1 || attempts[0].status !== "Succeeded") && (
            <div className="mt-6 border-t border-border/60 pt-5">
              <p
                className={cn(
                  "text-[10.5px] text-muted-foreground",
                  rtl ? "" : "uppercase tracking-[0.16em]"
                )}
              >
                {t("deal.funding.history")}
              </p>
              <ul className="mt-3 space-y-2.5">
                {attempts.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                    <span className="font-numeric text-muted-foreground/70">
                      {t("pay.history.attempt").replace("{n}", String(a.attemptNumber))}
                    </span>
                    <PaymentStatusPill status={a.status} />
                    <span className="font-numeric text-muted-foreground">
                      {exactMoney(a.amount)}
                    </span>
                    {a.status === "Failed" && a.failureMessage && (
                      <span className="w-full text-[11px] text-destructive/85">
                        {a.failureMessage}
                      </span>
                    )}
                    {a.status === "Succeeded" && (
                      <ReceiptLink transactionId={a.id} reference={a.reference} inline />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
      </div>

      {/* ---- Founder's ask ---- */}
      {deal.canRequestFunds && (
        <RequestFundsDialog deal={deal} open={askOpen} onOpenChange={setAskOpen} />
      )}

      {/* ---- Withdrawing an ask is destructive to the investor's action, so it asks ---- */}
      <Dialog open={withdrawOpen} onOpenChange={(v) => !withdraw.isPending && setWithdrawOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("fund.open.withdrawTitle")}</DialogTitle>
            <DialogDescription>
              {t("fund.open.withdrawBody").replace("{investor}", deal.investorName)}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setWithdrawOpen(false)}
              disabled={withdraw.isPending}
              data-cursor="hover"
              className="min-h-11 rounded-full border border-border px-5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("form.cancel")}
            </button>
            <button
              type="button"
              disabled={withdraw.isPending}
              onClick={() => withdraw.mutate()}
              data-cursor="hover"
              className="min-h-11 rounded-full bg-destructive px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {t("fund.open.withdrawConfirm")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.section>
  );

  function ReceiptLink({
    transactionId,
    reference,
    inline,
  }: {
    transactionId: number;
    reference: string;
    inline?: boolean;
  }) {
    return (
      <button
        type="button"
        onClick={() => router.push(`/invest/payments/${transactionId}`)}
        data-cursor="hover"
        className={cn(
          "link-underline text-[11px] text-muted-foreground transition-colors hover:text-primary",
          inline ? "" : "mt-4 block"
        )}
      >
        <span className="font-numeric">{reference}</span>
        {" · "}
        {t("pay.success.viewReceipt")}
      </button>
    );
  }
}

/** A compact "you owe money here" marker for lists. */
export function PaymentDueChip({ amount }: { amount: number }) {
  const { t } = useLocale();
  const reduce = useReducedMotion() ?? false;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/45 bg-primary/[0.08] px-2.5 py-0.5 text-[11px] text-primary">
      {reduce ? (
        <span className="size-1.5 rounded-full bg-primary" />
      ) : (
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
          className="size-1.5 rounded-full bg-primary"
        />
      )}
      {t("fund.state.PaymentDue")}
      <span className="font-numeric">{money(amount)}</span>
    </span>
  );
}
