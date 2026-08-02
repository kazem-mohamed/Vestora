"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowRight, Check, RotateCcw } from "lucide-react";
import {
  EASE,
  FeeBreakdown,
  SandboxBadge,
  exactMoney,
  formatDateTime,
} from "@/components/funding/funding-primitives";
import { paymentsApi } from "@/lib/api/payments";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { PaymentTransaction } from "@/lib/types/api";

/**
 * Where the investor lands after the provider.
 *
 * The single most important thing this page does is refuse to believe the URL it
 * was opened with. A success query string means a browser navigated somewhere; it
 * is not evidence that money moved, and treating it as evidence is the classic way
 * payment integrations get faked. So the page arrives in a verifying state, asks
 * the server to ask the provider, and only then commits to an outcome.
 *
 * That honesty is also why the waiting state is designed rather than a spinner:
 * the wait is the system doing the one thing that makes the result trustworthy.
 */
export default function PaymentReturnPage() {
  return (
    <Suspense fallback={<Shell><Verifying /></Shell>}>
      <PaymentReturn />
    </Suspense>
  );
}

function PaymentReturn() {
  const params = useSearchParams();
  const qc = useQueryClient();
  const transactionId = Number(params.get("tx"));
  const [tx, setTx] = useState<PaymentTransaction | null>(null);
  const [settled, setSettled] = useState(false);
  const polls = useRef(0);

  const verify = useMutation({
    mutationFn: () => paymentsApi.verify(transactionId),
    onSuccess: (result) => {
      setTx(result);

      // "Processing" is a real provider state, not a loading state — some payment
      // methods clear asynchronously. Poll a bounded number of times rather than
      // pretending it resolved, then hand the investor an honest holding message.
      const pending = result.status === "Initiated" || result.status === "Processing";
      if (pending && polls.current < 5) {
        polls.current += 1;
        setTimeout(() => verify.mutate(), 1800);
        return;
      }

      setSettled(true);
      // Everything downstream of a settled payment is now stale.
      qc.invalidateQueries({ queryKey: ["deal"] });
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["investor-dashboard"] });
      qc.invalidateQueries({ queryKey: ["investor-payments"] });
      qc.invalidateQueries({ queryKey: ["my-support"] });
      qc.invalidateQueries({ queryKey: ["project"] });
    },
    onError: () => setSettled(true),
  });

  useEffect(() => {
    if (Number.isFinite(transactionId) && transactionId > 0) verify.mutate();
    // Intentionally once: re-verification is driven by the poll above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId]);

  if (!settled || !tx) {
    return (
      <Shell>
        <Verifying processing={tx?.status === "Processing"} />
      </Shell>
    );
  }

  if (tx.status === "Succeeded") return <Shell><Success tx={tx} /></Shell>;
  if (tx.status === "Failed") return <Shell><Failed tx={tx} /></Shell>;
  if (tx.status === "Initiated" || tx.status === "Processing")
    return <Shell><StillClearing tx={tx} /></Shell>;
  return <Shell><Cancelled tx={tx} /></Shell>;
}

/* ========================================================================== */

function Verifying({ processing }: { processing?: boolean }) {
  const { t } = useLocale();
  const reduce = useReducedMotion() ?? false;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md text-center"
    >
      {/* A ring that fills and never completes — the wait is a real handshake, and
          a bar that pretends to know how long it will take would be a small lie. */}
      <div className="relative mx-auto size-20">
        <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden>
          <circle cx="40" cy="40" r="32" fill="none" stroke="var(--secondary)" strokeWidth="5" />
          {!reduce && (
            <motion.circle
              cx="40"
              cy="40"
              r="32"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 32}
              animate={{
                strokeDashoffset: [2 * Math.PI * 32, 2 * Math.PI * 32 * 0.25, 2 * Math.PI * 32],
                rotate: [0, 360],
              }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: "40px 40px" }}
            />
          )}
        </svg>
      </div>

      <h1
        className="mt-7 text-xl font-bold"
        style={{ fontFamily: "var(--font-heading)" }}
        aria-live="polite"
      >
        {processing ? t("pay.return.processing") : t("pay.return.verifying")}
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {processing ? t("pay.return.processingBody") : t("pay.return.verifyingBody")}
      </p>
      <SandboxBadge variant="line" className="mt-6 justify-center" />
    </motion.div>
  );
}

