"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { ArrowLeft, ArrowRight, Printer, Undo2 } from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";
import {
  EASE,
  FeeBreakdown,
  PaymentStatusPill,
  SandboxBadge,
  exactMoney,
  formatDateTime,
} from "@/components/funding/funding-primitives";
import { paymentsApi } from "@/lib/api/payments";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

/**
 * The record of a completed investment.
 *
 * Built as a document rather than a detail card: an investor who has just moved
 * capital wants something with a reference number, both parties named, and the
 * arithmetic shown — the shape of a statement, not a settings panel. The plate
 * carries a light tilt on pointer so it reads as a physical artifact, and drops it
 * entirely for print and for reduced motion.
 *
 * The one thing it will not do is overstate itself. A simulated transaction is
 * labelled as one, twice, and the page says plainly that it is not a certificate.
 */
export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const transactionId = Number(id);
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const Back = rtl ? ArrowRight : ArrowLeft;
  const reduce = useReducedMotion() ?? false;

  const { data: tx, isLoading, isError, refetch } = useQuery({
    queryKey: ["payment-transaction", transactionId],
    queryFn: () => paymentsApi.transaction(transactionId),
    enabled: Number.isFinite(transactionId),
  });

  // Depth on the plate only, and only for a mouse.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 70, damping: 26 });
  const sy = useSpring(py, { stiffness: 70, damping: 26 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-2.5, 2.5]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [1.8, -1.8]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton-shimmer h-6 w-32 rounded" />
        <div className="skeleton-shimmer h-[32rem] rounded-[1.5rem]" />
      </div>
    );
  }

  if (isError || !tx) return <ErrorState onRetry={() => refetch()} />;

  const refunded = tx.status === "Refunded";

  return (
    <div className="space-y-6">
      <Link
        href="/invest/payments"
        data-cursor="hover"
        className={cn(
          "link-underline inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground print:hidden",
          rtl ? "" : "uppercase tracking-[0.2em]"
        )}
      >
        <Back className="size-3.5" />
        {t("pay.receipt.back")}
      </Link>

      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
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
        style={{ perspective: 1600 }}
      >
        <motion.article
          style={reduce ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
          className="relative overflow-hidden rounded-[1.5rem] border border-border bg-card/70 backdrop-blur-md print:border-black/20 print:bg-white print:shadow-none"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent print:hidden"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 print:hidden"
            style={{
              background:
                "radial-gradient(100% 70% at 50% 0%, color-mix(in oklab, var(--primary) 7%, transparent), transparent 60%)",
            }}
          />

          <div className="relative p-7 sm:p-10" style={{ transform: reduce ? undefined : "translateZ(20px)" }}>
            {/* ---- Masthead ---- */}
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-6">
              <div>
                <p
                  className={cn(
                    "text-[11px] text-primary",
                    rtl ? "" : "uppercase tracking-[0.28em]"
                  )}
                >
                  {t("pay.receipt.eyebrow")}
                </p>
                <h1
                  className="mt-2.5 text-2xl font-bold sm:text-3xl"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {t("pay.receipt.title")}
                </h1>
                <p className="font-numeric mt-2 text-sm text-muted-foreground">{tx.reference}</p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <PaymentStatusPill status={tx.status} />
                <SandboxBadge />
              </div>
            </header>

            {refunded && (
              <div className="mt-6 flex gap-3 rounded-xl border border-bronze/35 bg-bronze/[0.05] px-4 py-3">
                <Undo2 className="mt-0.5 size-4 shrink-0 text-bronze" strokeWidth={1.9} />
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  {t("pay.receipt.refundedNotice").replace(
                    "{date}",
                    formatDateTime(tx.refundedAtUtc, locale)
                  )}
                </p>
              </div>
            )}

            {/* ---- The amount ---- */}
            <div className="mt-8">
              <p
                className={cn(
                  "text-[10.5px] text-muted-foreground",
                  rtl ? "" : "uppercase tracking-[0.18em]"
                )}
              >
                {t("fund.word.gross")}
              </p>
              <p
                className={cn(
                  "font-numeric mt-2 text-5xl leading-none",
                  refunded ? "text-muted-foreground line-through" : "text-bronze"
                )}
              >
                {exactMoney(tx.amount)}
              </p>
            </div>

            {/* ---- Parties ---- */}
            <section className="mt-9">
              <SectionLabel>{t("pay.receipt.parties")}</SectionLabel>
              <dl className="mt-4 grid gap-x-10 gap-y-3 sm:grid-cols-2">
                <Fact label={t("pay.col.investor")} value={tx.investorName} />
                <Fact
                  label={t("pay.col.founder")}
                  value={tx.founderName}
                  href={`/u/${tx.founderId}`}
                />
                <Fact
                  label={t("pay.col.venture")}
                  value={tx.projectName}
                  href={`/projects/${tx.projectId}`}
                />
                <Fact label={t("pay.receipt.provider")} value={tx.provider} />
              </dl>
            </section>

            {/* ---- Breakdown ---- */}
            <section className="mt-9">
              <SectionLabel>{t("pay.receipt.breakdown")}</SectionLabel>
              <div className="mt-4 rounded-xl border border-border/70 bg-background/40 p-5 print:bg-transparent">
                <FeeBreakdown
                  gross={tx.amount}
                  feeRateBps={tx.feeRateBps}
                  fee={tx.feeAmount}
                  net={tx.netToFounder}
                />
              </div>
            </section>

            {/* ---- Details ---- */}
            <section className="mt-9">
              <SectionLabel>{t("pay.receipt.details")}</SectionLabel>
              <dl className="mt-4 grid gap-x-10 gap-y-3 sm:grid-cols-2">
                <Fact
                  label={t("pay.receipt.created")}
                  value={formatDateTime(tx.createdAtUtc, locale)}
                />
                {tx.succeededAtUtc && (
                  <Fact
                    label={t("pay.receipt.settled")}
                    value={formatDateTime(tx.succeededAtUtc, locale)}
                  />
                )}
                {tx.failedAtUtc && (
                  <Fact
                    label={t("pay.receipt.failed")}
                    value={formatDateTime(tx.failedAtUtc, locale)}
                  />
                )}
                {tx.refundedAtUtc && (
                  <Fact
                    label={t("pay.receipt.refunded")}
                    value={formatDateTime(tx.refundedAtUtc, locale)}
                  />
                )}
                {tx.fundingRequestReference && (
                  <Fact
                    label={t("pay.receipt.fundingRef")}
                    value={tx.fundingRequestReference}
                    mono
                  />
                )}
                {tx.providerPaymentId && (
                  <Fact
                    label={t("pay.receipt.providerRef")}
                    value={tx.providerPaymentId}
                    mono
                  />
                )}
                <Fact
                  label={t("pay.history.attempt").replace("{n}", "")}
                  value={String(tx.attemptNumber)}
                  mono
                />
              </dl>
            </section>

            {/* ---- The disclosure. Twice, because once is easy to miss. ---- */}
            <footer className="mt-10 border-t border-border/60 pt-6">
              <SandboxBadge variant="panel" />
              <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground/80">
                {t("pay.receipt.notCertificate")}
              </p>
            </footer>

            <div className="mt-8 flex flex-wrap gap-3 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                data-cursor="hover"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm transition-colors hover:border-primary/50 hover:text-primary"
              >
                <Printer className="size-4" strokeWidth={1.8} />
                {t("pay.receipt.print")}
              </button>
              <Link
                href={`/deals/${tx.investmentId}`}
                data-cursor="hover"
                className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm transition-colors hover:border-primary/50 hover:text-primary"
              >
                {t("pay.success.backToDeal")}
              </Link>
            </div>
          </div>
        </motion.article>
      </motion.div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();
  return (
    <h2
      className={cn(
        "text-[10.5px] text-primary",
        locale === "ar" ? "" : "uppercase tracking-[0.2em]"
      )}
    >
      {children}
    </h2>
  );
}

function Fact({
  label,
  value,
  href,
  mono,
}: {
  label: string;
  value: string;
  href?: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className={cn("mt-1 truncate text-sm text-foreground", mono && "font-numeric text-[13px]")}>
        {href ? (
          <Link
            href={href}
            data-cursor="hover"
            className="transition-colors hover:text-primary print:no-underline"
          >
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
