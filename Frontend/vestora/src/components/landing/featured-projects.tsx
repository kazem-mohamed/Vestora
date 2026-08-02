"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, MapPin } from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { Magnetic } from "@/components/motion/magnetic";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { CardGround } from "@/components/landing/card-ground";
import { SectionSurface } from "@/components/landing/section-surface";
import { staggerContainer, staggerItem } from "@/components/motion/reveal";
import { useLocale } from "@/lib/i18n/locale";

interface Venture {
  name: string;
  category: string;
  location: string;
  raised: string;
  pct: number;
  /** Local, art-directed still. Briefs: docs/LANDING-IMAGE-BRIEF.md */
  img: string;
  /** Real reference format from the payments ledger — see docs/11. */
  ref: string;
}

/**
 * These three tiles used to hotlink Unsplash — someone else's CDN, outside
 * `next/image`, with no fallback if it rate-limits, and three photographs
 * generic enough that they were the main reason the ventures read as
 * invented. A solar farm, a laboratory and a server aisle, all shot in the
 * page's own single-warm-source lighting, do the opposite.
 */
const VENTURES: Venture[] = [
  { name: "Helios Grid", category: "Clean energy", location: "Cairo", raised: "$820K", pct: 82, img: "/landing/venture-01.jpg", ref: "VST-2026-000118" },
  { name: "Meridian Health", category: "HealthTech", location: "Dubai", raised: "$1.4M", pct: 68, img: "/landing/venture-02.jpg", ref: "VST-2026-000204" },
  { name: "Qantara AI", category: "Artificial intelligence", location: "Amman", raised: "$2.1M", pct: 74, img: "/landing/venture-03.jpg", ref: "VST-2026-000237" },
];

/** An image venture tile — the recurring bento building block. */
function VentureTile({
  v,
  className,
  large = false,
}: {
  v: Venture;
  className?: string;
  large?: boolean;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  return (
    <motion.div variants={staggerItem} className={`plate ${className ?? ""}`}>
      <Link
        href="/projects"
        data-cursor-text={rtl ? "عرض" : "View"}
        className="plate-face plate-face-bare group relative block h-full w-full bg-muted"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={v.img}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0908] via-[#0a0908]/25 to-[#0a0908]/5" />
        <div className="pointer-events-none absolute inset-3 ring-1 ring-primary/0 transition-all duration-500 group-hover:inset-4 group-hover:ring-primary/60" />

        <div className="relative z-10 flex h-full flex-col justify-between p-5 text-[#f0eae0] md:p-6">
          <div className="flex items-start justify-between gap-3">
            <span className="bg-black/35 px-3 py-1 text-[11px] backdrop-blur">
              {v.category}
            </span>
            {/* The ledger reference, in the exact format the payments tables
                issue (docs/11 · `VST-2026-000123`). It is the one detail on
                this card that is drawn from the real product rather than
                invented for the page, and a quoted reference number is what
                separates a record from a listing. */}
            <span className="font-numeric shrink-0 text-[10px] tracking-[0.08em] text-[#d8cdb8]/80">
              {v.ref}
            </span>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-[11px] text-[#d8cdb8]">
              <MapPin className="size-3" strokeWidth={1.5} />
              {v.location}
            </p>
            <h3
              className={`mt-1 font-bold leading-tight ${large ? "text-3xl md:text-4xl" : "text-2xl"}`}
              style={{ fontFamily: "var(--font-cinzel), serif" }}
            >
              {v.name}
            </h3>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-[11px] text-[#d8cdb8]">{t("land.feat.raised")}</p>
                <p className="font-numeric text-lg">{v.raised}</p>
              </div>
              <p className="font-numeric text-sm text-primary">
                {v.pct}% {t("land.feat.funded")}
              </p>
            </div>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-primary" style={{ width: `${v.pct}%` }} />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function FeaturedProjects() {
  const { t, locale } = useLocale();
  const isAr = locale === "ar";
  const caps = isAr ? "" : "uppercase tracking-[0.03em]";
  const track = isAr ? "" : "uppercase tracking-[0.35em]";

  return (
    <SectionSurface id="projects" variant="panel">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 md:py-32">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className={`text-xs text-primary-ink ${track}`}>{t("land.feat.eyebrow")}</p>
            <h2
              className={`mt-4 font-bold ${caps} ${
                isAr ? "leading-[1.3]" : "leading-[1.05]"
              }`}
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "var(--fs-h2)",
              }}
            >
              {t("land.feat.title")}
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              {t("land.feat.sub")}
            </p>
          </div>
          <Magnetic>
            <PillButton href="/projects" variant="outline">
              {t("nav.browse")}
            </PillButton>
          </Magnetic>
        </div>

        {/* Bento */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-12 grid auto-rows-[minmax(0,1fr)] grid-cols-1 gap-4 md:grid-cols-3 md:gap-5 lg:h-[640px]"
        >
          {/* Hero venture — tall left */}
          <VentureTile
            v={VENTURES[0]}
            large
            className="md:col-span-2 md:row-span-2 min-h-[360px] md:min-h-0"
          />

          {/* Big number */}
          <motion.div variants={staggerItem} className="plate min-h-[220px] md:min-h-0">
            <div
              className="plate-face relative flex h-full flex-col justify-center p-7 text-center"
              style={{ background: "color-mix(in srgb, var(--primary) 12%, var(--background))" }}
            >
              <CardGround src="/landing/card-figure.jpg" opacity={0.2} />
              <div className="relative">
                <p className="foil font-numeric text-5xl font-light tracking-tight md:text-6xl">
                  <AnimatedNumber value={52} format={(v) => `$${(v / 10).toFixed(1)}M`} duration={1.8} />
                </p>
                <p className="mx-auto mt-3 max-w-[180px] text-[13px] leading-relaxed text-muted-foreground">
                  {t("land.feat.total.caption")}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Second venture */}
          <VentureTile v={VENTURES[1]} className="min-h-[240px] md:min-h-0" />

          {/* CTA card */}
          <motion.div variants={staggerItem} className="plate md:col-span-2">
            <div
              className="plate-face relative"
              style={{ background: "color-mix(in srgb, var(--primary) 8%, var(--background))" }}
            >
              <CardGround src="/landing/card-explore.jpg" opacity={0.14} />
              <Link
                href="/projects"
                className="group relative flex h-full min-h-[180px] items-center justify-between gap-6 p-7 md:min-h-0"
              >
                <div>
                  <h3
                    className={`text-xl font-bold sm:text-2xl ${caps}`}
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {t("land.feat.cta.title")}
                  </h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    {t("land.feat.cta.d")}
                  </p>
                  <span className="link-underline mt-4 inline-block text-sm font-medium text-foreground">
                    {t("land.feat.cta.btn")}
                  </span>
                </div>
                <span className="grid size-12 shrink-0 place-items-center rounded-full border border-primary/40 text-primary transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:border-primary">
                  <ArrowUpRight className="size-5" strokeWidth={1.5} />
                </span>
              </Link>
            </div>
          </motion.div>

          {/* Third venture */}
          <VentureTile v={VENTURES[2]} className="min-h-[240px] md:min-h-0" />
        </motion.div>
      </div>
    </SectionSurface>
  );
}
