"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { Lock } from "lucide-react";
import { Magnetic } from "@/components/motion/magnetic";
import { PillButton } from "@/components/ui/pill-button";
import { useLandingCta } from "@/lib/nav/use-landing-cta";
import { useLocale } from "@/lib/i18n/locale";

const EASE = [0.22, 1, 0.36, 1] as const;

// User-selected footage (v08 — founder on a cliff-top isle above golden clouds).
const HERO_VIDEO = "/landing/hero.mp4";
// The still behind the footage: what a reduced-motion reader sees instead of
// the video, and what everyone sees for the first frames while it buffers. It
// pointed at `/hero/hero-1.jpg` — a 1.9 MB file that was also being served a
// second time under `/landing/about-atrium.png` for the About plates.
const HERO_POSTER = "/landing/hero-poster.jpg";

/** Blur-fade-up: elements arrive from a soft out-of-focus state. */
function BlurFade({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 30, filter: "blur(14px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 1, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function HeadlineLine({
  children,
  delay,
  loose = false,
  className,
}: {
  children: React.ReactNode;
  delay: number;
  loose?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <span className={`block overflow-hidden ${loose ? "-my-5 py-5" : "pb-2"}`}>
      <motion.span
        className={`block ${className ?? ""}`}
        initial={reduce ? false : { y: "115%" }}
        animate={{ y: 0 }}
        transition={{ duration: 1.05, delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export function LandingHero() {
  const { t, locale } = useLocale();
  const cta = useLandingCta();
  const reduce = useReducedMotion();
  const [videoFailed, setVideoFailed] = useState(false);

  const isAr = locale === "ar";
  const track = isAr ? "" : "uppercase tracking-[0.18em]";

  // Mouse parallax on the footage — springs keep it drifting, not tracking.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const px = useSpring(mx, { stiffness: 38, damping: 18, mass: 0.6 });
  const py = useSpring(my, { stiffness: 38, damping: 18, mass: 0.6 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 22);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 14);
  }

  // Curtain recede — the hero is pinned while the page sheet rides over it;
  // during that first viewport of scroll the film scales down, dims and
  // gains rounded corners, like a stage falling back behind the curtain.
  // Native scroll listener (not framer's useScroll): the pinned/sticky
  // layout confuses framer's offset measurement, a plain listener doesn't.
  const [vh, setVh] = useState(900);
  const scrollPos = useMotionValue(0);
  useEffect(() => {
    const updateVh = () => setVh(window.innerHeight);
    const onScroll = () => scrollPos.set(window.scrollY);
    updateVh();
    onScroll();
    window.addEventListener("resize", updateVh);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", updateVh);
      window.removeEventListener("scroll", onScroll);
    };
  }, [scrollPos]);
  const stageScale = useTransform(scrollPos, [0, vh], [1, 0.93]);
  const stageRadius = useTransform(scrollPos, [0, vh * 0.6], [0, 36]);
  const stageDim = useTransform(scrollPos, [0, vh], [0, 0.55]);

  return (
    <section className="sticky top-0 z-0 h-svh">
      {/* The hero always plays over dark cinematic footage, so it scopes
          itself to the dark token palette regardless of the page theme —
          the theme re-enters where the page sheet covers it. */}
      <motion.div
        style={
          reduce
            ? undefined
            : { scale: stageScale, borderRadius: stageRadius }
        }
        className="dark relative flex h-full flex-col overflow-hidden bg-background text-foreground"
        onMouseMove={onMove}
      >
        {/* Footage — oversized so parallax + push-in never reveal an edge. */}
        <motion.div
          aria-hidden="true"
          style={{ x: px, y: py }}
          className="absolute -inset-[4%]"
        >
          <motion.div
            className="h-full w-full"
            animate={reduce ? undefined : { scale: [1.02, 1.09] }}
            transition={{
              duration: 32,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "linear",
            }}
          >
            {reduce || videoFailed ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={HERO_POSTER}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <video
                className="h-full w-full object-cover"
                src={HERO_VIDEO}
                poster={HERO_POSTER}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                onError={() => setVideoFailed(true)}
                // Some engines (Safari low-power, embedded views) ignore the
                // autoplay attribute — nudge playback once data is ready.
                onLoadedData={(e) => {
                  e.currentTarget.play().catch(() => {});
                }}
              />
            )}
          </motion.div>
        </motion.div>

        {/* Contrast floors — headline headroom up top, copy floor below. The
            bottom floor goes fully opaque at the very edge so the hero
            resolves to its own dark background before the section ends —
            no video ever peeks through the seam into whatever page theme
            (light or dark) follows. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-background/55 via-background/20 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="film-grain pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay" />

        {/* One centred column, vertically balanced in the frame.
            The composition is unchanged — eyebrow, headline, subtitle, actions,
            promise, all centred, in that order. What changed is that they are
            now one group centred as a whole, instead of two groups pinned to
            the top and bottom edges with a `flex-1` spacer between them. That
            spacer measured 201px on a 720px viewport — 28% of the screen, empty,
            sitting exactly where the eye rests. `pt-28` still clears the fixed
            nav; `pb-16` still keeps the promise off the bottom edge. */}
        <main className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-6 pb-16 pt-28 text-center md:pb-20">
          <BlurFade delay={0.1} className={`text-xs text-primary ${track}`}>
            {t("brand.tagline")}
          </BlurFade>

          {/* Headline — centred; the second line recedes into bronze.
              The type is a step smaller than it was (4.9rem → 4.35rem at the
              ceiling). At the old size the two lines were the only thing the
              first screen could hold; a step down lets the headline, the
              sentence under it and the action all read as one composition
              rather than as a headline with captions.

              The floor matters more than the ceiling. At the previous 2.4rem
              minimum, "MEETS CONVICTION" needed 441px of measure and a 375px
              phone offers 327 — so the line wrapped and the deliberate
              two-line break became four ragged ones on every phone sold. The
              1.75rem floor plus tighter tracking below `sm` fits it back onto
              one line, which is the whole point of splitting the headline into
              two spans in the first place. */}
          <h1
            className={`mt-5 text-[clamp(1.75rem,4.85vw,4.35rem)] font-bold ${
              isAr ? "leading-[1.35]" : "leading-[1.08]"
            } ${isAr ? "" : "uppercase tracking-[0.012em] sm:tracking-[0.04em]"}`}
            style={{ fontFamily: "var(--font-heading)" }}
          >
            <HeadlineLine delay={0.25} loose={isAr}>
              {t("home.hero.l1")}
            </HeadlineLine>
            <HeadlineLine delay={0.4} loose={isAr} className="text-bronze">
              {t("home.hero.l2")}
            </HeadlineLine>
          </h1>

          <BlurFade delay={0.65}>
            <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-foreground/80 md:text-[17px]">
              {t("home.subtitle")}
            </p>
          </BlurFade>

          {/* The two actions no longer carry equal weight. `Browse projects`
              was a full outline pill the same height and presence as the gold
              one, which reads as "pick one of two equal things" — and across
              the whole page /projects already collected eight links to
              /register's five. It stays, quieter: same target, a third of the
              pull. */}
          <BlurFade
            delay={0.8}
            className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-4"
          >
            <Magnetic>
              <PillButton href={cta.href} size="lg">
                {t(cta.labelKey)}
              </PillButton>
            </Magnetic>
            <Link
              href="/projects"
              data-cursor="hover"
              className="link-underline text-sm font-medium text-foreground/75 transition-colors duration-300 hover:text-foreground"
            >
              {t("home.cta.browse")}
            </Link>
          </BlurFade>

          <BlurFade delay={0.95}>
            <p
              className={`mt-11 flex items-center gap-2 text-[11px] text-foreground/60 ${track}`}
            >
              <Lock className="size-3.5 text-primary" strokeWidth={1.5} />
              {t("home.trust")}
            </p>
          </BlurFade>
        </main>

        {/* Curtain dim — deepens as the page sheet covers the stage. */}
        {!reduce && (
          <motion.div
            aria-hidden="true"
            style={{ opacity: stageDim }}
            className="pointer-events-none absolute inset-0 z-20 bg-black"
          />
        )}
      </motion.div>
    </section>
  );
}
