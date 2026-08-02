"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Download, FileText, Lock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PillButton } from "@/components/ui/pill-button";
import { DocumentUploader } from "@/components/projects/document-uploader";
import { storyApi } from "@/lib/api/story";
import { useLocale } from "@/lib/i18n/locale";
import type { ProjectDocument } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsSection({ projectId, isOwner }: { projectId: number; isOwner: boolean }) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["documents", projectId],
    queryFn: () => storyApi.documents(projectId),
  });

  const [uploadOpen, setUploadOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ProjectDocument | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const del = useMutation({
    mutationFn: (id: number) => storyApi.deleteDocument(id),
    onSuccess: () => {
      toast.success(t("docs.deleted"));
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ["documents", projectId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const docs = data ?? [];
  if (!isLoading && docs.length === 0 && !isOwner) return null;

  async function download(doc: ProjectDocument) {
    try {
      setDownloadingId(doc.id);
      await storyApi.downloadDocument(doc.id, doc.fileName);
    } catch {
      toast.error(t("docs.downloadFailed"));
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <h2 className={`text-xs text-primary ${rtl ? "" : "uppercase tracking-[0.35em]"}`}>
          {t("docs.section")}
        </h2>
        {isOwner && (
          <PillButton onClick={() => setUploadOpen(true)} size="sm">
            <Plus className="size-4" />
            {t("docs.add")}
          </PillButton>
        )}
      </div>

      {isLoading ? (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-14 text-center">
          <p className="text-lg font-medium">{t("docs.empty.owner")}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{t("docs.empty.ownerBody")}</p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {docs.map((d, i) => {
            const backers = d.visibility === "Backers";
            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: (i % 8) * 0.05, ease: EASE }}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card/50 p-4 transition-colors duration-300 hover:border-primary/30 sm:p-5"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 text-primary">
                  <FileText className="size-5" strokeWidth={1.5} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{d.title}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="truncate">{d.fileName}</span>
                    <span className="font-numeric">{formatBytes(d.sizeBytes)}</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
                        backers ? "border-bronze/40 text-bronze" : "border-border"
                      }`}
                    >
                      {backers && <Lock className="size-2.5" />}
                      {t(`docs.visibility.${d.visibility}`)}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => download(d)}
                    disabled={downloadingId === d.id}
                    data-cursor="hover"
                    aria-label={t("docs.download")}
                    className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
                  >
                    <Download className="size-4" />
                  </button>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setToDelete(d)}
                      data-cursor="hover"
                      aria-label={t("docs.delete.ok")}
                      className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {isOwner && (
        <DocumentUploader projectId={projectId} open={uploadOpen} onOpenChange={setUploadOpen} />
      )}

      <Dialog open={!!toDelete} onOpenChange={(o) => !del.isPending && !o && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("docs.delete.title")}</DialogTitle>
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
              {t("docs.delete.ok")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
