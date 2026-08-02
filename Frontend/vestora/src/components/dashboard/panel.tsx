"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

/**
 * Shared dashboard surface. Two elevation tiers create depth:
 *  - base:     quiet card for secondary widgets
 *  - elevated: stronger blur + shadow for the panels that matter
 * Every panel lifts slightly on hover and carries the gold top hairline.
 */
export function Panel({
  title,
  icon,
  href,
  hrefLabel,
  action,
  elevated,
  className,
  children,
}: {
  title?: string;
  icon?: React.ReactNode;
  /** Optional "view all" destination shown in the header. */
  href?: string;
  hrefLabel?: string;
  action?: React.ReactNode;
  elevated?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";

  return (
    <div
      className={cn(
        "group/panel relative overflow-hidden rounded-2xl border p-5 backdrop-blur-sm transition-[border-color,box-shadow,transform] duration-500 ease-out hover:-translate-y-0.5",
        elevated
          ? "border-border/80 bg-card/75 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.55)] backdrop-blur-xl hover:border-primary/35"
          : "border-border/60 bg-card/40 hover:border-primary/30",
        className
      )}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      {(title || action || href) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            {icon && <span className="text-primary">{icon}</span>}
            {title}
          </h3>
          {action ??
            (href && (
              <Link
                href={href}
                data-cursor="hover"
                className="group/link inline-flex items-center gap-1 text-xs text-primary/80 transition-colors hover:text-primary"
              >
                {hrefLabel ?? t("dash.viewAll")}
                <ArrowUpRight
                  className={cn(
                    "size-3.5 transition-transform duration-300 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5",
                    rtl && "-scale-x-100"
                  )}
                />
              </Link>
            ))}
        </div>
      )}
      {children}
    </div>
  );
}
