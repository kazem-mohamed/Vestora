import { File, FileSpreadsheet, FileText, Presentation } from "lucide-react";

/**
 * Shared vocabulary for message attachments, so the composer's preview and the
 * thread's bubble describe the same file the same way.
 *
 * The allowed set is mirrored from the backend (`FileUploadSecuritySettings` +
 * `FileUploadSecurityService`): images plus the four document formats whose
 * first bytes can actually be verified. Keep the two in step — the server is the
 * one that enforces it, this is only what the picker offers.
 */

const DOC_TYPES = {
  "application/pdf": { ext: ".pdf", icon: FileText },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    ext: ".docx",
    icon: FileText,
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    ext: ".xlsx",
    icon: FileSpreadsheet,
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    ext: ".pptx",
    icon: Presentation,
  },
} as const;

/** What the file picker offers. Extensions included because Windows reports an
 *  empty content type for some Office files until they're opened once. */
export const ATTACHMENT_ACCEPT = [
  "image/*",
  ...Object.keys(DOC_TYPES),
  ...Object.values(DOC_TYPES).map((d) => d.ext),
].join(",");

export function isImageAttachment(contentType?: string | null): boolean {
  return (contentType ?? "").startsWith("image/");
}

/** The icon to stand in for a non-image attachment. */
export function attachmentIcon(contentType?: string | null) {
  return DOC_TYPES[contentType as keyof typeof DOC_TYPES]?.icon ?? File;
}

/** The extension, uppercased, as the file's short label ("PDF", "XLSX"). */
export function attachmentLabel(name?: string | null, contentType?: string | null): string {
  const fromName = name?.includes(".") ? name.split(".").pop() : null;
  const ext = fromName ?? DOC_TYPES[contentType as keyof typeof DOC_TYPES]?.ext.slice(1);
  return (ext ?? "file").toUpperCase();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
