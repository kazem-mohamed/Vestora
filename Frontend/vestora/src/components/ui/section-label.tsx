"use client";

import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

/**
 * Editorial section marker: a bracketed index [01] + a tracked gold label with
 * a hairline. Shared rhythm device across every major surface.
 */
export function SectionLabel({
  index,
  children,
  className,
}: {
  index: number;
  children: React.ReactNode;
  className?: string;
}) {
  const { locale } = useLocale();
  const rtl = locale === "ar";
  const n = String(index).padStart(2, "0");

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <span className="font-numeric text-sm text-primary">[{n}]</span>
      <span
        className={cn(
          "text-xs text-muted-foreground",
          rtl ? "" : "uppercase tracking-[0.3em]"
        )}
      >
        {children}
      </span>
      <span className="h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
    </div>
  );
}
