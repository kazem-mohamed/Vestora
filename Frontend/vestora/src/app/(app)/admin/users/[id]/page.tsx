"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Banknote,
  Flag,
  Handshake,
  Mail,
  RotateCcw,
  Rocket,
  ScrollText,
  ShieldAlert,
  Trash2,
  UserMinus,
} from "lucide-react";
import { ReasonDialog } from "@/components/admin/reason-dialog";
import { DashPageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { StagePill } from "@/components/invest/invest-primitives";
import { ErrorState } from "@/components/ui/error-state";
import { adminApi } from "@/lib/api/admin";
import { compactUsd, usd } from "@/lib/format/money";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { AdminUserOverview } from "@/lib/types/api";

/**
 * One account, and everything the platform can say about it.
 *
 * The order of the sections is the order the questions actually get asked: is this
 * account in trouble, who is it, what has it been doing, and what has been done to it.
 * Sections with nothing in them are not rendered — an empty "Ventures" panel on an
 * investor's page is noise pretending to be information.
 */
export default function AdminUserOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const userId = Number(id);
  const { t, locale } = useLocale();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-user-overview", userId],
    queryFn: () => adminApi.userOverview(userId),
    enabled: Number.isFinite(userId),
  });

  if (isError) return <ErrorState className="mt-6" onRetry={() => refetch()} />;
  if (isLoading || !data) return <OverviewSkeleton />;

  const { account, security, ventures, reports, deals, payments, activity } = data;

  return (
    <div className="space-y-6">
      <DashPageHeader
        title={account.userName}
        sub={account.email}
        eyebrowKey="admin.sidebar.label"
        action={
          <div className="flex items-center gap-2">
            {/* Reaching this page by search and then finding nothing to act on was the
                exact complaint this row answers — every action the list row offers is
                offered here too, on the same account the reader is already looking at. */}
            {account.userType !== "Admin" && <AccountActions account={account} />}
            <Link
              href="/admin/users"
              data-cursor="hover"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("admin.nav.users")}
            </Link>
          </div>
        }
      />

      <StatusStrip data={data} />

      {/* ---- account ---- */}
      <Panel title={t("admin.u360.account")} elevated>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label={t("admin.u360.role")} value={t(roleKey(account.userType))} />
          <Fact
            label={t("admin.u360.emailVerified")}
            value={account.isEmailVerified ? t("admin.u360.yes") : t("admin.u360.no")}
            tone={account.isEmailVerified ? undefined : "warn"}
          />
          <Fact label={t("admin.u360.joined")} value={date(account.createdAtUtc, locale)} />
          <Fact label={t("admin.u360.lastSeen")} value={date(account.lastSeenAt, locale)} />
          <Fact label={t("admin.u360.onboarded")} value={date(account.onboardedAtUtc, locale)} />
          <Fact label={t("admin.u360.phone")} value={account.phone || "—"} />
          <Fact
            label={t("admin.u360.unread")}
            value={String(data.unreadMessages)}
            icon={<Mail className="size-3.5" strokeWidth={1.8} />}
          />
          <Fact label={t("admin.u360.userId")} value={`#${account.id}`} />
        </dl>

        {account.suspensionReason && (
          <p className="mt-5 rounded-xl border border-destructive/30 bg-destructive/[0.05] px-4 py-3 text-sm">
            <span className="font-semibold text-destructive">{t("admin.u360.suspendReason")}: </span>
            {account.suspensionReason}
          </p>
        )}
      </Panel>

      {/* ---- security ---- */}
      <Panel title={t("admin.u360.security")} icon={<ShieldAlert className="size-4" strokeWidth={1.7} />}>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Fact
            label={t("admin.u360.failedLogins")}
            value={String(security.failedLoginCount)}
            tone={security.failedLoginCount >= 3 ? "warn" : undefined}
          />
          <Fact
            label={t("admin.u360.lockedOut")}
            value={security.isLockedOut ? t("admin.u360.yes") : t("admin.u360.no")}
            tone={security.isLockedOut ? "danger" : undefined}
          />
          <Fact label={t("admin.u360.lastFailed")} value={date(security.lastFailedLoginAtUtc, locale)} />
          <Fact
            label={t("admin.u360.distinctIps")}
            value={String(security.distinctIpCount)}
            tone={security.distinctIpCount >= 5 ? "warn" : undefined}
          />
        </dl>

        {security.recentEvents.length > 0 && (
          <ul className="mt-5 divide-y divide-border/50 border-t border-border/50">
            {security.recentEvents.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 text-sm">
                <span className="font-medium">{e.eventType}</span>
                {e.ipAddress && (
                  <span className="font-numeric text-xs text-muted-foreground">{e.ipAddress}</span>
                )}
                {e.details && <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{e.details}</span>}
                <span className="ms-auto font-numeric text-xs text-muted-foreground/70">
                  {date(e.createdAtUtc, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* ---- ventures ---- */}
      {ventures.length > 0 && (
        <Panel
          title={`${t("admin.u360.ventures")} (${ventures.length})`}
          icon={<Rocket className="size-4" strokeWidth={1.7} />}
          elevated
        >
          <ul className="divide-y divide-border/50">
            {ventures.map((v) => (
              <li key={v.projectId} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <Link
                  href={`/projects/${v.projectId}`}
                  data-cursor="hover"
                  className="min-w-0 flex-1 text-sm font-semibold transition-colors hover:text-primary"
                >
                  {v.name}
                  {v.isDeleted && <span className="ms-2 text-xs text-destructive">{t("admin.u360.removed")}</span>}
                </Link>

                <Tag tone={v.moderationStatus === "Approved" ? "good" : v.moderationStatus === "Rejected" ? "danger" : "warn"}>
                  {v.moderationStatus}
                </Tag>

                {v.openReports > 0 && (
                  <Tag tone="danger">
                    {v.openReports} {t("admin.u360.openReports")}
                  </Tag>
                )}

                {/* Committed and funded, side by side and never merged — the gap between
                    them is the only number on this row worth a second look. */}
                <span className="shrink-0 text-end font-numeric text-xs">
                  <span className="block">
                    <span className="text-muted-foreground">{t("fund.word.committed")} </span>
                    <span className="text-bronze">{compactUsd(v.committed)}</span>
                  </span>
                  <span className="block">
                    <span className="text-muted-foreground">{t("fund.word.funded")} </span>
                    <span className="text-primary">{compactUsd(v.funded)}</span>
                    <span className="text-muted-foreground/60"> / {compactUsd(v.goal)}</span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* ---- deals ---- */}
      {deals.length > 0 && (
        <Panel
          title={`${t("admin.u360.deals")} (${deals.length})`}
          icon={<Handshake className="size-4" strokeWidth={1.7} />}
        >
          <ul className="divide-y divide-border/50">
            {deals.map((d) => (
              <li key={d.investmentId} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 text-sm">
                <Tag tone="quiet">{t(d.side === "investor" ? "admin.u360.asInvestor" : "admin.u360.asFounder")}</Tag>

                <Link
                  href={`/deals/${d.investmentId}`}
                  data-cursor="hover"
                  className="min-w-0 flex-1 truncate font-medium transition-colors hover:text-primary"
                >
                  {d.projectName}
                  <span className="text-muted-foreground"> · {d.counterpartyName}</span>
                </Link>

                <StagePill stage={d.stage} />

                <span className="shrink-0 text-end font-numeric text-xs">
                  <span className="text-bronze">{compactUsd(d.amount)}</span>
                  {d.settled > 0 && <span className="text-primary"> · {compactUsd(d.settled)}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* ---- payments ---- */}
      <Panel title={t("admin.u360.payments")} icon={<Banknote className="size-4" strokeWidth={1.7} />}>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-5">
          <Fact label={t("fund.word.funded")} value={usd(payments.settledTotal)} />
          <Fact label={t("admin.u360.refunded")} value={usd(payments.refundedTotal)} tone={payments.refundedTotal > 0 ? "warn" : undefined} />
          <Fact label={t("admin.u360.succeeded")} value={String(payments.succeededCount)} />
          <Fact label={t("admin.u360.failed")} value={String(payments.failedCount)} tone={payments.failedCount > 0 ? "warn" : undefined} />
          <Fact label={t("admin.u360.refunds")} value={String(payments.refundedCount)} />
        </dl>

        {payments.recent.length > 0 && (
          <ul className="mt-5 divide-y divide-border/50 border-t border-border/50">
            {payments.recent.map((tx) => (
              <li key={tx.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm">
                <span className="font-numeric text-xs text-muted-foreground">{tx.reference}</span>
                <span className="min-w-0 flex-1 truncate">{tx.projectName}</span>
                <Tag tone={txTone(tx.status)}>{tx.status}</Tag>
                <span className="shrink-0 font-numeric">{usd(tx.amount)}</span>
                <span className="shrink-0 font-numeric text-xs text-muted-foreground/70">
                  {date(tx.createdAtUtc, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* ---- reports ---- */}
      {(reports.againstThemTotal > 0 || reports.filedByThemTotal > 0) && (
        <Panel title={t("admin.u360.reports")} icon={<Flag className="size-4" strokeWidth={1.7} />}>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
            <Fact
              label={t("admin.u360.againstOpen")}
              value={String(reports.againstThemOpen)}
              tone={reports.againstThemOpen > 0 ? "danger" : undefined}
            />
            <Fact label={t("admin.u360.againstTotal")} value={String(reports.againstThemTotal)} />
            <Fact label={t("admin.u360.filedByThem")} value={String(reports.filedByThemTotal)} />
          </dl>

          <ul className="mt-5 divide-y divide-border/50 border-t border-border/50">
            {reports.recent.map((r) => (
              <li key={`${r.filedByThem ? "b" : "a"}-${r.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                <Tag tone="quiet">{t(r.filedByThem ? "admin.u360.filedBy" : "admin.u360.filedAgainst")}</Tag>
                <span className="min-w-0 flex-1 truncate">{r.projectName}</span>
                <span className="text-xs text-muted-foreground">{r.reason}</span>
                <Tag tone={r.status === "Open" ? "danger" : "quiet"}>{r.status}</Tag>
                <span className="shrink-0 font-numeric text-xs text-muted-foreground/70">{date(r.createdAt, locale)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* ---- what has been done to this account ---- */}
      {activity.length > 0 && (
        <Panel
          title={t("admin.u360.adminActivity")}
          icon={<ScrollText className="size-4" strokeWidth={1.7} />}
          href="/admin/audit"
        >
          <ul className="divide-y divide-border/50">
            {activity.map((a) => (
              <li key={a.id} className="py-2.5 text-sm">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{a.action}</span>
                  <span className="text-xs text-muted-foreground">{a.adminName}</span>
                  <span className="ms-auto font-numeric text-xs text-muted-foreground/70">
                    {date(a.createdAtUtc, locale)}
                  </span>
                </span>
                {a.details && <p className="mt-0.5 text-xs text-muted-foreground">{a.details}</p>}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

/**
 * The same three actions the users list offers, reachable from the account itself.
 * Restore covers both a suspension and a deletion — the backend clears both flags
 * together, so one control is the honest shape rather than two that overlap.
 */
function AccountActions({ account }: { account: AdminUserOverview["account"] }) {
  const { t } = useLocale();
  const router = useRouter();
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState<null | "delete" | "suspend">(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-user-overview", account.id] });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["admin-analytics"] });
  };

  const del = useMutation({
    mutationFn: (reason: string) => adminApi.deleteUser(account.id, reason),
    onSuccess: (r) => {
      toast.success(r.message || t("admin.users.deleted"));
      // The account just left the platform's normal view — the overview page is no
      // longer where a reader would expect to land.
      router.push("/admin/users");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const suspend = useMutation({
    mutationFn: (reason: string) => adminApi.suspendUser(account.id, reason),
    onSuccess: () => {
      toast.success(t("admin.users.suspended"));
      setPrompt(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const restore = useMutation({
    mutationFn: () => adminApi.restoreUser(account.id),
    onSuccess: () => {
      toast.success(t("admin.users.restored"));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = del.isPending || suspend.isPending || restore.isPending;
  const needsRestore = account.isSuspended || account.isDeleted;

  return (
    <>
      {needsRestore ? (
        <button
          type="button"
          data-cursor="hover"
          disabled={busy}
          onClick={() => restore.mutate()}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/[0.08] px-4 py-2 text-sm text-primary transition-colors hover:bg-primary/[0.14] disabled:opacity-50"
        >
          <RotateCcw className="size-3.5" />
          {t("admin.users.restore")}
        </button>
      ) : (
        <>
          <button
            type="button"
            data-cursor="hover"
            disabled={busy}
            onClick={() => setPrompt("suspend")}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-bronze/50 hover:text-bronze disabled:opacity-50"
          >
            <UserMinus className="size-3.5" />
            {t("admin.users.suspend")}
          </button>
          <button
            type="button"
            data-cursor="hover"
            disabled={busy}
            onClick={() => setPrompt("delete")}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive disabled:opacity-50"
          >
            <Trash2 className="size-3.5" />
            {t("mine.delete")}
          </button>
        </>
      )}

      <ReasonDialog
        open={prompt !== null}
        onOpenChange={(v) => !v && setPrompt(null)}
        title={t(prompt === "suspend" ? "admin.reason.suspendUser.title" : "admin.reason.deleteUser.title")}
        body={t(prompt === "suspend" ? "admin.reason.suspendUser.body" : "admin.reason.deleteUser.body")}
        confirmLabel={t(prompt === "suspend" ? "admin.reason.suspendUser.confirm" : "admin.reason.deleteUser.confirm")}
        pending={busy}
        onConfirm={(reason) => (prompt === "suspend" ? suspend.mutate(reason) : del.mutate(reason))}
      />
    </>
  );
}

/**
 * The reasons this account might need a human, and nothing else.
 *
 * Rendered only when one of them is true, so its presence is itself the signal.
 */
function StatusStrip({ data }: { data: AdminUserOverview }) {
  const { t } = useLocale();
  const { account, security, reports, payments } = data;

  const flags: { key: string; label: string; tone: "danger" | "warn" }[] = [];
  if (account.isDeleted) flags.push({ key: "deleted", label: t("admin.u360.flag.deleted"), tone: "danger" });
  if (account.isSuspended) flags.push({ key: "susp", label: t("admin.u360.flag.suspended"), tone: "danger" });
  if (account.deletedAtUtc) flags.push({ key: "self", label: t("admin.u360.flag.selfDeleted"), tone: "warn" });
  if (security.isLockedOut) flags.push({ key: "lock", label: t("admin.u360.flag.lockedOut"), tone: "danger" });
  if (!account.isEmailVerified) flags.push({ key: "ver", label: t("admin.u360.flag.unverified"), tone: "warn" });
  if (reports.againstThemOpen > 0)
    flags.push({ key: "rep", label: `${reports.againstThemOpen} ${t("admin.u360.openReports")}`, tone: "danger" });
  if (payments.failedCount > 0)
    flags.push({ key: "fail", label: `${payments.failedCount} ${t("admin.u360.failedPayments")}`, tone: "warn" });

  if (flags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {flags.map((f) => (
        <span
          key={f.key}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium",
            f.tone === "danger"
              ? "border-destructive/40 bg-destructive/[0.06] text-destructive"
              : "border-bronze/40 bg-bronze/[0.06] text-bronze"
          )}
        >
          {f.label}
        </span>
      ))}
    </div>
  );
}

function Fact({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone?: "warn" | "danger";
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1.5 font-numeric text-sm",
          tone === "danger" && "text-destructive",
          tone === "warn" && "text-bronze"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Tag({ tone, children }: { tone: "good" | "warn" | "danger" | "quiet"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] leading-5",
        tone === "good" && "border-primary/35 text-primary",
        tone === "warn" && "border-bronze/40 text-bronze",
        tone === "danger" && "border-destructive/40 text-destructive",
        tone === "quiet" && "border-border text-muted-foreground"
      )}
    >
      {children}
    </span>
  );
}

function txTone(status: string): "good" | "warn" | "danger" | "quiet" {
  if (status === "Succeeded") return "good";
  if (status === "Failed") return "danger";
  if (status === "Refunded") return "warn";
  return "quiet";
}

function roleKey(userType: string): string {
  if (userType === "Innovator") return "profile.role.innovator";
  if (userType === "Admin") return "profile.role.admin";
  return "profile.role.investor";
}

function date(iso: string | null, locale: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton-shimmer h-16 rounded-2xl" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="skeleton-shimmer h-40 rounded-2xl" />
      ))}
    </div>
  );
}
