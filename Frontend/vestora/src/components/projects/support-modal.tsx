"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PillButton } from "@/components/ui/pill-button";
import { investorApi } from "@/lib/api/investor";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import type { Project } from "@/lib/types/api";

function usd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

type Method = "email" | "phone" | "whatsapp";

export function SupportModal({
  project,
  open,
  onOpenChange,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const remaining = Math.max(0, project.investmentNeeded - project.raisedAmount);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("email");
  const [contact, setContact] = useState("");

  // Quick-pick chips: round presets capped at the remaining need, plus "fund the rest".
  const chips = useMemo(() => {
    const presets = [10000, 50000, 100000].filter((v) => remaining <= 0 || v < remaining);
    const list = presets.map((v) => ({ value: v, label: usd(v) }));
    if (remaining > 0) list.push({ value: remaining, label: t("support.modal.rest") });
    return list;
  }, [remaining, t]);

  const numeric = Number(amount);
  const exceedsRemaining = Number.isFinite(numeric) && numeric > remaining;
  const validAmount = Number.isFinite(numeric) && numeric > 0 && !exceedsRemaining;
  const validContact = contact.trim().length > 0;

  const mutation = useMutation({
    mutationFn: () =>
      investorApi.support(project.id, {
        investorId: user!.id,
        projectId: project.id,
        amount: numeric,
        contactMethod: `${t(`support.modal.${method}`)}: ${contact.trim()}`,
      }),
    onSuccess: () => {
      toast.success(t("support.success"));
      qc.invalidateQueries({ queryKey: ["my-support", project.id] });
      qc.invalidateQueries({ queryKey: ["project", project.id] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      onOpenChange(false);
      setAmount("");
      setContact("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const methods: Method[] = ["email", "phone", "whatsapp"];

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("support.modal.title")}</DialogTitle>
          <DialogDescription>{project.name}</DialogDescription>
        </DialogHeader>

        {/* Amount */}
        <div className="space-y-3">
          <label htmlFor="support-amount" className="text-sm font-medium">
            {t("support.modal.amount")}
          </label>
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => {
              const active = numeric === c.value;
              return (
                <button
                  key={c.label}
                  type="button"
                  data-cursor="hover"
                  onClick={() => setAmount(String(c.value))}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          <input
            id="support-amount"
            type="number"
            min="0"
            max={remaining || undefined}
            step="any"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="25000"
            className="font-numeric h-11 w-full rounded-lg border border-input bg-card/60 px-3.5 text-sm outline-none backdrop-blur-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
          />
          {exceedsRemaining && (
            <p className="text-xs text-destructive">
              {t("support.modal.exceedsRemaining").replace("{amount}", usd(remaining))}
            </p>
          )}
        </div>

        {/* Contact */}
        <div className="mt-5 space-y-3">
          <p className="text-sm font-medium">{t("support.modal.contact")}</p>
          <div className="flex gap-2">
            {methods.map((m) => (
              <button
                key={m}
                type="button"
                data-cursor="hover"
                onClick={() => setMethod(m)}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  method === m
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {t(`support.modal.${m}`)}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={t("support.modal.contactPh")}
            className="h-11 w-full rounded-lg border border-input bg-card/60 px-3.5 text-sm outline-none backdrop-blur-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
            data-cursor="hover"
            className="rounded-full border border-border px-5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
          >
            {t("form.cancel")}
          </button>
          <PillButton
            onClick={() => {
              if (!validAmount || !validContact) {
                const amountError = exceedsRemaining
                  ? t("support.modal.exceedsRemaining").replace("{amount}", usd(remaining))
                  : t("valid.positive");
                toast.error(validAmount ? t("support.modal.contactRequired") : amountError);
                return;
              }
              mutation.mutate();
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? t("support.modal.submitting") : t("support.modal.submit")}
          </PillButton>
        </div>

        {/* The risk disclosure belongs here, not only in the footer.
            This is the one moment on Vestora where someone states a figure against a
            venture — expecting them to have found the policy pages beforehand is how
            disclosures end up unread. One line, in context, at the point of decision. */}
        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          {t("support.modal.riskNote")}{" "}
          <Link
            href="/legal/risk"
            target="_blank"
            data-cursor="hover"
            className="link-underline text-foreground transition-colors hover:text-primary"
          >
            {t("legal.risk.nav")}
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}
