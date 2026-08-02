"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { NotificationPreferences } from "@/components/settings/notification-preferences";
import { DangerZone } from "@/components/settings/danger-zone";
import { PillButton } from "@/components/ui/pill-button";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const MIN_LENGTH = 8;

/**
 * Account security.
 *
 * `POST /api/auth/change-password` and `authApi.changePassword` have both existed
 * since the auth work, with no page calling either — so nobody on Vestora could
 * change their password, and the only alternative route (forgot-password) depends
 * on the disabled SMTP. This is that missing surface.
 */
export default function AccountSettingsPage() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;
  const user = useAuthStore((s) => s.user);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reveal, setReveal] = useState(false);

  const longEnough = next.length >= MIN_LENGTH;
  const matches = confirm.length > 0 && next === confirm;
  const differs = next.length > 0 && next !== current;
  const ready = current.length > 0 && longEnough && matches && differs;

  const change = useMutation({
    mutationFn: () =>
      authApi.changePassword({
        currentPassword: current,
        newPassword: next,
        confirmNewPassword: confirm,
      }),
    onSuccess: () => {
      toast.success(t("aset.pw.saved"));
      setCurrent("");
      setNext("");
      setConfirm("");
      setReveal(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12 sm:py-16">
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <p
          className={cn(
            "text-[11px] text-primary",
            rtl ? "" : "uppercase tracking-[0.3em]"
          )}
        >
          {t("aset.eyebrow")}
        </p>
        <h1
          className={cn(
            "mt-4 text-3xl font-bold sm:text-4xl",
            rtl ? "leading-[1.4]" : "leading-tight tracking-[-0.02em]"
          )}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {t("aset.title")}
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">{t("aset.subtitle")}</p>
      </motion.div>

      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
        className="mt-8"
      >
        <SettingsTabs />
      </motion.div>

      {/* Identity — read-only, so the user knows which account they are securing. */}
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.14, ease: EASE }}
        className="mt-8 flex items-center gap-3 rounded-2xl border border-border/70 bg-card/40 px-5 py-4"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/[0.08] text-primary">
          <ShieldCheck className="size-[18px]" strokeWidth={1.7} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user?.email}</p>
          <p className="text-xs text-muted-foreground">{t("aset.signedInAs")}</p>
        </div>
      </motion.div>

      {/* Password */}
      <motion.section
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
        className="relative mt-6 overflow-hidden rounded-2xl border border-border bg-card/50 backdrop-blur-sm"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
        />
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <KeyRound className="size-4 text-primary" strokeWidth={1.8} />
            <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-heading)" }}>
              {t("aset.pw.title")}
            </h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{t("aset.pw.body")}</p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (ready && !change.isPending) change.mutate();
            }}
          >
            <Field
              id="current-password"
              label={t("aset.pw.current")}
              value={current}
              onChange={setCurrent}
              reveal={reveal}
              autoComplete="current-password"
              rtl={rtl}
            />

            <Field
              id="new-password"
              label={t("aset.pw.new")}
              value={next}
              onChange={setNext}
              reveal={reveal}
              autoComplete="new-password"
              rtl={rtl}
              trailing={
                <button
                  type="button"
                  onClick={() => setReveal((v) => !v)}
                  aria-label={reveal ? t("aset.pw.hide") : t("aset.pw.show")}
                  data-cursor="hover"
                  className={cn(
                    "absolute top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground",
                    rtl ? "left-1.5" : "right-1.5"
                  )}
                >
                  {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
            />

            <Field
              id="confirm-password"
              label={t("aset.pw.confirm")}
              value={confirm}
              onChange={setConfirm}
              reveal={reveal}
              autoComplete="new-password"
              rtl={rtl}
            />

            {/* Live requirements — the rules are visible before submitting, not
                delivered as a server error afterwards. */}
            <ul className="space-y-1.5 pt-1">
              <Rule met={longEnough} label={t("aset.pw.rule.length").replace("{n}", String(MIN_LENGTH))} />
              <Rule met={differs} label={t("aset.pw.rule.different")} />
              <Rule met={matches} label={t("aset.pw.rule.match")} />
            </ul>

            <div className="flex items-center gap-4 pt-2">
              <PillButton
                type="submit"
                size="lg"
                disabled={!ready || change.isPending}
                showArrow={false}
              >
                {change.isPending ? t("aset.pw.saving") : t("aset.pw.save")}
              </PillButton>
            </div>
          </form>
        </div>
      </motion.section>

      <NotificationPreferences />

      <DangerZone />
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  reveal,
  autoComplete,
  rtl,
  trailing,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  reveal: boolean;
  autoComplete: string;
  rtl: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={reveal ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "h-12 w-full rounded-xl border border-input bg-card/60 px-4 text-sm outline-none backdrop-blur-sm",
            "transition-colors duration-300 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25",
            trailing && (rtl ? "pl-12" : "pr-12")
          )}
        />
        {trailing}
      </div>
    </div>
  );
}

function Rule({ met, label }: { met: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      <span
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded-full transition-colors duration-300",
          met ? "bg-primary/15 text-primary" : "bg-foreground/[0.06] text-transparent"
        )}
      >
        <Check className="size-2.5" strokeWidth={3} />
      </span>
      <span className={cn("transition-colors duration-300", met ? "text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
    </li>
  );
}
