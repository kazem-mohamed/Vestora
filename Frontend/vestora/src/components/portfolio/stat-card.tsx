"use client";

import { useId, useRef } from "react";
import { motion, useInView } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { useLocale } from "@/lib/i18n/locale";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Tiny self-drawing chart line — pure SVG pathLength animation, no state. */
function Sparkline({
  series,
  active,
  delay,
}: {
  series: number[];
  active: boolean;
  delay: number;
}) {
  const gradId = useId();
  const data = series.length >= 2 ? series : [0, ...series];
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;

  const W = 120;
  const H = 34;
  const PAD = 3;
  const pts = data.map((v, i) => {
    const x = PAD + (i * (W - PAD * 2)) / (data.length - 1);
    const y = H - PAD - ((v - min) / span) * (H - PAD * 2);
    return `${x},${y}`;
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-9 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--bronze)" />
          <stop offset="100%" stopColor="var(--primary)" />
        </linearGradient>
      </defs>
      <motion.polyline
        points={pts.join(" ")}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={active ? { pathLength: 1, opacity: 1 } : {}}
        transition={{ duration: 1.4, delay, ease: EASE }}
      />
      {/* End dot lands as the line finishes drawing */}
      <motion.circle
        cx={pts[pts.length - 1]?.split(",")[0]}
        cy={pts[pts.length - 1]?.split(",")[1]}
        r="2.2"
        fill="var(--primary)"
        initial={{ scale: 0, opacity: 0 }}
        animate={active ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 0.4, delay: delay + 1.25, ease: EASE }}
      />
    </svg>
  );
}

/**
 * Luxury portfolio stat: gold hairline, linear icon, MotionValue count-up,
 * secondary detail line, self-drawing sparkline, ambient sheen sweep and a
 * lift + glow on hover.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  format,
  sub,
  series,
  bronze,
  delay,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  format: (v: number) => string;
  sub: React.ReactNode;
  series: number[];
  bronze?: boolean;
  delay: number;
}) {
  const { locale } = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.85, delay, ease: EASE }}
      className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/55 backdrop-blur-sm transition-[border-color,box-shadow,transform] duration-500 ease-out hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_24px_60px_-28px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
    >
      {/* Gold hairline */}
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      {/* Ambient sheen — sweeps across every few seconds */}
      <motion.span
        aria-hidden
        initial={{ x: "-160%" }}
        animate={{ x: "460%" }}
        transition={{
          duration: 2.4,
          delay: delay + 2,
          ease: "easeInOut",
          repeat: Infinity,
          repeatDelay: 7,
        }}
        className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent"
      />

      <div className="relative p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <p
            className={`text-[11px] text-muted-foreground ${
              locale === "ar" ? "" : "uppercase tracking-[0.25em]"
            }`}
          >
            {label}
          </p>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/25 text-primary transition-colors duration-500 group-hover:border-primary/60 group-hover:bg-primary/[0.07]">
            <Icon className="size-4" strokeWidth={1.5} />
          </span>
        </div>

        <AnimatedNumber
          value={value}
          format={format}
          active={inView}
          delay={delay + 0.15}
          className={`mt-4 block font-numeric text-4xl leading-none sm:text-5xl ${
            bronze ? "text-bronze" : "text-foreground"
          }`}
        />

        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">{sub}</div>

        <div className="mt-5 border-t border-border/50 pt-4">
          <Sparkline series={series} active={inView} delay={delay + 0.4} />
        </div>
      </div>
    </motion.div>
  );
}