/* ========================================================================== */

/**
 * The moment an investment becomes real.
 *
 * Deliberately not a green tick and a Back button. The investor has just completed
 * the thing the entire product exists for, so the page states what happened, what
 * it cost, what it is called, and where to go — with the amount arriving first and
 * the detail settling underneath it.
 */
function Success({ tx }: { tx: PaymentTransaction }) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE }}
      className="w-full max-w-lg"
    >
      <div
        className="relative overflow-hidden rounded-[1.5rem] border border-primary/40 bg-card/70 backdrop-blur-md"
        style={{
          boxShadow: "0 40px 100px -60px color-mix(in oklab, var(--primary) 90%, transparent)",
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(110% 80% at 50% 0%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 62%)",
          }}
        />

        <div className="relative p-7 sm:p-9">
          {/* The mark. Draws itself once — restraint instead of confetti. */}
          <motion.span
            initial={reduce ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            className="grid size-12 place-items-center rounded-full border border-primary/50 bg-primary/[0.12] text-primary"
          >
            <Check className="size-6" strokeWidth={2.2} />
          </motion.span>

          <p
            className={cn(
              "mt-6 text-[11px] text-primary",
              rtl ? "" : "uppercase tracking-[0.26em]"
            )}
          >
            {t("pay.success.eyebrow")}
          </p>

          <h1
            className={cn(
              "mt-3 text-2xl font-bold sm:text-3xl",
              rtl ? "leading-[1.35]" : "tracking-[-0.01em]"
            )}
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {t("pay.success.title").replace("{venture}", tx.projectName)}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t("pay.success.body")}
          </p>

          {/* The amount, arriving after the sentence rather than before it. */}
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
            className="mt-8 rounded-2xl border border-border/70 bg-background/40 p-6"
          >
            <p
              className={cn(
                "text-[10.5px] text-muted-foreground",
                rtl ? "" : "uppercase tracking-[0.18em]"
              )}
            >
              {t("pay.success.amount")}
            </p>
            <p className="font-numeric mt-2 text-4xl leading-none text-bronze">
              {exactMoney(tx.amount)}
            </p>

            <dl className="mt-6 space-y-2.5 border-t border-border/60 pt-5 text-[13px]">
              <Fact label={t("pay.success.venture")} value={tx.projectName} />
              <Fact label={t("pay.success.founder")} value={tx.founderName} />
              <Fact
                label={t("pay.success.date")}
                value={formatDateTime(tx.succeededAtUtc, locale)}
              />
              <Fact label={t("pay.success.reference")} value={tx.reference} mono />
            </dl>
          </motion.div>

          <SandboxBadge variant="panel" className="mt-5" />

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={`/invest/payments/${tx.id}`}
              data-cursor="hover"
              className="gold-cta group inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {t("pay.success.viewReceipt")}
              <ArrowRight
                className={cn(
                  "size-4 transition-transform duration-300 group-hover:translate-x-0.5",
                  rtl && "rotate-180 group-hover:-translate-x-0.5"
                )}
                strokeWidth={2}
              />
            </Link>
            <Link
              href={`/deals/${tx.investmentId}`}
              data-cursor="hover"
              className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm transition-colors hover:border-primary/50 hover:text-primary"
            >
              {t("pay.success.backToDeal")}
            </Link>
            <Link
              href="/invest/portfolio"
              data-cursor="hover"
              className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm transition-colors hover:border-primary/50 hover:text-primary"
            >
              {t("pay.success.viewPortfolio")}
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ========================================================================== */

/**
 * A failed payment is a financial event, not a toast.
 *
 * The investor needs four things and gets all four: that nothing was charged,
 * that the investment is not funded, what the provider actually said, and that
 * the ask is still open so they can try again.
 */
