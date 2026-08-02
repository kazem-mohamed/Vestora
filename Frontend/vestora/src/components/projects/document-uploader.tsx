"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileUp } from "lucide-react";
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

const inputCls =
  "h-11 w-full rounded-lg border border-input bg-card/60 px-3.5 text-sm outline-none backdrop-blur-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25";

export function DocumentUploader({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLocale();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"Public" | "Backers">("Public");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!file) {
      toast.error(t("docs.form.file"));
      return;
    }
    if (!title.trim()) {
      toast.error(t("valid.min"));
      return;
    }
    try {
      setBusy(true);
      await storyApi.uploadDocument(projectId, file, title.trim(), visibility);
      toast.success(t("docs.uploaded"));
      qc.invalidateQueries({ queryKey: ["documents", projectId] });
      setTitle("");
      setFile(null);
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
          <DialogTitle>{t("docs.form.new")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="doc-title" className="text-sm font-medium">
              {t("docs.form.title")}
            </label>
            <input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("docs.form.titlePh")} className={inputCls} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("docs.form.file")}</p>
            <button
              type="button"
              data-cursor="hover"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-input bg-card/40 px-6 py-8 text-center transition-colors hover:border-primary/50"
            >
              <FileUp className="size-5 text-primary" />
              <p className="text-sm text-foreground">{file ? file.name : t("docs.form.file")}</p>
              <p className="text-[11px] text-muted-foreground">{t("docs.form.fileHint")}</p>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              hidden
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("docs.form.visibility")}</p>
            <div className="flex gap-2">
              {(["Public", "Backers"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  data-cursor="hover"
                  onClick={() => setVisibility(v)}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                    visibility === v
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  {t(`docs.visibility.${v}`)}
                </button>
              ))}
            </div>
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
            {busy ? t("docs.form.uploading") : t("docs.form.upload")}
          </PillButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
