"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { reportsApi } from "@/lib/api/engagement";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const REASONS = ["Spam", "Scam", "Copyright", "Offensive", "Duplicate", "Other"];

export function ReportButton({ projectId, ownerId }: { projectId: number; ownerId: number }) {
  const { t } = useLocale();
  const me = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("Spam");
  const [details, setDetails] = useState("");

  const submit = useMutation({
    mutationFn: () => reportsApi.submit(projectId, reason, details.trim() || undefined),
    onSuccess: (r) => {
      toast.success(r.message || t("report.done"));
      setOpen(false);
      setDetails("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!me || me.id === ownerId) return null;

  return (
    <>
      <button
        type="button"
        data-cursor="hover"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-destructive"
      >
        <Flag className="size-3.5" strokeWidth={1.75} />
        {t("report.button")}
      </button>

      <Dialog open={open} onOpenChange={(o) => !submit.isPending && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("report.title")}</DialogTitle>
            <DialogDescription>{t("report.sub")}</DialogDescription>
          </DialogHeader>

          <div className="mt-2 flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                data-cursor="hover"
                onClick={() => setReason(r)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  reason === r
                    ? "border-primary/50 bg-primary/[0.08] text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {t(`report.reason.${r.toLowerCase()}`)}
              </button>
            ))}
          </div>

          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            maxLength={600}
            placeholder={t("report.detailsPh")}
            className="mt-3 w-full resize-none rounded-xl border border-input bg-card/60 px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
          />

          <div className="mt-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("form.cancel")}
            </button>
            <button
              type="button"
              disabled={submit.isPending}
              onClick={() => submit.mutate()}
              className="gold-cta rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
            >
              {submit.isPending ? t("report.sending") : t("report.submit")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
