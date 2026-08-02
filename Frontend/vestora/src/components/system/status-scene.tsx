"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { Guilloche } from "@/components/auth/guilloche";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export interface StatusAction {
  labelKey: string;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
}

/**
 * Every "this did not work" moment in Vestora, as one composed surface.
 *
 * Built as a single system with variants rather than six near-identical pages. A 404, a
 * 403, a server fault, a removed venture and a closed account differ in exactly three
 * things — the code, the words, and where the person should go next — and duplicating a
 * whole layout six times to vary those guarantees five of them rot.
 *
 * It is treated as a real Vestora surface, not a fallback: the code is set as a large
 * engraved numeral on a layered guilloché plate with pointer-driven depth, because these
 * are the moments a product either feels considered or feels broken.
 */
export function StatusScene({
  code,
  titleKey,
  bodyKey,
  actions,
  tone = "quiet",
  detail,
}: {
  /** Shown as the engraved numeral. Omit for states without an HTTP code. */
  code?: string;
  titleKey: string;
  bodyKey: string;
  actions: StatusAction[];
  /** `quiet` for expected outcomes, `alert` for genuine faults. */
  tone?: "quiet" | "alert";
  /** Optional technical line — a digest or reference. Never a raw stack trace. */
  detail?: string;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 22, mass: 0.7 });
  const sy = useSpring(py, { stiffness: 60, damping: 22, mass: 0.7 });

  // The plate tilts; the numeral behind it drifts further, so the two separate in depth.
  const rotateY = useTransform(sx, [-0.5, 0.5], [-6, 6]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [4, -4]);
  const numeralX = useTransform(sx, [-0.5, 0.5], [-26, 26]);
  const numeralY = useTransform(sy, [-0.5, 0.5], [-16, 16]);
  const lightX = useTransform(sx, [-0.5, 0.5], ["25%", "75%"]);
  const glow = useMotionTemplate`radial-gradient(620px circle at ${lightX} 30%, color-mix(in oklab, var(--primary) 9%, transparent), transparent 62%)`;

  function onPointerMove(e: React.PointerEvent) {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }

  return (
    <main
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
      className="relative isolate grid min-h-svh place-items-center overflow-hidden px-6 py-24"
      style={{ perspective: 1400 }}
    >
      {/* ---- Depth field ---- */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <motion.div
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 320, ease: "linear", repeat: Infinity }}
          className="absolute left-1/2 top-1/2 size-[780px] -translate-x-1/2 -translate-y-1/2"
        >
          <Guilloche
            className={cn(
              "h-full w-full",
              tone === "alert"
                ? "text-destructive/[0.05]"
                : "text-primary/[0.055] dark:text-primary/[0.04]"
            )}
          />
        </motion.div>

        {!reduce && <motion.div className="absolute inset-0" style={{ background: glow }} />}

        <div className="film-grain absolute inset-0 opacity-[0.03] mix-blend-overlay" />
      </div>

      {/* ---- The engraved code, set behind the plate ---- */}
      {code && (
        <motion.span
          aria-hidden
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: EASE }}
          style={reduce ? undefined : { x: numeralX, y: numeralY }}
          className={cn(
            "pointer-events-none absolute select-none text-[26rem] font-bold leading-none",
            "text-foreground/[0.035] sm:text-[34rem]"
          )}
        >
          {code}
        </motion.span>
      )}

      {/* ---- The plate ---- */}
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, ease: EASE }}
        style={reduce ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative w-full max-w-xl"
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-[1.6rem] border bg-card/60 p-8 backdrop-blur-xl sm:p-10",
            tone === "alert" ? "border-destructive/25" : "border-border/70"
          )}
        >
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
              tone === "alert" ? "via-destructive/50" : "via-primary/60"
            )}
          />

          <div style={{ transform: "translateZ(26px)" }}>
            {code && (
              <p
                className={cn(
                  "font-numeric text-xs",
                  tone === "alert" ? "text-destructive" : "text-primary",
                  rtl ? "" : "uppercase tracking-[0.32em]"
                )}
              >
                {t("status.code").replace("{code}", code)}
              </p>
            )}

            {/* Masked line reveal — the title rises out of its own baseline. */}
            <span className="mt-5 block overflow-hidden pb-1">
              <motion.h1
                initial={reduce ? { opacity: 0 } : { y: "112%" }}
                animate={reduce ? { opacity: 1 } : { y: 0 }}
                transition={{ duration: 1, delay: 0.12, ease: EASE }}
                className={cn(
                  "text-3xl font-bold sm:text-4xl",
                  rtl ? "leading-[1.3]" : "leading-[1.08] tracking-[-0.015em]"
                )}
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {t(titleKey)}
              </motion.h1>
            </span>

            <motion.p
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.28, ease: EASE }}
              className="mt-4 text-[15px] leading-relaxed text-muted-foreground"
            >
              {t(bodyKey)}
            </motion.p>

            {/* A reference the person can quote to support. Never a stack trace: it
                tells them nothing and can leak internals. */}
            {detail && (
              <p className="font-numeric mt-4 truncate rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-[11px] text-muted-foreground/80">
                {detail}
              </p>
            )}

            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.4, ease: EASE }}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              {actions.map((a) => {
                const label = t(a.labelKey);
                const cls = cn(
                  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm outline-none",
                  "transition-all duration-300 focus-visible:ring-3 focus-visible:ring-ring/25",
                  a.primary
                    ? "gold-cta bg-primary font-semibold text-primary-foreground hover:opacity-90"
                    : "border border-border text-foreground hover:border-primary/50 hover:text-primary"
                );

                return a.href ? (
                  <Link key={a.labelKey} href={a.href} data-cursor="hover" className={cls}>
                    {label}
                  </Link>
                ) : (
                  <button
                    key={a.labelKey}
                    type="button"
                    data-cursor="hover"
                    onClick={a.onClick}
                    className={cls}
                  >
                    {label}
                  </button>
                );
              })}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
