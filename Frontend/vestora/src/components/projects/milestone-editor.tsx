"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PillButton } from "@/components/ui/pill-button";
import { storyApi } from "@/lib/api/story";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { Milestone, MilestoneStatus } from "@/lib/types/api";

const STATUSES: MilestoneStatus[] = ["Planned", "InProgress", "Done"];

const inputCls =
  "h-11 w-full rounded-lg border border-input bg-card/60 px-3.5 text-sm outline-none backdrop-blur-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25";

export function MilestoneEditor({
  projectId,
  milestone,
  nextOrder,
  open,
  onOpenChange,
}: {
  projectId: number;
  milestone?: Milestone;
  nextOrder: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLocale();
  const qc = useQueryClient();
  const editing = !!milestone;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<MilestoneStatus>("Planned");
  const [progress, setProgress] = useState(0);
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(milestone?.title ?? "");
      setDescription(milestone?.description ?? "");
      setStatus(milestone?.status ?? "Planned");
      setProgress(milestone?.status === "Done" ? 100 : milestone?.progress ?? 0);
      setDate(milestone?.date ? milestone.date.slice(0, 10) : "");
    }
  }, [open, milestone]);

  function pickStatus(s: MilestoneStatus) {
    setStatus(s);
    if (s === "Done") setProgress(100);
    else if (s === "Planned") setProgress(0);
  }

  async function submit() {
    if (!title.trim()) {
      toast.error(t("valid.min"));
      return;
    }
    const body = {
      title: title.trim(),
      description: description.trim() || null,
      status,
      progress: status === "Done" ? 100 : Math.max(0, Math.min(100, progress)),
      sortOrder: milestone?.sortOrder ?? nextOrder,
      date: date ? new Date(date).toISOString() : null,
    };
    try {
      setBusy(true);
      if (editing) {
        await storyApi.editMilestone(milestone!.id, body);
        toast.success(t("ms.saved"));
      } else {
        await storyApi.createMilestone(projectId, body);
        toast.success(t("ms.added"));
      }
      qc.invalidateQueries({ queryKey: ["milestones", projectId] });
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? t("ms.form.edit") : t("ms.form.new")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="ms-title" className="text-sm font-medium">
              {t("ms.form.title")}
            </label>
            <input
              id="ms-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("ms.form.titlePh")}
              className={inputCls}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="ms-desc" className="text-sm font-medium">
              {t("ms.form.desc")}
            </label>
            <textarea
              id="ms-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("ms.form.descPh")}
              className={inputCls.replace("h-11", "min-h-20 resize-y py-3")}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("ms.form.status")}</p>
            <div className="flex gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  data-cursor="hover"
                  onClick={() => pickStatus(s)}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                    status === s
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  {t(`ms.status.${s}`)}
                </button>
              ))}
            </div>
          </div>

          {status === "InProgress" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="ms-progress" className="text-sm font-medium">
                  {t("ms.form.progress")}
                </label>
                <span className="font-numeric text-sm text-bronze">{progress}%</span>
              </div>
              <input
                id="ms-progress"
                type="range"
                min={0}
                max={100}
                step={5}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full accent-[var(--primary)]"
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="ms-date" className="text-sm font-medium">
              {t("ms.form.date")}
            </label>
            <input
              id="ms-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="rounded-full border border-border px-5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
          >
            {t("form.cancel")}
          </button>
          <PillButton onClick={submit} disabled={busy}>
            {busy ? t("ms.form.saving") : t("ms.form.save")}
          </PillButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
