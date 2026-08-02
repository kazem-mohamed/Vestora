"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { CustomCursor } from "@/components/motion/cursor";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { Guilloche } from "@/components/auth/guilloche";
import { PillButton } from "@/components/ui/pill-button";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/** The three positions Vestora takes. Each is a claim the product actually keeps. */
const POSITIONS = ["about.pos.1", "about.pos.2", "about.pos.3"] as const;

/**
 * About.
 *
 * Given a manifesto's shape rather than a company page's, because Vestora's substance is
 * a position — that an introduction platform should say exactly what it is and refuse the
 * language of things it is not. There is no team roster, no funding announcement and no
 * invented milestone timeline: none of it exists, and a graduation project inventing a
 * "founded in" story would undercut the honesty the whole product is built on.
 *
 * The composition is asymmetric and scroll-paced: a stated position, then what the
 * platform deliberately does not do, then the two sides it serves.
 */
export default function AboutPage() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const reduce = useReducedMotion() ?? false;
  const heroRef = useRef<HTMLElement>(null);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 58, damping: 22, mass: 0.7 });
  const sy = useSpring(py, { stiffness: 58, damping: 22, mass: 0.7 });

  const markX = useTransform(sx, [-0.5, 0.5], [-32, 32]);
  const markY = useTransform(sy, [-0.5, 0.5], [-20, 20]);
  const lightX = useTransform(sx, [-0.5, 0.5], ["30%", "70%"]);
  const glow = useMotionTemplate`radial-gradient(720px circle at ${lightX} 22%, color-mix(in oklab, var(--primary) 8%, transparent), transparent 62%)`;

  // The medallion recedes in Z as the hero leaves, so the page gives way to its content.
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const depth = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const fade = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  function onPointerMove(e: React.PointerEvent) {
    if (reduce || e.pointerType !== "mouse" || !heroRef.current) return;
    const r = heroRef.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }

  return (
    <div className="cursor-showpiece relative min-h-svh overflow-x-clip bg-background text-foreground">
      <CustomCursor />
      <SiteHeader />

      {/* ================= POSITION ================= */}
      <section
        ref={heroRef}
        onPointerMove={onPointerMove}
        onPointerLeave={() => {
          px.set(0);
          py.set(0);
        }}
        className="relative isolate mx-auto w-full max-w-6xl px-6 pt-16 sm:px-10 sm:pt-24"
        style={{ perspective: 1600 }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            style={
              reduce
                ? undefined
                : { x: markX, y: markY, z: depth, opacity: fade, transformStyle: "preserve-3d" }
            }
            className="absolute -end-40 -top-24 size-[620px]"
          >
            <motion.div
              animate={reduce ? undefined : { rotate: 360 }}
              transition={{ duration: 340, ease: "linear", repeat: Infinity }}
              className="h-full w-full"
            >
              <Guilloche className="h-full w-full text-primary/[0.07] dark:text-primary/[0.05]" />
            </motion.div>
          </motion.div>
          {!reduce && <motion.div className="absolute inset-0" style={{ background: glow }} />}
        </div>

        <motion.p
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className={cn("text-xs text-primary", rtl ? "" : "uppercase tracking-[0.35em]")}
        >
          {t("about.eyebrow")}
        </motion.p>

        {/* Two masked lines, revealed in sequence — the page's one piece of theatre. */}
        <div className="mt-6">
          {[t("about.title.1"), t("about.title.2")].map((line, i) => (
            <span key={i} className="block overflow-hidden pb-1">
              <motion.span
                initial={reduce ? { opacity: 0 } : { y: "110%" }}
                animate={reduce ? { opacity: 1 } : { y: 0 }}
                transition={{ duration: 1.05, delay: 0.1 + i * 0.12, ease: EASE }}
                className={cn(
                  "block max-w-4xl text-4xl font-bold sm:text-6xl lg:text-7xl",
                  rtl ? "leading-[1.24]" : "leading-[1.02] tracking-[-0.025em]",
                  i === 1 && "text-primary"
                )}
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </div>

        <motion.p
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.36, ease: EASE }}
          className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground"
        >
          {t("about.lede")}
        </motion.p>

        <div className="h-24 sm:h-32" />
      </section>

      {/* ================= WHAT IT IS ================= */}
      <section className="mx-auto w-full max-w-6xl px-6 sm:px-10">
        <div className="grid gap-10 border-t border-border/60 pt-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <motion.h2
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: EASE }}
            className={cn(
              "text-2xl font-bold sm:text-3xl",
              rtl ? "leading-[1.4]" : "leading-tight tracking-[-0.015em]"
            )}
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {t("about.what.title")}
          </motion.h2>

          <div className="space-y-5">
            {[t("about.what.1"), t("about.what.2")].map((p, i) => (
              <motion.p
                key={i}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.65, delay: i * 0.08, ease: EASE }}
                className="text-[15px] leading-[1.75] text-foreground/85"
              >
                {p}
              </motion.p>
            ))}
          </div>
        </div>
      </section>

      {/* ================= POSITIONS ================= */}
      <section className="mx-auto w-full max-w-6xl px-6 pt-20 sm:px-10 sm:pt-28">
        <p
          className={cn(
            "text-xs text-primary",
            rtl ? "" : "uppercase tracking-[0.3em]"
          )}
        >
          {t("about.positions.eyebrow")}
        </p>

        {/* Numbered positions on hairline-divided cells — the certificate motif, and the
            same rhythm the footer's value pillars use. */}
        <ol className="mt-8 grid gap-px overflow-hidden rounded-2xl bg-border/50 ring-1 ring-border/40 md:grid-cols-3">
          {POSITIONS.map((key, i) => (
            <motion.li
              key={key}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: EASE }}
              className="group/pos relative bg-card/50 p-7 backdrop-blur-sm transition-colors duration-500 hover:bg-card/80 sm:p-8"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent transition-all duration-500 group-hover/pos:via-primary/50"
              />
              <p className="font-numeric text-sm text-primary/70">
                [{String(i + 1).padStart(2, "0")}]
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-foreground/90">{t(key)}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      {/* ================= WHAT IT IS NOT ================= */}
      <section className="mx-auto w-full max-w-6xl px-6 pt-20 sm:px-10 sm:pt-28">
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.75, ease: EASE }}
          className="relative overflow-hidden rounded-[1.6rem] border border-bronze/25 bg-bronze/[0.035] p-7 sm:p-10"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bronze/50 to-transparent"
          />
          <h2
            className={cn(
              "text-2xl font-bold sm:text-3xl",
              rtl ? "leading-[1.4]" : "leading-tight tracking-[-0.015em]"
            )}
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {t("about.not.title")}
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            {t("about.not.lede")}
          </p>

          <ul className="mt-7 grid gap-x-10 gap-y-3 sm:grid-cols-2">
            {["about.not.1", "about.not.2", "about.not.3", "about.not.4"].map((k) => (
              <li key={k} className="flex gap-3 text-sm leading-relaxed text-foreground/85">
                <span aria-hidden className="mt-[9px] h-px w-4 shrink-0 bg-bronze/60" />
                {t(k)}
              </li>
            ))}
          </ul>

          <Link
            href="/legal/risk"
            data-cursor="hover"
            className="link-underline mt-8 inline-flex items-center gap-1.5 text-sm text-foreground transition-colors hover:text-primary"
          >
            {t("about.not.readRisk")}
            <Arrow className="size-3.5" />
          </Link>
        </motion.div>
      </section>

      {/* ================= THE TWO SIDES ================= */}
      <section className="mx-auto w-full max-w-6xl px-6 pt-20 sm:px-10 sm:pt-28">
        <div className="grid gap-6 lg:grid-cols-2">
          {[
            { key: "founders", href: "/register", cta: "about.side.founders.cta" },
            { key: "investors", href: "/projects", cta: "about.side.investors.cta" },
          ].map((side, i) => (
            <motion.div
              key={side.key}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: EASE }}
              className="group/side relative overflow-hidden rounded-[1.5rem] border border-border/70 bg-card/50 p-7 backdrop-blur-sm transition-colors duration-500 hover:border-primary/30 sm:p-9"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
              />
              <p
                className={cn(
                  "text-[11px] text-primary",
                  rtl ? "" : "uppercase tracking-[0.28em]"
                )}
              >
                {t(`about.side.${side.key}.label`)}
              </p>
              <h3
                className={cn(
                  "mt-4 text-xl font-bold sm:text-2xl",
                  rtl ? "leading-[1.4]" : "tracking-[-0.01em]"
                )}
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {t(`about.side.${side.key}.title`)}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t(`about.side.${side.key}.body`)}
              </p>
              <div className="mt-7">
                <PillButton href={side.href} size="lg">
                  {t(side.cta)}
                </PillButton>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="h-24 sm:h-32" />
      <Footer variant="compact" />
    </div>
  );
}
