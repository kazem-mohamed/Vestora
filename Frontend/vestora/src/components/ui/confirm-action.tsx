"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * A destructive action that asks first, without a dialog.
 *
 * Vestora's heavier destructive flows — closing a round, deleting an account, declining
 * a request — correctly use a modal, because those are decisions someone should stop and
 * read. But deleting your own comment is not that decision, and a modal for it is
 * friction theatre. What it also should not be is what it was: an immediate,
 * unrecoverable delete on a single click of a small trash icon.
 *
 * So the control replaces itself in place. The icon slides out, a confirm and a cancel
 * slide in, and anything else — Escape, clicking away, eight seconds of nothing —
 * returns it to rest. The cancel is what receives focus, so a stray Enter cannot
 * complete the delete.
 */
export function ConfirmAction({
  onConfirm,
  pending,
  label,
  confirmLabel,
  children,
  className,
}: {
  onConfirm: () => void;
  pending?: boolean;
  /** Accessible name for the resting trigger. */
  label: string;
  /** Accessible name for the confirm step. */
  confirmLabel?: string;
  /** The resting control — usually an icon. */
  children: React.ReactNode;
  className?: string;
}) {
  const { t } = useLocale();
  const reduce = useReducedMotion() ?? false;
  const [armed, setArmed] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!armed) return;

    // Focus lands on cancel, never confirm: a stray Enter should back out of a
    // delete, not complete one.
    cancelRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setArmed(false);
    }
    function onDown(e: MouseEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setArmed(false);
    }
    // Disarms itself, so a forgotten half-pressed delete does not sit waiting.
    const timer = window.setTimeout(() => setArmed(false), 8000);

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      window.clearTimeout(timer);
    };
  }, [armed]);

  return (
    <span ref={wrap} className={cn("relative inline-flex items-center", className)}>
      <AnimatePresence mode="wait" initial={false}>
        {!armed ? (
          <motion.button
            key="rest"
            type="button"
            data-cursor="hover"
            aria-label={label}
            onClick={() => setArmed(true)}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="grid size-7 place-items-center rounded-full text-muted-foreground/60 outline-none transition-colors duration-300 hover:bg-destructive/10 hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/25"
          >
            {children}
          </motion.button>
        ) : (
          <motion.span
            key="armed"
            initial={reduce ? { opacity: 0 } : { opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, width: 0 }}
            transition={{ duration: 0.24, ease: EASE }}
            className="flex items-center gap-1 overflow-hidden whitespace-nowrap"
          >
            <button
              ref={cancelRef}
              type="button"
              data-cursor="hover"
              aria-label={t("form.cancel")}
              onClick={() => setArmed(false)}
              className="grid size-7 place-items-center rounded-full border border-border text-muted-foreground outline-none transition-colors duration-300 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/25"
            >
              <X className="size-3" strokeWidth={2.4} />
            </button>
            <button
              type="button"
              data-cursor="hover"
              disabled={pending}
              aria-label={confirmLabel ?? label}
              onClick={onConfirm}
              className="inline-flex h-7 items-center gap-1 rounded-full bg-destructive px-2.5 text-[11px] font-semibold text-white outline-none transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-60"
            >
              <Check className="size-3" strokeWidth={2.6} />
              {t("confirm.sure")}
            </button>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
