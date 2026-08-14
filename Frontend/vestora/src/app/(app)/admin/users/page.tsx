"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BadgeCheck, RotateCcw, Search, ShieldPlus, Trash2, UserMinus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReasonDialog } from "@/components/admin/reason-dialog";
import { DashPageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { ErrorState } from "@/components/ui/error-state";
import { PillButton } from "@/components/ui/pill-button";
import { adminApi } from "@/lib/api/admin";
import { avatarUrl } from "@/lib/api/users";
import { useAdminUsers } from "@/lib/hooks/use-admin";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;
const TYPES = ["", "Investor", "Innovator", "Admin"] as const;

function initials(name: string): string {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function Avatar({ id, name }: { id: number; name: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary ring-1 ring-border">
      {!failed ? (
        <img src={avatarUrl(id)} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <span className="text-[10px] text-primary" style={{ fontFamily: "var(--font-heading)" }}>{initials(name)}</span>
      )}
    </span>
  );
}

function Row({ u, index }: { u: AdminUser; index: number }) {
  const { t } = useLocale();
  const qc = useQueryClient();
  // Which justification is being asked for, if any. Both actions need one, and the
  // dialog is the same — only the copy and the mutation differ.
  const [prompt, setPrompt] = useState<null | "delete" | "suspend">(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["admin-analytics"] });
    qc.invalidateQueries({ queryKey: ["admin-security"] });
    qc.invalidateQueries({ queryKey: ["admin-audit"] });
  };

  const del = useMutation({
    mutationFn: (reason: string) => adminApi.deleteUser(u.id, reason),
    onSuccess: (r) => {
      toast.success(r.message || t("admin.users.deleted"));
      setPrompt(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Suspension is the reversible middle ground between "leave alone" and delete.
  const suspend = useMutation({
    mutationFn: (reason: string) => adminApi.suspendUser(u.id, reason),
    onSuccess: () => {
      toast.success(t("admin.users.suspended"));
      setPrompt(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const restore = useMutation({
    mutationFn: () => adminApi.restoreUser(u.id),
    onSuccess: () => {
      toast.success(t("admin.users.restored"));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = del.isPending || suspend.isPending || restore.isPending;

  const roleKey =
    u.userType === "Innovator" ? "profile.role.innovator" : u.userType === "Admin" ? "profile.role.admin" : "profile.role.investor";

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: (index % 12) * 0.03, ease: EASE }}
      className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-foreground/[0.03]"
    >
      {/* The admin view, not the public profile: an administrator opening a row is
          asking what is going on with the account, not what it looks like to visitors. */}
      <Link href={`/admin/users/${u.id}`} data-cursor="hover" className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar id={u.id} name={u.userName} />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className={cn("truncate text-sm font-semibold", u.isSuspended && "text-muted-foreground line-through")}>
              {u.userName}
            </span>
            {u.isEmailVerified && <BadgeCheck className="size-3.5 shrink-0 text-primary" />}
            {u.isSuspended && (
              <span className="shrink-0 rounded-full border border-destructive/40 bg-destructive/[0.08] px-2 py-0.5 text-[10px] font-medium text-destructive">
                {t("admin.users.suspendedBadge")}
              </span>
            )}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
        </span>
      </Link>

      <span
        className={cn(
          "hidden shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] sm:inline-block",
          u.userType === "Admin" ? "border-bronze/40 text-bronze" : "border-primary/30 text-primary/90"
        )}
      >
        {t(roleKey)}
      </span>

      {u.userType === "Admin" ? (
        <span className="grid size-9 shrink-0 place-items-center text-muted-foreground/40" title={t("admin.users.protected")}>
          <Trash2 className="size-4" />
        </span>
      ) : (
        <span className="flex shrink-0 items-center gap-1.5">
          {u.isSuspended ? (
            <button
              type="button"
              data-cursor="hover"
              disabled={busy}
              onClick={() => restore.mutate()}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/[0.08] px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary/[0.14] disabled:opacity-50"
            >
              <RotateCcw className="size-3.5" />
              {t("admin.users.restore")}
            </button>
          ) : (
            <button
              type="button"
              data-cursor="hover"
              disabled={busy}
              aria-label={t("admin.users.suspend")}
              onClick={() => setPrompt("suspend")}
              className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-bronze/50 hover:text-bronze disabled:opacity-50"
            >
              <UserMinus className="size-4" />
            </button>
          )}
          <button
            type="button"
            data-cursor="hover"
            aria-label={t("mine.delete")}
            onClick={() => setPrompt("delete")}
            className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        </span>
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
    </motion.li>
  );
}

function CreateAdminDialog() {
  const { t } = useLocale();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const canSubmit = userName.trim().length >= 2 && /\S+@\S+\.\S+/.test(email) && password.length >= 8;

  const create = useMutation({
    mutationFn: () => adminApi.createAdmin({ userName: userName.trim(), email: email.trim(), password }),
    onSuccess: (r) => {
      toast.success(r.message || t("admin.users.createAdmin.done"));
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-analytics"] });
      setOpen(false);
      setUserName("");
      setEmail("");
      setPassword("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const inputCls =
    "w-full rounded-xl border border-input bg-card/60 px-4 py-2.5 text-sm outline-none backdrop-blur-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25";

  return (
    <>
      <PillButton size="sm" showArrow={false} onClick={() => setOpen(true)}>
        <ShieldPlus className="size-4" strokeWidth={1.8} />
        {t("admin.users.createAdmin.cta")}
      </PillButton>

      <Dialog open={open} onOpenChange={(o) => !create.isPending && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.users.createAdmin.title")}</DialogTitle>
            <DialogDescription>{t("admin.users.createAdmin.sub")}</DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-3">
            <input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder={t("admin.users.createAdmin.name")}
              maxLength={100}
              className={inputCls}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("admin.users.createAdmin.email")}
              dir="ltr"
              className={inputCls}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("admin.users.createAdmin.password")}
              dir="ltr"
              minLength={8}
              className={inputCls}
            />
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("form.cancel")}
            </button>
            <button
              type="button"
              disabled={!canSubmit || create.isPending}
              onClick={() => create.mutate()}
              className="gold-cta rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
            >
              {create.isPending ? t("admin.users.createAdmin.creating") : t("admin.users.createAdmin.submit")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AdminUsersPage() {
  const { t } = useLocale();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search, 300);
  const { data, isLoading, isError, refetch } = useAdminUsers(debounced, type, page);

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <DashPageHeader
        title={t("admin.users.title")}
        sub={t("admin.users.sub")}
        eyebrowKey="admin.sidebar.label"
        action={<CreateAdminDialog />}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("admin.users.search")}
            className="w-full rounded-full border border-input bg-card/60 py-2.5 ps-10 pe-4 text-sm outline-none backdrop-blur-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
          />
        </div>
        <div className="flex gap-2">
          {TYPES.map((ty) => (
            <button
              key={ty || "all"}
              type="button"
              data-cursor="hover"
              onClick={() => {
                setType(ty);
                setPage(1);
              }}
              className={cn(
                "rounded-full border px-3.5 py-2 text-xs transition-colors",
                type === ty ? "border-primary/50 bg-primary/[0.08] text-foreground" : "border-border/70 text-muted-foreground hover:text-foreground"
              )}
            >
              {ty === "" ? t("proj.filter.all") : t(ty === "Innovator" ? "profile.role.innovator" : ty === "Admin" ? "profile.role.admin" : "profile.role.investor")}
            </button>
          ))}
        </div>
      </div>

      <Panel elevated>
        {isLoading && !data ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer h-14 rounded-xl" />
            ))}
          </div>
        ) : isError && !data ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data || data.items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("admin.users.empty")}</p>
        ) : (
          <>
            <ul className="divide-y divide-border/50">
              {data.items.map((u, i) => (
                <Row key={u.id} u={u} index={i} />
              ))}
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
