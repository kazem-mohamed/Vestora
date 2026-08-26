"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Briefcase, MessageSquare, Sparkles } from "lucide-react";
import { DashPageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { ProfileEmptyState } from "@/components/profile/profile-empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { categoryLabelKey, categoryOrRawLabel } from "@/lib/config/categories";
import {
  AllocationBars,
  EASE,
  VentureThumb,
  compactUsd,
  usd,
} from "@/components/invest/invest-primitives";
import { useInvestorDashboard } from "@/lib/hooks/use-investor-dashboard";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

export default function InvestPortfolioPage() {
  const { t, locale } = useLocale();
  const { data, isLoading, isError, refetch } = useInvestorDashboard();

  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="space-y-6">
      <DashPageHeader title={t("inv.page.portfolio.title")} sub={t("inv.page.portfolio.sub")} eyebrowKey="inv.sidebar.label" />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-28 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (data?.portfolio.length ?? 0) === 0 ? (
        <ProfileEmptyState
          icon={Briefcase}
          title={t("inv.portfolio.empty")}
          body={t("inv.portfolio.emptySub")}
          ctaLabel={t("inv.quick.discover")}
          ctaHref="/projects"
        />
      ) : (
        <>
          {/* Honest framing: these are commitments, not transferred funds. */}
          <p className="rounded-xl border border-dashed border-border/70 bg-card/30 px-4 py-3 text-xs text-muted-foreground">
            {t("inv.portfolio.disclaimer")}
          </p>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
            <ul className="space-y-3">
              {data!.portfolio.map((p, i) => {
                // The venture's own progress, measured the way its page measures it.
                const pct = p.goal > 0 ? Math.min(100, Math.round((p.totalFunded / p.goal) * 100)) : 0;
                const committedPct =
                  p.goal > 0 ? Math.min(100, Math.round((p.totalCommitted / p.goal) * 100)) : 0;
                return (
                  <motion.li
                    key={p.projectId}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-30px" }}
                    transition={{ duration: 0.5, delay: (i % 6) * 0.05, ease: EASE }}
                    className="rounded-2xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-primary/30"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <VentureThumb
                        imageId={p.coverImageId}
                        name={p.projectName}
                        href={`/projects/${p.projectId}`}
                      />

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/projects/${p.projectId}`}
                          data-cursor="hover"
                          className="block truncate text-base font-bold transition-colors hover:text-primary"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          {p.projectName}
                        </Link>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <Link href={`/u/${p.founderId}`} data-cursor="hover" className="hover:text-foreground">
                            {p.founderName}
                          </Link>
                          {p.category && (
                            <>
                              <span aria-hidden>·</span>
                              <span>{t(categoryLabelKey(p.category))}</span>
                            </>
                          )}
                          {p.stage && (
                            <>
                              <span aria-hidden>·</span>
                              <span>{p.stage}</span>
                            </>
                          )}
                        </p>

                        <div className="mt-2.5 max-w-sm">
                          <div className="flex items-baseline justify-between text-[11px]">
                            <span className="text-muted-foreground">
                              {t("inv.portfolio.ventureProgress")}
                            </span>
                            <span className="font-numeric text-primary">{pct}%</span>
                          </div>
                          <div className="relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                            {committedPct > pct && (
                              <motion.div
                                initial={{ width: 0 }}
                                whileInView={{ width: `${committedPct}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.85, delay: 0.15, ease: EASE }}
                                className="absolute inset-y-0 start-0 rounded-full bg-bronze/35"
                              />
                            )}
                            <motion.div
                              initial={{ width: 0 }}
                              whileInView={{ width: `${pct}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.9, delay: 0.22, ease: EASE }}
                              className="absolute inset-y-0 start-0 rounded-full bg-gradient-to-r from-bronze to-primary"
                            />
                          </div>
                        </div>

                        {p.latestUpdateTitle && (
                          <p className="mt-2.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                            <Sparkles className="size-3 shrink-0 text-primary" />
                            <span className="truncate">{p.latestUpdateTitle}</span>
                            {p.latestUpdateDate && (
                              <span className="font-numeric shrink-0 text-muted-foreground/70">
                                · {dateFmt.format(new Date(p.latestUpdateDate))}
                              </span>
                            )}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                        {/* What this investor actually put in leads; what they
                            committed sits behind it. The portfolio previously showed
                            only the commitment and labelled it as the holding. */}
                        <span className="text-end">
                          <span className="block font-numeric text-lg text-bronze">
                            {usd(p.myFunded > 0 ? p.myFunded : p.myCommitment)}
                          </span>
                          <span className="block text-[10px] text-muted-foreground">
                            {p.myFunded > 0
                              ? t("fund.word.funded")
                              : t("inv.portfolio.myCommitment")}
                          </span>
                          {p.myFunded > 0 && p.myCommitment > p.myFunded && (
                            <span className="mt-0.5 block font-numeric text-[10px] text-muted-foreground/70">
                              {compactUsd(p.myCommitment)} {t("fund.word.committed")}
                            </span>
                          )}
                          {p.myPaymentDue > 0 && (
                            <Link
                              href={`/invest/payments`}
                              data-cursor="hover"
                              className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-primary/45 bg-primary/[0.08] px-2.5 py-0.5 text-[10px] text-primary transition-colors hover:bg-primary/[0.14]"
                            >
                              {t("fund.word.paymentDue")} {compactUsd(p.myPaymentDue)}
                            </Link>
                          )}
                        </span>
                        <Link
                          href={`/messages?to=${p.founderId}`}
                          data-cursor="hover"
                          aria-label={t("msg.messageFounder")}
                          className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                        >
                          <MessageSquare className="size-4" strokeWidth={1.7} />
                        </Link>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </ul>

            <div className="space-y-5">
              {data!.byIndustry.length > 0 && (
                <Panel title={t("inv.alloc.industry")} elevated>
                  <AllocationBars
                    slices={data!.byIndustry.map((s) => ({ ...s, label: categoryOrRawLabel(s.label, t) }))}
                  />
                </Panel>
              )}
              {data!.byStage.length > 0 && (
                <Panel title={t("inv.alloc.stage")}>
                  <AllocationBars slices={data!.byStage} />
                </Panel>
              )}
              <Panel title={t("fund.word.funded")} elevated>
                <p className="font-numeric text-2xl text-bronze">
                  {compactUsd(data!.kpis.fundedAmount)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("inv.portfolio.across").replace("{n}", String(data!.kpis.venturesFunded))}
                </p>
                <div className="mt-4 space-y-2 border-t border-border/60 pt-3.5 text-xs">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-muted-foreground">{t("fund.word.committed")}</span>
                    <span className="font-numeric text-foreground">
                      {compactUsd(data!.kpis.approvedAmount)}
                    </span>
                  </div>
                  {data!.kpis.paymentDueAmount > 0 && (
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-primary">{t("fund.word.paymentDue")}</span>
                      <span className="font-numeric text-primary">
                        {compactUsd(data!.kpis.paymentDueAmount)}
                      </span>
                    </div>
                  )}
                </div>
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
