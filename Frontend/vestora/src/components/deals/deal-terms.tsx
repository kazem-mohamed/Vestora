"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, FileSignature, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { exactMoney, money } from "@/components/funding/funding-primitives";
import { dealsApi } from "@/lib/api/deals";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { DealRoom, TermSheet } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The terms, in writing, with both signatures on them.
 *
 * The pipeline's "Committed" stage was documented as "both sides agreed terms
 * off-platform" — which meant the most consequential moment in the product happened
 * somewhere the product could not see, and every number after it, the funding request
 * included, rested on an agreement with no text.
 *
 * This panel is that text. It is careful not to overclaim: Vestora holds no signatures
 * and enforces nothing, so the language is "accepted", never "signed" or "executed".
 * What it does provide is a written statement each side accepted explicitly, which
 * cannot be edited without both accepting again — and which the funding request is
 * then measured against.
 */
export function DealTerms({ deal }: { deal: DealRoom }) {
  const { t, locale } = useLocale();
  const reduce = useReducedMotion() ?? false;
  const qc = useQueryClient();

  const [drafting, setDrafting] = useState(false);
  const [decliningId, setDecliningId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const [amount, setAmount] = useState("");
  const [equity, setEquity] = useState("");
  const [valuation, setValuation] = useState("");
  const [useOfFunds, setUseOfFunds] = useState("");
  const [otherTerms, setOtherTerms] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["deal", deal.investmentId] });
    qc.invalidateQueries({ queryKey: ["deals"] });
  };

  const propose = useMutation({
    mutationFn: () =>
      dealsApi.proposeTerms(deal.investmentId, {
        amount: Number(amount),
        equityPct: equity ? Number(equity) : null,
        valuation: valuation ? Number(valuation) : null,
        useOfFunds: useOfFunds.trim() || null,
        otherTerms: otherTerms.trim() || null,
      }),
    onSuccess: () => {
      toast.success(t("deal.terms.proposed"));
      setDrafting(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const accept = useMutation({
    mutationFn: (id: number) => dealsApi.acceptTerms(id),
    onSuccess: () => {
      toast.success(t("deal.terms.accepted"));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const decline = useMutation({
    mutationFn: (id: number) => dealsApi.declineTerms(id, reason.trim()),
    onSuccess: () => {
      toast.success(t("deal.terms.declinedToast"));
      setDecliningId(null);
      setReason("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const live = deal.termSheets.find((s) => s.status === "Proposed");
  const agreed = deal.agreedTerms;
  const history = deal.termSheets.filter((s) => s.status === "Superseded" || s.status === "Declined");

  const canDraft =
    deal.viewerRole !== "admin" &&
    deal.status === "Approved" &&
    deal.stage !== "Closed" &&
    deal.stage !== "Declined";

  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <motion.section
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: EASE }}
      className={cn(
        "overflow-hidden rounded-2xl border backdrop-blur-sm",
        agreed ? "border-primary/40 bg-primary/[0.035]" : "border-border/70 bg-card/45"
      )}
    >
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FileSignature className="size-4 text-primary" strokeWidth={1.8} />
            <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-heading)" }}>
              {t("deal.terms.title")}
            </h2>
          </div>

          {canDraft && !drafting && (
            <button
              type="button"
              data-cursor="hover"
              onClick={() => {
                setDrafting(true);
                setAmount(String(live?.amount ?? agreed?.amount ?? deal.amount));
                setEquity(live?.equityPct != null ? String(live.equityPct) : "");
                setValuation(live?.valuation != null ? String(live.valuation) : "");
                setUseOfFunds(live?.useOfFunds ?? "");
                setOtherTerms(live?.otherTerms ?? "");
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-xs transition-colors hover:border-primary/50 hover:text-primary"
            >
              <Pencil className="size-3.5" strokeWidth={1.9} />
              {live || agreed ? t("deal.terms.revise") : t("deal.terms.draft")}
            </button>
          )}
        </div>

        {/* Vestora holds no signatures. Saying so once, here, is cheaper than every
            other line having to hedge. */}
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {t("deal.terms.disclaimer")}
        </p>

        {/* ---- Draft ---- */}
        <AnimatePresence>
          {drafting && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="mt-4 grid gap-3 rounded-xl border border-border/70 bg-background/40 p-4 sm:grid-cols-2">
                <Field label={t("deal.terms.amount")} required>
                  <input
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label={t("deal.terms.equity")}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={equity}
                    onChange={(e) => setEquity(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label={t("deal.terms.valuation")}>
                  <input
                    type="number"
                    min={0}
                    value={valuation}
                    onChange={(e) => setValuation(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label={t("deal.terms.useOfFunds")}>
                    <textarea
                      rows={2}
                      value={useOfFunds}
                      onChange={(e) => setUseOfFunds(e.target.value.slice(0, 1000))}
                      className={cn(inputClass, "h-auto resize-none py-2.5")}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label={t("deal.terms.other")}>
                    <textarea
                      rows={3}
                      value={otherTerms}
                      onChange={(e) => setOtherTerms(e.target.value.slice(0, 2000))}
                      placeholder={t("deal.terms.otherPlaceholder")}
                      className={cn(inputClass, "h-auto resize-none py-2.5")}
                    />
                  </Field>
                </div>

                <div className="flex items-center gap-3 sm:col-span-2">
                  <button
                    type="button"
                    data-cursor="hover"
                    disabled={!(Number(amount) > 0) || propose.isPending}
                    onClick={() => propose.mutate()}
                    className="inline-flex min-h-10 items-center rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    {propose.isPending ? t("deal.q.sending") : t("deal.terms.send")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrafting(false)}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t("form.cancel")}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- The agreement, or the proposal on the table ---- */}
        {agreed ? (
          <Sheet sheet={agreed} deal={deal} tone="agreed" formatDate={fmt.format} />
        ) : live ? (
          <Sheet
            sheet={live}
            deal={deal}
            tone="live"
            formatDate={fmt.format}
            onAccept={() => accept.mutate(live.id)}
            onDecline={() => {
              setDecliningId(live.id);
              setReason("");
            }}
            busy={accept.isPending || decline.isPending}
          />
        ) : (
          !drafting && (
            <p className="mt-4 text-sm text-muted-foreground">
              {canDraft ? t("deal.terms.none") : t("deal.terms.noneLocked")}
            </p>
          )
        )}

        {/* Declining takes a reason. A silent no ends the conversation without
            telling anyone why, which is the failure this whole panel exists to fix. */}
        <AnimatePresence>
          {decliningId != null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="mt-4 rounded-xl border border-destructive/35 bg-destructive/[0.04] p-4">
                <label htmlFor="terms-decline" className="text-[11px] text-muted-foreground">
                  {t("deal.terms.declineLabel")}
                </label>
                <textarea
                  id="terms-decline"
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, 500))}
                  placeholder={t("deal.terms.declinePlaceholder")}
                  className={cn(inputClass, "mt-2 h-auto resize-none py-2.5")}
                />
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    disabled={reason.trim().length < 3 || decline.isPending}
                    onClick={() => decline.mutate(decliningId)}
                    className="inline-flex min-h-10 items-center rounded-full border border-destructive/45 px-5 text-xs text-destructive transition-colors hover:bg-destructive/[0.06] disabled:opacity-40"
                  >
                    {t("deal.terms.declineConfirm")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecliningId(null)}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t("form.cancel")}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- Earlier versions ----
            Renegotiation supersedes rather than edits, so the sequence of what was
            proposed and by whom survives. */}
        {history.length > 0 && (
          <details className="mt-5">
            <summary className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground">
              {t("deal.terms.history").replace("{n}", String(history.length))}
            </summary>
            <ul className="mt-3 space-y-2">
              {history.map((s) => (
                <li key={s.id} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                  <span className="font-numeric text-muted-foreground/70">v{s.version}</span>
                  <span className="font-numeric text-foreground/80">{exactMoney(s.amount)}</span>
                  <span
                    className={cn(
                      s.status === "Declined" ? "text-destructive/80" : "text-muted-foreground"
                    )}
                  >
                    {t(`deal.terms.status.${s.status}`)}
                  </span>
                  {s.declinedReason && (
                    <span className="w-full text-muted-foreground/85">{s.declinedReason}</span>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </motion.section>
  );
}

/* ========================================================================== */

const inputClass =
  "h-11 w-full rounded-xl border border-input bg-background/60 px-4 text-sm outline-none transition-colors focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-muted-foreground">
        {label}
        {required && <span className="ms-0.5 text-primary">*</span>}
      </span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

function Sheet({
  sheet,
  deal,
  tone,
  formatDate,
  onAccept,
  onDecline,
  busy,
}: {
  sheet: TermSheet;
  deal: DealRoom;
  tone: "agreed" | "live";
  formatDate: (d: Date) => string;
  onAccept?: () => void;
  onDecline?: () => void;
  busy?: boolean;
}) {
  const { t } = useLocale();

  return (
    <div
      className={cn(
        "mt-4 rounded-xl border p-4",
        tone === "agreed" ? "border-primary/40 bg-background/40" : "border-bronze/40 bg-bronze/[0.04]"
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="font-numeric text-2xl leading-none text-bronze">{money(sheet.amount)}</p>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            v{sheet.version} ·{" "}
            {tone === "agreed" && sheet.agreedAtUtc
              ? t("deal.terms.agreedOn").replace("{date}", formatDate(new Date(sheet.agreedAtUtc)))
              : t("deal.terms.onTable")}
          </p>
        </div>

        {/* Both acceptances, stated separately. Whose is missing is the actionable half,
            and one combined "agreed" flag would hide exactly that. */}
        <div className="flex flex-col gap-1 text-[11px]">
          <Signature ok={sheet.acceptedByMe} label={t("deal.terms.you")} />
          <Signature
            ok={sheet.acceptedByThem}
            label={deal.viewerRole === "founder" ? deal.investorName : deal.founderName}
          />
        </div>
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-border/60 pt-3.5 text-[13px] sm:grid-cols-2">
        {sheet.equityPct != null && (
          <Row label={t("deal.terms.equity")} value={`${sheet.equityPct}%`} />
        )}
        {sheet.valuation != null && (
          <Row label={t("deal.terms.valuation")} value={money(sheet.valuation)} />
        )}
        {sheet.useOfFunds && (
          <div className="sm:col-span-2">
            <Row label={t("deal.terms.useOfFunds")} value={sheet.useOfFunds} stacked />
          </div>
        )}
        {sheet.otherTerms && (
          <div className="sm:col-span-2">
            <Row label={t("deal.terms.other")} value={sheet.otherTerms} stacked />
          </div>
        )}
      </dl>

      {sheet.canAccept && (
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            data-cursor="hover"
            disabled={busy}
            onClick={onAccept}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Check className="size-3.5" strokeWidth={2.4} />
            {t("deal.terms.accept")}
          </button>
          <button
            type="button"
            data-cursor="hover"
            disabled={busy}
            onClick={onDecline}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-5 text-xs text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive disabled:opacity-50"
          >
            <X className="size-3.5" strokeWidth={2.2} />
            {t("deal.terms.decline")}
          </button>
        </div>
      )}

      {sheet.status === "Proposed" && sheet.acceptedByMe && !sheet.acceptedByThem && (
        <p className="mt-3 text-[12px] text-muted-foreground">{t("deal.terms.waitingOnThem")}</p>
      )}
    </div>
  );
}

function Signature({ ok, label }: { ok: boolean; label: string }) {
  const { t } = useLocale();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        ok ? "text-primary" : "text-muted-foreground/70"
      )}
    >
      {ok ? <Check className="size-3" strokeWidth={2.6} /> : <span className="size-3 rounded-full border border-current" />}
      {label}
      <span className="text-muted-foreground/60">
        {ok ? t("deal.terms.sig.accepted") : t("deal.terms.sig.pending")}
      </span>
    </span>
  );
}

function Row({ label, value, stacked }: { label: string; value: string; stacked?: boolean }) {
  return (
    <div className={cn(stacked ? "" : "flex items-baseline justify-between gap-3")}>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className={cn("text-foreground/90", stacked && "mt-1 whitespace-pre-line leading-relaxed")}>
        {value}
      </dd>
    </div>
  );
}
