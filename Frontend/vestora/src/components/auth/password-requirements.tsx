"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Minus } from "lucide-react";
import { passwordChecks } from "@/lib/validation/rules";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The passcode requirements, satisfied live.
 *
 * Deliberately a checklist and **not** a strength meter. A Weak/Medium/Strong bar driven
 * by length — which is what almost every implementation does — tells someone that
 * `Password1234` is "Strong" because it is twelve characters, which is worse than saying
 * nothing: it hands out a feeling of safety the assessment cannot support. The brief
 * called that out and it is right. Real entropy estimation means shipping a dictionary
 * (zxcvbn is ~800KB) for a signup form, which is not a trade worth making here.
 *
 * So the requirements are simply stated and simply ticked. Every row is a fact the person
 * can act on, and when all four are met the panel collapses to a single line — the
 * checklist has done its job and should stop taking up the column.
 *
 * The list is not `aria-live`. Announcing four rows on every keystroke is unusable with a
 * screen reader; instead the whole panel is the password field's `aria-describedby`
 * target, so it is read on focus and can be re-read on demand.
 */
export function PasswordRequirements({
  value,
  /** Hidden until the field has been touched, so an untouched form is not all red. */
  show,
  id,
}: {
  value: string;
  show: boolean;
  id?: string;
}) {
  const { t } = useLocale();
  const reduce = useReducedMotion() ?? false;
  const checks = passwordChecks(value);
  const allMet = checks.every((c) => c.met);

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          id={id}
          initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
          transition={{ duration: 0.34, ease: EASE }}
          className="overflow-hidden"
        >
          <div className="mt-2.5 rounded-xl border border-border/70 bg-background/40 px-3.5 py-3 backdrop-blur-sm">
            <AnimatePresence mode="wait" initial={false}>
              {allMet ? (
                // Collapsed. The checklist is finished, so it stops being a list.
                <motion.p
                  key="done"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.26, ease: EASE }}
                  className="flex items-center gap-2 text-[11.5px] text-primary"
                >
                  <span className="grid size-4 place-items-center rounded-full border border-primary/45">
                    <Check className="size-2.5" strokeWidth={3} />
                  </span>
                  {t("pw.req.done")}
                </motion.p>
              ) : (
                <motion.div
                  key="list"
                  initial={reduce ? { opacity: 0 } : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground/80 rtl:tracking-normal">
                    {t("pw.req.title")}
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {checks.map((c) => (
                      <li key={c.id} className="flex items-center gap-2">
                        {/* The mark carries the state; colour alone would not be
                            enough for anyone who cannot separate gold from grey. */}
                        <motion.span
                          animate={reduce ? undefined : { scale: c.met ? [1, 1.18, 1] : 1 }}
                          transition={{ duration: 0.3, ease: EASE }}
                          className={cn(
                            "grid size-4 shrink-0 place-items-center rounded-full border transition-colors duration-300",
                            c.met
                              ? "border-primary/45 text-primary"
                              : "border-border text-muted-foreground/50"
                          )}
                        >
                          {c.met ? (
                            <Check className="size-2.5" strokeWidth={3} />
                          ) : (
                            <Minus className="size-2.5" strokeWidth={3} />
                          )}
                        </motion.span>
                        <span
                          className={cn(
                            "text-[11.5px] leading-snug transition-colors duration-300",
                            c.met ? "text-foreground/70" : "text-muted-foreground"
                          )}
                        >
                          {t(`pw.req.${c.id}`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
