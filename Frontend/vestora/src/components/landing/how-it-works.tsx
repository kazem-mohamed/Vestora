"use client";

import { useRef, type ComponentType } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
} from "framer-motion";
import {
  Compass,
  Eye,
  TrendingUp,
  Megaphone,
  Users,
  Sprout,
} from "lucide-react";
import { SectionHeading } from "@/components/landing/section-heading";
import { SectionSurface } from "@/components/landing/section-surface";
import { useLocale } from "@/lib/i18n/locale";

const EASE = [0.22, 1, 0.36, 1] as const;

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

interface Step {
  t: string;
  d: string;
  Icon: Icon;
}

function Journey({
  label,
  steps,
  mirror,
}: {
  label: string;
  steps: Step[];
  mirror: boolean;
}) {
  const { locale } = useLocale();
  const reduce = useReducedMotion();
  const track = locale === "ar" ? "" : "uppercase tracking-[0.28em]";

  // The connector spine draws itself as this column scrolls into view.
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.7", "end 0.65"],
  });
  const scaleY = useSpring(scrollYProgress, { stiffness: 80, damping: 24 });

  return (
    <div>
      {/* Label with a slow pulsing gold node. */}
      <div
        className={`flex items-center gap-3 ${
          mirror ? "md:flex-row-reverse" : ""
        }`}
      >
        <span className="relative grid size-2.5 place-items-center">
          <span className="size-2.5 rounded-full bg-primary" />
          {!reduce && (
            <motion.span
              className="absolute inset-0 rounded-full bg-primary"
              animate={{ scale: [1, 2.4], opacity: [0.5, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
            />
          )}
        </span>
        <p className={`text-sm text-primary-ink ${track}`}>{label}</p>
      </div>

      {/* Even-height steps → evenly spaced discs → a clean connector. */}
      <div ref={ref} className="relative mt-8">
        <div
          className={`absolute top-[80px] bottom-[80px] w-px bg-border/70 start-[27px] ${
            mirror ? "md:start-auto md:end-[27px]" : ""
          }`}
        >
          {reduce ? (
            <div className="h-full w-full bg-primary/60" />
          ) : (
            <motion.div
              style={{ scaleY }}
              className="h-full w-full origin-top bg-gradient-to-b from-primary via-primary/70 to-bronze"
            />
          )}
        </div>

        {steps.map((s, i) => (
          <motion.div
            key={i}
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: i * 0.12, ease: EASE }}
            className={`group flex min-h-40 items-center gap-6 ${
              mirror ? "md:flex-row-reverse md:text-end" : ""
            }`}
          >
            {/* Node — index over a gold-ringed disc, swaps to icon on hover. */}
            <span className="relative z-10 grid size-14 shrink-0 place-items-center rounded-full border border-primary/40 bg-background transition-colors duration-300 group-hover:border-primary">
              <span className="font-numeric text-xl text-primary transition-opacity duration-300 group-hover:opacity-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <s.Icon
                className="absolute size-5 text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                strokeWidth={1.5}
              />
            </span>

            <div className="max-w-sm">
              {/* Karla, not Cinzel.
                  Cinzel is an inscriptional Roman capital — a face for names
                  and titles, not for six consecutive 24px step headings, where
                  it stops reading as a mark and starts working as a UI font,
                  which it was never drawn to be. It also asked for weight 500
                  while `layout.tsx` only loads 600 and 700, so the browser
                  rounded it and `font-medium` did nothing at all.

                  Giving the steps the reading face gives the page two voices
                  instead of one, which is what lets the display face mean
                  something when it does appear. */}
              <h3
                className="text-xl font-semibold tracking-[-0.01em] sm:text-2xl"
                style={{ fontSize: "var(--fs-h3)" }}
              >
                {s.t}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                {s.d}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function HowItWorks() {
  const { t } = useLocale();

  const investors: Step[] = [
    { t: t("land.how.inv1.t"), d: t("land.how.inv1.d"), Icon: Compass },
    { t: t("land.how.inv2.t"), d: t("land.how.inv2.d"), Icon: Eye },
    { t: t("land.how.inv3.t"), d: t("land.how.inv3.d"), Icon: TrendingUp },
  ];
  const entrepreneurs: Step[] = [
    { t: t("land.how.ent1.t"), d: t("land.how.ent1.d"), Icon: Megaphone },
    { t: t("land.how.ent2.t"), d: t("land.how.ent2.d"), Icon: Users },
    { t: t("land.how.ent3.t"), d: t("land.how.ent3.d"), Icon: Sprout },
  ];

  return (
    <SectionSurface id="how" variant="engraved">
      <div className="mx-auto w-full max-w-6xl px-6 py-28 md:py-32">
        <SectionHeading
          eyebrow={t("land.how.eyebrow")}
          title={t("land.how.title")}
        />

        <div className="mt-20 grid grid-cols-1 gap-16 md:grid-cols-2 md:gap-10 lg:gap-20">
          <Journey label={t("land.how.investors")} steps={investors} mirror={false} />
          <Journey label={t("land.how.entrepreneurs")} steps={entrepreneurs} mirror />
        </div>
      </div>
    </SectionSurface>
  );
}
