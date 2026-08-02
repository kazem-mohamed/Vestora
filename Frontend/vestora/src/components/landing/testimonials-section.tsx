"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowUpRight, BadgeCheck } from "lucide-react";
import { Guilloche } from "@/components/auth/guilloche";
import { Magnetic } from "@/components/motion/magnetic";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { SectionSurface } from "@/components/landing/section-surface";
import { useLandingCta } from "@/lib/nav/use-landing-cta";
import { useLocale } from "@/lib/i18n/locale";

const EASE = [0.22, 1, 0.36, 1] as const;
const DURATION = 6500; // ms each voice holds the spotlight

/** The non-text half of each member: the stat figure tied to them. Text
 *  (quote, name, role, caption) comes from the dictionary so it stays bilingual. */
const MEMBERS = [
  { key: 1, value: 820, format: (v: number) => `$${v}K` }, // Amira — Helios Grid ($820K, matches Featured)
  { key: 2, value: 14, format: (v: number) => `${v}` }, //     Marcus — ventures backed
  { key: 3, value: 19, format: (v: number) => `$${(v / 10).toFixed(1)}M` }, // Nora — $1.9M
] as const;

const LEDGER = [
  { value: 100, format: (v: number) => `${v}%`, k: "land.test.ledger.1.k" },
  { value: 2, format: (v: number) => `${v}`, k: "land.test.ledger.2.k" },
  { value: 0, format: (v: number) => `${v}`, k: "land.test.ledger.3.k" },
] as const;

const isInvestor = (role: string) => /investor|مستثمر/i.test(role);

/** Engraved first-letter monogram — the brand's mark, no stock avatars. */
function Monogram({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-full border border-primary/40 text-primary"
      style={{ width: size, height: size, fontFamily: "var(--font-heading)" }}
    >
      <span className="absolute inset-1 rounded-full border border-primary/15" />
      <span style={{ fontSize: size * 0.34 }}>{name.trim().charAt(0)}</span>
    </span>
  );
}

/** Founder / Investor side tag — a quiet gold-dot pill, the "both sides" signal. */
function SideChip({ role, t }: { role: string; t: (k: string) => string }) {
  const label = isInvestor(role)
    ? t("land.test.side.investor")
    : t("land.test.side.founder");
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/40 px-2.5 py-0.5 text-[10.5px] text-foreground/70">
      <span className="size-1 rounded-full bg-primary" />
      {label}
    </span>
  );
}