function Failed({ tx }: { tx: PaymentTransaction }) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE }}
      className="w-full max-w-lg"
    >
      <div className="relative overflow-hidden rounded-[1.5rem] border border-destructive/35 bg-card/65 backdrop-blur-md">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-destructive/60 to-transparent"
        />
        <div className="relative p-7 sm:p-9">
          <motion.span
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: -6 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, x: [0, -5, 5, -3, 0] }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid size-12 place-items-center rounded-full border border-destructive/45 bg-destructive/[0.08] text-destructive"
          >
            <AlertTriangle className="size-5" strokeWidth={2} />
          </motion.span>

          <p
            className={cn(
              "mt-6 text-[11px] text-destructive",
              rtl ? "" : "uppercase tracking-[0.26em]"
            )}
          >
            {t("pay.failed.eyebrow")}
          </p>

          <h1
            className="mt-3 text-2xl font-bold"
            style={{ fontFamily: "var(--font-heading)" }}
            aria-live="assertive"
          >
            {t("pay.failed.title")}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t("pay.failed.body").replace("{venture}", tx.projectName)}
          </p>

          {tx.failureMessage && (
            <div className="mt-6 rounded-xl border border-border/70 bg-background/40 p-4">
              <p
                className={cn(
                  "text-[10.5px] text-muted-foreground",
                  rtl ? "" : "uppercase tracking-[0.16em]"
                )}
              >
                {t("pay.failed.reason")}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-foreground/85">
                {tx.failureMessage}
              </p>
              {tx.failureCode && (
                <p className="font-numeric mt-2 text-[11px] text-muted-foreground/70">
                  {tx.failureCode}
                </p>
              )}
            </div>
          )}

          <p className="mt-5 text-[12px] text-muted-foreground">
            {t("pay.failed.attemptSaved").replace("{n}", String(tx.attemptNumber))}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={`/deals/${tx.investmentId}`}
              data-cursor="hover"
              className="gold-cta group inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <RotateCcw className="size-4" strokeWidth={2} />
              {t("pay.failed.retry")}
            </Link>
            <Link
              href="/invest/payments"
              data-cursor="hover"
              className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm transition-colors hover:border-primary/50 hover:text-primary"
            >
              {t("pay.receipt.back")}
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ========================================================================== */

function Cancelled({ tx }: { tx: PaymentTransaction }) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="w-full max-w-lg"
    >
      <div className="rounded-[1.5rem] border border-border bg-card/60 p-7 backdrop-blur-md sm:p-9">
        <p
          className={cn(
            "text-[11px] text-muted-foreground",
            rtl ? "" : "uppercase tracking-[0.26em]"
          )}
        >
          {t("pay.cancelled.eyebrow")}
        </p>
        <h1 className="mt-3 text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          {t("pay.cancelled.title")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t("pay.cancelled.body").replace("{venture}", tx.projectName)}
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href={`/deals/${tx.investmentId}`}
            data-cursor="hover"
            className="gold-cta inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t("pay.cancelled.resume")}
          </Link>
          <Link
            href="/invest/payments"
            data-cursor="hover"
            className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm transition-colors hover:border-primary/50 hover:text-primary"
          >
            {t("pay.receipt.back")}
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

/** The provider took the money but hasn't finalised it. Rare, and honestly stated. */
function StillClearing({ tx }: { tx: PaymentTransaction }) {
  const { t } = useLocale();
  return (
    <div className="w-full max-w-lg rounded-[1.5rem] border border-bronze/35 bg-card/60 p-7 backdrop-blur-md sm:p-9">
      <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
        {t("pay.return.processing")}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {t("pay.return.processingBody")}
      </p>
      <div className="mt-6 rounded-xl border border-border/70 bg-background/40 p-4">
        <FeeBreakdown
          gross={tx.amount}
          feeRateBps={tx.feeRateBps}
          fee={tx.feeAmount}
          net={tx.netToFounder}
          emphasise="gross"
        />
      </div>
      <p className="font-numeric mt-4 text-[11px] text-muted-foreground/75">{tx.reference}</p>
      <Link
        href={`/deals/${tx.investmentId}`}
        data-cursor="hover"
        className="mt-7 inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm transition-colors hover:border-primary/50 hover:text-primary"
      >
        {t("pay.success.backToDeal")}
      </Link>
    </div>
  );
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className={cn("min-w-0 truncate text-end text-foreground", mono && "font-numeric")}>
        {value}
      </dd>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="grid min-h-screen place-items-center px-6 py-16">{children}</main>;
}
