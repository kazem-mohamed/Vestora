"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Building2,
  Cpu,
  FlaskConical,
  HeartPulse,
  Leaf,
  Rocket,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { Magnetic } from "@/components/motion/magnetic";
import { PillButton } from "@/components/ui/pill-button";
import { LazyVideo } from "@/components/motion/lazy-video";
import { CardGround } from "@/components/landing/card-ground";
import { SectionSurface } from "@/components/landing/section-surface";
import { staggerContainer, staggerItem } from "@/components/motion/reveal";
import { useLandingCta } from "@/lib/nav/use-landing-cta";
import { useLocale } from "@/lib/i18n/locale";

const ROW_ICONS_A = [Cpu, Leaf, HeartPulse, Building2, Rocket, FlaskConical, ShoppingBag, Truck];
const ROW_ICONS_B = [Rocket, ShoppingBag, Building2, Cpu, Truck, Leaf, FlaskConical, HeartPulse];

/** Background footage that does not load until the tile is nearly in view. */
function CardVideo({ src }: { src: string }) {
  return <LazyVideo src={src} className="absolute inset-0 h-full w-full" />;
}

function SectionLabel({
  text,
  track,
  onDark = false,
}: {
  text: string;
  track: string;
  /** Force cream text — for labels sitting directly over video footage,
      which stays dark regardless of the page theme. */
  onDark?: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <span className="size-1 rounded-full bg-primary/70" />
      <p className={`text-[11px] ${onDark ? "text-[#f0eae0]/80" : "text-foreground/70"} ${track}`}>
        {text}
      </p>
      <span className="size-1 rounded-full bg-primary/70" />
    </div>
  );
}