export function TestimonialsSection() {
  const { t, locale } = useLocale();
  const cta = useLandingCta();
  const isAr = locale === "ar";
  const caps = isAr ? "" : "uppercase tracking-[0.03em]";
  const track = isAr ? "" : "uppercase tracking-[0.35em]";
  const reduce = useReducedMotion();

  const items = MEMBERS.map((m) => ({
    ...m,
    q: t(`land.test.${m.key}.q`),
    name: t(`land.test.${m.key}.name`),
    role: t(`land.test.${m.key}.role`),
    statK: t(`land.test.${m.key}.stat.k`),
  }));

  const [index, setIndex] = useState(0);
  const active = items[index];

  // Auto-advance progress driven through a MotionValue (rAF), so the countdown
  // and the progress bar don't re-render React 60×/s — only the once-per-voice
  // index change does. Paused on hover / keyboard focus and under reduced motion.
  const progress = useMotionValue(0);
  const barWidth = useTransform(progress, (p) => `${p * 100}%`);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (reduce) return; // let the reader drive; no auto-rotation
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (!pausedRef.current) {
        const next = progress.get() + dt / DURATION;
        if (next >= 1) {
          progress.set(0);
          setIndex((i) => (i + 1) % items.length);
        } else {
          progress.set(next);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce, progress, items.length]);

  function select(i: number) {
    progress.set(0);
    setIndex(i);
  }

  // Subtle mouse-parallax tilt on the featured card — depth, not spectacle.
  const rx = useSpring(0, { stiffness: 120, damping: 18 });
  const ry = useSpring(0, { stiffness: 120, damping: 18 });
  function onTilt(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    ry.set(((e.clientX - (r.left + r.width / 2)) / r.width) * 6);
    rx.set((-(e.clientY - (r.top + r.height / 2)) / r.height) * 6);
  }
  function resetTilt() {
    rx.set(0);
    ry.set(0);
  }

  const swap = reduce
    ? { initial: false as const, animate: {}, exit: {}, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 14, filter: "blur(6px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -12, filter: "blur(6px)" },
        transition: { duration: 0.55, ease: EASE },
      };

  return (
    <SectionSurface id="testimonials" variant="panel">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 md:py-32">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className={`text-xs text-primary-ink ${track}`}>{t("land.test.eyebrow")}</p>
          <h2
            className={`mt-4 font-bold ${caps} ${
              isAr ? "leading-[1.3]" : "leading-[1.08]"
            }`}
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "var(--fs-h2)",
            }}
          >
            {t("land.test.title")}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            {t("land.test.sub")}
          </p>
        </div>

        {/* Spotlight — featured voice + roster. Hover / focus here pauses rotation. */}
        <div
          className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-12"
          onMouseEnter={() => (pausedRef.current = true)}
          onMouseLeave={() => (pausedRef.current = false)}
          onFocusCapture={() => (pausedRef.current = true)}
          onBlurCapture={() => (pausedRef.current = false)}
        >
          {/* Featured voice */}
          <motion.div
            onMouseMove={onTilt}
            onMouseLeave={resetTilt}
            style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
            className="noise-overlay group relative flex min-h-[420px] flex-col overflow-hidden rounded-3xl border border-primary/15 p-8 md:p-10 lg:col-span-7"
          >
            <div
              className="pointer-events-none absolute inset-0 -z-10"
              style={{ background: "color-mix(in srgb, var(--primary) 6%, var(--background))" }}
            />
            {/* Depth layers */}
            <Guilloche className="pointer-events-none absolute -bottom-32 start-[-90px] h-[440px] w-[440px] text-primary/[0.06]" />
            <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            {/* Top row: counter + verified seal */}
            <div className="relative flex items-center justify-between">
              <span className="font-numeric text-xs text-primary/80">
                {String(index + 1).padStart(2, "0")}
                <span className="text-foreground/30"> / {String(items.length).padStart(2, "0")}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-primary">
                <BadgeCheck className="size-4" strokeWidth={1.75} />
                <span className="text-foreground/60">{t("land.test.verified")}</span>
              </span>
            </div>

            {/* Oversized quote glyph */}
            <span
              aria-hidden
              className="pointer-events-none absolute right-8 top-16 select-none text-[9rem] leading-none text-primary/10 md:text-[11rem]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              &rdquo;
            </span>

            <AnimatePresence mode="wait">
              <motion.div
                key={active.key}
                initial={swap.initial}
                animate={swap.animate}
                exit={swap.exit}
                transition={swap.transition}
                className="relative mt-8 flex flex-1 flex-col justify-between"
              >
                <blockquote
                  className="max-w-xl text-[clamp(1.2rem,1.9vw,1.6rem)] leading-[1.5] text-foreground/90"
                  style={isAr ? undefined : { fontFamily: "var(--font-numeric)" }}
                >
                  {active.q}
                </blockquote>

                <figcaption className="mt-10 flex flex-wrap items-end justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <Monogram name={active.name} size={52} />
                    <div className={isAr ? "text-end" : ""}>
                      <p className="text-[15px] font-semibold">{active.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{active.role}</p>
                      <div className="mt-2">
                        <SideChip role={active.role} t={t} />
                      </div>
                    </div>
                  </div>

                  {/* Small stat tied to the person */}
                  <div className={isAr ? "text-start" : "text-end"}>
                    <p className="font-numeric text-2xl text-foreground md:text-3xl">
                      {reduce ? (
                        active.format(active.value)
                      ) : (
                        <AnimatedNumber
                          key={active.key}
                          value={active.value}
                          format={active.format}
                          duration={1.4}
                        />
                      )}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{active.statK}</p>
                  </div>
                </figcaption>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Roster */}
          <div className="flex flex-col gap-3 lg:col-span-5">
            {items.map((m, i) => {
              const on = i === index;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => select(i)}
                  aria-pressed={on}
                  className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-border/50 p-4 text-start transition-colors duration-300 hover:border-primary/30"
                >
                  {on && (
                    <motion.span
                      layoutId="voice-active"
                      className="liquid-glass absolute inset-0 -z-10 rounded-2xl"
                      transition={{ type: "spring", stiffness: 320, damping: 34 }}
                    />
                  )}
                  <Monogram name={m.name} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{m.name}</p>
                      <BadgeCheck
                        className={`size-3.5 shrink-0 transition-opacity ${
                          on ? "text-primary opacity-100" : "text-primary/50 opacity-70"
                        }`}
                        strokeWidth={2}
                      />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{m.role}</p>
                  </div>
                  <SideChip role={m.role} t={t} />

                  {/* Auto-advance progress — only on the active row */}
                  {on && !reduce && (
                    <motion.span
                      className="absolute bottom-0 start-0 h-px bg-primary"
                      style={{ width: barWidth }}
                    />
                  )}
                </button>
              );
            })}

            {/* Trust ledger + a quiet closing CTA */}
            <div className="mt-2 flex items-stretch gap-3 rounded-2xl border border-border/50 p-4">
              <div className="grid flex-1 grid-cols-3 gap-2">
                {LEDGER.map((l) => (
                  <div key={l.k} className="text-center">
                    <p className="font-numeric text-lg text-foreground md:text-xl">
                      {reduce ? (
                        l.format(l.value)
                      ) : (
                        <AnimatedNumber value={l.value} format={l.format} duration={1.4} />
                      )}
                    </p>
                    <p className="mt-1 text-[10px] leading-tight text-muted-foreground">
                      {t(l.k)}
                    </p>
                  </div>
                ))}
              </div>
              <Magnetic className="grid place-items-center">
                <Link
                  href={cta.href}
                  aria-label={t(cta.labelKey)}
                  className="gold-cta grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
                >
                  <ArrowUpRight className="size-4" />
                </Link>
              </Magnetic>
            </div>
          </div>
        </div>
      </div>
    </SectionSurface>
  );
}
