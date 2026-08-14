"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/lib/i18n/locale";

/**
 * Mirrors AdminReasonDto on the API. Kept as a named constant rather than a bare 4 so
 * the two sides can be compared at a glance when either moves.
 */
export const MIN_REASON_LENGTH = 4;

/**
 * The justification an admin action carries with it.
 *
 * `ConfirmAction` is the right control for deleting your own comment — a small,
 * personal act where a modal is friction theatre. Suspending someone's account is the
 * other kind: it happens to a person who will ask why, and the only place that answer
 * can survive is the audit row written beside it. So this stops, states what is about
 * to happen, and refuses to proceed on an empty box — the same standard the payment
 * reconciliation queue already applies to its resolution notes.
 *
 * The reason is not a formality for the reader either: it is shown back to the founder
 * on a rejected listing, and it is what a second administrator sees months later when
 * they are asked to explain a decision they did not make.
 */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  /** What this action actually does, stated before it is taken. */
  body: string;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: (reason: string) => void;
}) {
  const { t } = useLocale();
  const [reason, setReason] = useState("");

  // A reason typed for one venture must not arrive pre-filled on the next one.
  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  const trimmed = reason.trim();
  const valid = trimmed.length >= MIN_REASON_LENGTH;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-destructive" strokeWidth={1.8} />
            {title}
          </DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label htmlFor="admin-reason" className="block text-xs font-medium text-muted-foreground">
            {t("admin.reason.label")}
          </label>
          <Textarea
            id="admin-reason"
            rows={3}
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder={t("admin.reason.placeholder")}
          />
          <p className="text-[11px] text-muted-foreground">{t("admin.reason.hint")}</p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            data-cursor="hover"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("form.cancel")}
          </button>
          <button
            type="button"
            data-cursor="hover"
            disabled={!valid || pending}
            onClick={() => onConfirm(trimmed)}
            className="rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
