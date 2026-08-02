"use client";

import Link from "next/link";
import { ReactLenis } from "lenis/react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Compass,
  Handshake,
  MessageSquare,
  Scale,
  Send,
  Stamp,
} from "lucide-react";
import { CustomCursor } from "@/components/motion/cursor";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { PillButton } from "@/components/ui/pill-button";
import { useLandingCta } from "@/lib/nav/use-landing-cta";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

const INVESTOR_STEPS = [
  { icon: Compass, k: "how.inv.1" },
  { icon: Send, k: "how.inv.2" },
  { icon: Handshake, k: "how.inv.3" },
  { icon: MessageSquare, k: "how.inv.4" },
];

const FOUNDER_STEPS = [
  { icon: Send, k: "how.fnd.1" },
  { icon: Stamp, k: "how.fnd.2" },
  { icon: Compass, k: "how.fnd.3" },
  { icon: Handshake, k: "how.fnd.4" },
];

export function HowItWorks() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;
  const cta = useLandingCta();

  return (
    <ReactLenis root options={{ lerp: reduce ? 1 : 0.09 }}>
      <div className="cursor-showpiece relative min-h-svh overflow-x-clip bg-background text-foreground">
        <CustomCursor />
        <SiteHeader />

        <main className="mx-auto max-w-5xl px-6 pb-24 pt-16 sm:pt-24">
          {/* Masthead */}
          <header className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-10 -top-24 -z-10 h-72 opacity-80"
              style={{
                backgroundImage:
                  "radial-gradient(55% 70% at 20% 0%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 65%)",
              }}
            />
            <motion.p
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE }}
              className={cn("text-[11px] text-primary", rtl ? "" : "uppercase tracking-[0.32em]")}
            >
              {t("how.eyebrow")}
            </motion.p>

            <h1 className="mt-4 overflow-hidden">
              <motion.span
                initial={reduce ? { opacity: 0 } : { y: "110%" }}
                animate={reduce ? { opacity: 1 } : { y: "0%" }}
                transition={{ duration: 0.9, delay: 0.06, ease: EASE }}
                className={cn(
                  "block max-w-3xl text-4xl font-bold sm:text-5xl lg:text-6xl",
                  rtl ? "leading-[1.35]" : "leading-[1.05] tracking-[-0.025em]"
                )}
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {t("how.title")}
              </motion.span>
            </h1>

            <motion.p
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.16, ease: EASE }}
              className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground"
            >
              {t("how.subtitle")}
            </motion.p>
          </header>

          {/* The boundary — stated before the journeys, not buried under them. */}
          <motion.section
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.75, ease: EASE }}
            className="relative mt-16 overflow-hidden rounded-[1.5rem] border border-primary/25 bg-primary/[0.04] p-7 sm:p-9"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
            />
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/[0.1] text-primary">
                <Scale className="size-5" strokeWidth={1.6} />
              </span>
              <div className="min-w-0">
                <h2
                  className="text-xl font-bold sm:text-2xl"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {t("how.truth.title")}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {t("how.truth.body")}
                </p>
              </div>
            </div>
          </motion.section>

          {/* Two journeys */}
          <div className="mt-20 grid gap-14 lg:grid-cols-2 lg:gap-12">
            <Journey
              labelKey="how.investors"
              introKey="how.investors.intro"
              steps={INVESTOR_STEPS}
              rtl={rtl}
              reduce={reduce}
            />
            <Journey
              labelKey="how.founders"
              introKey="how.founders.intro"
              steps={FOUNDER_STEPS}
              rtl={rtl}
              reduce={reduce}
            />
          </div>

          {/* What Vestora is not */}
          <motion.section
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.75, ease: EASE }}
            className="mt-20"
          >
            <p
              className={cn(
                "flex items-center gap-2.5 text-[11px] text-primary",
                rtl ? "" : "uppercase tracking-[0.28em]"
              )}
            >
              <span aria-hidden className="h-px w-8 bg-primary/60" />
              {t("how.limits.eyebrow")}
            </p>
            <h2
              className={cn(
                "mt-4 text-2xl font-bold sm:text-3xl",
                rtl ? "leading-[1.45]" : "leading-tight"
              )}
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {t("how.limits.title")}
            </h2>

            <ul className="mt-8 grid gap-3 sm:grid-cols-3">
              {["how.limits.1", "how.limits.2", "how.limits.3"].map((k, i) => (
                <motion.li
                  key={k}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
                  className="rounded-2xl border border-dashed border-border bg-card/30 p-5"
                >
                  <p className="text-sm leading-relaxed text-muted-foreground">{t(k)}</p>
                </motion.li>
              ))}
            </ul>

            <p className="mt-6 text-xs text-muted-foreground/80">
              {t("how.limits.terms")}{" "}
              <Link
                href="/legal/terms"
                data-cursor="hover"
                className="link-underline text-foreground transition-colors hover:text-primary"
              >
                {t("nav.terms")}
              </Link>
            </p>
          </motion.section>

          {/* Close */}
          <motion.section
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: EASE }}
            className="relative mt-24 overflow-hidden rounded-[1.5rem] border border-border/70 bg-card/40 px-8 py-14 text-center"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-80"
              style={{
                backgroundImage:
                  "radial-gradient(60% 90% at 50% 0%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 70%)",
              }}
            />
            <div className="relative">
              <h2
                className={cn(
                  "mx-auto max-w-lg text-2xl font-bold sm:text-3xl",
                  rtl ? "leading-[1.5]" : "leading-tight"
                )}
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {t("how.cta.title")}
              </h2>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <PillButton href="/projects" size="lg">
                  {t("how.cta.browse")}
                </PillButton>
                <Link
                  href={cta.href}
                  data-cursor="hover"
                  className="group/cta inline-flex items-center gap-2 rounded-full border border-border px-7 py-3.5 text-sm text-muted-foreground outline-none transition-colors duration-300 hover:border-primary/50 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/25"
                >
                  {t(cta.labelKey)}
                  <ArrowUpRight
                    className={cn(
                      "size-4 transition-transform duration-300 motion-safe:group-hover/cta:translate-x-0.5 motion-safe:group-hover/cta:-translate-y-0.5",
                      rtl && "-scale-x-100"
                    )}
                  />
                </Link>
              </div>
            </div>
          </motion.section>
        </main>

        <Footer variant="compact" />
      </div>
    </ReactLenis>
  );
}

