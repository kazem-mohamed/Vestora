"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ScrollText, ShieldCheck, Trash2, Stamp, UserPlus, UserMinus, RotateCcw } from "lucide-react";
import { DashPageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { ProfileEmptyState } from "@/components/profile/profile-empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { adminApi } from "@/lib/api/admin";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Action → icon + tone. Destructive actions read red, approvals gold. */
function actionMeta(action: string) {
  if (/Delete/i.test(action)) return { Icon: Trash2, tone: "border-destructive/40 bg-destructive/[0.06] text-destructive" };
  if (/Suspend/i.test(action)) return { Icon: UserMinus, tone: "border-destructive/40 bg-destructive/[0.06] text-destructive" };
  if (/Restore/i.test(action)) return { Icon: RotateCcw, tone: "border-primary/40 bg-primary/[0.07] text-primary" };
  if (/Approve/i.test(action)) return { Icon: Stamp, tone: "border-primary/40 bg-primary/[0.07] text-primary" };
  if (/Reject|Dismiss/i.test(action)) return { Icon: Stamp, tone: "border-bronze/40 bg-bronze/[0.06] text-bronze" };
  if (/CreateAdmin/i.test(action)) return { Icon: UserPlus, tone: "border-primary/40 bg-primary/[0.07] text-primary" };
  return { Icon: ShieldCheck, tone: "border-border text-muted-foreground" };
}

/** Deep-link to whatever the action touched, when it still exists. */
function targetHref(targetType: string, targetId: number | null): string | null {
  if (targetId == null) return null;
  if (/Project/i.test(targetType)) return `/projects/${targetId}`;
  if (/User/i.test(targetType)) return `/u/${targetId}`;
  return null;
}

export default function AdminAuditPage() {
  const { t, locale } = useLocale();
  const [page, setPage] = useState(1);

  const q = useQuery({
    queryKey: ["admin-audit", page],
    queryFn: () => adminApi.auditLog({ page, pageSize: 30 }),
    placeholderData: (prev) => prev,
  });

  const items = q.data?.items ?? [];
  const totalPages = q.data ? Math.max(1, Math.ceil(q.data.totalCount / q.data.pageSize)) : 1;

  const dtf = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="space-y-6">
      <DashPageHeader
        title={t("admin.audit.title")}
        sub={t("admin.audit.sub")}
        eyebrowKey="admin.sidebar.label"
      />

      <Panel elevated>
        {q.isLoading && !q.data ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer h-14 rounded-xl" />
            ))}
          </div>
        ) : q.isError ? (
          <ErrorState onRetry={() => q.refetch()} />
        ) : items.length === 0 ? (
          <ProfileEmptyState
            compact
            icon={ScrollText}
            title={t("admin.audit.empty")}
            body={t("admin.audit.emptySub")}
          />
        ) : (
          <>
            <ul className="divide-y divide-border/50">
              {items.map((e, i) => {
                const { Icon, tone } = actionMeta(e.action);
                const href = targetHref(e.targetType, e.targetId);
                return (
                  <motion.li
                    key={e.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: (i % 12) * 0.03, ease: EASE }}
                    className="flex items-start gap-3 px-2 py-3"
                  >
                    <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border", tone)}>
                      <Icon className="size-3.5" strokeWidth={1.7} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-semibold">{e.adminName}</span>{" "}
                        <span className="text-muted-foreground">{e.action}</span>{" "}
                        {href ? (
                          <Link href={href} data-cursor="hover" className="text-foreground underline-offset-4 hover:text-primary hover:underline">
                            {e.targetType} #{e.targetId}
                          </Link>
                        ) : (
                          <span className="text-foreground">
                            {e.targetType}
                            {e.targetId != null && ` #${e.targetId}`}
                          </span>
                        )}
                      </p>
                      {e.details && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{e.details}</p>
                      )}
                    </div>
                    <span className="shrink-0 font-numeric text-[11px] text-muted-foreground/70">
                      {dtf.format(new Date(e.createdAtUtc))}
                    </span>
                  </motion.li>
                );
              })}
            </ul>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-4 text-sm">
                <button
                  type="button"
                  data-cursor="hover"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-full border border-border px-4 py-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                >
                  {t("proj.page.prev")}
                </button>
                <span className="font-numeric text-xs text-muted-foreground">
                  {t("proj.page.label")} {page} {t("proj.page.of")} {totalPages}
                </span>
                <button
                  type="button"
                  data-cursor="hover"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-full border border-border px-4 py-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                >
                  {t("proj.page.next")}
                </button>
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
