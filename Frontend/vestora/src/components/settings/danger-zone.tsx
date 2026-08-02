"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usersApi } from "@/lib/api/users";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Closing an account.
 *
 * Two guards, both deliberate: the consequences are listed before the button is
 * reachable, and the password is required at the point of no return. The copy
 * states what actually happens rather than implying a clean erase — commitments
 * and conversations are shared records, and the other party keeps their half.
 */
export function DangerZone() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const isFounder = user?.userType === "Innovator";

  const close = useMutation({
    mutationFn: () => usersApi.deleteMe(password),
    onSuccess: (r) => {
      toast.success(r.message || t("aset.delete.done"));
      clearSession();
      router.replace("/goodbye");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <motion.section
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.32, ease: EASE }}
        className="relative mt-6 overflow-hidden rounded-2xl border border-destructive/25 bg-destructive/[0.03]"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-destructive/50 to-transparent"
        />
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-4 text-destructive" strokeWidth={1.8} />
            <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-heading)" }}>
              {t("aset.delete.title")}
            </h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{t("aset.delete.body")}</p>

          <ul className="mt-5 space-y-2">
            {[
              "aset.delete.effect.access",
              isFounder ? "aset.delete.effect.listings" : "aset.delete.effect.requests",
              "aset.delete.effect.history",
            ].map((k) => (
              <li key={k} className="flex gap-2.5 text-xs leading-relaxed text-muted-foreground">
                <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-destructive/60" />
                {t(k)}
              </li>
            ))}
          </ul>

          <button
            type="button"
            data-cursor="hover"
            onClick={() => {
              setPassword("");
              setOpen(true);
            }}
            className={cn(
              "mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-destructive/40 px-5 text-sm text-destructive outline-none",
              "transition-colors duration-300 hover:border-destructive hover:bg-destructive/[0.07]",
              "focus-visible:ring-3 focus-visible:ring-ring/25"
            )}
          >
            <Trash2 className="size-4" strokeWidth={1.8} />
            {t("aset.delete.cta")}
          </button>
        </div>
      </motion.section>

      <Dialog open={open} onOpenChange={(o) => !close.isPending && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("aset.delete.confirm.title")}</DialogTitle>
            <DialogDescription>{t("aset.delete.confirm.body")}</DialogDescription>
          </DialogHeader>

          <form
            className="mt-2 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (password && !close.isPending) close.mutate();
            }}
          >
            <div>
              <label htmlFor="delete-password" className="mb-1.5 block text-xs text-muted-foreground">
                {t("aset.delete.confirm.password")}
              </label>
              <input
                id="delete-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-xl border border-input bg-card/60 px-4 text-sm outline-none backdrop-blur-sm transition-colors focus-visible:border-destructive/60 focus-visible:ring-3 focus-visible:ring-destructive/20"
              />
            </div>

            <div className={cn("flex items-center gap-3 pt-1", rtl && "flex-row-reverse")}>
              <button
                type="submit"
                data-cursor="hover"
                disabled={!password || close.isPending}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-destructive px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {close.isPending ? t("aset.delete.confirm.working") : t("aset.delete.confirm.cta")}
              </button>
              <button
                type="button"
                data-cursor="hover"
                disabled={close.isPending}
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                {t("aset.delete.confirm.cancel")}
              </button>
            </div>
          </form>

          <AnimatePresence>
            {close.isError && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden text-xs text-destructive"
              >
                {close.error.message}
              </motion.p>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
}
