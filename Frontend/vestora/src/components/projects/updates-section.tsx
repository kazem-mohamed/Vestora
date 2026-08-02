"use client";

import { useState } from "react";
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
import { UpdateComposer } from "@/components/projects/update-composer";
import { storyApi, updateImageUrl } from "@/lib/api/story";
import { useLocale } from "@/lib/i18n/locale";
import type { ProjectUpdate } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

export function UpdatesSection({
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
    queryKey: ["updates", projectId],
    queryFn: () => storyApi.updates(projectId),
  });

  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectUpdate | undefined>();
  const [toDelete, setToDelete] = useState<ProjectUpdate | null>(null);

  const del = useMutation({
    mutationFn: (id: number) => storyApi.deleteUpdate(id),
    onSuccess: () => {
      toast.success(t("upd.deleted"));
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ["updates", projectId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updates = data ?? [];
  const dateFmt = new Intl.DateTimeFormat(rtl ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Hide the whole section for non-owners when there's nothing to show.
  if (!isLoading && updates.length === 0 && !isOwner) return null;

  function openNew() {
    setEditing(undefined);
    setComposerOpen(true);
  }
  function openEdit(u: ProjectUpdate) {
    setEditing(u);
    setComposerOpen(true);
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <h2 className={`text-xs text-primary ${rtl ? "" : "uppercase tracking-[0.35em]"}`}>
          {t("upd.section")}
        </h2>
        {isOwner && (
          <PillButton onClick={openNew} size="sm">
            <Plus className="size-4" />
            {t("upd.post")}
          </PillButton>
        )}
      </div>

      {isLoading ? (
        <div className="mt-8 space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      ) : updates.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-14 text-center">
          <p className="text-lg font-medium">{t("upd.empty.owner")}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {t("upd.empty.ownerBody")}
          </p>
        </div>
      ) : (
        <ol className="relative mt-10 border-s border-border/70 ps-8">
          {updates.map((u, i) => (
            <motion.li
              key={u.id}
              initial={{ opacity: 0, x: rtl ? 18 : -18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: (i % 6) * 0.05, ease: EASE }}
              className="relative pb-10 last:pb-0"
            >
              <span className="absolute -start-[37px] top-1.5 size-3 rounded-full bg-primary ring-4 ring-background" />

              <article className="group/card overflow-hidden rounded-3xl border border-border bg-card/50 transition-[border-color,transform,box-shadow] duration-500 ease-out hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_34px_80px_-46px_rgba(0,0,0,0.65)]">
                <span aria-hidden className="block h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                {/* Lead image — large cover */}
                {u.imageIds.length > 0 && (
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img
                      src={updateImageUrl(u.imageIds[0])}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover/card:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                )}

                <div className="p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`font-numeric text-[11px] text-primary ${rtl ? "" : "uppercase tracking-[0.15em]"}`}>
                        {dateFmt.format(new Date(u.createdDate))}
                      </p>
                      <h3
                        className="mt-1.5 text-2xl font-bold leading-tight sm:text-[1.65rem]"
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {u.title}
                      </h3>
                    </div>
                    {isOwner && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          data-cursor="hover"
                          aria-label={t("upd.edit")}
                          className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setToDelete(u)}
                          data-cursor="hover"
                          aria-label={t("upd.delete")}
                          className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="mt-3.5 whitespace-pre-line text-[15px] leading-relaxed text-foreground/85">
                    {u.body}
                  </p>

                  {/* Remaining images */}
                  {u.imageIds.length > 1 && (
                    <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {u.imageIds.slice(1).map((id) => (
                        <div
                          key={id}
                          className="aspect-square overflow-hidden rounded-xl ring-1 ring-border"
                        >
                          <img
                            src={updateImageUrl(id)}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            </motion.li>
          ))}
        </ol>
      )}

      {isOwner && (
        <UpdateComposer
          projectId={projectId}
          update={editing}
          open={composerOpen}
          onOpenChange={setComposerOpen}
        />
      )}

      <Dialog open={!!toDelete} onOpenChange={(o) => !del.isPending && !o && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("upd.delete.title")}</DialogTitle>
            <DialogDescription>{t("upd.delete.body")}</DialogDescription>
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
              {t("upd.delete.ok")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
