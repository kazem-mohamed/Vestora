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

/**
 * The changed fields, either side of the action.
 *
 * Rendered only where the two differ. An action that touched three columns and moved one
 * of them should show one line, not three — the pair is stored so the reader can see
 * what changed, and printing what stayed the same buries it.
 */
function Diff({ before, after }: { before: string | null; after: string | null }) {
  const { t } = useLocale();
  if (!before && !after) return null;

  let b: Record<string, unknown> = {};
  let a: Record<string, unknown> = {};
  try {
    b = before ? JSON.parse(before) : {};
    a = after ? JSON.parse(after) : {};
  } catch {
    // A row written by an older build, or hand-edited. Showing nothing is better than
    // showing a parser error in a moderation trail.
    return null;
  }

  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)])).filter(
    (k) => JSON.stringify(b[k]) !== JSON.stringify(a[k])
  );
  if (keys.length === 0) return null;

  const show = (v: unknown) =>
    v === null || v === undefined || v === "" ? "—" : typeof v === "boolean" ? String(v) : String(v);

  return (
    <ul className="mt-2 space-y-1 rounded-lg border border-border/60 bg-background/40 px-3 py-2">
      {keys.map((k) => (
        <li key={k} className="flex flex-wrap items-baseline gap-x-2 text-[11px]">
          <span className="text-muted-foreground">{k}</span>
          <span className="font-numeric text-muted-foreground/70 line-through">{show(b[k])}</span>
          <span className="text-muted-foreground/50">→</span>
          <span className="font-numeric text-foreground">{show(a[k])}</span>
        </li>
      ))}
      <li className="sr-only">{t("admin.audit.diff")}</li>
    </ul>
  );
}

export default function AdminAuditPage() {
  const { t, locale } = useLocale();
  const [page, setPage] = useState(1);
  const [adminId, setAdminId] = useState<number | undefined>();
  const [action, setAction] = useState<string | undefined>();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const q = useQuery({
    queryKey: ["admin-audit", page, adminId, action, from, to],
    queryFn: () =>
      adminApi.auditLog({
        page,
        pageSize: 30,
        adminId,
        action,
        from: from || undefined,
        to: to || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const facets = q.data?.facets;
  const filtered = adminId != null || action != null || from !== "" || to !== "";

  function reset() {
    setAdminId(undefined);
    setAction(undefined);
    setFrom("");
    setTo("");
    setPage(1);
  }

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

      {/* Filters, built from what the table actually contains. */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/60 bg-card/40 p-4">
        <label className="flex min-w-40 flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {t("admin.audit.filter.admin")}
          </span>
          <select
            value={adminId ?? ""}
            onChange={(e) => {
              setAdminId(e.target.value ? Number(e.target.value) : undefined);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-input bg-card/60 px-3 text-sm outline-none focus-visible:border-primary/60"
          >
            <option value="">{t("admin.audit.filter.any")}</option>
            {facets?.admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-40 flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {t("admin.audit.filter.action")}
          </span>
          <select
            value={action ?? ""}
            onChange={(e) => {
              setAction(e.target.value || undefined);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-input bg-card/60 px-3 text-sm outline-none focus-visible:border-primary/60"
          >
            <option value="">{t("admin.audit.filter.any")}</option>
            {facets?.actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {t("admin.audit.filter.from")}
          </span>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-input bg-card/60 px-3 text-sm outline-none focus-visible:border-primary/60"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {t("admin.audit.filter.to")}
          </span>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-input bg-card/60 px-3 text-sm outline-none focus-visible:border-primary/60"
          />
        </label>

        {filtered && (
          <button
            type="button"
            data-cursor="hover"
            onClick={reset}
            className="h-9 rounded-full border border-border px-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("admin.audit.filter.clear")}
          </button>
        )}
      </div>

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
                      {/* The reason gets its own line and its own weight. It is the field
                          a support conversation quotes back, not a footnote to Details. */}
                      {e.reason && (
                        <p className="mt-1 text-xs">
                          <span className="text-muted-foreground">{t("admin.reason.label")}: </span>
                          <span className="text-foreground">{e.reason}</span>
                        </p>
                      )}
                      <Diff before={e.beforeJson} after={e.afterJson} />
                    </div>
                    <span className="shrink-0 text-end">
                      <span className="block font-numeric text-[11px] text-muted-foreground/70">
                        {dtf.format(new Date(e.createdAtUtc))}
                      </span>
                      {e.ipAddress && (
                        <span className="mt-0.5 block font-numeric text-[10px] text-muted-foreground/50">
                          {e.ipAddress}
                        </span>
                      )}
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
