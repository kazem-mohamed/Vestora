"use client";

import { useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { Guilloche } from "@/components/auth/guilloche";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { CapitalFacets } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The head of the capital register.
 *
 * A stated, verifiable count of who is actually on the other side of this market —
 * which is the one thing a founder arriving here wants to know before reading a
 * single entry. Built as an engraved plate rather than a stat row: three numbers in
 * a line is a dashboard, and this page is a directory of people.
 *
 * The guilloché medallion sits behind the surface in Z and drifts against the
 * pointer, so the masthead has real depth without a single loaded asset.
 */
export function CapitalMasthead({ facets }: { facets?: CapitalFacets }) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLElement>(null);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 22, mass: 0.7 });
  const sy = useSpring(py, { stiffness: 60, damping: 22, mass: 0.7 });

  const medallionX = useTransform(sx, [-0.5, 0.5], [-28, 28]);
  const medallionY = useTransform(sy, [-0.5, 0.5], [-18, 18]);
  const lightX = useTransform(sx, [-0.5, 0.5], ["30%", "70%"]);
  const spotlight = useMotionTemplate`radial-gradient(680px circle at ${lightX} 20%, color-mix(in oklab, var(--primary) 8%, transparent), transparent 62%)`;

  // The medallion also recedes as the page scrolls, so the head of the register
  // gives way to its entries rather than competing with them.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const depth = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  function onPointerMove(e: React.PointerEvent) {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }

  return (
    <section
      ref={ref}
      onPointerMove={onPointerMove}
      className="relative isolate"
      style={{ perspective: 1500 }}
    >
      {/* ---- Depth field ---- */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          style={
            reduce
              ? undefined
              : { x: medallionX, y: medallionY, z: depth, opacity: fade, transformStyle: "preserve-3d" }
          }
          className="absolute -end-24 -top-32 size-[560px] sm:-end-10"
        >
          <motion.div
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 280, ease: "linear", repeat: Infinity }}
            className="h-full w-full"
          >
            <Guilloche className="h-full w-full text-primary/[0.07] dark:text-primary/[0.05]" />
          </motion.div>
        </motion.div>

        {!reduce && (
          <motion.div className="absolute inset-0" style={{ background: spotlight }} />
        )}
      </div>

      <div className="relative pt-16 sm:pt-20">
        <motion.p
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className={cn("text-xs text-primary", rtl ? "" : "uppercase tracking-[0.35em]")}
        >
          {t("cap.eyebrow")}
        </motion.p>

        {/* Masked line reveal — the title rises out of its own baseline. */}
        <span className="mt-5 block overflow-hidden pb-1">
          <motion.h1
            initial={reduce ? { opacity: 0 } : { y: "110%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            transition={{ duration: 1, delay: 0.1, ease: EASE }}
            className={cn(
              "max-w-3xl text-4xl font-bold sm:text-5xl lg:text-6xl",
              rtl ? "leading-[1.28]" : "leading-[1.05] tracking-[-0.02em]"
            )}
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {t("cap.title")}
          </motion.h1>
        </span>

        <motion.p
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.24, ease: EASE }}
          className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground"
        >
          {t("cap.sub")}
        </motion.p>

        {/* ---- The register's own facts, set as a rule of engraved cells ---- */}
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.36, ease: EASE }}
          className="mt-9 flex flex-wrap items-baseline gap-x-10 gap-y-4 border-t border-border/60 pt-6"
        >
          <Reading value={facets?.total ?? 0} label={t("cap.stat.listed")} delay={0.42} />
          <Reading
            value={facets?.withTrackRecord ?? 0}
            label={t("cap.stat.trackRecord")}
            delay={0.5}
          />
          <Reading value={facets?.withThesis ?? 0} label={t("cap.stat.thesis")} delay={0.58} />
        </motion.div>
      </div>
    </section>
  );
}

function Reading({
  value,
  label,
  delay,
}: {
  value: number;
  label: string;
  delay: number;
}) {
  return (
    <div className="group/reading flex items-baseline gap-2.5">
      <AnimatedNumber
        value={value}
        format={(v) => String(v)}
        delay={delay}
        className="font-numeric text-2xl leading-none text-foreground transition-colors duration-300 group-hover/reading:text-primary sm:text-[1.7rem]"
      />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