function MarqueeRow({
  icons,
  direction,
}: {
  icons: typeof ROW_ICONS_A;
  direction: "left" | "right";
}) {
  const doubled = [...icons, ...icons];
  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div
        className={`flex w-max gap-3 ${
          direction === "left" ? "animate-marquee-left" : "animate-marquee-right"
        }`}
      >
        {doubled.map((Icon, i) => (
          <span
            key={i}
            className="liquid-glass grid size-14 shrink-0 place-items-center rounded-xl md:size-16"
          >
            <Icon className="size-6 text-primary/90" strokeWidth={1.5} />
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * "Why Vestora" — the bento board. Follows the page theme like every other
 * section; only the video-backed cards keep fixed cream text, since they
 * stay dark footage regardless of light/dark mode (same convention as
 * FeaturedProjects' venture cards).
 * Keeps id="principles" so existing anchors stay valid.
 */
export function WhyVestora() {
  const { t, locale } = useLocale();
  const cta = useLandingCta();
  const isAr = locale === "ar";
  const caps = isAr ? "" : "uppercase tracking-[0.04em]";
  const track = isAr ? "" : "uppercase tracking-[0.22em]";

  const rows = [1, 2, 3].map((i) => ({
    a: t(`land.why.r${i}.a`),
    b: t(`land.why.r${i}.b`),
    n: String(i).padStart(2, "0"),
  }));

  return (
    <SectionSurface id="principles" variant="engraved" className="text-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 md:py-24">
        {/* Header row */}
        <div className="mb-8 flex flex-col items-start justify-between gap-6 md:mb-10 md:flex-row md:items-end">
          <div className="max-w-3xl">
            <h2
              className={`font-bold leading-[1.15] ${caps}`}
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "var(--fs-h2)",
              }}
            >
              {t("land.why.title")}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-[1.6] text-foreground/60 md:text-[15px]">
              {t("land.why.sub")}
            </p>
          </div>
          <Magnetic>
            <PillButton href={cta.href} variant="outline" className="liquid-glass border-transparent hover:border-transparent">
              {t(cta.labelKey)}
            </PillButton>
          </Magnetic>
        </div>

        {/* Bento grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3"
        >
          {/* Column 1 — the platform, footage + pillar rows */}
          <motion.div
            variants={staggerItem}
            className="plate min-h-[420px] lg:min-h-[560px]"
          >
            <div className="plate-face plate-face-bare relative h-full bg-muted">
              {/* Was `bento-work.mp4` — a boy at a laptop among glowing
                  flowers under a starfield. A lovely clip, and the furthest
                  thing in the library from a platform where capital is
                  committed; it read as an education app. This one has a person
                  actually working, at altitude, in the warm low light the rest
                  of the page is built on. */}
              <CardVideo src="/landing/why-platform.mp4" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#0a0908]/70 via-transparent to-[#0a0908]/85" />
              <div className="relative flex h-full flex-col justify-between p-5 text-[#f0eae0] md:p-6">
                <SectionLabel text={t("land.why.plat")} track={track} onDark />
                <div className="space-y-3">
                  {rows.map((r) => (
                    <div
                      key={r.n}
                      className="grid grid-cols-[auto_auto_1fr] items-center gap-3 border-b border-white/10 pb-3 last:border-0 last:pb-0"
                    >
                      <span className="font-numeric text-xs text-primary/80">{r.n}</span>
                      <span className="text-sm font-medium">{r.a}</span>
                      <span className="text-end text-xs text-[#d8cdb8]">{r.b}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Column 2 — footage, standing alone.
              This tile used to carry `$2.4M+ / Committed through Vestora` at
              7xl. `FeaturedProjects` — the section immediately above, one
              screen away — carries `$5.2M / Committed across live ventures`
              in the same position in the same bento shape. Two oversized
              money figures, both describing commitments, a screen apart, is
              why the two sections read as one section shown twice. The figure
              belongs to Featured, which is where live ventures are; here the
              footage now carries the tile on its own, which is also what lets
              it breathe at this size. */}
          <motion.div variants={staggerItem} className="plate min-h-[300px] md:min-h-0">
            <div className="plate-face plate-face-bare relative h-full bg-muted">
              {/* Was `bento-wealth.mp4` — a cliffside villa at sunset, which
                  is the visual language of a property developer, not of a
                  place capital is committed. This is low-detail and warm,
                  which is what a tile carrying a line of type needs. */}
              <CardVideo src="/landing/why-capital.mp4" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0908]/80 via-[#0a0908]/25 to-[#0a0908]/50" />
              <div className="relative flex h-full flex-col justify-end p-6 text-[#f0eae0]">
                <span
                  aria-hidden
                  className="mb-4 block h-px w-14 bg-gradient-to-r from-primary/70 to-transparent rtl:bg-gradient-to-l"
                />
                <p className="text-sm leading-relaxed text-[#f0eae0]/90">
                  {t("land.why.big.caption")}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Column 3 — industries marquee + get started */}
          <motion.div variants={staggerItem} className="grid gap-4 md:gap-5 md:grid-rows-[1fr_auto] md:col-span-2 lg:col-span-1">
            <div className="plate min-h-[300px]">
              <div
                className="plate-face relative flex h-full flex-col justify-between p-5 md:p-6"
                style={{
                  background: "color-mix(in srgb, var(--foreground) 5%, var(--background))",
                }}
              >
                {/* The glass tiles need something behind them to be glass
                    against — over a flat wash the `liquid-glass` treatment has
                    nothing to refract and reads as a plain grey square. */}
                <CardGround src="/landing/card-industries.jpg" opacity={0.22} />
                <div className="relative">
                  <SectionLabel text={t("land.why.ind")} track={track} />
                </div>
                <div className="relative space-y-3">
                  <MarqueeRow icons={ROW_ICONS_A} direction="left" />
                  <MarqueeRow icons={ROW_ICONS_B} direction="right" />
                </div>
              </div>
            </div>

            <div className="plate">
              <div
                className="noise-overlay plate-face relative p-5 md:p-6"
                style={{
                  background: "color-mix(in srgb, var(--primary) 14%, var(--background))",
                }}
              >
                <CardGround src="/landing/card-start.jpg" opacity={0.13} />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="size-1 rounded-full bg-primary/70" />
                      <p className={`text-[11px] text-foreground/70 ${track}`}>
                        {t("land.why.start")}
                      </p>
                    </div>
                    <p className="mt-4 max-w-xs text-[13.5px] leading-[1.6] text-foreground/85">
                      {t("land.why.start.d")}
                    </p>
                  </div>
                  <Magnetic>
                    <Link
                      href={cta.href}
                      aria-label={t(cta.labelKey)}
                      className="gold-cta grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
                    >
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </Magnetic>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </SectionSurface>
  );
}
