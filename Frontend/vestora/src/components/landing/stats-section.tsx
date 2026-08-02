"use client";

import { useRef } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { LazyVideo } from "@/components/motion/lazy-video";
import { SectionSurface } from "@/components/landing/section-surface";
import { useLocale } from "@/lib/i18n/locale";

const EASE = [0.22, 1, 0.36, 1] as const;

// Marketing copy values — animate scaled integers, format back to display
// (AnimatedNumber rounds to whole numbers internally).
const STATS = [
  { key: "land.stats.1", value: 24, format: (v: number) => `$${(v / 10).toFixed(1)}M+` },
  { key: "land.stats.2", value: 120, format: (v: number) => `${v}+` },
  { key: "land.stats.3", value: 800, format: (v: number) => `${v}+` },
  { key: "land.stats.4", value: 15, format: (v: number) => `${v}+` },
  { key: "land.stats.5", value: 100, format: (v: number) => `${v}%` },
];

// A classical two-stroke "V" — the mask through which the footage plays.
const V_PATH =
  "M2 4 L38 4 L38 10 L32 12 L52 68 L70 12 L64 10 L64 4 L98 4 L98 10 L91 13 L61 96 L41 96 L9 13 L2 10 Z";
const V_MASK = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='${V_PATH}'/%3E%3C/svg%3E")`;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/* A character-by-character `Typewriter` used to render the heading and the
   paragraph under it, stepping a letter every 12ms. It was removed rather than
   retuned: type that assembles itself is a 2010s device, it fights the one
   thing this brand claims — that it is quiet — and it delays the only sentence
   in the section that explains the numbers beside it. The masked line reveal
   the rest of the page already uses does the same job without narrating. */

export function StatsSection() {
  const { t, locale } = useLocale();
  const reduce = useReducedMotion();
  const isAr = locale === "ar";
  const track = isAr ? "" : "uppercase tracking-[0.14em]";

  const gridRef = useRef<HTMLDivElement>(null);
  const gridInView = useInView(gridRef, { once: true, margin: "-60px" });

  return (
    <SectionSurface id="stats" variant="engraved" className="border-t border-border/60">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 md:py-32">
        <div className="flex flex-col items-stretch gap-16 lg:flex-row lg:gap-24">
          {/* Copy + counters */}
          <div className="flex flex-1 flex-col justify-center">
            <h2
              className={`mb-6 max-w-xl font-bold ${
                isAr ? "leading-[1.4]" : "leading-[1.12]"
              } ${isAr ? "" : "uppercase tracking-[0.04em]"}`}
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "var(--fs-h2)",
              }}
            >
              {t("land.stats.h1")}
              <br />
              <span
                className={`font-normal normal-case text-primary-ink ${isAr ? "" : "italic"}`}
                style={{
                  fontFamily: isAr
                    ? "var(--font-heading)"
                    : "var(--font-spectral), serif",
                }}
              >
                {t("land.stats.h2")}
              </span>
            </h2>

            <p className="mb-14 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              {t("land.stats.sub")}
            </p>

            <motion.div
              ref={gridRef}
              initial="hidden"
              animate={gridInView ? "show" : "hidden"}
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
              }}
              className="grid grid-cols-2 gap-x-10 gap-y-9 md:grid-cols-3"
            >
              {/* Each figure sits on its own ruled line, the way a statement
                  sets a column of numbers. Gaps alone left five figures
                  floating in a grid; a hairline under each one turns the group
                  into a ledger, which is the register the section is claiming
                  when it says "proven in numbers". */}
              {STATS.map((s) => (
                <motion.div key={s.key} variants={fadeUp} className="flex flex-col">
                  <span className="font-numeric text-4xl text-foreground md:text-[2.75rem]">
                    {reduce ? (
                      s.format(s.value)
                    ) : (
                      <AnimatedNumber
                        value={s.value}
                        format={s.format}
                        active={gridInView}
                        duration={1.6}
                      />
                    )}
                  </span>
                  <span
                    aria-hidden
                    className="mt-3 block h-px w-full bg-gradient-to-r from-primary/45 to-transparent rtl:bg-gradient-to-l"
                  />
                  <span
                    className={`mt-2.5 text-[10px] text-muted-foreground md:text-[11px] ${track}`}
                  >
                    {t(s.key)}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Footage through the V — the mark itself made of moving gold. */}
          <div className="flex shrink-0 items-center justify-center lg:w-[42%]">
            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.9, ease: EASE }}
              className="aspect-square w-full max-w-[420px] lg:max-w-none"
              style={{
                WebkitMaskImage: V_MASK,
                WebkitMaskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskImage: V_MASK,
                maskSize: "contain",
                maskRepeat: "no-repeat",
                maskPosition: "center",
              }}
            >
              {/* Footage seen through the mark itself, so it wants texture
                  rather than a scene: anything with a horizon or a subject
                  gets sliced into unreadable fragments by the V. The previous
                  clip was also 22.8 MB of 1080p for a ≤420px opening — the
                  heaviest asset on the page for the smallest display area. */}
              <LazyVideo src="/landing/stats-mark.mp4" className="h-full w-full" />
            </motion.div>
          </div>
        </div>
      </div>
    </SectionSurface>
  );
}