function Journey({
  labelKey,
  introKey,
  steps,
  rtl,
  reduce,
}: {
  labelKey: string;
  introKey: string;
  steps: { icon: typeof Compass; k: string }[];
  rtl: boolean;
  reduce: boolean;
}) {
  const { t } = useLocale();

  return (
    <motion.section
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
    >
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 14 },
          show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
        }}
      >
        <p
          className={cn(
            "flex items-center gap-2.5 text-[11px] text-primary",
            rtl ? "" : "uppercase tracking-[0.28em]"
          )}
        >
          <span aria-hidden className="h-px w-8 bg-primary/60" />
          {t(labelKey)}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t(introKey)}</p>
      </motion.div>

      {/* A spine connecting the steps — the journey reads as one motion. */}
      <ol className="relative mt-8">
        <span
          aria-hidden
          className="absolute bottom-6 top-6 w-px bg-gradient-to-b from-primary/45 via-border to-transparent"
          style={{ insetInlineStart: "19px" }}
        />
        {steps.map((step) => (
          <motion.li
            key={step.k}
            variants={{
              hidden: { opacity: 0, y: 18 },
              show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
            }}
            className="relative flex gap-4 pb-7 last:pb-0"
          >
            <span className="relative z-[1] grid size-10 shrink-0 place-items-center rounded-full border border-border bg-background text-primary ring-4 ring-background">
              <step.icon className="size-[18px]" strokeWidth={1.7} />
            </span>
            <div className="min-w-0 pt-1.5">
              <p className="text-sm font-semibold">{t(`${step.k}.t`)}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {t(`${step.k}.d`)}
              </p>
            </div>
          </motion.li>
        ))}
      </ol>
    </motion.section>
  );
}
