"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { KeyRound, Lock, ShieldAlert, ShieldCheck, UserMinus } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { DashPageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { ProfileEmptyState } from "@/components/profile/profile-empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { adminApi } from "@/lib/api/admin";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Failure-ish events read red; everything else stays neutral. */
function eventTone(type: string): string {
  if (/fail|blocked|reuse|invalid/i.test(type)) return "border-destructive/40 bg-destructive/[0.06] text-destructive";
  if (/lockout|suspend/i.test(type)) return "border-bronze/40 bg-bronze/[0.06] text-bronze";
  return "border-border text-muted-foreground";
}

export default function AdminSecurityPage() {
  const { t, locale } = useLocale();
  const [days, setDays] = useState(14);

  const q = useQuery({
    queryKey: ["admin-security", days],
    queryFn: () => adminApi.security(days),
    placeholderData: (prev) => prev,
  });

  const data = q.data;
  const dtf = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const RANGES = [7, 14, 30];

  return (
    <div className="space-y-6">
      <DashPageHeader
        title={t("admin.security.title")}
        sub={t("admin.security.sub")}
        eyebrowKey="admin.sidebar.label"
      />

      <div className="flex flex-wrap gap-2">
        {RANGES.map((d) => (
          <button
            key={d}
            type="button"
            data-cursor="hover"
            onClick={() => setDays(d)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs transition-colors",
              days === d
                ? "border-primary/50 bg-primary/[0.08] text-foreground"
                : "border-border/70 text-muted-foreground hover:text-foreground"
            )}
          >
            {t("admin.security.lastDays").replace("{n}", String(d))}
          </button>
        ))}
      </div>

      {q.isLoading && !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer h-28 rounded-2xl" />
            ))}
          </div>
          <div className="skeleton-shimmer h-80 rounded-2xl" />
        </div>
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <SecurityStat
              index={0}
              icon={Lock}
              label={t("admin.security.locked")}
              value={data.lockedAccounts}
              alert={data.lockedAccounts > 0}
            />
            <SecurityStat
              index={1}
              icon={UserMinus}
              label={t("admin.security.suspended")}
              value={data.suspendedAccounts}
              alert={data.suspendedAccounts > 0}
            />
            <SecurityStat
              index={2}
              icon={ShieldAlert}
              label={t("admin.security.events")}
              value={data.events.length}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <Panel title={t("admin.security.recent")} elevated>
              {data.events.length === 0 ? (
                <ProfileEmptyState
                  compact
                  icon={ShieldCheck}
                  title={t("admin.security.empty")}
                  body={t("admin.security.emptySub")}
                />
              ) : (
                <ul className="divide-y divide-border/50">
                  {data.events.map((e, i) => (
                    <motion.li
                      key={e.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: (i % 12) * 0.03, ease: EASE }}
                      className="flex items-start gap-3 px-1 py-3"
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border",
                          eventTone(e.eventType)
                        )}
                      >
                        <KeyRound className="size-3.5" strokeWidth={1.7} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{e.eventType}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {e.email ?? "—"}
                          {e.ipAddress && <span className="font-numeric"> · {e.ipAddress}</span>}
                        </p>
                        {e.details && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground/80">{e.details}</p>
                        )}
                      </div>
                      <span className="shrink-0 font-numeric text-[11px] text-muted-foreground/70">
                        {dtf.format(new Date(e.createdAtUtc))}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title={t("admin.security.byType")}>
              {data.byType.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("dash.chart.noData")}</p>
              ) : (
                <ul className="space-y-2.5">
                  {data.byType.map((b) => (
                    <li key={b.type} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-muted-foreground">{b.type}</span>
                      <span className="font-numeric shrink-0 text-foreground">{b.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      ) : null}
    </div>
  );
}

function SecurityStat({
  icon: Icon,
  label,
  value,
  alert,
  index,
}: {
  icon: typeof Lock;
  label: string;
  value: number;
  alert?: boolean;
  index: number;
}) {
  const { locale } = useLocale();
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: EASE }}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 backdrop-blur-sm transition-[border-color,transform] duration-500 hover:-translate-y-0.5",
        alert ? "border-destructive/40 bg-destructive/[0.04]" : "border-border/70 bg-card/55 hover:border-primary/40"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={cn("text-[11px] text-muted-foreground", locale === "ar" ? "" : "uppercase tracking-[0.12em]")}>
          {label}
        </p>
        <Icon className={cn("size-4", alert ? "text-destructive" : "text-primary")} strokeWidth={1.6} />
      </div>
      <AnimatedNumber
        value={value}
        format={(v) => String(v)}
        delay={index * 0.06 + 0.1}
        className={cn("mt-2.5 block font-numeric text-2xl leading-none", alert && "text-destructive")}
      />
    </motion.div>
  );
}
