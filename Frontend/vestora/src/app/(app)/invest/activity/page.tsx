"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, Banknote, CheckCircle2, Sparkles, XCircle } from "lucide-react";
import { DashPageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { ProfileEmptyState } from "@/components/profile/profile-empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { timeAgo } from "@/components/dashboard/dashboard-panels";
import { EASE, compactUsd } from "@/components/invest/invest-primitives";
import { useInvestorDashboard } from "@/lib/hooks/use-investor-dashboard";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { InvestorActivity } from "@/lib/types/api";

const ICON: Record<InvestorActivity["type"], typeof Banknote> = {
  commitment: Banknote,
  approved: CheckCircle2,
  declined: XCircle,
  update: Sparkles,
  milestone: Sparkles,
};

export default function InvestActivityPage() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const { data, isLoading, isError, refetch } = useInvestorDashboard();
  const items = data?.recentActivity ?? [];

  function line(a: InvestorActivity): React.ReactNode {
    const venture = a.projectId ? (
      <Link
        href={`/projects/${a.projectId}`}
        data-cursor="hover"
        className="font-medium text-foreground transition-colors hover:text-primary"
      >
        {a.projectName}
      </Link>
    ) : (
      <span className="font-medium text-foreground">{a.projectName}</span>
    );

    if (a.type === "approved")
      return (
        <>
          {t("inv.activity.approved")} <span className="font-numeric text-bronze">{compactUsd(a.amount ?? 0)}</span>{" "}
          {t("inv.activity.in")} {venture}
        </>
      );
    if (a.type === "declined")
      return (
        <>
          {t("inv.activity.declined")} {venture}
        </>
      );
    if (a.type === "update")
      return (
        <>
          {venture} {t("inv.activity.posted")}
          {a.text && <span className="text-muted-foreground/80"> — “{a.text}”</span>}
        </>
      );
    return (
      <>
        {t("inv.activity.requested")} <span className="font-numeric text-bronze">{compactUsd(a.amount ?? 0)}</span>{" "}
        {t("inv.activity.in")} {venture}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <DashPageHeader title={t("inv.page.activity.title")} sub={t("inv.page.activity.sub")} eyebrowKey="inv.sidebar.label" />

      {isLoading ? (
        <div className="skeleton-shimmer h-80 rounded-2xl" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <ProfileEmptyState
          icon={Activity}
          title={t("inv.activity.empty")}
          body={t("inv.activity.emptySub")}
          ctaLabel={t("inv.quick.discover")}
          ctaHref="/projects"
        />
      ) : (
        <Panel elevated>
          <div className="relative">
            <span
              aria-hidden
              className="absolute bottom-3 start-[15px] top-3 w-px bg-gradient-to-b from-primary/50 via-border to-transparent"
            />
            <ol className="space-y-1.5">
              {items.map((a, i) => {
                const Icon = ICON[a.type] ?? Activity;
                const important = a.type === "approved";
                return (
                  <motion.li
                    key={`${a.type}-${a.date}-${i}`}
                    initial={{ opacity: 0, x: rtl ? 14 : -14 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-30px" }}
                    transition={{ duration: 0.5, delay: (i % 8) * 0.05, ease: EASE }}
                    className={cn(
                      "relative flex items-start gap-3.5 rounded-xl py-2.5 pe-3 ps-1 transition-colors",
                      important ? "bg-primary/[0.04] ring-1 ring-primary/15" : "hover:bg-foreground/[0.03]"
                    )}
                  >
                    <span
                      className={cn(
                        "relative z-[1] grid size-[30px] shrink-0 place-items-center rounded-full border ring-4 ring-background",
                        important
                          ? "border-primary/50 bg-primary/[0.1] text-primary"
                          : a.type === "declined"
                            ? "border-destructive/40 bg-destructive/[0.06] text-destructive"
                            : "border-border bg-card text-muted-foreground"
                      )}
                    >
                      <Icon className="size-3.5" strokeWidth={1.7} />
                    </span>
                    <p className="min-w-0 flex-1 pt-1 text-sm leading-snug text-muted-foreground">{line(a)}</p>
                    <span className="shrink-0 pt-1.5 font-numeric text-[11px] text-muted-foreground/70">
                      {timeAgo(a.date, t("time.now"))}
                    </span>
                  </motion.li>
                );
              })}
            </ol>
          </div>
        </Panel>
      )}
    </div>
  );
}
