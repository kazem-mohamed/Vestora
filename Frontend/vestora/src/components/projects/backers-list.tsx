"use client";

import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { SectionLabel } from "@/components/ui/section-label";
import { investorApi } from "@/lib/api/investor";
import { useLocale } from "@/lib/i18n/locale";

function usd(v: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

/**
 * Founder-only, durable list of everyone who has backed a project (pending +
 * approved) with how to reach them — closes the gap where approving a support
 * request had no lasting record of the investor's contact info once the
 * triggering notification was dismissed.
 */
export function BackersList({ projectId }: { projectId: number }) {
  const { t, locale } = useLocale();
  const { data, isLoading } = useQuery({
    queryKey: ["backers", projectId],
    queryFn: () => investorApi.backers(projectId),
  });

  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <section className="mt-14">
      <SectionLabel index={5}>{t("backers.title")}</SectionLabel>

      {isLoading ? (
        <div className="mt-6 space-y-2.5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-16 rounded-xl" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-dashed border-border/70 px-5 py-8 text-sm text-muted-foreground">
          <Users className="size-4 shrink-0" strokeWidth={1.5} />
          {t("backers.empty")}
        </div>
      ) : (
        <ul className="mt-6 space-y-2.5">
          {data.map((b) => {
            const approved = b.status === "Approved";
            return (
              <li
                key={b.id}
                className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{b.investorName}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-numeric text-bronze">{usd(b.amount)}</span>
                    <span aria-hidden>·</span>
                    <span
                      className={approved ? "text-primary" : "text-bronze"}
                    >
                      {approved ? t("port.status.approved") : t("port.status.pending")}
                    </span>
                    <span aria-hidden>·</span>
                    <span className="font-numeric">{dateFmt.format(new Date(b.date))}</span>
                  </p>
                </div>
                {b.contactInfo && (
                  <p className="rounded-full border border-primary/25 bg-primary/[0.06] px-3.5 py-1.5 text-xs text-foreground">
                    {b.contactInfo}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
