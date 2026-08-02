"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { projectImageUrl } from "@/lib/api/projects";
import { useLocale } from "@/lib/i18n/locale";

export interface StagedFile {
  id: string;
  file: File;
  url: string;
}

/**
 * Drag-and-drop multi-image zone. Existing images (edit mode) are shown by id
 * with an immediate delete; newly picked files are staged and uploaded by the
 * parent on save.
 */
export function ImageDropzone({
  existingIds,
  onRemoveExisting,
  staged,
  onAddFiles,
  onRemoveStaged,
}: {
  existingIds: number[];
  onRemoveExisting: (imageId: number) => void;
  staged: StagedFile[];
  onAddFiles: (files: File[]) => void;
  onRemoveStaged: (id: string) => void;
}) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function accept(list: FileList | null) {
    if (!list) return;
    const images = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (images.length) onAddFiles(images);
  }

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        data-cursor="hover"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-input bg-card/40 hover:border-primary/50"
        }`}
      >
        <ImagePlus className="size-6 text-primary" />
        <p className="text-sm text-foreground">{t("form.images.drop")}</p>
        <p className="text-xs text-muted-foreground">{t("form.images.hint")}</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            accept(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {(existingIds.length > 0 || staged.length > 0) && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {existingIds.map((id) => (
            <div
              key={`ex-${id}`}
              className="group/thumb relative aspect-square overflow-hidden rounded-lg ring-1 ring-border"
            >
              <img
                src={projectImageUrl(id)}
                alt=""
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                data-cursor="hover"
                onClick={() => onRemoveExisting(id)}
                aria-label={t("mine.delete")}
                className="absolute end-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-destructive group-hover/thumb:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          {staged.map((s) => (
            <div
              key={s.id}
              className="group/thumb relative aspect-square overflow-hidden rounded-lg ring-1 ring-primary/40"
            >
              <img src={s.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                data-cursor="hover"
                onClick={() => onRemoveStaged(s.id)}
                aria-label={t("mine.delete")}
                className="absolute end-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-destructive group-hover/thumb:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
