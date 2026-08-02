"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Info } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EASE, FeeBreakdown, SandboxBadge, money } from "@/components/funding/funding-primitives";
import { paymentsApi } from "@/lib/api/payments";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { DealRoom } from "@/lib/types/api";

/**
 * The founder asking for the agreed money.
 *
 * Deliberately not a button that fires a request. By the time a deal reaches this
 * point the number has usually moved from whatever the investor opened with, and
 * the founder is about to put a figure in front of someone — so the dialog states
 * the amount, what Vestora takes, what they will actually receive, and what
 * happens to the investor next, before there is anything to click.
 *
 * "Request funds" in the interface; a capital call in the domain. The plainer
 * phrase is the one a founder types into a message, so it is the one shown.
 */
export function RequestFundsDialog({
  deal,
  open,
  onOpenChange,
}: {
  deal: DealRoom;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const qc = useQueryClient();

  // Seeded with what the investor originally asked for — the common case is that
  // it did not change, and the uncommon case is one field away.
  const [raw, setRaw] = useState(() => String(Math.round(deal.amount)));
  const [note, setNote] = useState("");

  const amount = Number(raw.replace(/[^\d.]/g, "")) || 0;
  const max = deal.maxRequestableAmount;
  const rate = deal.feeRateBps;

  const { fee, net } = useMemo(() => {
    const f = Math.round((amount * rate) / 100) / 100;
    return { fee: f, net: amount - f };
  }, [amount, rate]);

  const tooHigh = amount > max;
  const invalid = amount <= 0 || tooHigh;

  const submit = useMutation({
    mutationFn: () =>
      paymentsApi.createFundingRequest(deal.investmentId, {
        amount,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(t("fund.request.sent"));
      qc.invalidateQueries({ queryKey: ["deal", deal.investmentId] });
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["founder-dashboard"] });
      onOpenChange(false);
      setNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const days = 14;

  return (
    <Dialog open={open} onOpenChange={(v) => !submit.isPending && onOpenChange(v)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>{t("fund.request.title")}</DialogTitle>
            <SandboxBadge />
          </div>
          <DialogDescription>
            {t("fund.request.sub").replace("{investor}", deal.investorName)}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-6">
          {/* ---- The amount ---- */}
          <div>
            <label
              htmlFor="funding-amount"
              className={cn(
                "block text-[11px] text-muted-foreground",
                rtl ? "" : "uppercase tracking-[0.16em]"
              )}
            >
              {t("fund.request.amount")}
            </label>

            <div className="relative mt-2.5">
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-y-0 grid place-items-center font-numeric text-xl text-muted-foreground/70",
                  rtl ? "end-4" : "start-4"
                )}
              >
                $
              </span>
              <input
                id="funding-amount"
                inputMode="decimal"
                value={raw}
                onChange={(e) => setRaw(e.target.value.replace(/[^\d.]/g, "").slice(0, 12))}
                aria-invalid={invalid}
                aria-describedby="funding-amount-hint"
                className={cn(
                  "font-numeric w-full rounded-xl border bg-card/60 py-3.5 text-xl outline-none backdrop-blur-sm transition-colors duration-300",
                  rtl ? "pe-10 ps-4 text-end" : "ps-10 pe-4",
                  tooHigh
                    ? "border-destructive/60 focus-visible:ring-3 focus-visible:ring-destructive/25"
                    : "border-input focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
                )}
              />
            </div>

            <p id="funding-amount-hint" className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
              {tooHigh
                ? t("fund.request.amountTooHigh").replace("{amount}", money(max))
                : t("fund.request.amountHint").replace("{amount}", money(deal.amount))}
            </p>
            {!tooHigh && (
              <p className="mt-1 text-[11px] text-muted-foreground/75">
                {t("fund.request.max").replace("{amount}", money(max))}
              </p>
            )}
          </div>

          {/* ---- What the founder receives. Shown before sending, not after. ---- */}
          <motion.div
            key={amount > 0 ? "live" : "empty"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="rounded-xl border border-border/70 bg-secondary/35 p-4"
          >
            <p
              className={cn(
                "text-[10.5px] text-muted-foreground",
                rtl ? "" : "uppercase tracking-[0.16em]"
              )}
            >
              {t("fund.request.breakdown")}
            </p>
            <FeeBreakdown
              className="mt-3"
              gross={amount}
              feeRateBps={rate}
              fee={fee}
              net={net}
              emphasise="net"
            />
          </motion.div>

          {/* ---- Note ---- */}
          <div>
            <label
              htmlFor="funding-note"
              className={cn(
                "block text-[11px] text-muted-foreground",
                rtl ? "" : "uppercase tracking-[0.16em]"
              )}
            >
              {t("fund.request.note")}
            </label>
            <textarea
              id="funding-note"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              rows={3}
              placeholder={t("fund.request.notePlaceholder")}
              className="mt-2.5 w-full resize-none rounded-xl border border-input bg-card/60 px-4 py-3 text-sm outline-none backdrop-blur-sm transition-colors duration-300 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
            />
          </div>

          {/* ---- What happens next. The part that makes this not a mystery button. ---- */}
          <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-4">
            <p className="flex items-center gap-2 text-[11px] text-primary">
              <Info className="size-3.5" strokeWidth={1.9} />
              {t("fund.request.willHappen")}
            </p>
            <ol className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-muted-foreground">
              {[
                t("fund.request.step1").replace("{investor}", deal.investorName),
                t("fund.request.step2"),
                t("fund.request.step3"),
              ].map((line, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="font-numeric mt-px shrink-0 text-[11px] text-primary/80">
                    {i + 1}
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 border-t border-primary/15 pt-3 text-[11px] text-muted-foreground/85">
              {t("fund.request.expiry").replace("{days}", String(days))}
            </p>
          </div>

          <SandboxBadge variant="line" />
        </div>

        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={submit.isPending}
            data-cursor="hover"
            className="min-h-11 rounded-full border border-border px-5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            {t("form.cancel")}
          </button>
          <button
            type="button"
            disabled={invalid || submit.isPending}
            onClick={() => submit.mutate()}
            data-cursor="hover"
            className={cn(
              "gold-cta group inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground",
              "transition-opacity duration-300 hover:opacity-90 disabled:opacity-40"
            )}
          >
            {submit.isPending ? t("fund.request.sending") : t("fund.request.submit")}
            {!submit.isPending && (
              <ArrowRight
                className={cn(
                  "size-4 transition-transform duration-300 group-hover:translate-x-0.5",
                  rtl && "rotate-180 group-hover:-translate-x-0.5"
                )}
                strokeWidth={2}
              />
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
