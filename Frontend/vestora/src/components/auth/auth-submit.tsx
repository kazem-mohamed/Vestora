"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The submit control, and the whole visible half of the submit sequence.
 *
 * The brief was to stop shipping "the button disables and a spinner appears". So:
 *
 * **No layout shift.** The label swaps between rest and pending, but the button holds a
 * `min-width` and the label sits in a grid cell that both strings share, so the widest of
 * the two reserves the space once. A spinner is never inserted into the flow — the
 * progress lives in a hairline that sweeps the button's own top edge, occupying no space
 * at all.
 *
 * **No double submit.** `disabled` alone is not enough: a keyboard Enter held down can
 * fire twice before React commits the re-render. The caller guards on its own submitting
 * flag as well, and this button additionally reports `aria-busy` so assistive tech knows
 * the press registered.
 *
 * **Slow connections are named.** After 2.4 seconds of pending, a quiet second line
 * appears. It is not a fake delay — it only ever shows when the request genuinely is
 * that slow, and it exists because a button that has looked identical for four seconds is
 * indistinguishable from a button that did nothing.
 */
export function AuthSubmit({
  pending,
  label,
  pendingLabel,
  disabled,
  className,
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
  disabled?: boolean;
  className?: string;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const reduce = useReducedMotion() ?? false;
  return (
    <div className={className}>
      <button
        type="submit"
        disabled={pending || disabled}
        aria-busy={pending}
        data-cursor="hover"
        className={cn(
          "group/s relative h-12 w-full overflow-hidden rounded-full bg-primary text-[14px] font-semibold text-primary-foreground outline-none",
          "transition-[filter,opacity] duration-300",
          "hover:brightness-[1.06] focus-visible:ring-3 focus-visible:ring-ring/40",
          "disabled:cursor-not-allowed",
          // Pending is not the same as unavailable: it stays full-strength gold so the
          // press clearly registered, where a greyed-out button reads as "rejected".
          pending ? "opacity-100" : "disabled:opacity-45"
        )}
      >
        {/* Indeterminate progress on the top edge. Absolutely positioned, so it
            contributes nothing to layout and cannot shift the label. */}
        <AnimatePresence>
          {pending && !reduce && (
            <motion.span
              key="sweep"
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-x-0 top-0 h-[2px] overflow-hidden"
            >
              <motion.span
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 1.15, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent"
              />
            </motion.span>
          )}
        </AnimatePresence>

        {/* Both labels share one grid cell, so the button is sized by the longer of
            the two from first paint and never resizes mid-request. */}
        <span className="grid place-items-center">
          <span
            className={cn(
              "col-start-1 row-start-1 inline-flex items-center gap-2 transition-[opacity,transform] duration-300",
              pending ? "opacity-0" : "opacity-100"
            )}
          >
            {label}
            <Arrow
              className={cn(
                "size-4 transition-transform duration-300",
                rtl ? "group-hover/s:-translate-x-0.5" : "group-hover/s:translate-x-0.5"
              )}
            />
          </span>
          <span
            aria-hidden={!pending}
            className={cn(
              "col-start-1 row-start-1 transition-opacity duration-300",
              pending ? "opacity-100" : "opacity-0"
            )}
          >
            {pendingLabel}
          </span>
        </span>
      </button>

      {/* Mounted only while the request is in flight, so it needs no resetting: the
          notice's timer lives and dies with the attempt. */}
      <AnimatePresence>{pending && <SlowNotice key="slow" />}</AnimatePresence>
    </div>
  );
}

/**
 * The "still working" line.
 *
 * A separate component precisely so it has no reset logic. Clearing a boolean when
 * `pending` goes false would mean setState inside an effect — a cascading render on every
 * submit — and comparing run ids would mean reading a ref during render. Letting the
 * subtree unmount solves both: the next attempt mounts a fresh timer starting from
 * hidden.
 *
 * It is not a fake delay. It only ever appears when the request genuinely has taken this
 * long, and it exists because a button that has looked identical for four seconds is
 * indistinguishable from one that did nothing.
 */
function SlowNotice() {
  const { t } = useLocale();
  const reduce = useReducedMotion() ?? false;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 2400);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <motion.p
      initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      aria-live="polite"
      className="overflow-hidden text-center text-[11px] text-muted-foreground"
    >
      <span className="mt-2.5 block">{t("auth.stillWorking")}</span>
    </motion.p>
  );
}
