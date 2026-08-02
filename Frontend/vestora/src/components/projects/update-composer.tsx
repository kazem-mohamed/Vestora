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
import { ImageDropzone, type StagedFile } from "@/components/projects/image-dropzone";
import { storyApi } from "@/lib/api/story";
import { useLocale } from "@/lib/i18n/locale";
import type { ProjectUpdate } from "@/lib/types/api";

const inputCls =
  "h-11 w-full rounded-lg border border-input bg-card/60 px-3.5 text-sm outline-none backdrop-blur-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25";

export function UpdateComposer({
  projectId,
  update,
  open,
  onOpenChange,
}: {
  projectId: number;
  update?: ProjectUpdate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLocale();
  const qc = useQueryClient();
  const editing = !!update;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [busy, setBusy] = useState(false);

  // Reset fields whenever the modal opens for a (new) target.
  useEffect(() => {
    if (open) {
      setTitle(update?.title ?? "");
      setBody(update?.body ?? "");
      setStaged([]);
    }
  }, [open, update]);

  function addFiles(files: File[]) {
    setStaged((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: `${file.name}-${crypto.randomUUID()}`,
        file,
        url: URL.createObjectURL(file),
      })),
    ]);
  }
  function removeStaged(id: string) {
    setStaged((prev) => {
      const gone = prev.find((s) => s.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return prev.filter((s) => s.id !== id);
    });
  }

  async function submit() {
    if (!title.trim() || !body.trim()) {
      toast.error(t("valid.min"));
      return;
    }
    try {
      setBusy(true);
      if (editing) {
        await storyApi.editUpdate(update!.id, { title: title.trim(), body: body.trim() });
        toast.success(t("upd.saved"));
      } else {
        const res = await storyApi.createUpdate(projectId, { title: title.trim(), body: body.trim() });
        for (const s of staged) await storyApi.uploadUpdateImage(res.updateId, s.file);
        toast.success(t("upd.created"));
      }
      qc.invalidateQueries({ queryKey: ["updates", projectId] });
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? t("upd.form.edit") : t("upd.form.new")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="upd-title" className="text-sm font-medium">
              {t("upd.form.title")}
            </label>
            <input
              id="upd-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("upd.form.titlePh")}
              className={inputCls}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="upd-body" className="text-sm font-medium">
              {t("upd.form.body")}
            </label>
            <textarea
              id="upd-body"
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("upd.form.bodyPh")}
              className={inputCls.replace("h-11", "min-h-28 resize-y py-3")}
            />
          </div>

          {!editing && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("upd.form.images")}</p>
              <ImageDropzone
                existingIds={[]}
                onRemoveExisting={() => {}}
                staged={staged}
                onAddFiles={addFiles}
                onRemoveStaged={removeStaged}
              />
            </div>
          )}
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
            {busy
              ? t("upd.form.publishing")
              : editing
                ? t("upd.form.save")
                : t("upd.form.publish")}
          </PillButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
