"use client";

import { RotateCcw } from "lucide-react";
import { Guilloche } from "@/components/auth/guilloche";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

/**
 * The one data-error surface. A calm branded panel with a clear recovery
 * path, so a failed fetch never reads as an empty page. Pass `onRetry` to
 * surface the retry button (usually a react-query `refetch`).
 */
export function ErrorState({
  onRetry,
  title,
  body,
  className,
}: {
  onRetry?: () => void;
  title?: string;
  body?: string;
  className?: string;
}) {
  const t = useT();
  return (
    <div
      role="alert"
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border bg-card/40",
        className
      )}
    >
      <Guilloche className="pointer-events-none absolute -end-24 -top-24 size-[420px] text-primary/[0.06]" />
      <div className="relative flex flex-col items-center px-6 py-20 text-center">
        <span className="grid size-12 place-items-center rounded-full border border-primary/30 text-primary">
          <RotateCcw className="size-5" strokeWidth={1.5} />
        </span>
        <h2
          className="mt-6 text-2xl font-bold"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {title ?? t("state.error.title")}
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
          {body ?? t("state.error.body")}
        </p>
        {onRetry && (
          <button
            type="button"
            data-cursor="hover"
            onClick={onRetry}
            className="gold-cta mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <RotateCcw className="size-4" strokeWidth={2} />
            {t("state.error.retry")}
          </button>
        )}
      </div>
    </div>
  );
}
