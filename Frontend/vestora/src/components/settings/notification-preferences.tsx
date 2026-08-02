"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { Bell, Lock } from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/lib/api/auth";
import { usersApi } from "@/lib/api/users";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

interface Prefs {
  notifyOnFollow: boolean;
  notifyOnProjectUpdate: boolean;
}

/**
 * Which notifications a member may switch off.
 *
 * Only the ambient ones. The four support notifications — a request arriving, a
 * request submitted, an approval, a decline — carry the decisions the whole
 * relationship pipeline runs on. A founder who muted "an investor wants to back
 * you" would simply stop receiving the product, so those are stated as always on
 * rather than hidden, and the reason is given.
 */
export function NotificationPreferences() {
  const { t } = useLocale();
  const reduce = useReducedMotion() ?? false;
  const qc = useQueryClient();

  const me = useQuery({ queryKey: ["me"], queryFn: () => authApi.me() });

  // The server is the source of truth; `pending` is only the in-flight override
  // that makes the switch answer instantly. Derived rather than synced, so there
  // is no effect copying server state into local state and no cascading render.
  const [pending, setPending] = useState<Prefs | null>(null);

  const follow = pending?.notifyOnFollow ?? me.data?.notifyOnFollow ?? true;
  const updates = pending?.notifyOnProjectUpdate ?? me.data?.notifyOnProjectUpdate ?? true;

  const save = useMutation({
    mutationFn: (next: Prefs) => usersApi.updateMe(next),
    onSuccess: () => toast.success(t("aset.notif.saved")),
    onError: (e: Error) => toast.error(e.message),
    // Either way, drop the override and let the refetched profile speak — a
    // failed save visibly returns the switch to where it really is.
    onSettled: () => {
      setPending(null);
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  function toggle(which: "follow" | "updates", value: boolean) {
    const next: Prefs = {
      notifyOnFollow: which === "follow" ? value : follow,
      notifyOnProjectUpdate: which === "updates" ? value : updates,
    };
    setPending(next);
    save.mutate(next);
  }

  return (
    <motion.section
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.26, ease: EASE }}
      className="relative mt-6 overflow-hidden rounded-2xl border border-border bg-card/50 backdrop-blur-sm"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
      />
      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-2.5">
          <Bell className="size-4 text-primary" strokeWidth={1.8} />
          <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            {t("aset.notif.title")}
          </h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t("aset.notif.body")}</p>

        <div className="mt-6 divide-y divide-border/60">
          <Toggle
            id="notify-updates"
            label={t("aset.notif.updates")}
            hint={t("aset.notif.updates.hint")}
            checked={updates}
            disabled={me.isLoading}
            onChange={(v) => toggle("updates", v)}
            reduce={reduce}
          />
          <Toggle
            id="notify-follow"
            label={t("aset.notif.follow")}
            hint={t("aset.notif.follow.hint")}
            checked={follow}
            disabled={me.isLoading}
            onChange={(v) => toggle("follow", v)}
            reduce={reduce}
          />
        </div>

        {/* Say what cannot be turned off, and why — silence here would read as
            a missing feature rather than a deliberate line. */}
        <div className="mt-6 flex gap-3 rounded-xl border border-dashed border-border bg-background/40 px-4 py-3.5">
          <Lock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.8} />
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">{t("aset.notif.always")}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t("aset.notif.always.hint")}
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function Toggle({
  id,
  label,
  hint,
  checked,
  disabled,
  onChange,
  reduce,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  reduce: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-5 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium">
          {label}
        </label>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>
      </div>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        data-cursor="hover"
        onClick={() => onChange(!checked)}
        className={cn(
          // 44px tall hit area around a 28px track — comfortable on touch without
          // an oversized control.
          "relative grid h-11 w-14 shrink-0 place-items-center rounded-full outline-none",
          "focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-50"
        )}
      >
        <span
          className={cn(
            "relative h-7 w-12 rounded-full transition-colors duration-300",
            checked ? "bg-primary" : "bg-secondary ring-1 ring-inset ring-border"
          )}
        >
          <motion.span
            layout={!reduce}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 34 }}
            className={cn(
              "absolute top-1 size-5 rounded-full shadow-sm",
              checked ? "bg-primary-foreground" : "bg-muted-foreground/70"
            )}
            style={checked ? { insetInlineEnd: "0.25rem" } : { insetInlineStart: "0.25rem" }}
          />
        </span>
      </button>
    </div>
  );
}
