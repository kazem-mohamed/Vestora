"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Eye, EyeOff, Loader2, TriangleAlert } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export type FieldState = "default" | "invalid" | "valid" | "checking";

/**
 * One form field, with every state it can actually be in.
 *
 * The old inputs had two: normal, and a red border. That is not enough to be either
 * clear or accessible — a red rule alone is invisible to anyone who cannot separate it
 * from the surrounding warm palette, and it never says *why*. So invalid carries a rule,
 * a glyph, and a sentence, all three; and `aria-invalid` plus `aria-describedby` are
 * wired so the sentence is what a screen reader reads out rather than "edit text, blank".
 *
 * Valid is deliberately quiet — a thin gold tick, no green, no motion. Marking every
 * satisfied field with a badge turns a filled form into a scoreboard, and the useful
 * signal (what is still wrong) gets lost among a dozen reassurances. It only shows on
 * fields where confirmation genuinely helps: the email, and the password confirmation.
 *
 * Autofill is handled explicitly. Chrome's `-webkit-autofill` inserts its own background
 * that overrode the card surface and made a filled field look like a different component;
 * the shadow trick below paints over it in the field's own colour.
 */
export function AuthField({
  label,
  state = "default",
  message,
  hint,
  optional,
  /** Renders the show/hide control and switches the input type. */
  reveal,
  /** Right-hand slot in the label row — e.g. "Forgot?" */
  labelAction,
  className,
  inputClassName,
  ...input
}: {
  label: string;
  state?: FieldState;
  message?: string;
  hint?: string;
  optional?: boolean;
  reveal?: boolean;
  labelAction?: React.ReactNode;
  className?: string;
  inputClassName?: string;
} & Omit<React.ComponentProps<"input">, "className">) {
  const { t } = useLocale();
  const reduce = useReducedMotion() ?? false;
  const id = useId();
  const msgId = `${id}-msg`;
  const hintId = `${id}-hint`;
  const [shown, setShown] = useState(false);

  const invalid = state === "invalid";
  const valid = state === "valid";
  const checking = state === "checking";

  const type = reveal ? (shown ? "text" : "password") : input.type;

  return (
    <div className={cn("group/f", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[12.5px] font-medium text-foreground/90">
          {label}
          {optional && (
            <span className="ms-1.5 text-[11px] font-normal text-muted-foreground">
              {t("form.optional")}
            </span>
          )}
        </label>
        {labelAction}
      </div>

      <div className="relative">
        <input
          {...input}
          id={id}
          type={type}
          aria-invalid={invalid || undefined}
          aria-describedby={cn(hint && hintId, (invalid || message) && msgId) || undefined}
          className={cn(
            "vt-field h-11 w-full rounded-xl border bg-background/50 px-3.5 text-[14px] outline-none backdrop-blur-sm",
            "transition-[border-color,box-shadow,background-color] duration-300",
            "placeholder:text-muted-foreground/60",
            // Room for whichever affordance is on the end.
            (reveal || valid || checking || invalid) && "pe-11",
            invalid
              ? "border-destructive/60 focus-visible:border-destructive focus-visible:ring-3 focus-visible:ring-destructive/20"
              : valid
                ? "border-primary/40 focus-visible:border-primary/70 focus-visible:ring-3 focus-visible:ring-ring/25"
                : "border-input focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25",
            // readOnly is used instead of disabled while a form is submitting, so the
            // value stays legible and selectable rather than greying out.
            "read-only:text-muted-foreground read-only:opacity-80",
            "disabled:cursor-not-allowed disabled:opacity-50",
            inputClassName
          )}
        />

        {/* End-of-field affordance. One slot, so the states cannot collide. */}
        <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3.5">
          {checking ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : reveal ? (
            <button
              type="button"
              tabIndex={0}
              onClick={() => setShown((v) => !v)}
              aria-label={shown ? t("login.hide") : t("login.show")}
              aria-pressed={shown}
              data-cursor="hover"
              className="pointer-events-auto grid size-7 place-items-center rounded-full text-muted-foreground outline-none transition-colors duration-300 hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/25"
            >
              {shown ? (
                <EyeOff className="size-4" strokeWidth={1.9} />
              ) : (
                <Eye className="size-4" strokeWidth={1.9} />
              )}
            </button>
          ) : invalid ? (
            <TriangleAlert className="size-4 text-destructive" strokeWidth={2} />
          ) : valid ? (
            <Check className="size-4 text-primary" strokeWidth={2.4} />
          ) : null}
        </span>
      </div>

      {hint && !invalid && (
        <p id={hintId} className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}

      {/* The reason, animated by height so the layout settles rather than jumping.
          `role=alert` announces it the moment it appears. */}
      <AnimatePresence initial={false}>
        {invalid && message && (
          <motion.p
            id={msgId}
            role="alert"
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0, y: -3 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, y: -3 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="overflow-hidden text-[11.5px] leading-relaxed text-destructive"
          >
            <span className="mt-1.5 block">{message}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
