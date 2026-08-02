"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Reveal, staggerContainer, staggerItem } from "@/components/motion/reveal";
import { SectionSurface } from "@/components/landing/section-surface";
import { useLocale } from "@/lib/i18n/locale";

// Chamfered-corner language — used in About only (deliberate one-section
// accent). Three different cuts, faithful to the reference plates.
const CLIPS = [
  "polygon(64px 0, calc(100% - 14px) 0, calc(100% - 4px) 4px, 100% 14px, 100% calc(100% - 14px), calc(100% - 4px) calc(100% - 4px), calc(100% - 14px) 100%, 14px 100%, 4px calc(100% - 4px), 0 calc(100% - 14px), 0 64px)",
  "polygon(0 14px, 4px 4px, 14px 0, calc(100% - 64px) 0, 100% 64px, 100% calc(100% - 14px), calc(100% - 4px) calc(100% - 4px), calc(100% - 14px) 100%, 64px 100%, 0 calc(100% - 64px))",
  "polygon(0 14px, 4px 4px, 14px 0, calc(100% - 64px) 0, 100% 64px, 100% calc(100% - 64px), calc(100% - 64px) 100%, 14px 100%, 4px calc(100% - 4px), 0 calc(100% - 14px))",
];

const ICON_CLIP =
  "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)";

/**
 * ── IMAGE SLOTS ─────────────────────────────────────────────────────────
 * The three plates used to point at `about-atrium.png`, `about-skyline.jpg`
 * and `about-gold.png`. All three were byte-identical copies of the three
 * hero stills (MD5-verified), and two were JPEGs carrying a `.png`
 * extension — so the same picture was served twice under two names, at
 * roughly double the bytes it needed.
 *
 * They now sit under slot names. Drop the generated files over these and no
 * code changes: docs/LANDING-IMAGE-BRIEF.md
 * ────────────────────────────────────────────────────────────────────── */
const CARDS = [
  {
    img: "/landing/about-01.jpg", // 48h — the review turnaround
    v: "land.about.card1.v",
    d: "land.about.card1.d",
    offset: false,
    overlay: "start-6 end-6 bottom-6",
  },
  {
    img: "/landing/about-02.jpg", // 100% — founder-approved
    v: "land.about.card2.v",
    d: "land.about.card2.d",
    offset: true,
    overlay: "start-6 bottom-16 end-10",
  },
  {
    img: "/landing/about-03.jpg", // 0 — intermediaries
    v: "land.about.card3.v",
    d: "land.about.card3.d",
    offset: false,
    overlay: "start-6 end-24 bottom-6",
  },
];

export function AboutSection() {
  const { t, locale } = useLocale();
  const isAr = locale === "ar";
  const caps = isAr ? "" : "uppercase tracking-[0.02em]";

  return (
    <SectionSurface
      id="about"
      variant="panel"
      className="flex min-h-svh w-full flex-col justify-center py-20 sm:py-28"
    >
      <div className="mx-auto w-full max-w-6xl px-6 sm:px-10">
        {/* Heading + description, side by side. */}
        <div className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:gap-20">
          <Reveal>
            {/* Was `clamp(2.5rem, 6vw, 4.5rem)` — a hard 72px that outranked
                the hero's own H1 (69px) on every viewport under ~1333px, which
                is most laptops. The weakest heading on the page was set as the
                largest type on it. */}
            <h2
              className={`font-bold ${caps} ${
                isAr ? "leading-[1.3]" : "leading-[0.98]"
              }`}
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "var(--fs-h2)",
              }}
            >
              {t("land.about.title")
                .split("|")
                .map((line, i) => (
                  <span key={i} className="block">
                    {line}
                  </span>
                ))}
            </h2>
          </Reveal>

          <Reveal delay={0.12} className="flex max-w-xl flex-col">
            <p className="text-[17px] leading-[1.6] sm:text-lg">
              {t("land.about.p1").split("|").join(" ")}
            </p>
            <p className="mt-4 text-[17px] leading-[1.6] text-foreground/80 sm:text-lg">
              {t("land.about.p2")}
            </p>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              {t("land.about.p3")}
            </p>
            <Link
              href="/projects"
              className="group mt-6 inline-flex items-center gap-4 text-sm font-medium text-foreground"
            >
              <span className="link-underline">{t("nav.browse")}</span>
              <span
                className="grid size-8 place-items-center border border-foreground/60 transition-transform duration-300 group-hover:-translate-y-0.5"
                style={{ clipPath: ICON_CLIP }}
              >
                <ArrowUpRight className="size-3.5" strokeWidth={2} />
              </span>
            </Link>
          </Reveal>
        </div>

        {/* Chamfered stat plates. */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          {CARDS.map((card, i) => (
            <motion.div
              key={card.v}
              variants={staggerItem}
              className={`relative h-[280px] w-full sm:h-[340px] ${
                card.offset ? "lg:mt-24" : ""
              }`}
              style={{
                background: "color-mix(in srgb, var(--primary) 50%, transparent)",
                padding: "1.5px",
                clipPath: CLIPS[i],
              }}
            >
              <div
                className="group relative h-full w-full overflow-hidden bg-cover bg-center"
                style={{ clipPath: CLIPS[i], backgroundImage: `url(${card.img})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0908]/85 via-[#0a0908]/25 to-transparent" />
                <div className={`absolute max-w-[66%] ${card.overlay}`}>
                  <p
                    className="font-numeric text-[40px] font-semibold leading-none sm:text-[52px]"
                    style={{
                      background:
                        "linear-gradient(294deg, var(--bronze) 15%, var(--primary) 60%, #e8d5a3 100%)",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                    }}
                  >
                    {t(card.v)}
                  </p>
                  <p className="mt-3 text-sm leading-[1.5] text-[#e7ddc9]">
                    {t(card.d)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </SectionSurface>
  );
}
