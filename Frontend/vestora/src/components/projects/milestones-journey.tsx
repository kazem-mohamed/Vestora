"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PillButton } from "@/components/ui/pill-button";
import { MilestoneEditor } from "@/components/projects/milestone-editor";
import { storyApi } from "@/lib/api/story";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { Milestone } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

export function MilestonesJourney({
  projectId,
  isOwner,
}: {
  projectId: number;
  isOwner: boolean;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["milestones", projectId],
    queryFn: () => storyApi.milestones(projectId),
  });

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Milestone | undefined>();
  const [toDelete, setToDelete] = useState<Milestone | null>(null);

  const del = useMutation({
    mutationFn: (id: number) => storyApi.deleteMilestone(id),
    onSuccess: () => {
      toast.success(t("ms.deleted"));
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ["milestones", projectId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const milestones = useMemo(() => data ?? [], [data]);
  const fillPct = useMemo(() => {
    if (milestones.length === 0) return 0;
    const sum = milestones.reduce((s, m) => s + (m.status === "Done" ? 100 : m.progress), 0);
    return Math.round(sum / milestones.length);
  }, [milestones]);

  const dateFmt = new Intl.DateTimeFormat(rtl ? "ar-EG" : "en-US", {
    month: "short",
    year: "numeric",
  });

  if (!isLoading && milestones.length === 0 && !isOwner) return null;

  function openNew() {
    setEditing(undefined);
    setEditorOpen(true);
  }
  function openEdit(m: Milestone) {
    setEditing(m);
    setEditorOpen(true);
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <h2 className={`text-xs text-primary ${rtl ? "" : "uppercase tracking-[0.35em]"}`}>
          {t("ms.section")}
        </h2>
        {isOwner && (
          <PillButton onClick={openNew} size="sm">
            <Plus className="size-4" />
            {t("ms.add")}
          </PillButton>
        )}
      </div>

      {isLoading ? (
        <div className="mt-8 h-32 animate-pulse rounded-2xl bg-secondary" />
      ) : milestones.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-14 text-center">
          <p className="text-lg font-medium">{t("ms.empty.owner")}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {t("ms.empty.ownerBody")}
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto pb-2">
          <div className="relative flex min-w-max gap-0" dir={rtl ? "rtl" : "ltr"}>
            {/* Track + fill line through the node centres (top-[11px]) */}
            <span aria-hidden className="absolute inset-x-6 top-[11px] h-px bg-border" />
            <motion.span
              aria-hidden
              initial={{ width: 0 }}
              whileInView={{ width: `calc((100% - 3rem) * ${fillPct / 100})` }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: EASE }}
              className={cn(
                "absolute top-[11px] h-px bg-gradient-to-r from-bronze to-primary",
                rtl ? "right-6" : "left-6"
              )}
            />

            {milestones.map((m, i) => {
              const done = m.status === "Done";
              const active = m.status === "InProgress";
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
                  className="relative flex w-44 shrink-0 flex-col items-center px-3 text-center"
                >
                  {/* Node */}
                  <span className="relative z-10 flex size-[22px] items-center justify-center">
                    <span
                      className={cn(
                        "size-3 rounded-full ring-4 ring-background",
                        done ? "bg-primary" : active ? "bg-bronze" : "border border-border bg-background"
                      )}
                    />
                    {active && (
                      <span className="absolute size-3 animate-ping rounded-full bg-bronze opacity-60" />
                    )}
                  </span>

                  <p
                    className="mt-3 text-sm font-bold leading-tight"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {m.title}
                  </p>

                  <span
                    className={cn(
                      "mt-1.5 rounded-full border px-2.5 py-0.5 text-[10px]",
                      done
                        ? "border-primary/40 text-primary"
                        : active
                          ? "border-bronze/40 text-bronze"
                          : "border-border text-muted-foreground"
                    )}
                  >
                    {active ? `${m.progress}%` : t(`ms.status.${m.status}`)}
                  </span>

                  {m.date && (
                    <p className="font-numeric mt-1.5 text-[11px] text-muted-foreground">
                      {dateFmt.format(new Date(m.date))}
                    </p>
                  )}

                  {m.description && (
                    <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground line-clamp-3">
                      {m.description}
                    </p>
                  )}

                  {isOwner && (
                    <div className="mt-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(m)}
                        data-cursor="hover"
                        aria-label={t("upd.edit")}
                        className="flex size-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                      >
                        <Pencil className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setToDelete(m)}
                        data-cursor="hover"
                        aria-label={t("upd.delete")}
                        className="flex size-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {isOwner && (
        <MilestoneEditor
          projectId={projectId}
          milestone={editing}
          nextOrder={milestones.length}
          open={editorOpen}
          onOpenChange={setEditorOpen}
        />
      )}

      <Dialog open={!!toDelete} onOpenChange={(o) => !del.isPending && !o && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("ms.delete.title")}</DialogTitle>
            <DialogDescription>{toDelete?.title}</DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setToDelete(null)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("form.cancel")}
            </button>
            <button
              type="button"
              disabled={del.isPending}
              onClick={() => toDelete && del.mutate(toDelete.id)}
              className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {t("ms.delete.ok")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
