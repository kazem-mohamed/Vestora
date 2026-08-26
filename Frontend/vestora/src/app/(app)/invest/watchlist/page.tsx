"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Bookmark, CheckCircle2 } from "lucide-react";
import { DashPageHeader } from "@/components/dashboard/page-header";
import { ProfileEmptyState } from "@/components/profile/profile-empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { BookmarkButton } from "@/components/projects/bookmark-button";
import { EASE, VentureThumb, compactUsd } from "@/components/invest/invest-primitives";
import { bookmarksApi } from "@/lib/api/bookmarks";
import { useAuthStore } from "@/lib/auth/store";
import { categoryLabelKey } from "@/lib/config/categories";
import { useInvestorDashboard } from "@/lib/hooks/use-investor-dashboard";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

export default function InvestWatchlistPage() {
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);
  const { data: dash } = useInvestorDashboard();

  // Same key the bookmark toggle invalidates, so un-saving updates this list.
  const q = useQuery({
    queryKey: ["bookmarks", user?.id],
    queryFn: () => bookmarksApi.list(),
    enabled: !!user,
  });
  const saved = q.data ?? [];

  // A venture the investor already has a live request on shouldn't read as a
  // cold prospect — surface that relationship right on the watchlist row.
  const engagedIds = new Set(
    (dash?.pipeline ?? [])
      .filter((p) => p.stage !== "Declined" && p.stage !== "Closed")
      .map((p) => p.projectId)
  );

  return (
    <div className="space-y-6">
      <DashPageHeader title={t("inv.page.watchlist.title")} sub={t("inv.page.watchlist.sub")} eyebrowKey="inv.sidebar.label" />

      {q.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-24 rounded-2xl" />
          ))}
        </div>
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : saved.length === 0 ? (
        <ProfileEmptyState
          icon={Bookmark}
          title={t("inv.watchlist.empty")}
          body={t("inv.watchlist.emptySub")}
          ctaLabel={t("inv.quick.discover")}
          ctaHref="/projects"
        />
      ) : (
        <ul className="space-y-3">
          {saved.map((p, i) => {
            const pct =
              p.investmentNeeded > 0
                ? Math.min(100, Math.round((p.raisedAmount / p.investmentNeeded) * 100))
                : 0;
            const engaged = engagedIds.has(p.id);
            return (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.5, delay: (i % 6) * 0.05, ease: EASE }}
                className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-primary/30 sm:flex-row sm:items-center"
              >
                <VentureThumb imageId={p.imageIds[0] ?? null} name={p.name} href={`/projects/${p.id}`} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/projects/${p.id}`}
                      data-cursor="hover"
                      className="truncate text-base font-bold transition-colors hover:text-primary"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {p.name}
                    </Link>
                    {engaged && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-primary/[0.07] px-2 py-0.5 text-[10px] text-primary">
                        <CheckCircle2 className="size-3" />
                        {t("inv.watchlist.engaged")}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    {p.category && <span>{t(categoryLabelKey(p.category))}</span>}
                    {p.category && p.location && <span aria-hidden>·</span>}
                    {p.location && <span>{p.location}</span>}
                  </p>

                  <div className="mt-2.5 max-w-sm">
                    <div className="flex items-baseline justify-between font-numeric text-[11px]">
                      <span className="text-bronze">{compactUsd(p.raisedAmount)}</span>
                      <span className="text-muted-foreground">
                        {t("proj.card.of")} {compactUsd(p.investmentNeeded)} · {pct}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
                        className="h-full rounded-full bg-gradient-to-r from-bronze to-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={cn(
                      "whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px]",
                      pct >= 100 ? "border-primary/40 text-primary" : "border-bronze/40 text-bronze"
                    )}
                  >
                    {pct >= 100 ? t("proj.card.completed") : t("proj.card.needs")}
                  </span>
                  <BookmarkButton projectId={p.id} variant="surface" />
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
